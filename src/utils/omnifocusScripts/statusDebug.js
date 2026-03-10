// Script to debug task status values
(() => {
  try {
    const allTasks = flattenedTasks;

    // Get status info for the first 5 tasks
    const statusInfo = [];
    for (let i = 0; i < Math.min(5, allTasks.length); i++) {
      const task = allTasks[i];
      statusInfo.push({
        name: task.name,
        rawStatus: task.taskStatus,
        statusType: typeof task.taskStatus,
        statusString: task.taskStatus.toString(),
        isCompleted: task.taskStatus.toString() === "completed"
      });
    }

    // Check completed tasks by status string comparison
    const completedTasks = allTasks.filter(task => task.taskStatus.toString() === "completed");

    const result = {
      success: true,
      totalTasks: allTasks.length,
      completedByToString: completedTasks.length,
      taskStatusEnum: {
        available: Task.Status.Available,
        completed: Task.Status.Completed,
        blocked: Task.Status.Blocked
      },
      statusInfo: statusInfo,
      // Try different ways to check status
      statusTestResults: {
        usingEnum: allTasks.filter(task => task.taskStatus === Task.Status.Completed).length,
        usingString: allTasks.filter(task => task.taskStatus.toString() === "completed").length,
        usingName: allTasks.filter(task => task.taskStatus.name === "completed").length
      }
    };

    return JSON.stringify(result, null, 2);

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();
