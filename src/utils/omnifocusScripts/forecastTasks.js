// OmniJS script to get forecast tasks from OmniFocus
(() => {
  try {
    // Helper function to get date without time for grouping
    function getDateKey(date) {
      if (!date) return null;
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
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
        
        // Due tasks take precedence unless deferred-only mode was requested.
        if (!includeDeferredOnly && task.dueDate) {
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
        if (!shouldInclude && task.deferDate) {
          const deferDate = new Date(task.deferDate);
          deferDate.setHours(0, 0, 0, 0);

          if (deferDate >= today && deferDate <= endDate) {
            shouldInclude = true;
            taskDate = deferDate;
            isDue = false;
          }
        }
        
        if (shouldInclude && taskDate) {
          const dateKey = getDateKey(taskDate);
          
          if (!exportData.tasksByDate[dateKey]) {
            exportData.tasksByDate[dateKey] = [];
          }
          
          const taskData = omnifocusMcpSerializeTask(task, injectedArgs || {}, hideCompleted);
          taskData.isDue = isDue;
          
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
