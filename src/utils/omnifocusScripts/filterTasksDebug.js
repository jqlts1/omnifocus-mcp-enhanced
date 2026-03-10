// Debug version of filter_tasks - includes detailed execution tracing
(() => {
  try {
    // Debug log array
    const debugLog = [];

    // Get injected arguments
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};
    debugLog.push(`Args injected: ${JSON.stringify(args)}`);

    const filters = {
      taskStatus: args.taskStatus || null,
      perspective: args.perspective || "all",
      completedToday: args.completedToday || false,
      completedYesterday: args.completedYesterday || false,
      completedThisWeek: args.completedThisWeek || false,
      completedThisMonth: args.completedThisMonth || false,
      limit: args.limit || 100
    };

    debugLog.push(`Filter config: ${JSON.stringify(filters)}`);

    // Get all tasks
    const allTasks = flattenedTasks;
    debugLog.push(`Total task count: ${allTasks.length}`);

    // Count completed tasks
    const completedTasksCount = allTasks.filter(task => task.taskStatus === Task.Status.Completed).length;
    debugLog.push(`Completed task count: ${completedTasksCount}`);

    // Determine whether completed tasks are needed
    const wantsCompletedTasks = filters.completedToday || filters.completedYesterday ||
                               filters.completedThisWeek || filters.completedThisMonth;
    const includeCompletedByStatus = filters.taskStatus &&
      (filters.taskStatus.includes("Completed") || filters.taskStatus.includes("Dropped"));

    debugLog.push(`wantsCompletedTasks: ${wantsCompletedTasks}`);
    debugLog.push(`includeCompletedByStatus: ${includeCompletedByStatus}`);

    let availableTasks;
    if (wantsCompletedTasks || includeCompletedByStatus) {
      availableTasks = allTasks;
      debugLog.push(`Using all tasks: ${availableTasks.length}`);
    } else {
      availableTasks = allTasks.filter(task =>
        task.taskStatus !== Task.Status.Completed &&
        task.taskStatus !== Task.Status.Dropped
      );
      debugLog.push(`Using incomplete tasks: ${availableTasks.length}`);
    }

    // Count completed tasks in availableTasks
    const availableCompletedCount = availableTasks.filter(task => task.taskStatus === Task.Status.Completed).length;
    debugLog.push(`Completed tasks in availableTasks: ${availableCompletedCount}`);

    // Perspective handling
    let baseTasks = [];
    debugLog.push(`Perspective mode: ${filters.perspective}`);

    switch (filters.perspective) {
      case "inbox":
        baseTasks = availableTasks.filter(task => task.inInbox);
        debugLog.push(`Inbox tasks: ${baseTasks.length}`);
        break;
      case "flagged":
        baseTasks = availableTasks.filter(task => task.flagged);
        debugLog.push(`Flagged tasks: ${baseTasks.length}`);
        break;
      default:
        baseTasks = availableTasks;
        debugLog.push(`Default perspective tasks: ${baseTasks.length}`);
        break;
    }

    // Count completed tasks in baseTasks
    const baseCompletedCount = baseTasks.filter(task => task.taskStatus === Task.Status.Completed).length;
    debugLog.push(`Completed tasks in baseTasks: ${baseCompletedCount}`);

    // Status mapping function
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

    // Filter logic
    let passedTasksCount = 0;
    let filteredTasks = baseTasks.filter(task => {
      try {
        const taskStatus = getTaskStatus(task.taskStatus);

        // Repeat the completed-task logic inside the filter function
        const wantsCompletedTasksLocal = filters.completedToday || filters.completedYesterday ||
                                       filters.completedThisWeek || filters.completedThisMonth;
        const includeCompletedByStatusLocal = filters.taskStatus &&
          (filters.taskStatus.includes("Completed") || filters.taskStatus.includes("Dropped"));

        // Status filter
        if (wantsCompletedTasksLocal) {
          if (taskStatus !== "Completed") {
            return false;
          }
        } else {
          if (!includeCompletedByStatusLocal && (taskStatus === "Completed" || taskStatus === "Dropped")) {
            return false;
          }
        }

        // Status match filter
        if (filters.taskStatus && filters.taskStatus.length > 0) {
          if (!filters.taskStatus.includes(taskStatus)) {
            return false;
          }
        }

        // Date filter
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
        debugLog.push(`Filter task error: ${error}`);
        return false;
      }
    });

    debugLog.push(`Tasks after filtering: ${filteredTasks.length}`);
    debugLog.push(`Tasks that passed filter: ${passedTasksCount}`);

    // Limit result count
    if (filters.limit && filteredTasks.length > filters.limit) {
      filteredTasks = filteredTasks.slice(0, filters.limit);
      debugLog.push(`Limited to: ${filteredTasks.length} tasks`);
    }

    // Build return data
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

    // Process task data
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
        debugLog.push(`Task processing error: ${taskError}`);
      }
    });

    return JSON.stringify(exportData);

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `Debug script error: ${error}`,
      debugLog: [`Script execution error: ${error}`]
    });
  }
})();
