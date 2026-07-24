// OmniJS script to set, update, or clear the repetition rule on an OmniFocus task.
// End date and repetition count are encoded into the ICS rule string as UNTIL= and COUNT=.
(() => {
  try {
    const args = (typeof injectedArgs !== 'undefined') ? injectedArgs : {};
    const taskId = args.taskId;
    const clear = args.clear === true;

    if (!taskId) {
      return JSON.stringify({ success: false, error: 'taskId is required' });
    }

    // Resolve the task by identifier.
    let task = null;
    if (typeof Task !== 'undefined' && Task.byIdentifier) {
      task = Task.byIdentifier(taskId);
    }
    if (!task && typeof flattenedTasks !== 'undefined') {
      task = flattenedTasks.find(t => t.id && t.id.primaryKey === taskId) || null;
    }
    if (!task) {
      return JSON.stringify({ success: false, error: 'Task not found: ' + taskId });
    }

    if (clear) {
      task.repetitionRule = null;
      return JSON.stringify({ success: true, cleared: true });
    }

    // Build the ICS rule string.
    let ruleString = args.ruleString || 'FREQ=WEEKLY';
    ruleString = String(ruleString).trim().replace(/^RRULE:/i, '');
    // Strip existing COUNT/UNTIL so we can re-append user-provided values.
    ruleString = ruleString.replace(/;?(COUNT|UNTIL)=[^;]*/gi, '');

    if (args.count) {
      const count = parseInt(args.count, 10);
      if (!isNaN(count) && count > 0) {
        ruleString += ';COUNT=' + count;
      }
    }

    if (args.endDate) {
      const until = toICSDateTime(args.endDate);
      if (until) {
        ruleString += ';UNTIL=' + until;
      }
    }

    // Map schedule type.
    let scheduleType = null;
    if (typeof Task !== 'undefined' && Task.RepetitionScheduleType) {
      if (args.scheduleType === 'FromCompletion') {
        scheduleType = Task.RepetitionScheduleType.FromCompletion;
      } else {
        scheduleType = Task.RepetitionScheduleType.Regularly;
      }
    }

    // Map anchor date key.
    let anchorDateKey = null;
    if (typeof Task !== 'undefined' && Task.AnchorDateKey) {
      if (args.anchorDateKey === 'DeferDate') {
        anchorDateKey = Task.AnchorDateKey.DeferDate;
      } else if (args.anchorDateKey === 'PlannedDate') {
        anchorDateKey = Task.AnchorDateKey.PlannedDate;
      } else {
        anchorDateKey = Task.AnchorDateKey.DueDate;
      }
    }

    const catchUpAutomatically = args.catchUpAutomatically === true;

    // Construct and assign the repetition rule.
    // Signature: new Task.RepetitionRule(ruleString, method, scheduleType, anchorDateKey, catchUpAutomatically)
    // method is deprecated and must be null when scheduleType/anchorDateKey are provided.
    task.repetitionRule = new Task.RepetitionRule(
      ruleString,
      null,
      scheduleType,
      anchorDateKey,
      catchUpAutomatically
    );

    const appliedRule = task.repetitionRule;
    return JSON.stringify({
      success: true,
      ruleString: appliedRule ? appliedRule.ruleString : ruleString,
      scheduleType: args.scheduleType || 'Regularly',
      anchorDateKey: args.anchorDateKey || 'DueDate',
      catchUpAutomatically
    });
  } catch (error) {
    return JSON.stringify({ success: false, error: String(error) });
  }

  // Convert an ISO date string to ICS UNTIL format: YYYYMMDDTHHMMSSZ (UTC).
  function toICSDateTime(isoDate) {
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return null;
      const pad = n => String(n).padStart(2, '0');
      return (
        date.getUTCFullYear() +
        pad(date.getUTCMonth() + 1) +
        pad(date.getUTCDate()) +
        'T' +
        pad(date.getUTCHours()) +
        pad(date.getUTCMinutes()) +
        pad(date.getUTCSeconds()) +
        'Z'
      );
    } catch {
      return null;
    }
  }
})();
