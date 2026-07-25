// List OmniFocus folders without loading task data.
(() => {
  try {
    // Resolve arguments: prefer injectedArgs at runtime, allow direct globals for testing.
    var includeDroppedValue = (typeof includeDropped !== "undefined")
      ? includeDropped
      : (typeof injectedArgs !== "undefined" && injectedArgs.includeDropped !== undefined
          ? injectedArgs.includeDropped
          : true);

    var folderStatus = function (folder) {
      try {
        if (typeof Folder !== "undefined" && Folder.Status) {
          if (folder.status === Folder.Status.Dropped) return "dropped";
          return "active";
        }
      } catch (e) {
        // Fall through to string handling below.
      }
      return folder.status ? String(folder.status) : "active";
    };

    var folders = flattenedFolders
      .filter(function (folder) {
        return includeDroppedValue || folderStatus(folder) !== "dropped";
      })
      .map(function (folder) {
        var parentFolderID = null;
        try {
          if (folder.parent) {
            parentFolderID = folder.parent.id.primaryKey;
          }
        } catch (e) {
          parentFolderID = null;
        }

        var projectCount = 0;
        try {
          projectCount = folder.projects ? folder.projects.length : 0;
        } catch (e) {
          projectCount = 0;
        }

        return {
          id: folder.id.primaryKey,
          name: folder.name,
          parentFolderID: parentFolderID,
          status: folderStatus(folder),
          projectCount: projectCount
        };
      });

    return JSON.stringify({ success: true, count: folders.length, folders: folders });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message || String(error),
      count: 0,
      folders: []
    });
  }
})();
