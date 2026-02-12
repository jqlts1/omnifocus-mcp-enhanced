// OmniJS script to get forecast tasks from OmniFocus
(() => {
  try {
    // Use default values since parameters are not easily available in JXA mode
    const days = 7;
    const hideCompleted = true; // Default to true
    const includeDeferredOnly = false;
    
    // Helper function to format dates consistently
    function formatDate(date) {
      if (!date) return null;
      return date.toISOString();
    }
    
    // Helper function to get date without time for grouping
    function getDateKey(date) {
      if (!date) return null;
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split('T')[0];
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
      tasksByDate: {}
    };
    
    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);
    
    console.log(`Looking for forecast tasks from ${today.toISOString()} to ${endDate.toISOString()}`);
    
    // Get all active tasks
    let allTasks = flattenedTasks;
    
    // Filter by completion status if needed
    if (hideCompleted) {
      allTasks = allTasks.filter(task => 
        task.taskStatus !== Task.Status.Completed && 
        task.taskStatus !== Task.Status.Dropped
      );
    }
    
    console.log(`Processing ${allTasks.length} active tasks for forecast`);
    
    // Process each task to see if it falls in forecast range
    allTasks.forEach(task => {
      try {
        let shouldInclude = false;
        let taskDate = null;
        let isDue = false;
        
        // Check if task has due date in range
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDate >= today && dueDate <= endDate) {
            shouldInclude = true;
            taskDate = dueDate;
            isDue = true;
          }
          // Also include overdue tasks
          else if (dueDate < today) {
            shouldInclude = true;
            taskDate = dueDate;
            isDue = true;
          }
        }
        
        // Check if task has defer date in range (becomes available)
        if (!includeDeferredOnly || !shouldInclude) {
          if (task.deferDate && !isDue) {
            const deferDate = new Date(task.deferDate);
            deferDate.setHours(0, 0, 0, 0);
            
            if (deferDate >= today && deferDate <= endDate) {
              shouldInclude = true;
              taskDate = deferDate;
              isDue = false;
            }
          }
        }
        
        if (shouldInclude && taskDate) {
          const dateKey = getDateKey(taskDate);
          
          if (!exportData.tasksByDate[dateKey]) {
            exportData.tasksByDate[dateKey] = [];
          }
          
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
            projectId: task.containingProject ? task.containingProject.id.primaryKey : null,
            projectName: task.containingProject ? task.containingProject.name : null,
            inInbox: task.inInbox,
            isDue: isDue, // Whether this is due or just becoming available
            tags: task.tags.map(tag => ({
              id: tag.id.primaryKey,
              name: tag.name
            }))
          };
          
          exportData.tasksByDate[dateKey].push(taskData);
        }
      } catch (taskError) {
        console.log(`Error processing forecast task: ${taskError}`);
      }
    });
    
    // Count total tasks
    const totalTasks = Object.values(exportData.tasksByDate).reduce((sum, tasks) => sum + tasks.length, 0);
    console.log(`Successfully processed ${totalTasks} forecast tasks across ${Object.keys(exportData.tasksByDate).length} dates`);
    
    return JSON.stringify(exportData);
    
  } catch (error) {
    console.error(`Error in forecastTasks script: ${error}`);
    return JSON.stringify({
      success: false,
      error: `Error getting forecast tasks: ${error}`
    });
  }
})();