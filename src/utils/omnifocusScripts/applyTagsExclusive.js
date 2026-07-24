// OmniJS script to apply tags to a task while respecting mutually exclusive tag groups.
// When a tag belongs to a mutually exclusive group (childrenAreMutuallyExclusive === true
// on its parent), sibling tags from the same group are removed before the new tag is added.
(() => {
  try {
    const args = (typeof injectedArgs !== 'undefined') ? injectedArgs : {};
    const taskId = args.taskId;
    const tagNames = Array.isArray(args.tagNames) ? args.tagNames : [];
    const mode = args.mode || 'add';

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

    // Helper: find a tag by name.
    function findTagByName(name) {
      if (typeof flattenedTags !== 'undefined' && flattenedTags.byName) {
        return flattenedTags.byName(name) || null;
      }
      if (typeof Tag !== 'undefined' && Tag.named) {
        return Tag.named(name) || null;
      }
      return null;
    }

    // Helper: remove a tag from the task if supported.
    function removeTagFromTask(taskObj, tagObj) {
      if (!tagObj) return;
      if (typeof taskObj.removeTag === 'function') {
        taskObj.removeTag(tagObj);
        return;
      }
      if (typeof taskObj.removeTags === 'function') {
        taskObj.removeTags([tagObj]);
      }
    }

    // Helper: add a tag to the task if supported.
    function addTagToTask(taskObj, tagObj) {
      if (!tagObj) return;
      if (typeof taskObj.addTag === 'function') {
        taskObj.addTag(tagObj);
        return;
      }
      if (typeof taskObj.addTags === 'function') {
        taskObj.addTags([tagObj]);
      }
    }

    const applied = [];
    const removedSiblings = [];
    const missing = [];

    // For replace mode, clear existing tags first.
    if (mode === 'replace') {
      if (typeof task.clearTags === 'function') {
        task.clearTags();
      } else if (typeof task.removeTags === 'function' && Array.isArray(task.tags)) {
        task.removeTags(task.tags.slice());
      }
    }

    const currentTags = () => (Array.isArray(task.tags) ? task.tags : []);

    tagNames.forEach(name => {
      const tag = findTagByName(name);
      if (!tag) {
        missing.push(name);
        return;
      }

      const parent = tag.parent;
      if (parent && parent.childrenAreMutuallyExclusive === true) {
        const siblings = Array.isArray(parent.children) ? parent.children : [];
        siblings.forEach(sibling => {
          if (!sibling || !sibling.id || !tag.id) return;
          if (sibling.id.primaryKey === tag.id.primaryKey) return;
          const hasSibling = currentTags().some(t => t.id && t.id.primaryKey === sibling.id.primaryKey);
          if (hasSibling) {
            removeTagFromTask(task, sibling);
            removedSiblings.push(sibling.name);
          }
        });
      }

      addTagToTask(task, tag);
      applied.push(name);
    });

    return JSON.stringify({ success: true, applied, removedSiblings, missing });
  } catch (error) {
    return JSON.stringify({ success: false, error: String(error) });
  }
})();
