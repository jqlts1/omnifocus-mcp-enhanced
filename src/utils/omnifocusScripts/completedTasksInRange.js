// Query completed tasks within a date range
(() => {
  try {
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};
    const daysBack = args.daysBack || 7;
    const limit = args.limit || 50;

    const allTasks = flattenedTasks;

    // Filter completed tasks
    const completedTasks = allTasks.filter(task =>
      task.taskStatus === Task.Status.Completed
    );

    // Date range: from (today - daysBack) to now
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    // Filter by completion date range
    const rangeCompletedTasks = completedTasks.filter(task => {
      if (!task.completionDate) return false;
      const completedDate = new Date(task.completionDate);
      return completedDate >= startDate && completedDate <= endDate;
    });

    // Sort by completion date descending (most recent first)
    rangeCompletedTasks.sort((a, b) => {
      const dateA = a.completionDate ? new Date(a.completionDate).getTime() : 0;
      const dateB = b.completionDate ? new Date(b.completionDate).getTime() : 0;
      return dateB - dateA;
    });

    const statusMap = {
      [Task.Status.Available]: "Available",
      [Task.Status.Blocked]: "Blocked",
      [Task.Status.Completed]: "Completed",
      [Task.Status.Dropped]: "Dropped",
      [Task.Status.DueSoon]: "DueSoon",
      [Task.Status.Next]: "Next",
      [Task.Status.Overdue]: "Overdue"
    };

    const exportData = {
      exportDate: new Date().toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysBack: daysBack,
      totalCompleted: rangeCompletedTasks.length,
      tasks: []
    };

    const tasksToProcess = rangeCompletedTasks.slice(0, limit);

    tasksToProcess.forEach(task => {
      try {
        exportData.tasks.push({
          id: task.id.primaryKey,
          name: task.name,
          note: task.note || "",
          flagged: task.flagged,
          completedDate: task.completionDate ? task.completionDate.toISOString() : null,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          estimatedMinutes: task.estimatedMinutes,
          projectId: task.containingProject ? task.containingProject.id.primaryKey : null,
          projectName: task.containingProject ? task.containingProject.name : null,
          inInbox: task.inInbox,
          tags: task.tags.map(tag => ({
            id: tag.id.primaryKey,
            name: tag.name
          }))
        });
      } catch (taskError) {
        // Skip individual task errors
      }
    });

    return JSON.stringify(exportData);

  } catch (error) {
    return JSON.stringify({
      error: "Completed tasks range query error: " + error
    });
  }
})();
