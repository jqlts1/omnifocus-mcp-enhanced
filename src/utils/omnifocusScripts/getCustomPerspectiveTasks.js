// Get tasks from a custom perspective by name (supports hierarchical relationships)
// Based on and improved from user-provided code

(() => {
  try {
    // Get injected arguments
    const perspectiveName = injectedArgs && injectedArgs.perspectiveName ? injectedArgs.perspectiveName : null;

    if (!perspectiveName) {
      throw new Error("Perspective name cannot be empty");
    }

    // Look up the custom perspective by name
    let perspective = Perspective.Custom.byName(perspectiveName);
    if (!perspective) {
      throw new Error(`No custom perspective found with name "${perspectiveName}"`);
    }

    // Switch to the specified perspective
    document.windows[0].perspective = perspective;

    // Map to store all tasks keyed by task ID (supports hierarchical relationships)
    let taskMap = {};

    // Traverse the content tree to collect task info (including hierarchy)
    let rootNode = document.windows[0].content.rootNode;

    function collectTasks(node, parentId) {
      if (node.object && node.object instanceof Task) {
        let t = node.object;
        let id = t.id.primaryKey;

        // Record task info (including hierarchical relationships)
        taskMap[id] = {
          id: id,
          name: t.name,
          note: t.note || "",
          project: t.containingProject ? t.containingProject.name : (t.project ? t.project.name : null),
          tags: t.tags ? t.tags.map(tag => tag.name) : [],
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          deferDate: t.deferDate ? t.deferDate.toISOString() : null,
          plannedDate: t.plannedDate ? t.plannedDate.toISOString() : null,
          completed: t.completed,
          flagged: t.flagged,
          estimatedMinutes: t.estimatedMinutes || null,
          repetitionRule: t.repetitionRule ? t.repetitionRule.toString() : null,
          creationDate: t.added ? t.added.toISOString() : null,
          completionDate: t.completedDate ? t.completedDate.toISOString() : null,
          parent: parentId,     // Parent task ID
          children: [],         // Child task IDs, populated below
        };

        // Recursively collect child tasks
        node.children.forEach(childNode => {
          if (childNode.object && childNode.object instanceof Task) {
            let childId = childNode.object.id.primaryKey;
            taskMap[id].children.push(childId);
            collectTasks(childNode, id);
          } else {
            collectTasks(childNode, id);
          }
        });
      } else {
        // Not a task node — recurse into children
        node.children.forEach(childNode => collectTasks(childNode, parentId));
      }
    }

    // Start collecting tasks (root tasks have parent = null)
    if (rootNode && rootNode.children) {
      rootNode.children.forEach(node => collectTasks(node, null));
    }

    // Count total tasks
    const taskCount = Object.keys(taskMap).length;

    // Return result (including hierarchical structure)
    const result = {
      success: true,
      perspectiveName: perspectiveName,
      perspectiveId: perspective.identifier,
      count: taskCount,
      taskMap: taskMap
    };

    return JSON.stringify(result);

  } catch (error) {
    // Error handling
    const errorResult = {
      success: false,
      error: error.message || String(error),
      perspectiveName: perspectiveName || null,
      perspectiveId: null,
      count: 0,
      taskMap: {}
    };

    return JSON.stringify(errorResult);
  }
})();
