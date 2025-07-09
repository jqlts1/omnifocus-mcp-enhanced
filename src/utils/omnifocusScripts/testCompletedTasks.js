// 专门测试完成任务的脚本
(() => {
  try {
    console.log("=== 完成任务测试脚本开始 ===");
    
    // 获取所有任务
    const allTasks = flattenedTasks;
    console.log(`总任务数: ${allTasks.length}`);
    
    // 过滤完成任务
    const completedTasks = allTasks.filter(task => 
      task.taskStatus === Task.Status.Completed
    );
    console.log(`完成任务数: ${completedTasks.length}`);
    
    // 今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    console.log(`今天开始: ${today.toISOString()}`);
    console.log(`明天开始: ${tomorrow.toISOString()}`);
    
    // 过滤今天完成的任务
    const todayCompletedTasks = completedTasks.filter(task => {
      if (!task.completionDate) {
        console.log(`任务 "${task.name}" 没有完成日期`);
        return false;
      }
      
      const completedDate = new Date(task.completionDate);
      const isToday = completedDate >= today && completedDate < tomorrow;
      
      console.log(`任务 "${task.name}" 完成日期: ${completedDate.toISOString()}, 是今天: ${isToday}`);
      return isToday;
    });
    
    console.log(`今天完成任务数: ${todayCompletedTasks.length}`);
    
    // 最近几天的完成任务
    const recentDays = 7;
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - recentDays);
    recentDate.setHours(0, 0, 0, 0);
    
    const recentCompletedTasks = completedTasks.filter(task => {
      if (!task.completionDate) return false;
      const completedDate = new Date(task.completionDate);
      return completedDate >= recentDate;
    });
    
    console.log(`最近${recentDays}天完成任务数: ${recentCompletedTasks.length}`);
    
    // 输出最近的完成任务
    const exportData = {
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      todayCompletedTasks: todayCompletedTasks.length,
      recentCompletedTasks: recentCompletedTasks.length,
      todayTasks: [],
      recentTasks: []
    };
    
    // 处理今天的任务
    todayCompletedTasks.slice(0, 10).forEach(task => {
      exportData.todayTasks.push({
        id: task.id.primaryKey,
        name: task.name,
        note: task.note || "",
        completedDate: task.completionDate ? task.completionDate.toISOString() : null,
        projectName: task.containingProject ? task.containingProject.name : null
      });
    });
    
    // 处理最近的任务
    recentCompletedTasks.slice(0, 10).forEach(task => {
      exportData.recentTasks.push({
        id: task.id.primaryKey,
        name: task.name,
        note: task.note || "",
        completedDate: task.completionDate ? task.completionDate.toISOString() : null,
        projectName: task.containingProject ? task.containingProject.name : null
      });
    });
    
    console.log("=== 完成任务测试脚本结束 ===");
    return JSON.stringify(exportData, null, 2);
    
  } catch (error) {
    console.error(`测试完成任务脚本错误: ${error}`);
    return JSON.stringify({
      error: `测试完成任务脚本错误: ${error}`
    });
  }
})();