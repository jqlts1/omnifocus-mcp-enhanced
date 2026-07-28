// Preflight, write, verify, and restore the repetition rule on one OmniFocus task.
// The caller supplies a fully built ICS rule string; UNTIL and COUNT are encoded there.
(() => {
  const args = typeof injectedArgs !== "undefined" ? injectedArgs : {};
  const taskId = args.taskId;
  const clear = args.clear === true;

  function fail(code, error, extra) {
    return JSON.stringify({ success: false, code, error, ...(extra || {}) });
  }

  function scheduleTypeName(value) {
    const types = typeof Task !== "undefined" ? Task.RepetitionScheduleType : null;
    if (!types || value === null || value === undefined) return null;
    if (value === types.Regularly) return "Regularly";
    if (value === types.FromCompletion) return "FromCompletion";
    if (value === types.None) return "None";
    return null;
  }

  function anchorDateKeyName(value) {
    const keys = typeof Task !== "undefined" ? Task.AnchorDateKey : null;
    if (!keys || value === null || value === undefined) return null;
    if (value === keys.DueDate) return "DueDate";
    if (value === keys.DeferDate) return "DeferDate";
    if (value === keys.PlannedDate) return "PlannedDate";
    return null;
  }

  function ruleParts(value) {
    const parts = new Map();
    String(value || "")
      .trim()
      .replace(/^RRULE:/i, "")
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .forEach((part) => {
        const separator = part.indexOf("=");
        parts.set(part.slice(0, separator).toUpperCase(), part.slice(separator + 1));
      });
    return parts;
  }

  function sameRuleString(actual, expected) {
    const actualParts = ruleParts(actual);
    const expectedParts = ruleParts(expected);
    if (actualParts.size !== expectedParts.size) return false;
    for (const [key, value] of expectedParts) {
      if (actualParts.get(key) !== value) return false;
    }
    return true;
  }

  function snapshotRule(target) {
    let rule = null;
    try {
      rule = target.repetitionRule || null;
    } catch (error) {
      rule = null;
    }
    if (!rule) return null;

    return {
      ruleString: rule.ruleString || "",
      scheduleType: scheduleTypeName(rule.scheduleType),
      anchorDateKey: anchorDateKeyName(rule.anchorDateKey),
      catchUpAutomatically: !!rule.catchUpAutomatically,
    };
  }

  function nextOccurrence(target) {
    try {
      const rule = target.repetitionRule;
      if (!rule) return null;
      const next = rule.firstDateAfterDate(new Date());
      return next ? next.toISOString() : null;
    } catch (error) {
      return null;
    }
  }

  function applyRule(target, rule) {
    if (!rule) {
      target.repetitionRule = null;
      return;
    }
    target.repetitionRule = new Task.RepetitionRule(
      rule.ruleString,
      null,
      rule.scheduleType ? Task.RepetitionScheduleType[rule.scheduleType] : null,
      rule.anchorDateKey ? Task.AnchorDateKey[rule.anchorDateKey] : null,
      rule.catchUpAutomatically,
    );
  }

  function ruleMismatches(expected, actual) {
    if (!expected) return actual ? ["repetitionRule"] : [];
    if (!actual) return ["repetitionRule"];

    const mismatches = [];
    if (!sameRuleString(actual.ruleString, expected.ruleString)) mismatches.push("ruleString");
    if (actual.scheduleType !== expected.scheduleType) mismatches.push("scheduleType");
    if (actual.anchorDateKey !== expected.anchorDateKey) mismatches.push("anchorDateKey");
    if (actual.catchUpAutomatically !== expected.catchUpAutomatically) {
      mismatches.push("catchUpAutomatically");
    }
    return mismatches;
  }

  function restore(target, snapshot, code, error) {
    let restoreError = null;
    try {
      applyRule(target, snapshot);
    } catch (failure) {
      restoreError = String(failure);
    }

    if (ruleMismatches(snapshot, snapshotRule(target)).length === 0) {
      return fail(code, error, { restored: true });
    }

    return fail("REPETITION_RESTORE_UNCONFIRMED", error, {
      residualTaskId: taskId,
      recovery: restoreError
        ? `Restoring the previous repetition rule failed (${restoreError}). Inspect task ${taskId} in OmniFocus.`
        : `The previous repetition rule could not be confirmed. Inspect task ${taskId} in OmniFocus.`,
    });
  }

  try {
    if (!taskId) return fail("INVALID_REPETITION", "taskId is required");

    let task = null;
    if (typeof Task !== "undefined" && Task.byIdentifier) {
      task = Task.byIdentifier(taskId);
    }
    if (!task && typeof flattenedTasks !== "undefined") {
      task = flattenedTasks.find((candidate) => candidate.id && candidate.id.primaryKey === taskId) || null;
    }
    if (!task) return fail("INVALID_REPETITION", `Task not found: ${taskId}`);

    const previous = snapshotRule(task);

    if (clear) {
      try {
        applyRule(task, null);
      } catch (error) {
        return restore(task, previous, "REPETITION_WRITE_FAILED_RESTORED", `Failed to clear repetition rule: ${String(error)}`);
      }
      if (snapshotRule(task)) {
        return restore(
          task,
          previous,
          "REPETITION_VERIFICATION_FAILED_RESTORED",
          "Repetition rule still present after clearing",
        );
      }
      return JSON.stringify({ success: true, cleared: true });
    }

    const expected = {
      ruleString: String(args.ruleString || "FREQ=WEEKLY"),
      scheduleType: args.scheduleType === "FromCompletion" ? "FromCompletion" : "Regularly",
      anchorDateKey:
        args.anchorDateKey === "DeferDate" || args.anchorDateKey === "PlannedDate"
          ? args.anchorDateKey
          : "DueDate",
      catchUpAutomatically: args.catchUpAutomatically === true,
    };

    try {
      applyRule(task, expected);
    } catch (error) {
      return restore(task, previous, "REPETITION_WRITE_FAILED_RESTORED", `Failed to set repetition rule: ${String(error)}`);
    }

    const applied = snapshotRule(task);
    const mismatches = ruleMismatches(expected, applied);
    if (mismatches.length > 0) {
      return restore(
        task,
        previous,
        "REPETITION_VERIFICATION_FAILED_RESTORED",
        `Repetition verification failed for: ${mismatches.join(", ")}`,
      );
    }

    return JSON.stringify({
      success: true,
      ruleString: applied.ruleString,
      scheduleType: applied.scheduleType,
      anchorDateKey: applied.anchorDateKey,
      catchUpAutomatically: applied.catchUpAutomatically,
      nextOccurrence: nextOccurrence(task),
    });
  } catch (error) {
    return fail("INVALID_REPETITION", error && error.message ? error.message : String(error));
  }
})();
