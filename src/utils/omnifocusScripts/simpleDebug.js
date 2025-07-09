// 最简单的调试脚本
(() => {
  try {
    // 获取参数
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};
    
    // 获取所有任务
    const allTasks = flattenedTasks;
    
    // 基本信息
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