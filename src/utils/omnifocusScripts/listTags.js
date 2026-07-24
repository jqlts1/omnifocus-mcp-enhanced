// List OmniFocus tags without loading task data.
(() => {
  try {
    const tags = flattenedTags
      .filter(tag => includeInactive || tag.active)
      .map(tag => ({
        id: tag.id.primaryKey,
        name: tag.name,
        parentTagID: tag.parent ? tag.parent.id.primaryKey : null,
        active: tag.active
      }));

    return JSON.stringify({ success: true, count: tags.length, tags });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message || String(error),
      count: 0,
      tags: []
    });
  }
})();
