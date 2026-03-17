(() => {
  const taskId = injectedArgs && injectedArgs.taskId ? injectedArgs.taskId : null;
  const taskName = injectedArgs && injectedArgs.taskName ? injectedArgs.taskName : null;
  const attachmentId = injectedArgs && injectedArgs.attachmentId ? injectedArgs.attachmentId : null;
  const attachmentName = injectedArgs && injectedArgs.attachmentName ? injectedArgs.attachmentName : null;

  function readWrapperContents(wrapper) {
    try {
      if (wrapper.regularFileContents && typeof wrapper.regularFileContents.toBase64 === 'function') {
        return wrapper.regularFileContents.toBase64();
      }
    } catch {
      // Fall through to alternate accessor
    }

    try {
      if (wrapper.contents && typeof wrapper.contents.toBase64 === 'function') {
        return wrapper.contents.toBase64();
      }
    } catch {
      // Nothing else to do
    }

    return null;
  }

  try {
    if ((!taskId && !taskName) || (!attachmentId && !attachmentName)) {
      throw new Error('taskId/taskName and attachmentId/attachmentName are required');
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

    const wrappers = task.attachments || [];
    let targetWrapper = null;
    let resolvedAttachmentId = null;
    let resolvedAttachmentName = null;

    for (let index = 0; index < wrappers.length; index += 1) {
      const wrapper = wrappers[index];
      let name = null;

      try {
        name = wrapper.preferredFilename || null;
      } catch {
        name = null;
      }

      const generatedId = `embedded-${index + 1}`;
      const generatedName = name || `attachment-${index + 1}`;

      if (
        (attachmentId && generatedId === attachmentId) ||
        (attachmentName && generatedName === attachmentName)
      ) {
        targetWrapper = wrapper;
        resolvedAttachmentId = generatedId;
        resolvedAttachmentName = generatedName;
        break;
      }
    }

    if (!targetWrapper) {
      throw new Error('Embedded attachment not found');
    }

    const base64 = readWrapperContents(targetWrapper);

    if (!base64) {
      throw new Error('Attachment content could not be read');
    }

    return JSON.stringify({
      success: true,
      attachment: {
        id: resolvedAttachmentId,
        name: resolvedAttachmentName,
        source: 'embedded'
      },
      content: {
        base64
      }
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
})();
