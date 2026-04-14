(() => {
  try {
    // Read parameters from injectedArgs (injected by executeOmniFocusScript)
    const statusFilter = injectedArgs ? injectedArgs.statusFilter : null;
    const folderFilter = injectedArgs ? injectedArgs.folderFilter : null;
    const includeReview = injectedArgs ? (injectedArgs.includeReviewData !== false) : true;

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

    const allProjects = flattenedProjects;
    let filtered = allProjects;

    // Apply status filter if provided
    if (statusFilter && statusFilter.length > 0) {
      const statusSet = new Set(statusFilter);
      filtered = filtered.filter((p) =>
        statusSet.has(getEnumValue(p.status, projectStatusMap)),
      );
    }

    // Apply folder filter if provided
    if (folderFilter) {
      filtered = filtered.filter(
        (p) =>
          p.parentFolder &&
          p.parentFolder.name
            .toLowerCase()
            .includes(folderFilter.toLowerCase()),
      );
    }

    const projects = [];
    filtered.forEach((project) => {
      try {
        const data = {
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
        };

        if (includeReview) {
          data.nextReviewDate = formatDate(project.nextReviewDate);
          data.lastReviewDate = formatDate(project.lastReviewDate);
          data.reviewInterval = project.reviewInterval
            ? {
                steps: project.reviewInterval.steps,
                unit: String(project.reviewInterval.unit),
                fixed: project.reviewInterval.fixed || false,
              }
            : null;
        }

        projects.push(data);
      } catch (projError) {
        // Skip projects that error during extraction
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
