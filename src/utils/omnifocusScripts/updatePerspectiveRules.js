// Updates a custom perspective's name, filter rules, and aggregation in place.
//
// Three behaviours here are load-bearing and were established by experiment
// against OmniFocus 4.8.12:
//
// 1. OmniFocus does not validate archivedFilterRules. An unknown key is stored
//    verbatim and then ignored by the filter engine, so reading a value back
//    proves only that storage worked. Structural validation happens before this
//    script runs; this script verifies storage and rolls back on mismatch.
// 2. Writing rules does NOT refresh a perspective that is currently displayed.
//    The window must be switched away and back for the change to take effect
//    on screen.
// 3. Name references must be resolved to primary keys. Rules carry ids, never
//    names.
//
// Helpers come from perspectiveRuleHelpers.js, prepended at execution time.

(() => {
  const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};

  // Walks the native rule tree replacing {$ref:{kind,name}} with primary keys.
  function resolvePlaceholders(value) {
    if (Array.isArray(value)) return value.map(resolvePlaceholders);
    if (!value || typeof value !== 'object') return value;
    if (value.$ref && typeof value.$ref === 'object') {
      return resolvePerspectiveRef(value.$ref.kind, value.$ref.name);
    }
    const out = {};
    Object.keys(value).forEach((key) => {
      out[key] = resolvePlaceholders(value[key]);
    });
    return out;
  }

  function parseHexColor(hex) {
    const clean = String(hex).replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
      throw new Error('iconColor must be a hex string such as "#3399EE"');
    }
    return Color.RGB(
      parseInt(clean.slice(0, 2), 16) / 255,
      parseInt(clean.slice(2, 4), 16) / 255,
      parseInt(clean.slice(4, 6), 16) / 255,
      1,
    );
  }

  const hasValue = (value) => value !== undefined && value !== null;

  let perspective = null;
  let backupRules = null;
  let backupAggregation = null;
  let backupName = null;

  try {
    perspective = findCustomPerspective(
      args.perspectiveId,
      args.perspectiveName,
    );
    if (!perspective) {
      return JSON.stringify({
        success: false,
        error:
          'Custom perspective not found: ' +
          (args.perspectiveId || args.perspectiveName),
      });
    }

    backupRules = JSON.parse(
      JSON.stringify(perspective.archivedFilterRules || []),
    );
    backupAggregation = perspective.archivedTopLevelFilterAggregation;
    backupName = perspective.name;

    const resolvedRules = hasValue(args.rules)
      ? resolvePlaceholders(args.rules)
      : null;

    if (hasValue(args.newName)) {
      const clash = Perspective.Custom.all.filter(
        (p) =>
          p.name === args.newName && p.identifier !== perspective.identifier,
      );
      if (clash.length > 0) {
        return JSON.stringify({
          success: false,
          error:
            'Another custom perspective is already named "' +
            args.newName +
            '". Duplicate names make every later lookup by name ambiguous.',
        });
      }
    }

    if (args.dryRun) {
      const proposedRules = resolvedRules === null ? backupRules : resolvedRules;
      return JSON.stringify({
        success: true,
        dryRun: true,
        perspective: {
          name: backupName,
          identifier: perspective.identifier,
          aggregation: backupAggregation,
          rules: backupRules,
          refNames: buildPerspectiveRefNames(backupRules),
        },
        proposed: {
          name: hasValue(args.newName) ? args.newName : backupName,
          aggregation: hasValue(args.aggregation)
            ? args.aggregation
            : backupAggregation,
          rules: proposedRules,
          refNames: buildPerspectiveRefNames(proposedRules),
        },
      });
    }

    if (resolvedRules !== null) perspective.archivedFilterRules = resolvedRules;
    if (hasValue(args.aggregation)) {
      perspective.archivedTopLevelFilterAggregation = args.aggregation;
    }
    if (hasValue(args.newName)) perspective.name = args.newName;
    if (hasValue(args.iconColor)) {
      perspective.iconColor = parseHexColor(args.iconColor);
    }

    // Storage check. This catches a refused write, not an invalid rule:
    // OmniFocus accepts any JSON, so validation must happen before this point.
    const storedRules = perspective.archivedFilterRules || [];
    if (
      resolvedRules !== null &&
      JSON.stringify(storedRules) !== JSON.stringify(resolvedRules)
    ) {
      perspective.archivedFilterRules = backupRules;
      perspective.archivedTopLevelFilterAggregation = backupAggregation;
      perspective.name = backupName;
      return JSON.stringify({
        success: false,
        error:
          'OmniFocus stored different rules than were written; the perspective was rolled back.',
        expected: resolvedRules,
        stored: storedRules,
      });
    }

    // Writes do not repaint a displayed perspective. Switch away and back.
    let refreshed = false;
    try {
      document.windows.forEach((win) => {
        const shown = win.perspective;
        if (shown && shown.identifier === perspective.identifier) {
          win.perspective = Perspective.BuiltIn.Inbox;
          win.perspective = perspective;
          refreshed = true;
        }
      });
    } catch (e) {
      refreshed = false;
    }

    const finalRules = perspective.archivedFilterRules || [];
    return JSON.stringify({
      success: true,
      perspective: {
        name: perspective.name,
        identifier: perspective.identifier,
        aggregation: perspective.archivedTopLevelFilterAggregation,
        rules: finalRules,
        refNames: buildPerspectiveRefNames(finalRules),
      },
      previous: {
        name: backupName,
        aggregation: backupAggregation,
        rules: backupRules,
        refNames: buildPerspectiveRefNames(backupRules),
      },
      refreshedDisplay: refreshed,
    });
  } catch (error) {
    // Any failure after the backup was taken must leave the perspective intact.
    if (perspective && backupRules !== null) {
      try {
        perspective.archivedFilterRules = backupRules;
        perspective.archivedTopLevelFilterAggregation = backupAggregation;
        perspective.name = backupName;
      } catch (restoreError) {
        return JSON.stringify({
          success: false,
          error: error.message || String(error),
          restoreFailed: restoreError.message || String(restoreError),
        });
      }
    }
    return JSON.stringify({
      success: false,
      error: error.message || String(error),
    });
  }
})();
