// Simplified version of filter_tasks - used for testing and debugging
(() => {
  try {
    // Get injected arguments
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};

    // Simplified filter configuration
    const filters = {
      completedToday: args.completedToday || false,
      completedThisWeek: args.completedThisWeek || false,
      taskStatus: args.taskStatus || null,
      limit: args.limit || 10
    };

    console.log("=== Simplified filter_tasks starting ===");
    console.log("Filter config:", JSON.stringify(filters));

    // Get all tasks
    const allTasks = flattenedTasks;
    console.log(`Total task count: ${allTasks.length}`);

    // Determine whether completed tasks are needed
    const wantsCompleted = filters.completedToday || filters.completedThisWeek ||
                          (filters.taskStatus && filters.taskStatus.includes("Completed"));

    let targetTasks;
    if (wantsCompleted) {
      // Use all tasks (including completed)
      targetTasks = allTasks;
      console.log(`Need completed tasks, using all tasks: ${targetTasks.length}`);
    } else {
      // Use only incomplete tasks
      targetTasks = allTasks.filter(task =>
        task.taskStatus !== Task.Status.Completed &&
        task.taskStatus !== Task.Status.Dropped
      );
      console.log(`Need incomplete tasks, after filtering: ${targetTasks.length}`);
    }

    // Basic status filter
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
      console.log(`After status filter: ${filteredTasks.length}`);
    }

    // Date filter
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
      console.log(`After completed-today filter: ${filteredTasks.length}`);
    }

    // Limit result count
    if (filters.limit && filteredTasks.length > filters.limit) {
      filteredTasks = filteredTasks.slice(0, filters.limit);
    }

    console.log(`Final result: ${filteredTasks.length} tasks`);

    // Build return data
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

    // Process each task
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
          plannedDate: task.plannedDate ? task.plannedDate.toISOString() : null,
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
        console.log(`Error processing task: ${taskError}`);
      }
    });

    console.log("=== Simplified filter_tasks complete ===");
    return JSON.stringify(exportData);

  } catch (error) {
    console.error(`Simplified filter_tasks error: ${error}`);
    return JSON.stringify({
      success: false,
      error: `Simplified filter_tasks error: ${error}`
    });
  }
})();
