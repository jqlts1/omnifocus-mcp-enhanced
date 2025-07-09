// Get Tasks from Custom Perspective in OmniFocus using OmniJS
(() => {
  try {
    // Use default values - these will be replaced by parameter injection
    let perspectiveName = null;
    let perspectiveId = null;
    let hideCompleted = true;
    let limit = 100;
    
    console.log(`Getting tasks from custom perspective: ${perspectiveName || perspectiveId || "unknown"}`);
    
    // Use OmniJS document access
    const doc = Document.makeDefault();
    
    // Unfortunately, OmniFocus perspectives are not directly accessible via OmniJS
    // This is a known limitation of the OmniJS API
    // We'll provide a helpful fallback that simulates perspective behavior
    
    console.log("⚠️ Custom perspective access is limited in OmniJS API");
    
    // Fallback: Return common perspective-like task groups with explanation
    const tasks = [];
    const flattenedTasks = doc.flattenedTasks;
    
    // Helper functions
    function formatDate(date) {
      if (!date) return null;
      return date.toISOString();
    }
    
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
    
    // Instead of true perspective access, provide common task groups
    // This demonstrates what would be available with proper API access
    
    flattenedTasks.forEach(task => {
      try {
        const taskStatus = getTaskStatus(task.taskStatus);
        
        // Skip completed/dropped tasks if hideCompleted is true
        if (hideCompleted && (taskStatus === "Completed" || taskStatus === "Dropped")) {
          return;
        }
        
        const taskData = {
          id: task.id.primaryKey,
          name: task.name,
          note: task.note || "",
          taskStatus: taskStatus,
          flagged: task.flagged,
          dueDate: formatDate(task.dueDate),
          deferDate: formatDate(task.deferDate),
          completedDate: formatDate(task.completionDate),
          estimatedMinutes: task.estimatedMinutes,
          projectId: task.containingProject ? task.containingProject.id.primaryKey : null,
          projectName: task.containingProject ? task.containingProject.name : null,
          inInbox: task.inInbox,
          tags: task.tags.map(tag => ({
            id: tag.id.primaryKey,
            name: tag.name
          }))
        };
        
        // Simple filtering to simulate perspective behavior
        // In a real perspective, this would be much more sophisticated
        let shouldInclude = false;
        
        // Simulate common perspective patterns
        if (perspectiveName) {
          const lowerPerspectiveName = perspectiveName.toLowerCase();
          
          if (lowerPerspectiveName.includes("今日") || lowerPerspectiveName.includes("today")) {
            // Today perspective: due today or available flagged tasks
            const today = new Date();
            const dueToday = task.dueDate && 
              new Date(task.dueDate).toDateString() === today.toDateString();
            shouldInclude = dueToday || (task.flagged && taskStatus === "Available");
          } 
          else if (lowerPerspectiveName.includes("工作") || lowerPerspectiveName.includes("work")) {
            // Work perspective: available tasks with estimates or in work projects
            shouldInclude = taskStatus === "Available" && 
              (task.estimatedMinutes > 0 || 
               (task.containingProject && task.containingProject.name.includes("工作")));
          }
          else if (lowerPerspectiveName.includes("重点") || lowerPerspectiveName.includes("重要")) {
            // Important perspective: flagged available tasks
            shouldInclude = task.flagged && taskStatus === "Available";
          }
          else {
            // Generic perspective: just show available tasks
            shouldInclude = taskStatus === "Available";
          }
        } else {
          // No specific perspective name, show available tasks
          shouldInclude = taskStatus === "Available";
        }
        
        if (shouldInclude) {
          tasks.push(taskData);
        }
        
        // Apply limit
        if (tasks.length >= limit) {
          return false; // break
        }
        
      } catch (taskError) {
        console.log(`Error processing task: ${taskError}`);
      }
    });
    
    const result = {
      success: true,
      perspectiveName: perspectiveName || "Simulated Perspective",
      perspectiveId: perspectiveId || null,
      isSimulated: true,
      tasks: tasks,
      taskCount: tasks.length,
      apiLimitation: true,
      note: "⚠️ OmniFocus perspectives are not directly accessible via OmniJS API. This is a simulated perspective based on common task patterns. For true custom perspectives, use the OmniFocus app directly and consider using filter_tasks for advanced filtering."
    };
    
    console.log(`Simulated ${tasks.length} tasks for perspective: ${perspectiveName || perspectiveId || "unknown"}`);
    
    return JSON.stringify(result);
    
  } catch (error) {
    console.error(`Error in customPerspective script: ${error}`);
    return JSON.stringify({
      success: false,
      error: `Error getting perspective tasks: ${error}`,
      apiLimitation: true,
      suggestion: "Consider using the built-in perspective tools (get_inbox_tasks, get_flagged_tasks, get_forecast_tasks) or filter_tasks for advanced task filtering."
    });
  }
})();