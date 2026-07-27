// Atomically preflight, move, and verify a set of OmniFocus tasks by stable ID.
(() => {
  const args = typeof injectedArgs !== "undefined" ? injectedArgs : {};
  const requestedMoves = Array.isArray(args.moves) ? args.moves : [];

  function fail(error) {
    return JSON.stringify({ success: false, error });
  }

  function taskById(id) {
    return flattenedTasks.find((task) => task.id.primaryKey === id) || null;
  }

  function projectById(id) {
    return flattenedProjects.find((project) => {
      if (project.id.primaryKey === id) return true;
      try {
        return project.task && project.task.id.primaryKey === id;
      } catch (error) {
        return false;
      }
    }) || null;
  }

  function parentTask(task) {
    try {
      return task.parent || null;
    } catch (error) {
      return null;
    }
  }

  function originalLocation(task) {
    const parent = parentTask(task);
    if (parent) return { kind: "parent", id: parent.id.primaryKey, object: parent };
    if (task.inInbox) return { kind: "inbox", id: null, object: null };
    if (task.containingProject) {
      let projectId = task.containingProject.id.primaryKey;
      try {
        if (task.containingProject.task && task.containingProject.task.id.primaryKey) {
          projectId = task.containingProject.task.id.primaryKey;
        }
      } catch (error) {}
      return {
        kind: "project",
        id: projectId,
        object: task.containingProject,
      };
    }
    return null;
  }

  function moveTo(task, destination) {
    if (destination.kind === "inbox") {
      moveTasks([task], inbox.ending);
    } else {
      moveTasks([task], destination.object.ending);
    }
  }

  function destinationSummary(destination) {
    return {
      kind: destination.kind,
      id: destination.id,
      name: destination.object ? destination.object.name : "Inbox",
    };
  }

  function actualLocation(task) {
    const parent = parentTask(task);
    if (parent) return { kind: "parent", id: parent.id.primaryKey };
    if (task.inInbox) return { kind: "inbox", id: null };
    if (task.containingProject) {
      let projectId = task.containingProject.id.primaryKey;
      try {
        if (task.containingProject.task && task.containingProject.task.id.primaryKey) {
          projectId = task.containingProject.task.id.primaryKey;
        }
      } catch (error) {}
      return { kind: "project", id: projectId };
    }
    return { kind: "unknown", id: null };
  }

  function locationMatches(task, destination) {
    if (destination.kind === "inbox") return !!task.inInbox && !parentTask(task);
    if (destination.kind === "parent") {
      const actualParent = parentTask(task);
      return !!actualParent && actualParent.id.primaryKey === destination.object.id.primaryKey;
    }
    if (!task.containingProject) return false;
    return task.containingProject.id.primaryKey === destination.object.id.primaryKey;
  }

  function rollback(plans) {
    const failures = [];
    for (let index = plans.length - 1; index >= 0; index -= 1) {
      const plan = plans[index];
      try {
        moveTo(plan.task, plan.original);
      } catch (error) {
        failures.push(`${plan.task.name}: ${String(error)}`);
      }
    }
    return failures;
  }

  try {
    if (requestedMoves.length === 0) return fail("At least one move is required");

    const sourceIds = new Set();
    const plans = [];

    for (let index = 0; index < requestedMoves.length; index += 1) {
      const move = requestedMoves[index] || {};
      const taskId = String(move.taskId || "").trim();
      if (!taskId) return fail(`Move ${index + 1} is missing taskId`);
      if (sourceIds.has(taskId)) return fail(`Duplicate source task ID: ${taskId}`);
      sourceIds.add(taskId);

      const destinationCount =
        (move.projectId ? 1 : 0) +
        (move.parentTaskId ? 1 : 0) +
        (move.inbox === true ? 1 : 0);
      if (destinationCount !== 1) {
        return fail(`Task ${taskId} must have exactly one destination`);
      }

      const task = taskById(taskId);
      if (!task) return fail(`Task not found: ${taskId}`);

      let destination;
      if (move.projectId) {
        const project = projectById(move.projectId);
        if (!project) return fail(`Destination project not found: ${move.projectId}`);
        destination = { kind: "project", id: move.projectId, object: project };
      } else if (move.parentTaskId) {
        const parent = taskById(move.parentTaskId);
        if (!parent) return fail(`Destination parent task not found: ${move.parentTaskId}`);
        if (sourceIds.has(move.parentTaskId) || requestedMoves.some((item) => item.taskId === move.parentTaskId)) {
          return fail(`Destination parent task cannot also be moved in this batch: ${move.parentTaskId}`);
        }

        let cursor = parent;
        while (cursor) {
          if (cursor.id.primaryKey === taskId) {
            return fail(`Invalid move for ${taskId}: cannot move a task into itself or its descendants`);
          }
          cursor = parentTask(cursor);
        }
        destination = { kind: "parent", id: parent.id.primaryKey, object: parent };
      } else {
        destination = { kind: "inbox", id: null, object: null };
      }

      const original = originalLocation(task);
      if (!original) return fail(`Cannot determine current location for task: ${taskId}`);
      plans.push({ task, destination, original });
    }

    const changedPlans = plans.filter((plan) => !locationMatches(plan.task, plan.destination));
    const movedPlans = [];
    try {
      for (const plan of changedPlans) {
        moveTo(plan.task, plan.destination);
        movedPlans.push(plan);
      }
    } catch (error) {
      const rollbackFailures = rollback(movedPlans);
      const suffix = rollbackFailures.length > 0
        ? ` Rollback also failed for: ${rollbackFailures.join("; ")}`
        : " All completed moves were rolled back.";
      return fail(`Batch move failed: ${String(error)}.${suffix}`);
    }

    const mismatches = changedPlans.filter((plan) => !locationMatches(plan.task, plan.destination));
    if (mismatches.length > 0) {
      const rollbackFailures = rollback(movedPlans);
      const mismatchIds = mismatches.map((plan) => plan.task.id.primaryKey).join(", ");
      const suffix = rollbackFailures.length > 0
        ? ` Rollback also failed for: ${rollbackFailures.join("; ")}`
        : " The batch was rolled back.";
      return fail(`Move verification failed for task(s): ${mismatchIds}.${suffix}`);
    }

    return JSON.stringify({
      success: true,
      movedCount: changedPlans.length,
      unchangedCount: plans.length - changedPlans.length,
      results: plans.map((plan) => ({
        taskId: plan.task.id.primaryKey,
        taskName: plan.task.name,
        destination: destinationSummary(plan.destination),
        verified: locationMatches(plan.task, plan.destination),
        changed: changedPlans.includes(plan),
      })),
    });
  } catch (error) {
    return fail(`Batch move failed: ${error && error.message ? error.message : String(error)}`);
  }
})();
