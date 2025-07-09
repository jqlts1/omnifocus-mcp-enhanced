// 调试任务状态的脚本
(() => {
  try {
    const allTasks = flattenedTasks;
    
    // 获取前5个任务的状态信息
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
    
    // 检查完成任务的状态
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
      // 尝试不同的状态检查方式
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