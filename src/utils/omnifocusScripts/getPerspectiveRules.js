// Reads a custom perspective's filter rules together with the display names of
// every tag, project, and folder the rules reference.
//
// OmniFocus stores references as primary keys, so the caller cannot render or
// re-write a rule without this lookup table.
//
// Helpers come from perspectiveRuleHelpers.js, prepended at execution time.

(() => {
  const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};

  try {
    if (!args.perspectiveId && !args.perspectiveName) {
      const perspectives = Perspective.Custom.all.map((p) => {
        let rules = [];
        let aggregation = null;
        try {
          rules = p.archivedFilterRules || [];
          aggregation = p.archivedTopLevelFilterAggregation;
        } catch (e) {
          rules = [];
        }
        return {
          name: p.name,
          identifier: p.identifier,
          aggregation: aggregation,
          rules: rules,
        };
      });
      return JSON.stringify({
        success: true,
        count: perspectives.length,
        perspectives: perspectives,
      });
    }

    const perspective = findCustomPerspective(
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

    const rules = perspective.archivedFilterRules || [];
    return JSON.stringify({
      success: true,
      perspective: {
        name: perspective.name,
        identifier: perspective.identifier,
        aggregation: perspective.archivedTopLevelFilterAggregation,
        rules: rules,
        refNames: buildPerspectiveRefNames(rules),
      },
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message || String(error),
    });
  }
})();
