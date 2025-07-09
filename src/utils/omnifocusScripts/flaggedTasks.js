// OmniJS script to get flagged tasks from OmniFocus
(() => {
  try {
    // Use default values since parameters are not easily available in JXA mode
    const hideCompleted = true; // Default to true
    const projectFilter = null;
    
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
    
    // Get all flagged tasks using flattenedTasks with flagged filter
    let flaggedTasks = flattenedTasks.filter(task => task.flagged);
    console.log(`Found ${flaggedTasks.length} total flagged tasks`);
    
    // Filter by completion status if needed
    if (hideCompleted) {
      flaggedTasks = flaggedTasks.filter(task => 
        task.taskStatus !== Task.Status.Completed && 
        task.taskStatus !== Task.Status.Dropped
      );
    }
    
    // Filter by project if specified
    if (projectFilter) {
      flaggedTasks = flaggedTasks.filter(task => {
        const projectName = task.containingProject ? task.containingProject.name : '';
        return projectName.toLowerCase().includes(projectFilter.toLowerCase());
      });
    }
    
    console.log(`Processing ${flaggedTasks.length} flagged tasks after filtering`);
    
    // Process each flagged task
    flaggedTasks.forEach(task => {
      try {
        const taskData = {
          id: task.id.primaryKey,
          name: task.name,
          note: task.note || "",
          taskStatus: getTaskStatus(task.taskStatus),
          flagged: task.flagged, // Should always be true for flagged tasks
          dueDate: formatDate(task.dueDate),
          deferDate: formatDate(task.deferDate),
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
        console.log(`Error processing flagged task: ${taskError}`);
      }
    });
    
    console.log(`Successfully processed ${exportData.tasks.length} flagged tasks`);
    return JSON.stringify(exportData);
    
  } catch (error) {
    console.error(`Error in flaggedTasks script: ${error}`);
    return JSON.stringify({
      success: false,
      error: `Error getting flagged tasks: ${error}`
    });
  }
})();