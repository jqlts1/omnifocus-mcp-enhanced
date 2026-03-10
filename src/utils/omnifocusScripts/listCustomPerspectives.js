// Get a list of all custom perspectives
// Uses the OmniJS API: Perspective.Custom.all

(() => {
  try {
    // Retrieve all custom perspectives
    const customPerspectives = Perspective.Custom.all;

    // Format the result
    const perspectives = customPerspectives.map(p => ({
      name: p.name,
      identifier: p.identifier
    }));

    // Return the result
    const result = {
      success: true,
      count: perspectives.length,
      perspectives: perspectives
    };

    return JSON.stringify(result);

  } catch (error) {
    // Error handling
    const errorResult = {
      success: false,
      error: error.message || String(error),
      count: 0,
      perspectives: []
    };

    return JSON.stringify(errorResult);
  }
})();
