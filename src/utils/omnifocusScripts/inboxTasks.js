// OmniJS script to get inbox tasks from OmniFocus
(() => {
  try {
    // Use default values since parameters are not easily available in JXA mode
    const hideCompleted = true; // Default to true
    
    // Helper function to format dates consistently
    function formatDate(date) {
      if (!date) return null;
      return date.toISOString();
    }
    
    // Get task status enum mapping
    const taskStatusMap = {
      [Task.Status.Available]: "Available",
      [Task.Status.Blocked]: "Blocked", 
      [Task.Status.Completed]: "Completed",
      [Task.Status.Dropped]: "Dropped",
      [Task.Status.DueSoon]: "DueSoon",
      [Task.Status.Next]: "Next",
      [Task.Status.Overdue]: "Overdue"
    };
    
    function getTaskStatus(status) {
      return taskStatusMap[status] || "Unknown";
    }
    
    const exportData = {
      exportDate: new Date().toISOString(),
      tasks: []
    };
    
    // Get all tasks and filter for inbox tasks
    const allTasks = flattenedTasks;
    console.log(`Found ${allTasks.length} total tasks`);
    
    // Filter for inbox tasks (tasks that are in inbox)
    const inboxTasks = allTasks.filter(task => task.inInbox);
    console.log(`Found ${inboxTasks.length} inbox tasks`);
    
    // Filter tasks based on completion status
    let filteredTasks = inboxTasks;
    if (hideCompleted) {
      filteredTasks = inboxTasks.filter(task => 
        task.taskStatus !== Task.Status.Completed && 
        task.taskStatus !== Task.Status.Dropped
      );
    }
    
    console.log(`Processing ${filteredTasks.length} inbox tasks after filtering`);
    
    // Process each inbox task
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
          estimatedMinutes: task.estimatedMinutes,
          tags: task.tags.map(tag => ({
            id: tag.id.primaryKey,
            name: tag.name
          })),
          inInbox: true // All these tasks are in inbox by definition
        };
        
        exportData.tasks.push(taskData);
      } catch (taskError) {
        console.log(`Error processing inbox task: ${taskError}`);
      }
    });
    
    console.log(`Successfully processed ${exportData.tasks.length} inbox tasks`);
    return JSON.stringify(exportData);
    
  } catch (error) {
    console.error(`Error in inboxTasks script: ${error}`);
    return JSON.stringify({
      success: false,
      error: `Error getting inbox tasks: ${error}`
    });
  }
})();