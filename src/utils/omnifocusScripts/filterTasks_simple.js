// 简化版的filter_tasks - 专门用于测试和修复
(() => {
  try {
    // 获取参数
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};
    
    // 简化的过滤器配置
    const filters = {
      completedToday: args.completedToday || false,
      completedThisWeek: args.completedThisWeek || false,
      taskStatus: args.taskStatus || null,
      limit: args.limit || 10
    };
    
    console.log("=== 简化版 filter_tasks 开始 ===");
    console.log("过滤器配置:", JSON.stringify(filters));
    
    // 获取所有任务
    const allTasks = flattenedTasks;
    console.log(`总任务数: ${allTasks.length}`);
    
    // 判断是否需要完成任务
    const wantsCompleted = filters.completedToday || filters.completedThisWeek || 
                          (filters.taskStatus && filters.taskStatus.includes("Completed"));
    
    let targetTasks;
    if (wantsCompleted) {
      // 获取所有任务（包括完成的）
      targetTasks = allTasks;
      console.log(`需要完成任务，使用全部任务: ${targetTasks.length}`);
    } else {
      // 只获取未完成任务
      targetTasks = allTasks.filter(task => 
        task.taskStatus !== Task.Status.Completed && 
        task.taskStatus !== Task.Status.Dropped
      );
      console.log(`需要未完成任务，过滤后: ${targetTasks.length}`);
    }
    
    // 基本状态过滤
    let filteredTasks = targetTasks;
    
    if (filters.taskStatus) {
      const statusMap = {
        [Task.Status.Available]: "Available",
        [Task.Status.Blocked]: "Blocked",
        [Task.Status.Completed]: "Completed", 
        [Task.Status.Dropped]: "Dropped",
        [Task.Status.DueSoon]: "DueSoon",
        [Task.Status.Next]: "Next",
        [Task.Status.Overdue]: "Overdue"
      };
      
      filteredTasks = filteredTasks.filter(task => {
        const taskStatus = statusMap[task.taskStatus] || "Unknown";
        return filters.taskStatus.includes(taskStatus);
      });
      console.log(`状态过滤后: ${filteredTasks.length}`);
    }
    
    // 日期过滤
    if (filters.completedToday && wantsCompleted) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      filteredTasks = filteredTasks.filter(task => {
        if (!task.completionDate) return false;
        const completedDate = new Date(task.completionDate);
        return completedDate >= today && completedDate < tomorrow;
      });
      console.log(`今天完成过滤后: ${filteredTasks.length}`);
    }
    
    // 限制结果数量
    if (filters.limit && filteredTasks.length > filters.limit) {
      filteredTasks = filteredTasks.slice(0, filters.limit);
    }
    
    console.log(`最终结果: ${filteredTasks.length} 个任务`);
    
    // 构建返回数据
    const exportData = {
      exportDate: new Date().toISOString(),
      tasks: [],
      totalCount: targetTasks.length,
      filteredCount: filteredTasks.length,
      debug: {
        totalTasks: allTasks.length,
        wantsCompleted,
        filters
      }
    };
    
    // 处理每个任务
    filteredTasks.forEach(task => {
      try {
        const statusMap = {
          [Task.Status.Available]: "Available",
          [Task.Status.Blocked]: "Blocked",
          [Task.Status.Completed]: "Completed", 
          [Task.Status.Dropped]: "Dropped",
          [Task.Status.DueSoon]: "DueSoon",
          [Task.Status.Next]: "Next",
          [Task.Status.Overdue]: "Overdue"
        };
        
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
    
    console.log("=== 简化版 filter_tasks 结束 ===");
    return JSON.stringify(exportData);
    
  } catch (error) {
    console.error(`简化版 filter_tasks 错误: ${error}`);
    return JSON.stringify({
      success: false,
      error: `简化版过滤任务出错: ${error}`
    });
  }
})();