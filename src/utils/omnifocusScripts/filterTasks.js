// Unified task filtering engine used by filter_tasks, count_tasks, prompts, and resources.
(() => {
  try {
    const args = typeof injectedArgs !== "undefined" ? injectedArgs : {};
    const now = new Date();

    function parseDate(value) {
      if (!value) return null;
      if (typeof value === "string") {
        const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (dateOnly) {
          const parsed = new Date(
            Number(dateOnly[1]),
            Number(dateOnly[2]) - 1,
            Number(dateOnly[3]),
          );
          if (
            parsed.getFullYear() !== Number(dateOnly[1]) ||
            parsed.getMonth() !== Number(dateOnly[2]) - 1 ||
            parsed.getDate() !== Number(dateOnly[3])
          ) {
            return null;
          }
          return parsed;
        }
      }

      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    function startOfDay(date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function startOfTomorrow(date) {
      const result = startOfDay(date);
      result.setDate(result.getDate() + 1);
      return result;
    }

    function startOfWeek(date) {
      const result = startOfDay(date);
      const mondayOffset = (result.getDay() + 6) % 7;
      result.setDate(result.getDate() - mondayOffset);
      return result;
    }

    function startOfNextWeek(date) {
      const result = startOfWeek(date);
      result.setDate(result.getDate() + 7);
      return result;
    }

    function startOfMonth(date) {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function startOfNextMonth(date) {
      return new Date(date.getFullYear(), date.getMonth() + 1, 1);
    }

    function inRange(value, start, end) {
      const date = parseDate(value);
      return !!date && date >= start && date < end;
    }

    function before(value, boundary) {
      const date = parseDate(value);
      const limit = parseDate(boundary);
      return !!date && !!limit && date < limit;
    }

    function after(value, boundary) {
      const date = parseDate(value);
      const limit = parseDate(boundary);
      return !!date && !!limit && date > limit;
    }

    function formatDate(date) {
      if (!date) return null;
      try {
        return date.toISOString();
      } catch (error) {
        return null;
      }
    }

    function getTaskStatus(status) {
      const taskStatusMap = {
        [Task.Status.Available]: "Available",
        [Task.Status.Blocked]: "Blocked",
        [Task.Status.Completed]: "Completed",
        [Task.Status.Dropped]: "Dropped",
        [Task.Status.DueSoon]: "DueSoon",
        [Task.Status.Next]: "Next",
        [Task.Status.Overdue]: "Overdue",
      };
      return taskStatusMap[status] || "Unknown";
    }

    function taskTagNames(task) {
      try {
        return (task.tags || [])
          .map((tag) => (tag && tag.name ? String(tag.name).toLowerCase() : ""))
          .filter(Boolean);
      } catch (error) {
        return [];
      }
    }

    function matchesTags(task) {
      if (!args.tagFilter) return true;
      const requested = (Array.isArray(args.tagFilter) ? args.tagFilter : [args.tagFilter])
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean);
      if (requested.length === 0) return true;

      const actual = taskTagNames(task);
      return requested.some((wanted) =>
        actual.some((name) => (args.exactTagMatch ? name === wanted : name.includes(wanted))),
      );
    }

    const todayStart = startOfDay(now);
    const tomorrowStart = startOfTomorrow(now);
    const weekStart = startOfWeek(now);
    const nextWeekStart = startOfNextWeek(now);
    const monthStart = startOfMonth(now);
    const nextMonthStart = startOfNextMonth(now);

    const completionFilterRequested = !!(
      args.completedToday ||
      args.completedYesterday ||
      args.completedThisWeek ||
      args.completedThisMonth ||
      args.completedBefore ||
      args.completedAfter
    );
    const explicitStatuses = Array.isArray(args.taskStatus) ? args.taskStatus : null;
    const explicitCompletedOrDropped = !!(
      explicitStatuses &&
      (explicitStatuses.includes("Completed") || explicitStatuses.includes("Dropped"))
    );

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    function matches(task) {
      try {
        const status = getTaskStatus(task.taskStatus);
        const isCompleted = status === "Completed";
        const isDropped = status === "Dropped";

        // Remaining tasks are the default. Completion-date filters explicitly select
        // completed tasks, while explicit Completed/Dropped statuses opt those states in.
        if (completionFilterRequested && !isCompleted) return false;
        if (!completionFilterRequested && !explicitCompletedOrDropped && (isCompleted || isDropped)) {
          return false;
        }
        if (explicitStatuses && explicitStatuses.length > 0 && !explicitStatuses.includes(status)) {
          return false;
        }

        const perspective = args.perspective || "all";
        if (perspective === "inbox" && !task.inInbox) return false;
        if (perspective === "flagged" && !task.flagged) return false;

        if (args.inInbox !== undefined && !!task.inInbox !== args.inInbox) return false;
        if (args.flagged !== undefined && !!task.flagged !== args.flagged) return false;

        if (args.projectFilter) {
          const projectName = task.containingProject ? task.containingProject.name || "" : "";
          if (!String(projectName).toLowerCase().includes(String(args.projectFilter).toLowerCase())) {
            return false;
          }
        }

        if (!matchesTags(task)) return false;

        if (args.searchText) {
          const needle = String(args.searchText).toLowerCase();
          const name = String(task.name || "").toLowerCase();
          const note = String(task.note || "").toLowerCase();
          if (!name.includes(needle) && !note.includes(needle)) return false;
        }

        const dueDate = task.dueDate;
        if (args.dueBefore && !before(dueDate, args.dueBefore)) return false;
        if (args.dueAfter && !after(dueDate, args.dueAfter)) return false;
        if (args.dueToday && !inRange(dueDate, todayStart, tomorrowStart)) return false;
        if (args.dueThisWeek && !inRange(dueDate, weekStart, nextWeekStart)) return false;
        if (args.dueThisMonth && !inRange(dueDate, monthStart, nextMonthStart)) return false;
        if (args.overdue && (!dueDate || dueDate >= now || isCompleted || isDropped)) return false;

        const deferDate = task.deferDate;
        if (args.deferBefore && !before(deferDate, args.deferBefore)) return false;
        if (args.deferAfter && !after(deferDate, args.deferAfter)) return false;
        if (args.deferToday && !inRange(deferDate, todayStart, tomorrowStart)) return false;
        if (args.deferThisWeek && !inRange(deferDate, weekStart, nextWeekStart)) return false;
        if (args.deferAvailable && deferDate && deferDate > now) return false;

        const plannedDate = task.plannedDate;
        if (args.plannedBefore && !before(plannedDate, args.plannedBefore)) return false;
        if (args.plannedAfter && !after(plannedDate, args.plannedAfter)) return false;
        if (args.plannedToday && !inRange(plannedDate, todayStart, tomorrowStart)) return false;
        if (args.plannedThisWeek && !inRange(plannedDate, weekStart, nextWeekStart)) return false;
        if (args.plannedThisMonth && !inRange(plannedDate, monthStart, nextMonthStart)) return false;

        const completionDate = task.completionDate;
        if (args.completedBefore && !before(completionDate, args.completedBefore)) return false;
        if (args.completedAfter && !after(completionDate, args.completedAfter)) return false;
        if (args.completedToday && !inRange(completionDate, todayStart, tomorrowStart)) return false;
        if (args.completedYesterday && !inRange(completionDate, yesterdayStart, todayStart)) return false;
        if (args.completedThisWeek && !inRange(completionDate, weekStart, nextWeekStart)) return false;
        if (args.completedThisMonth && !inRange(completionDate, monthStart, nextMonthStart)) return false;

        const estimatedMinutes = task.estimatedMinutes;
        const hasEstimate = estimatedMinutes !== null && estimatedMinutes !== undefined && estimatedMinutes > 0;
        if (args.hasEstimate !== undefined && hasEstimate !== args.hasEstimate) return false;
        if (args.estimateMin !== undefined && (!hasEstimate || estimatedMinutes < args.estimateMin)) return false;
        if (args.estimateMax !== undefined && (!hasEstimate || estimatedMinutes > args.estimateMax)) return false;

        const hasNote = typeof task.note === "string" && task.note.trim().length > 0;
        if (args.hasNote !== undefined && hasNote !== args.hasNote) return false;

        return true;
      } catch (error) {
        return false;
      }
    }

    const filteredTasks = flattenedTasks.filter(matches);

    if (args.countOnly) {
      const byStatus = {};
      filteredTasks.forEach((task) => {
        const status = getTaskStatus(task.taskStatus);
        byStatus[status] = (byStatus[status] || 0) + 1;
      });
      return JSON.stringify({
        success: true,
        exportDate: now.toISOString(),
        total: filteredTasks.length,
        byStatus,
      });
    }

    const sortBy = args.sortBy || "name";
    const sortOrder = args.sortOrder === "desc" ? "desc" : "asc";
    const direction = sortOrder === "desc" ? -1 : 1;

    function normalizeSortValue(task) {
      if (sortBy === "dueDate") return formatDate(task.dueDate);
      if (sortBy === "deferDate") return formatDate(task.deferDate);
      if (sortBy === "plannedDate") return formatDate(task.plannedDate);
      if (sortBy === "completedDate") return formatDate(task.completionDate);
      if (sortBy === "flagged") return task.flagged ? 1 : 0;
      if (sortBy === "project") {
        return task.containingProject ? String(task.containingProject.name || "").toLowerCase() : null;
      }
      return String(task.name || "").toLowerCase();
    }

    function compareNullable(a, b) {
      if (a === b) return 0;
      if (a === null || a === undefined || a === "") return 1;
      if (b === null || b === undefined || b === "") return -1;
      if (a < b) return -1 * direction;
      if (a > b) return 1 * direction;
      return 0;
    }

    function compareTuple(valueA, idA, valueB, idB) {
      const primary = compareNullable(valueA, valueB);
      if (primary !== 0) return primary;
      if (idA < idB) return -1 * direction;
      if (idA > idB) return 1 * direction;
      return 0;
    }

    function compareTasks(a, b) {
      return compareTuple(
        normalizeSortValue(a),
        String(a.id.primaryKey),
        normalizeSortValue(b),
        String(b.id.primaryKey),
      );
    }

    const continuation = args.continuation;
    if (continuation && (continuation.sortBy !== sortBy || continuation.sortOrder !== sortOrder)) {
      throw new Error("Cursor sort metadata does not match the request");
    }
    if (continuation) {
      const validValue = continuation.lastValue === null ||
        (sortBy === "flagged"
          ? (continuation.lastValue === 0 || continuation.lastValue === 1)
          : typeof continuation.lastValue === "string");
      if (!validValue || typeof continuation.lastId !== "string" || continuation.lastId.length === 0) {
        throw new Error("Cursor continuation value is invalid");
      }
    }

    function parentTaskId(task) {
      try {
        return task.parent ? String(task.parent.id.primaryKey) : null;
      } catch (error) {
        return null;
      }
    }

    const filteredIds = {};
    filteredTasks.forEach((task) => { filteredIds[String(task.id.primaryKey)] = true; });
    const tasksById = {};
    flattenedTasks.forEach((task) => { tasksById[String(task.id.primaryKey)] = task; });
    const paginatedTasks = args.showSubtasks === true
      ? filteredTasks.filter((task) => {
          let parentId = parentTaskId(task);
          const visited = {};
          while (parentId && !visited[parentId]) {
            visited[parentId] = true;
            if (filteredIds[parentId]) return false;
            const parentTask = tasksById[parentId];
            parentId = parentTask ? parentTaskId(parentTask) : null;
          }
          return true;
        })
      : filteredTasks;
    const remainingTasks = continuation
      ? paginatedTasks.filter((task) => compareTuple(
          normalizeSortValue(task),
          String(task.id.primaryKey),
          continuation.lastValue,
          continuation.lastId,
        ) > 0)
      : paginatedTasks.slice();
    remainingTasks.sort(compareTasks);

    const requestedLimit = Number(args.limit);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 100;
    const pageWithLookahead = remainingTasks.slice(0, limit + 1);
    const hasMore = pageWithLookahead.length > limit;
    const limitedTasks = pageWithLookahead.slice(0, limit);

    const tasks = limitedTasks.map((task) => {
      const serialized = omnifocusMcpSerializeTask(task, args, true);
      serialized.completedDate = formatDate(task.completionDate);
      return serialized;
    });
    const lastTask = limitedTasks.length > 0 ? limitedTasks[limitedTasks.length - 1] : null;

    return JSON.stringify({
      success: true,
      exportDate: now.toISOString(),
      tasks,
      totalCount: flattenedTasks.length,
      filteredCount: filteredTasks.length,
      returnedCount: tasks.length,
      hasMore,
      lastSortTuple: lastTask ? {
        value: normalizeSortValue(lastTask),
        id: String(lastTask.id.primaryKey),
      } : null,
      sortedBy: sortBy,
      sortOrder,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `Error filtering tasks: ${error && error.message ? error.message : String(error)}`,
    });
  }
})();
