// 修复版本的 filter_tasks
(() => {
  try {
    // 获取参数
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};
    
    const filters = {
      taskStatus: args.taskStatus || null,
      perspective: args.perspective || "all", 
      flagged: args.flagged !== undefined ? args.flagged : null,
      
      // 完成日期过滤器
      completedToday: args.completedToday || false,
      completedYesterday: args.completedYesterday || false,
      completedThisWeek: args.completedThisWeek || false,
      completedThisMonth: args.completedThisMonth || false,
      completedBefore: args.completedBefore || null,
      completedAfter: args.completedAfter || null,
      
      // 其他过滤器
      projectFilter: args.projectFilter || null,
      searchText: args.searchText || null,
      limit: args.limit || 100,
      sortBy: args.sortBy || "name",
      sortOrder: args.sortOrder || "asc"
    };
    
    // 辅助函数
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
    
    function formatDate(date) {
      if (!date) return null;
      return date.toISOString();
    }
    
    function isToday(date) {
      if (!date) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const checkDate = new Date(date);
      return checkDate >= today && checkDate < tomorrow;
    }
    
    function isYesterday(date) {
      if (!date) return false;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date(yesterday);
      today.setDate(yesterday.getDate() + 1);
      const checkDate = new Date(date);
      return checkDate >= yesterday && checkDate < today;
    }
    
    // 获取所有任务
    const allTasks = flattenedTasks;
    
    // 判断是否需要包含完成的任务
    const wantsCompletedTasks = filters.completedToday || filters.completedYesterday || 
                               filters.completedThisWeek || filters.completedThisMonth || 
                               filters.completedBefore || filters.completedAfter;
    const includeCompletedByStatus = filters.taskStatus && 
      (filters.taskStatus.includes("Completed") || filters.taskStatus.includes("Dropped"));
    
    // 选择任务集
    let availableTasks;
    if (wantsCompletedTasks || includeCompletedByStatus) {
      availableTasks = allTasks;
    } else {
      availableTasks = allTasks.filter(task => 
        task.taskStatus !== Task.Status.Completed && 
        task.taskStatus !== Task.Status.Dropped
      );
    }
    
    // 应用透视过滤
    let baseTasks = [];
    switch (filters.perspective) {
      case "inbox":
        baseTasks = availableTasks.filter(task => task.inInbox);
        break;
      case "flagged":
        baseTasks = availableTasks.filter(task => task.flagged);
        break;
      default:
        baseTasks = availableTasks;
        break;
    }
    
    // 应用所有过滤器
    let filteredTasks = baseTasks.filter(task => {
      try {
        const taskStatus = getTaskStatus(task.taskStatus);
        
        // 完成任务逻辑
        if (wantsCompletedTasks) {
          // 只要完成任务
          if (taskStatus !== "Completed") {
            return false;
          }
        } else {
          // 排除完成任务（除非明确指定状态）
          if (!includeCompletedByStatus && (taskStatus === "Completed" || taskStatus === "Dropped")) {
            return false;
          }
        }
        
        // 状态过滤
        if (filters.taskStatus && filters.taskStatus.length > 0) {
          if (!filters.taskStatus.includes(taskStatus)) {
            return false;
          }
        }
        
        // 标记过滤
        if (filters.flagged !== null && task.flagged !== filters.flagged) {
          return false;
        }
        
        // 项目过滤
        if (filters.projectFilter) {
          const projectName = task.containingProject ? task.containingProject.name : '';
          if (!projectName.toLowerCase().includes(filters.projectFilter.toLowerCase())) {
            return false;
          }
        }
        
        // 搜索文本过滤
        if (filters.searchText) {
          const searchLower = filters.searchText.toLowerCase();
          const taskName = (task.name || '').toLowerCase();
          const taskNote = (task.note || '').toLowerCase();
          if (!taskName.includes(searchLower) && !taskNote.includes(searchLower)) {
            return false;
          }
        }
        
        // 完成日期过滤
        if (wantsCompletedTasks) {
          if (filters.completedToday && !isToday(task.completionDate)) {
            return false;
          }
          if (filters.completedYesterday && !isYesterday(task.completionDate)) {
            return false;
          }
          if (filters.completedBefore && task.completionDate && 
              new Date(task.completionDate) >= new Date(filters.completedBefore)) {
            return false;
          }
          if (filters.completedAfter && task.completionDate && 
              new Date(task.completionDate) <= new Date(filters.completedAfter)) {
            return false;
          }
        }
        
        return true;
      } catch (error) {
        return false;
      }
    });
    
    // 排序
    if (filters.sortBy === "completedDate") {
      filteredTasks.sort((a, b) => {
        const dateA = a.completionDate || new Date('1900-01-01');
        const dateB = b.completionDate || new Date('1900-01-01');
        return filters.sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
    } else {
      filteredTasks.sort((a, b) => {
        const valueA = a.name || '';
        const valueB = b.name || '';
        if (valueA < valueB) return filters.sortOrder === "desc" ? 1 : -1;
        if (valueA > valueB) return filters.sortOrder === "desc" ? -1 : 1;
        return 0;
      });
    }
    
    // 限制结果数量
    if (filters.limit && filteredTasks.length > filters.limit) {
      filteredTasks = filteredTasks.slice(0, filters.limit);
    }
    
    // 构建返回数据
    const exportData = {
      exportDate: new Date().toISOString(),
      tasks: [],
      totalCount: baseTasks.length,
      filteredCount: filteredTasks.length,
      sortedBy: filters.sortBy,
      sortOrder: filters.sortOrder
    };
    
    // 处理每个任务
    filteredTasks.forEach(task => {
      try {
        const taskData = {
          id: task.id.primaryKey,
          name: task.name,
          note: task.note || "",
          taskStatus: getTaskStatus(task.taskStatus),
          flagged: task.flagged,
          dueDate: formatDate(task.dueDate),
          deferDate: formatDate(task.deferDate),
          plannedDate: formatDate(task.plannedDate),
          completedDate: formatDate(task.completionDate),
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
        // 跳过处理错误的任务
      }
    });
    
    return JSON.stringify(exportData);
    
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `Error filtering tasks: ${error}`
    });
  }
})();