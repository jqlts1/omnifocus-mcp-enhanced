// OmniJS script to get inbox tasks from OmniFocus
(() => {
  try {
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
        const taskData = omnifocusMcpSerializeTask(task, injectedArgs || {}, hideCompleted);
        
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
