// 调试版本的 filter_tasks - 包含详细的执行跟踪
(() => {
  try {
    // 调试日志数组
    const debugLog = [];
    
    // 参数获取
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};
    debugLog.push(`参数注入: ${JSON.stringify(args)}`);
    
    const filters = {
      taskStatus: args.taskStatus || null,
      perspective: args.perspective || "all", 
      completedToday: args.completedToday || false,
      completedYesterday: args.completedYesterday || false,
      completedThisWeek: args.completedThisWeek || false,
      completedThisMonth: args.completedThisMonth || false,
      limit: args.limit || 100
    };
    
    debugLog.push(`过滤器配置: ${JSON.stringify(filters)}`);
    
    // 获取所有任务
    const allTasks = flattenedTasks;
    debugLog.push(`总任务数: ${allTasks.length}`);
    
    // 检查完成任务数量
    const completedTasksCount = allTasks.filter(task => task.taskStatus === Task.Status.Completed).length;
    debugLog.push(`完成任务数: ${completedTasksCount}`);
    
    // 判断是否需要包含完成的任务
    const wantsCompletedTasks = filters.completedToday || filters.completedYesterday || 
                               filters.completedThisWeek || filters.completedThisMonth;
    const includeCompletedByStatus = filters.taskStatus && 
      (filters.taskStatus.includes("Completed") || filters.taskStatus.includes("Dropped"));
    
    debugLog.push(`wantsCompletedTasks: ${wantsCompletedTasks}`);
    debugLog.push(`includeCompletedByStatus: ${includeCompletedByStatus}`);
    
    let availableTasks;
    if (wantsCompletedTasks || includeCompletedByStatus) {
      availableTasks = allTasks;
      debugLog.push(`使用所有任务: ${availableTasks.length}`);
    } else {
      availableTasks = allTasks.filter(task => 
        task.taskStatus !== Task.Status.Completed && 
        task.taskStatus !== Task.Status.Dropped
      );
      debugLog.push(`使用未完成任务: ${availableTasks.length}`);
    }
    
    // 检查 availableTasks 中的完成任务数量
    const availableCompletedCount = availableTasks.filter(task => task.taskStatus === Task.Status.Completed).length;
    debugLog.push(`availableTasks中的完成任务: ${availableCompletedCount}`);
    
    // 透视处理
    let baseTasks = [];
    debugLog.push(`透视模式: ${filters.perspective}`);
    
    switch (filters.perspective) {
      case "inbox":
        baseTasks = availableTasks.filter(task => task.inInbox);
        debugLog.push(`收件箱任务: ${baseTasks.length}`);
        break;
      case "flagged":
        baseTasks = availableTasks.filter(task => task.flagged);
        debugLog.push(`已标记任务: ${baseTasks.length}`);
        break;
      default:
        baseTasks = availableTasks;
        debugLog.push(`默认透视任务: ${baseTasks.length}`);
        break;
    }
    
    // 检查 baseTasks 中的完成任务数量
    const baseCompletedCount = baseTasks.filter(task => task.taskStatus === Task.Status.Completed).length;
    debugLog.push(`baseTasks中的完成任务: ${baseCompletedCount}`);
    
    // 状态映射函数
    function getTaskStatus(status) {
      const taskStatusMap = {
        [Task.Status.Available]: "Available",
        [Task.Status.Blocked]: "Blocked",
        [Task.Status.Completed]: "Completed", 
        [Task.Status.Dropped]: "Dropped",
        [Task.Status.DueSoon]: "DueSoon",
        [Task.Status.Next]: "Next",
        [Task.Status.Overdue]: "Overdue"
      };
      return taskStatusMap[status] || "Unknown";
    }
    
    // 过滤逻辑
    let passedTasksCount = 0;
    let filteredTasks = baseTasks.filter(task => {
      try {
        const taskStatus = getTaskStatus(task.taskStatus);
        
        // 重复判断逻辑（在过滤函数内部）
        const wantsCompletedTasksLocal = filters.completedToday || filters.completedYesterday || 
                                       filters.completedThisWeek || filters.completedThisMonth;
        const includeCompletedByStatusLocal = filters.taskStatus && 
          (filters.taskStatus.includes("Completed") || filters.taskStatus.includes("Dropped"));
        
        // 状态过滤
        if (wantsCompletedTasksLocal) {
          if (taskStatus !== "Completed") {
            return false;
          }
        } else {
          if (!includeCompletedByStatusLocal && (taskStatus === "Completed" || taskStatus === "Dropped")) {
            return false;
          }
        }
        
        // 状态匹配过滤
        if (filters.taskStatus && filters.taskStatus.length > 0) {
          if (!filters.taskStatus.includes(taskStatus)) {
            return false;
          }
        }
        
        // 日期过滤
        if (filters.completedYesterday && wantsCompletedTasksLocal) {
          if (!task.completionDate) {
            return false;
          }
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const today = new Date(yesterday);
          today.setDate(yesterday.getDate() + 1);
          const completedDate = new Date(task.completionDate);
          
          if (!(completedDate >= yesterday && completedDate < today)) {
            return false;
          }
        }
        
        passedTasksCount++;
        return true;
      } catch (error) {
        debugLog.push(`过滤任务错误: ${error}`);
        return false;
      }
    });
    
    debugLog.push(`过滤后任务数: ${filteredTasks.length}`);
    debugLog.push(`通过过滤的任务数: ${passedTasksCount}`);
    
    // 限制结果数量
    if (filters.limit && filteredTasks.length > filters.limit) {
      filteredTasks = filteredTasks.slice(0, filters.limit);
      debugLog.push(`限制到: ${filteredTasks.length} 个任务`);
    }
    
    // 构建返回数据
    const exportData = {
      exportDate: new Date().toISOString(),
      tasks: [],
      totalCount: baseTasks.length,
      filteredCount: filteredTasks.length,
      debugLog: debugLog,
      debug: {
        allTasksCount: allTasks.length,
        completedTasksCount: completedTasksCount,
        availableTasksCount: availableTasks.length,
        availableCompletedCount: availableCompletedCount,
        baseTasksCount: baseTasks.length,
        baseCompletedCount: baseCompletedCount,
        wantsCompletedTasks: wantsCompletedTasks,
        includeCompletedByStatus: includeCompletedByStatus,
        filters: filters
      }
    };
    
    // 处理任务数据
    filteredTasks.forEach(task => {
      try {
        const taskData = {
          id: task.id.primaryKey,
          name: task.name,
          taskStatus: getTaskStatus(task.taskStatus),
          completedDate: task.completionDate ? task.completionDate.toISOString() : null,
          projectName: task.containingProject ? task.containingProject.name : null
        };
        exportData.tasks.push(taskData);
      } catch (taskError) {
        debugLog.push(`处理任务错误: ${taskError}`);
      }
    });
    
    return JSON.stringify(exportData);
    
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `调试脚本错误: ${error}`,
      debugLog: [`脚本执行错误: ${error}`]
    });
  }
})();