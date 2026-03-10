// Minimal debug script
(() => {
  try {
    // Get injected arguments
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};

    // Get all tasks
    const allTasks = flattenedTasks;

    // Basic info
    const result = {
      success: true,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(task => task.taskStatus === Task.Status.Completed).length,
      args: args,
      firstTaskStatus: allTasks.length > 0 ? allTasks[0].taskStatus : null,
      completedStatusValue: Task.Status.Completed
    };

    return JSON.stringify(result);

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();
