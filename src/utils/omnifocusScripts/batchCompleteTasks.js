// Batch complete or mark incomplete tasks with preflight, verification, and restoration.
(() => {
  const args = typeof injectedArgs !== "undefined" ? injectedArgs : {};
  const items = args.items || [];

  function fail(code, error, extra) {
    return JSON.stringify({ success: false, code, error, ...(extra || {}) });
  }

  function primaryKey(object) {
    try {
      return object && object.id ? object.id.primaryKey : null;
    } catch (_error) {
      return null;
    }
  }

  function findById(collection, id) {
    return collection.find((item) => primaryKey(item) === id) || null;
  }

  function completionSnapshot(task) {
    try {
      const completed = !!task.completed;
      const completionDate = completed && task.completionDate
        ? task.completionDate.toISOString()
        : null;
      return { completed, completionDate };
    } catch (_error) {
      return { completed: false, completionDate: null };
    }
  }

  function repetitionSnapshot(task) {
    try {
      const rule = task.repetitionRule || null;
      if (!rule) return null;
      return { ruleString: rule.ruleString || "" };
    } catch (_error) {
      return null;
    }
  }

  function deleteTask(task) {
    try {
      deleteObject(task);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function restoreCompletionState(task, snapshot) {
    try {
      if (snapshot.completed) {
        if (snapshot.completionDate) {
          const date = new Date(snapshot.completionDate);
          task.markComplete(date);
        } else {
          task.markComplete();
        }
      } else {
        task.markIncomplete();
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  try {
    if (!items || items.length === 0) {
      return fail("INVALID_COMPLETION", "items array is required");
    }

    // Preflight: resolve all task IDs and check current states
    const plan = [];
    for (const item of items) {
      if (!item.taskId) {
        return fail("INVALID_COMPLETION", "every item must have a taskId");
      }

      let task = null;
      if (typeof Task !== "undefined" && Task.byIdentifier) {
        task = Task.byIdentifier(item.taskId);
      }
      if (!task && typeof flattenedTasks !== "undefined") {
        task = findById(flattenedTasks, item.taskId);
      }
      if (!task) {
        return fail("INVALID_COMPLETION", `Task not found: ${item.taskId}`);
      }

      const before = completionSnapshot(task);
      const repetition = repetitionSnapshot(task);

      let targetCompleted;
      if (item.action === "complete") {
        targetCompleted = true;
      } else if (item.action === "incomplete") {
        targetCompleted = false;
      } else {
        return fail("INVALID_COMPLETION", `Invalid action for ${item.taskId}: ${item.action}`);
      }

      // Check idempotence
      if (before.completed === targetCompleted) {
        plan.push({
          task,
          taskId: item.taskId,
          action: "unchanged",
          before,
          repetition,
          targetCompleted,
        });
        continue;
      }

      // Validate completionDate
      let completionDate = null;
      if (item.completionDate !== undefined) {
        if (item.action !== "complete") {
          return fail(
            "INVALID_COMPLETION",
            `completionDate only valid with action=complete for ${item.taskId}`,
          );
        }
        completionDate = new Date(item.completionDate);
        if (Number.isNaN(completionDate.getTime())) {
          return fail(
            "INVALID_COMPLETION",
            `Invalid completionDate for ${item.taskId}: ${item.completionDate}`,
          );
        }
      }

      plan.push({
        task,
        taskId: item.taskId,
        action: item.action,
        before,
        repetition,
        targetCompleted,
        completionDate,
      });
    }

    // Execute all actions
    const results = [];
    const generatedTasks = [];

    for (let index = 0; index < plan.length; index += 1) {
      const step = plan[index];
      if (step.action === "unchanged") {
        results.push({
          taskId: primaryKey(step.task),
          status: "unchanged",
          before: step.before,
        });
        continue;
      }

      try {
        if (step.action === "complete") {
          const taskIdsBefore = step.repetition && typeof flattenedTasks !== "undefined"
            ? new Set(flattenedTasks.map((task) => primaryKey(task)))
            : null;
          const returnedTask = step.completionDate
            ? step.task.markComplete(step.completionDate)
            : step.task.markComplete();
          const completedTask = returnedTask || step.task;
          step.completedTask = completedTask;

          if (step.repetition) {
            let generatedTask = returnedTask && returnedTask !== step.task
              ? step.task
              : null;
            if (!generatedTask && taskIdsBefore && typeof flattenedTasks !== "undefined") {
              generatedTask = flattenedTasks.find(
                (task) => !taskIdsBefore.has(primaryKey(task)),
              ) || null;
            }
            if (generatedTask && generatedTask !== completedTask) {
              generatedTasks.push({
                originalTaskId: step.taskId,
                generated: generatedTask,
                completed: completedTask,
              });
            }
          }
        } else if (step.action === "incomplete") {
          step.task.markIncomplete();
        }

        results.push({
          taskId: step.taskId,
          action: step.action,
          before: step.before,
        });
      } catch (error) {
        // Restore all previous changes in reverse order
        for (let restore = index - 1; restore >= 0; restore -= 1) {
          const prev = plan[restore];
          if (prev.action === "unchanged") continue;
          restoreCompletionState(prev.completedTask || prev.task, prev.before);
        }

        // Delete generated tasks
        for (const gen of generatedTasks) {
          deleteTask(gen.generated);
        }

        return fail(
          "COMPLETION_FAILED_RESTORED",
          `Failed to ${step.action} task ${step.taskId}: ${String(error)}`,
          { restored: true },
        );
      }
    }

    // Verify all results
    const verified = [];
    const mismatches = [];

    for (const result of results) {
      if (result.status === "unchanged") {
        verified.push({
          taskId: result.taskId,
          status: "unchanged",
        });
        continue;
      }

      // Use the original task reference from the plan, not a lookup
      const step = plan.find((candidate) => candidate.taskId === result.taskId);
      if (!step) {
        mismatches.push(`${result.taskId}: task not found in plan`);
        continue;
      }

      // For repeating tasks that were completed, use the completed clone reference
      const task = step.completedTask || step.task;
      if (!task) {
        mismatches.push(`${result.taskId}: task reference lost`);
        continue;
      }

      const after = completionSnapshot(task);

      if (after.completed !== step.targetCompleted) {
        mismatches.push(`${result.taskId}: expected ${step.targetCompleted ? "completed" : "incomplete"}, got ${after.completed ? "completed" : "incomplete"}`);
        continue;
      }

      if (step.action === "complete" && step.completionDate) {
        const expectedTime = step.completionDate.getTime();
        const actualTime = after.completionDate ? new Date(after.completionDate).getTime() : null;
        if (!actualTime || Math.abs(actualTime - expectedTime) > 1000) {
          mismatches.push(`${result.taskId}: completionDate mismatch`);
          continue;
        }
      }

      // Find generated task if any (new incomplete instance from repeating task)
      let generatedTaskId = null;
      let nextOccurrence = null;
      const gen = generatedTasks.find((candidate) => candidate.originalTaskId === result.taskId);
      if (gen) {
        generatedTaskId = primaryKey(gen.generated);
        try {
          const rule = gen.generated.repetitionRule;
          if (rule) {
            const next = rule.firstDateAfterDate(new Date());
            nextOccurrence = next ? next.toISOString() : null;
          }
        } catch (_error) {
          nextOccurrence = null;
        }
      }

      verified.push({
        taskId: result.taskId,
        status: step.action === "complete" ? "completed" : "incompleted",
        completionDate: after.completionDate,
        generatedTaskId,
        nextOccurrence,
      });
    }

    if (mismatches.length > 0) {
      // Restore all in reverse order
      for (let restore = plan.length - 1; restore >= 0; restore -= 1) {
        const step = plan[restore];
        if (step.action === "unchanged") continue;
        restoreCompletionState(step.completedTask || step.task, step.before);
      }

      // Delete generated tasks
      for (const gen of generatedTasks) {
        deleteTask(gen.generated);
      }

      return fail(
        "COMPLETION_VERIFICATION_FAILED_RESTORED",
        `Verification failed: ${mismatches.join("; ")}`,
        { restored: true },
      );
    }

    return JSON.stringify({
      success: true,
      items: verified,
    });
  } catch (error) {
    return fail("INVALID_COMPLETION", error && error.message ? error.message : String(error));
  }
})();
