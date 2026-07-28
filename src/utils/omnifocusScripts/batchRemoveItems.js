// Preflight, delete, rollback on failure, and verify a confirmed item set.
(() => {
  const args = typeof injectedArgs !== "undefined" ? injectedArgs : {};
  const requestedItems = Array.isArray(args.items) ? args.items : [];

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
      } catch (_error) {
        return false;
      }
    }) || null;
  }

  function directTaskChildren(task) {
    try {
      return Array.from(task.children || []);
    } catch (_error) {
      return [];
    }
  }

  function descendantCount(task) {
    let count = 0;
    const stack = directTaskChildren(task);
    const seen = new Set();
    while (stack.length > 0) {
      const child = stack.pop();
      if (!child || seen.has(child.id.primaryKey)) continue;
      seen.add(child.id.primaryKey);
      count += 1;
      stack.push(...directTaskChildren(child));
    }
    return count;
  }

  function projectTaskCount(project) {
    try {
      return Array.from(project.flattenedTasks || []).length;
    } catch (_error) {
      return 0;
    }
  }

  function stillExists(plan) {
    return plan.itemType === "task"
      ? !!taskById(plan.id)
      : !!projectById(plan.id);
  }

  function rollback(deletedPlans) {
    for (let attempt = 0; attempt < deletedPlans.length; attempt += 1) {
      if (deletedPlans.every(stillExists)) return [];
      if (!document.canUndo) break;
      try {
        document.undo();
      } catch (_error) {
        break;
      }
    }

    return deletedPlans
      .filter((plan) => !stillExists(plan))
      .map((plan) => `${plan.itemType}:${plan.id}`);
  }

  try {
    if (requestedItems.length === 0) return fail("At least one item is required");

    const seen = new Set();
    const plans = [];
    for (let index = 0; index < requestedItems.length; index += 1) {
      const requested = requestedItems[index] || {};
      const id = String(requested.id || "").trim();
      const itemType = requested.itemType;
      if (!id) return fail(`Item ${index + 1} is missing a stable ID`);
      if (itemType !== "task" && itemType !== "project") {
        return fail(`Item ${index + 1} has an invalid itemType`);
      }

      const key = `${itemType}:${id}`;
      if (seen.has(key)) return fail(`Duplicate item: ${key}`);
      seen.add(key);

      const object = itemType === "task" ? taskById(id) : projectById(id);
      if (!object) return fail(`${itemType === "task" ? "Task" : "Project"} not found: ${id}`);

      plans.push({
        id,
        itemType,
        object,
        name: object.name,
        cascadeCount: itemType === "task" ? descendantCount(object) : projectTaskCount(object),
      });
    }

    const deletedPlans = [];
    try {
      for (const plan of plans) {
        deleteObject(plan.object);
        deletedPlans.push(plan);
      }
    } catch (error) {
      const rollbackFailures = rollback(deletedPlans);
      const rollbackText = rollbackFailures.length > 0
        ? ` Rollback failed for: ${rollbackFailures.join("; ")}`
        : " Completed deletions were restored.";
      return fail(
        `Batch removal failed after preflight: ${error && error.message ? error.message : String(error)}.${rollbackText}`,
      );
    }

    const mismatches = plans.filter(stillExists);
    if (mismatches.length > 0) {
      const rollbackFailures = rollback(deletedPlans);
      const rollbackText = rollbackFailures.length > 0
        ? ` Rollback failed for: ${rollbackFailures.join("; ")}`
        : " The batch was restored.";
      return fail(
        `Removal verification failed for: ${mismatches.map((plan) => plan.id).join(", ")}.${rollbackText}`,
      );
    }

    return JSON.stringify({
      success: true,
      removedCount: plans.length,
      results: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        itemType: plan.itemType,
        cascadeCount: plan.cascadeCount,
        verified: true,
      })),
    });
  } catch (error) {
    return fail(`Batch removal failed: ${error && error.message ? error.message : String(error)}`);
  }
})();
