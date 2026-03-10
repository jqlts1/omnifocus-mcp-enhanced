// Script to test completed task retrieval
(() => {
  try {
    console.log("=== Completed tasks test script starting ===");

    // Get all tasks
    const allTasks = flattenedTasks;
    console.log(`Total task count: ${allTasks.length}`);

    // Filter completed tasks
    const completedTasks = allTasks.filter(task =>
      task.taskStatus === Task.Status.Completed
    );
    console.log(`Completed task count: ${completedTasks.length}`);

    // Date range for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    console.log(`Today starts: ${today.toISOString()}`);
    console.log(`Tomorrow starts: ${tomorrow.toISOString()}`);

    // Filter tasks completed today
    const todayCompletedTasks = completedTasks.filter(task => {
      if (!task.completionDate) {
        console.log(`Task "${task.name}" has no completion date`);
        return false;
      }

      const completedDate = new Date(task.completionDate);
      const isToday = completedDate >= today && completedDate < tomorrow;

      console.log(`Task "${task.name}" completion date: ${completedDate.toISOString()}, is today: ${isToday}`);
      return isToday;
    });

    console.log(`Tasks completed today: ${todayCompletedTasks.length}`);

    // Recent completed tasks
    const recentDays = 7;
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - recentDays);
    recentDate.setHours(0, 0, 0, 0);

    const recentCompletedTasks = completedTasks.filter(task => {
      if (!task.completionDate) return false;
      const completedDate = new Date(task.completionDate);
      return completedDate >= recentDate;
    });

    console.log(`Tasks completed in the last ${recentDays} days: ${recentCompletedTasks.length}`);

    // Build output of recent completed tasks
    const exportData = {
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      todayCompletedTasks: todayCompletedTasks.length,
      recentCompletedTasks: recentCompletedTasks.length,
      todayTasks: [],
      recentTasks: []
    };

    // Process today's tasks
    todayCompletedTasks.slice(0, 10).forEach(task => {
      exportData.todayTasks.push({
        id: task.id.primaryKey,
        name: task.name,
        note: task.note || "",
        completedDate: task.completionDate ? task.completionDate.toISOString() : null,
        projectName: task.containingProject ? task.containingProject.name : null
      });
    });

    // Process recent tasks
    recentCompletedTasks.slice(0, 10).forEach(task => {
      exportData.recentTasks.push({
        id: task.id.primaryKey,
        name: task.name,
        note: task.note || "",
        completedDate: task.completionDate ? task.completionDate.toISOString() : null,
        projectName: task.containingProject ? task.containingProject.name : null
      });
    });

    console.log("=== Completed tasks test script complete ===");
    return JSON.stringify(exportData, null, 2);

  } catch (error) {
    console.error(`Completed tasks test script error: ${error}`);
    return JSON.stringify({
      error: `Completed tasks test script error: ${error}`
    });
  }
})();
