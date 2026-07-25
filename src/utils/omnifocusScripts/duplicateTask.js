// Duplicate an OmniFocus task, including its subtasks, using Omni Automation.
(() => {
  try {
    var args = typeof injectedArgs !== "undefined" ? injectedArgs : {};
    var taskId = args.taskId || null;
    var taskName = args.taskName || null;
    var newName = args.newName || null;
    var includeSubtasks = args.includeSubtasks !== undefined ? args.includeSubtasks : true;

    if (!taskId && !taskName) {
      return JSON.stringify({ success: false, error: "Either taskId or taskName must be provided" });
    }

    // Resolve the source task with duplicate-name protection.
    var matches = flattenedTasks.filter(function (candidate) {
      if (taskId) return candidate.id.primaryKey === taskId;
      return candidate.name === taskName;
    });

    if (matches.length === 0) {
      return JSON.stringify({ success: false, error: "Task not found" });
    }
    if (matches.length > 1 && !taskId) {
      return JSON.stringify({
        success: false,
        error: "Ambiguous task name: " + taskName + ". Multiple matches found; please use taskId."
      });
    }

    var source = matches[0];

    // Determine the drop location (same container as the source task).
    var location;
    if (source.parent) {
      location = source.parent.ending;
    } else if (source.containingProject) {
      location = source.containingProject.ending;
    } else {
      location = inbox.ending;
    }

    // duplicateTasks preserves subtasks natively.
    var duplicated = duplicateTasks([source], location);
    var newTask = duplicated && duplicated.length ? duplicated[0] : null;

    if (!newTask) {
      return JSON.stringify({ success: false, error: "Duplication failed: no task returned" });
    }

    // Optionally rename the duplicate.
    if (newName) {
      newTask.name = newName;
    }

    // Optionally strip subtasks if the caller does not want them.
    if (!includeSubtasks && newTask.children && newTask.children.length > 0) {
      // Iterate over a copy since deletion mutates the collection.
      var children = newTask.children.slice();
      children.forEach(function (child) {
        deleteObject(child);
      });
    }

    return JSON.stringify({
      success: true,
      newTaskId: newTask.id.primaryKey,
      name: newTask.name,
      childrenCount: newTask.children ? newTask.children.length : 0
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
})();
