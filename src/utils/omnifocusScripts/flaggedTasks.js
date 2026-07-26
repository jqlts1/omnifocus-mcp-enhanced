// OmniJS script to get flagged tasks from OmniFocus
(() => {
  try {
    const projectFilter = injectedArgs.projectFilter || null;
    
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
        const taskData = omnifocusMcpSerializeTask(task, injectedArgs || {}, hideCompleted);
        
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
