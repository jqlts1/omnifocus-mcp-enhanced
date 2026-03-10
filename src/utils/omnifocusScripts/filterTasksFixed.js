// Fixed version of filter_tasks
(() => {
  try {
    // Get injected arguments
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};

    const filters = {
      taskStatus: args.taskStatus || null,
      perspective: args.perspective || "all",
      flagged: args.flagged !== undefined ? args.flagged : null,

      // Completion date filters
      completedToday: args.completedToday || false,
      completedYesterday: args.completedYesterday || false,
      completedThisWeek: args.completedThisWeek || false,
      completedThisMonth: args.completedThisMonth || false,
      completedBefore: args.completedBefore || null,
      completedAfter: args.completedAfter || null,

      // Other filters
      projectFilter: args.projectFilter || null,
      searchText: args.searchText || null,
      limit: args.limit || 100,
      sortBy: args.sortBy || "name",
      sortOrder: args.sortOrder || "asc"
    };

    // Helper functions
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

    // Get all tasks
    const allTasks = flattenedTasks;

    // Determine whether completed tasks are needed
    const wantsCompletedTasks = filters.completedToday || filters.completedYesterday ||
                               filters.completedThisWeek || filters.completedThisMonth ||
                               filters.completedBefore || filters.completedAfter;
    const includeCompletedByStatus = filters.taskStatus &&
      (filters.taskStatus.includes("Completed") || filters.taskStatus.includes("Dropped"));

    // Select the task set
    let availableTasks;
    if (wantsCompletedTasks || includeCompletedByStatus) {
      availableTasks = allTasks;
    } else {
      availableTasks = allTasks.filter(task =>
        task.taskStatus !== Task.Status.Completed &&
        task.taskStatus !== Task.Status.Dropped
      );
    }

    // Apply perspective filter
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

    // Apply all filters
    let filteredTasks = baseTasks.filter(task => {
      try {
        const taskStatus = getTaskStatus(task.taskStatus);

        // Completed task logic
        if (wantsCompletedTasks) {
          // Only include completed tasks
          if (taskStatus !== "Completed") {
            return false;
          }
        } else {
          // Exclude completed tasks (unless status explicitly requested)
          if (!includeCompletedByStatus && (taskStatus === "Completed" || taskStatus === "Dropped")) {
            return false;
          }
        }

        // Status filter
        if (filters.taskStatus && filters.taskStatus.length > 0) {
          if (!filters.taskStatus.includes(taskStatus)) {
            return false;
          }
        }

        // Flagged filter
        if (filters.flagged !== null && task.flagged !== filters.flagged) {
          return false;
        }

        // Project filter
        if (filters.projectFilter) {
          const projectName = task.containingProject ? task.containingProject.name : '';
          if (!projectName.toLowerCase().includes(filters.projectFilter.toLowerCase())) {
            return false;
          }
        }

        // Search text filter
        if (filters.searchText) {
          const searchLower = filters.searchText.toLowerCase();
          const taskName = (task.name || '').toLowerCase();
          const taskNote = (task.note || '').toLowerCase();
          if (!taskName.includes(searchLower) && !taskNote.includes(searchLower)) {
            return false;
          }
        }

        // Completion date filter
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

    // Sort results
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

    // Limit result count
    if (filters.limit && filteredTasks.length > filters.limit) {
      filteredTasks = filteredTasks.slice(0, filters.limit);
    }

    // Build return data
    const exportData = {
      exportDate: new Date().toISOString(),
      tasks: [],
      totalCount: baseTasks.length,
      filteredCount: filteredTasks.length,
      sortedBy: filters.sortBy,
      sortOrder: filters.sortOrder
    };

    // Process each task
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
        // Skip tasks that fail to process
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
