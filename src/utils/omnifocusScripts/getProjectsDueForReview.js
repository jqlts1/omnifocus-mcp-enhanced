(() => {
  try {
    const onHold = injectedArgs ? injectedArgs.includeOnHold : false;

    const projectStatusMap = {
      [Project.Status.Active]: "Active",
      [Project.Status.Done]: "Done",
      [Project.Status.Dropped]: "Dropped",
      [Project.Status.OnHold]: "OnHold",
    };

    function formatDate(date) {
      if (!date) return null;
      return date.toISOString();
    }

    function getEnumValue(enumVal, map) {
      return map[enumVal] || "Unknown";
    }

    const now = new Date();

    const dueForReview = flattenedProjects.filter((project) => {
      if (!project.nextReviewDate || project.nextReviewDate > now) return false;
      const status = getEnumValue(project.status, projectStatusMap);
      if (status === "Done" || status === "Dropped") return false;
      if (status === "OnHold" && !onHold) return false;
      return true;
    });

    // Sort by nextReviewDate ascending (most overdue first)
    dueForReview.sort((a, b) => {
      if (!a.nextReviewDate) return 1;
      if (!b.nextReviewDate) return -1;
      return a.nextReviewDate - b.nextReviewDate;
    });

    const projects = [];
    dueForReview.forEach((project) => {
      try {
        projects.push({
          id: project.id.primaryKey,
          name: project.name,
          status: getEnumValue(project.status, projectStatusMap),
          folderName: project.parentFolder ? project.parentFolder.name : null,
          folderID: project.parentFolder
            ? project.parentFolder.id.primaryKey
            : null,
          sequential: project.task ? project.task.sequential || false : false,
          dueDate: formatDate(project.dueDate),
          deferDate: formatDate(project.deferDate),
          effectiveDueDate: formatDate(project.effectiveDueDate),
          effectiveDeferDate: formatDate(project.effectiveDeferDate),
          completedByChildren: project.completedByChildren || false,
          containsSingletonActions: project.containsSingletonActions || false,
          note: project.note || "",
          taskCount: project.tasks ? project.tasks.length : 0,
          flagged: project.flagged || false,
          nextReviewDate: formatDate(project.nextReviewDate),
          lastReviewDate: formatDate(project.lastReviewDate),
          reviewInterval: project.reviewInterval
            ? {
                steps: project.reviewInterval.steps,
                unit: String(project.reviewInterval.unit),
                fixed: project.reviewInterval.fixed || false,
              }
            : null,
        });
      } catch (projError) {
        // Skip
      }
    });

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      count: projects.length,
      projects: projects,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: String(error),
    });
  }
})();
