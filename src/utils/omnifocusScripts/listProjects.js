// List OmniFocus projects with task counts and stalled detection.
(() => {
  try {
    var args = typeof injectedArgs !== "undefined" ? injectedArgs : {};
    var statusFilter = args.status || "active"; // active | onHold | done | dropped | all
    var limitValue = args.limit || 500;

    function statusOf(project) {
      try {
        if (project.status === Project.Status.Active) return "active";
        if (project.status === Project.Status.OnHold) return "onHold";
        if (project.status === Project.Status.Done) return "done";
        if (project.status === Project.Status.Dropped) return "dropped";
      } catch (e) {}
      return project.status ? String(project.status) : "active";
    }

    function formatDate(date) {
      if (!date) return null;
      try { return date.toISOString(); } catch (e) { return null; }
    }

    var projects = flattenedProjects
      .filter(function (project) {
        if (statusFilter === "all") return true;
        return statusOf(project) === statusFilter;
      })
      .slice(0, limitValue)
      .map(function (project) {
        var all = [];
        try { all = project.flattenedTasks || []; } catch (e) { all = []; }

        var remaining = 0;
        var available = 0;
        for (var i = 0; i < all.length; i++) {
          var task = all[i];
          try {
            if (!task.completed) {
              remaining++;
              if (task.taskStatus === Task.Status.Available || task.taskStatus === Task.Status.Next) {
                available++;
              }
            }
          } catch (e) {}
        }

        var folderName = null;
        try { folderName = project.parentFolder ? project.parentFolder.name : null; } catch (e) {}
        if (!folderName) {
          try { folderName = project.folder ? project.folder.name : null; } catch (e) {}
        }

        return {
          id: project.id.primaryKey,
          name: project.name,
          status: statusOf(project),
          folderName: folderName,
          note: (function () { try { return project.note || ""; } catch (e) { return ""; } })(),
          dueDate: formatDate((function () { try { return project.dueDate; } catch (e) { return null; } })()),
          deferDate: formatDate((function () { try { return project.deferDate; } catch (e) { return null; } })()),
          taskCount: all.length,
          remainingTaskCount: remaining,
          availableTaskCount: available,
          // A project is stalled when work remains but nothing is actionable.
          isStalled: remaining > 0 && available === 0,
          sequential: (function () { try { return !!project.sequential; } catch (e) { return false; } })()
        };
      });

    return JSON.stringify({ success: true, count: projects.length, projects: projects });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error && error.message ? error.message : String(error),
      count: 0,
      projects: []
    });
  }
})();
