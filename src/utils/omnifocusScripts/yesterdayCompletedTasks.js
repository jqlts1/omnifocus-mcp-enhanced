// Simplified script to retrieve tasks completed yesterday
(() => {
  try {
    // Get arguments if available
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};
    const limit = args.limit || 20;

    console.log("=== Yesterday's completed tasks query starting ===");

    // Get all tasks
    const allTasks = flattenedTasks;
    console.log(`Total task count: ${allTasks.length}`);

    // Filter completed tasks
    const completedTasks = allTasks.filter(task =>
      task.taskStatus === Task.Status.Completed
    );
    console.log(`Completed task count: ${completedTasks.length}`);

    // Date range for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // Go back one day
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date(yesterday);
    today.setDate(yesterday.getDate() + 1);

    console.log(`Yesterday's range: ${yesterday.toISOString()} to ${today.toISOString()}`);

    // Filter tasks completed yesterday
    const yesterdayCompletedTasks = completedTasks.filter(task => {
      if (!task.completionDate) return false;

      const completedDate = new Date(task.completionDate);
      return completedDate >= yesterday && completedDate < today;
    });

    console.log(`Tasks completed yesterday: ${yesterdayCompletedTasks.length}`);

    // Task status mapping
    const statusMap = {
      [Task.Status.Available]: "Available",
      [Task.Status.Blocked]: "Blocked",
      [Task.Status.Completed]: "Completed",
      [Task.Status.Dropped]: "Dropped",
      [Task.Status.DueSoon]: "DueSoon",
      [Task.Status.Next]: "Next",
      [Task.Status.Overdue]: "Overdue"
    };

    // Build export data
    const exportData = {
      exportDate: new Date().toISOString(),
      tasks: [],
      totalCount: completedTasks.length,
      filteredCount: yesterdayCompletedTasks.length,
      query: "Tasks completed yesterday"
    };

    // Process each task completed yesterday
    const tasksToProcess = yesterdayCompletedTasks.slice(0, limit);

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

    console.log(`Successfully processed ${exportData.tasks.length} tasks completed yesterday`);
    console.log("=== Yesterday's completed tasks query complete ===");

    return JSON.stringify(exportData);

  } catch (error) {
    console.error(`Yesterday's completed tasks query error: ${error}`);
    return JSON.stringify({
      success: false,
      error: `Yesterday's completed tasks query error: ${error}`
    });
  }
})();
