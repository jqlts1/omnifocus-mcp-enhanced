(() => {
  const taskId = injectedArgs && injectedArgs.taskId ? injectedArgs.taskId : null;
  const taskName = injectedArgs && injectedArgs.taskName ? injectedArgs.taskName : null;

  function formatDate(date) {
    if (!date) {
      return null;
    }

    try {
      return date.toISOString();
    } catch {
      return null;
    }
  }

  function serializeAttachment(wrapper, index) {
    let preferredFilename = null;

    try {
      preferredFilename = wrapper.preferredFilename || null;
    } catch {
      preferredFilename = null;
    }

    return {
      id: `embedded-${index + 1}`,
      name: preferredFilename || `attachment-${index + 1}`,
      sizeBytes: null
    };
  }

  function serializeLinkedFileURL(fileUrl) {
    try {
      return fileUrl.toString();
    } catch {
      return null;
    }
  }

  try {
    if (!taskId && !taskName) {
      throw new Error('Either taskId or taskName must be provided');
    }

    const task = flattenedTasks.find(candidate => {
      if (taskId) {
        return candidate.id.primaryKey === taskId;
      }

      return candidate.name === taskName;
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const parentTask = task.parent || null;
    const containingProject = task.containingProject || null;
    const attachments = (task.attachments || []).map((wrapper, index) => serializeAttachment(wrapper, index));
    const linkedFileURLs = (task.linkedFileURLs || [])
      .map(fileUrl => serializeLinkedFileURL(fileUrl))
      .filter(Boolean);

    return JSON.stringify({
      success: true,
      task: {
        id: task.id.primaryKey,
        name: task.name,
        note: task.note || '',
        parentId: parentTask ? parentTask.id.primaryKey : null,
        parentName: parentTask ? parentTask.name : null,
        projectId: containingProject ? containingProject.id.primaryKey : null,
        projectName: containingProject ? containingProject.name : null,
        hasChildren: (task.children || []).length > 0,
        childrenCount: (task.children || []).length,
        tags: (task.tags || []).map(tag => tag.name),
        dueDate: formatDate(task.dueDate),
        deferDate: formatDate(task.deferDate),
        plannedDate: formatDate(task.plannedDate),
        flagged: !!task.flagged,
        completed: !!task.completed,
        estimatedMinutes: task.estimatedMinutes || null,
        attachments,
        linkedFileURLs
      }
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
})();
