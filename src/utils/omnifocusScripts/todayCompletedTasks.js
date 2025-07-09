// 专门获取今天完成任务的简化脚本
(() => {
  try {
    // 获取参数（如果有的话）
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};
    const limit = args.limit || 20;
    
    console.log("=== 今天完成任务查询开始 ===");
    
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
    
    console.log(`今天范围: ${today.toISOString()} 到 ${tomorrow.toISOString()}`);
    
    // 过滤今天完成的任务
    const todayCompletedTasks = completedTasks.filter(task => {
      if (!task.completionDate) return false;
      
      const completedDate = new Date(task.completionDate);
      return completedDate >= today && completedDate < tomorrow;
    });
    
    console.log(`今天完成任务数: ${todayCompletedTasks.length}`);
    
    // 获取任务状态映射
    const statusMap = {
      [Task.Status.Available]: "Available",
      [Task.Status.Blocked]: "Blocked",
      [Task.Status.Completed]: "Completed", 
      [Task.Status.Dropped]: "Dropped",
      [Task.Status.DueSoon]: "DueSoon",
      [Task.Status.Next]: "Next",
      [Task.Status.Overdue]: "Overdue"
    };
    
    // 构建导出数据
    const exportData = {
      exportDate: new Date().toISOString(),
      tasks: [],
      totalCount: completedTasks.length,
      filteredCount: todayCompletedTasks.length,
      query: "今天完成的任务"
    };
    
    // 处理每个今天完成的任务
    const tasksToProcess = todayCompletedTasks.slice(0, limit);
    
    tasksToProcess.forEach(task => {
      try {
        const taskData = {
          id: task.id.primaryKey,
          name: task.name,
          note: task.note || "",
          taskStatus: statusMap[task.taskStatus] || "Unknown",
          flagged: task.flagged,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          deferDate: task.deferDate ? task.deferDate.toISOString() : null,
          completedDate: task.completionDate ? task.completionDate.toISOString() : null,
          estimatedMinutes: task.estimatedMinutes,
          projectId: task.containingProject ? task.containingProject.id.primaryKey : null,
          projectName: task.containingProject ? task.containingProject.name : null,
          inInbox: task.inInbox,
          tags: task.tags.map(tag => ({
            id: tag.id.primaryKey,
            name: tag.name
          }))
        };
        
        exportData.tasks.push(taskData);
      } catch (taskError) {
        console.log(`处理任务出错: ${taskError}`);
      }
    });
    
    console.log(`成功处理 ${exportData.tasks.length} 个今天完成的任务`);
    console.log("=== 今天完成任务查询结束 ===");
    
    return JSON.stringify(exportData);
    
  } catch (error) {
    console.error(`今天完成任务查询错误: ${error}`);
    return JSON.stringify({
      success: false,
      error: `今天完成任务查询错误: ${error}`
    });
  }
})();