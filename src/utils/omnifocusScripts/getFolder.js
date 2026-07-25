// Get a single OmniFocus folder with its child projects and subfolders.
(() => {
  try {
    // Resolve arguments: prefer injectedArgs at runtime, allow direct globals for testing.
    var targetId = (typeof folderId !== "undefined")
      ? folderId
      : (typeof injectedArgs !== "undefined" ? injectedArgs.folderId : null);
    var targetName = (typeof folderName !== "undefined")
      ? folderName
      : (typeof injectedArgs !== "undefined" ? injectedArgs.folderName : null);

    var projectStatus = function (project) {
      try {
        if (typeof Project !== "undefined" && Project.Status) {
          if (project.status === Project.Status.Active) return "active";
          if (project.status === Project.Status.OnHold) return "on_hold";
          if (project.status === Project.Status.Done) return "completed";
          if (project.status === Project.Status.Dropped) return "dropped";
        }
      } catch (e) {
        // Fall through.
      }
      return project.status ? String(project.status) : "active";
    };

    var folderStatus = function (folder) {
      try {
        if (typeof Folder !== "undefined" && Folder.Status) {
          if (folder.status === Folder.Status.Dropped) return "dropped";
          return "active";
        }
      } catch (e) {
        // Fall through.
      }
      return folder.status ? String(folder.status) : "active";
    };

    var matches = flattenedFolders.filter(function (folder) {
      if (targetId) return folder.id.primaryKey === targetId;
      if (targetName) return folder.name === targetName;
      return false;
    });

    if (matches.length === 0) {
      return JSON.stringify({ success: false, error: "Folder not found" });
    }
    if (matches.length > 1 && !targetId) {
      return JSON.stringify({
        success: false,
        error: "Ambiguous folder name: " + targetName + ". Multiple matches found; please use id."
      });
    }

    var folder = matches[0];

    var parentFolderID = null;
    try {
      if (folder.parent) {
        parentFolderID = folder.parent.id.primaryKey;
      }
    } catch (e) {
      parentFolderID = null;
    }

    var projects = (folder.projects || []).map(function (project) {
      var remaining = 0;
      try {
        remaining = project.flattenedTasks.filter(function (task) {
          return !task.completed;
        }).length;
      } catch (e) {
        remaining = 0;
      }
      return {
        id: project.id.primaryKey,
        name: project.name,
        status: projectStatus(project),
        remainingTaskCount: remaining
      };
    });

    var subfolders = (folder.folders || []).map(function (child) {
      return {
        id: child.id.primaryKey,
        name: child.name,
        status: folderStatus(child)
      };
    });

    return JSON.stringify({
      success: true,
      folder: {
        id: folder.id.primaryKey,
        name: folder.name,
        parentFolderID: parentFolderID,
        status: folderStatus(folder),
        projects: projects,
        subfolders: subfolders
      }
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message || String(error)
    });
  }
})();
