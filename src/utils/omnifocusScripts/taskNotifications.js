// Manage OmniFocus task notifications (list / add / remove).
(() => {
  try {
    var args = typeof injectedArgs !== "undefined" ? injectedArgs : {};
    var action = args.action || "list";
    var taskId = args.taskId || null;
    var taskName = args.taskName || null;

    if (!taskId && !taskName) {
      return JSON.stringify({ success: false, error: "Either taskId or taskName must be provided" });
    }

    // Resolve the task with duplicate-name protection.
    var matches = flattenedTasks.filter(function (candidate) {
      if (taskId) return candidate.id.primaryKey === taskId;
      return candidate.name === taskName;
    });

    if (matches.length === 0) {
      return JSON.stringify({ success: false, error: "Task not found" });
    }
    if (matches.length > 1 && !taskId) {
      return JSON.stringify({
        success: false,
        error: "Ambiguous task name: " + taskName + ". Multiple matches found; please use taskId."
      });
    }

    var task = matches[0];

    // Serialize a notification defensively: reading the wrong field throws.
    function serialize(notification, index) {
      var info = { index: index, kind: "unknown", absoluteFireDate: null, relativeFireOffset: null, isSnoozed: null };
      try {
        var kindStr = String(notification.kind);
        info.kind = kindStr.indexOf("Absolute") !== -1 ? "absolute"
          : kindStr.indexOf("DueRelative") !== -1 ? "dueRelative"
          : kindStr;
      } catch (e) {}
      try {
        if (info.kind === "absolute" && notification.absoluteFireDate) {
          info.absoluteFireDate = notification.absoluteFireDate.toISOString();
        }
      } catch (e) {}
      try {
        if (info.kind === "dueRelative") {
          info.relativeFireOffset = notification.relativeFireOffset;
        }
      } catch (e) {}
      try { info.isSnoozed = notification.isSnoozed; } catch (e) {}
      return info;
    }

    function listAll() {
      var list = [];
      var notifications = task.notifications || [];
      for (var i = 0; i < notifications.length; i++) {
        list.push(serialize(notifications[i], i));
      }
      return list;
    }

    if (action === "list") {
      return JSON.stringify({
        success: true,
        taskId: task.id.primaryKey,
        taskName: task.name,
        notifications: listAll()
      });
    }

    if (action === "add") {
      var added;
      if (args.absoluteDate) {
        var when = new Date(args.absoluteDate);
        if (isNaN(when.getTime())) {
          return JSON.stringify({ success: false, error: "Invalid absoluteDate: " + args.absoluteDate });
        }
        added = task.addNotification(when);
      } else if (args.relativeMinutes !== undefined && args.relativeMinutes !== null) {
        // OmniFocus expects seconds relative to the due date (negative = before due).
        if (!task.dueDate) {
          return JSON.stringify({
            success: false,
            error: "Task has no due date; a relative notification requires a due date. Use absoluteDate instead."
          });
        }
        var seconds = Math.round(Number(args.relativeMinutes) * 60);
        added = task.addNotification(seconds);
      } else {
        return JSON.stringify({
          success: false,
          error: "Provide either absoluteDate (ISO 8601) or relativeMinutes (negative = before due date)"
        });
      }

      return JSON.stringify({
        success: true,
        taskId: task.id.primaryKey,
        taskName: task.name,
        added: added ? serialize(added, (task.notifications || []).length - 1) : null,
        notifications: listAll()
      });
    }

    if (action === "remove") {
      var notifications = task.notifications || [];
      if (notifications.length === 0) {
        return JSON.stringify({ success: false, error: "Task has no notifications to remove" });
      }

      if (args.removeAll === true) {
        var removedCount = 0;
        // Copy first: removal mutates the collection.
        var copy = [];
        for (var j = 0; j < notifications.length; j++) copy.push(notifications[j]);
        for (var k = 0; k < copy.length; k++) {
          try { task.removeNotification(copy[k]); removedCount++; } catch (e) {}
        }
        return JSON.stringify({
          success: true,
          taskId: task.id.primaryKey,
          taskName: task.name,
          removedCount: removedCount,
          notifications: listAll()
        });
      }

      var index = args.index;
      if (index === undefined || index === null) {
        return JSON.stringify({ success: false, error: "Provide index (0-based) or removeAll: true" });
      }
      if (index < 0 || index >= notifications.length) {
        return JSON.stringify({
          success: false,
          error: "Index out of range: " + index + " (task has " + notifications.length + " notification(s))"
        });
      }

      var target = notifications[index];
      var removedInfo = serialize(target, index);
      task.removeNotification(target);

      return JSON.stringify({
        success: true,
        taskId: task.id.primaryKey,
        taskName: task.name,
        removed: removedInfo,
        removedCount: 1,
        notifications: listAll()
      });
    }

    return JSON.stringify({ success: false, error: "Unknown action: " + action });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
})();
