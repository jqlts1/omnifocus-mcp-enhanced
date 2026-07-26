// Shared OmniJS helpers for serializing task hierarchies.
// This file is prepended to task-list scripts by executeOmniFocusScript.

function omnifocusMcpTaskStatus(status) {
  const taskStatusMap = {
    [Task.Status.Available]: "Available",
    [Task.Status.Blocked]: "Blocked",
    [Task.Status.Completed]: "Completed",
    [Task.Status.Dropped]: "Dropped",
    [Task.Status.DueSoon]: "DueSoon",
    [Task.Status.Next]: "Next",
    [Task.Status.Overdue]: "Overdue",
  };
  return taskStatusMap[status] || "Unknown";
}

function omnifocusMcpVisibleChildren(task, hideCompleted) {
  let children = [];
  try {
    children = task.children || [];
  } catch (error) {
    children = [];
  }

  if (!hideCompleted) return children;
  return children.filter(
    (child) =>
      child.taskStatus !== Task.Status.Completed &&
      child.taskStatus !== Task.Status.Dropped,
  );
}

function omnifocusMcpSerializeTaskNode(task, options, depth, state) {
  const visibleChildren = omnifocusMcpVisibleChildren(task, options.hideCompleted);
  const canExpand =
    options.showSubtasks &&
    (options.maxSubtaskDepth === null || depth < options.maxSubtaskDepth) &&
    state.nodes < options.maxSubtaskNodes;

  const node = {
    id: task.id.primaryKey,
    name: task.name,
    note: task.note || "",
    taskStatus: omnifocusMcpTaskStatus(task.taskStatus),
    flagged: !!task.flagged,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    deferDate: task.deferDate ? task.deferDate.toISOString() : null,
    plannedDate: task.plannedDate ? task.plannedDate.toISOString() : null,
    estimatedMinutes: task.estimatedMinutes,
    projectId: task.containingProject ? task.containingProject.id.primaryKey : null,
    projectName: task.containingProject ? task.containingProject.name : null,
    inInbox: !!task.inInbox,
    tags: (task.tags || []).map((tag) => ({
      id: tag.id.primaryKey,
      name: tag.name,
    })),
    childrenCount: visibleChildren.length,
    children: [],
    childrenTruncated: false,
  };

  if (canExpand) {
    for (let index = 0; index < visibleChildren.length; index += 1) {
      if (state.nodes >= options.maxSubtaskNodes) {
        node.childrenTruncated = true;
        break;
      }
      state.nodes += 1;
      node.children.push(
        omnifocusMcpSerializeTaskNode(visibleChildren[index], options, depth + 1, state),
      );
    }
  } else if (options.showSubtasks && visibleChildren.length > 0) {
    node.childrenTruncated = true;
  }

  return node;
}

function omnifocusMcpSerializeTask(task, args, hideCompleted) {
  const maxDepthValue = Number(args.maxSubtaskDepth);
  const maxSubtaskDepth =
    args.maxSubtaskDepth === undefined || args.maxSubtaskDepth === null
      ? null
      : Math.max(0, Math.floor(maxDepthValue));

  if (!args.__omnifocusMcpTaskTreeState) {
    args.__omnifocusMcpTaskTreeState = { nodes: 0 };
  }

  return omnifocusMcpSerializeTaskNode(
    task,
    {
      hideCompleted: hideCompleted !== false,
      showSubtasks: args.showSubtasks === true,
      maxSubtaskDepth,
      // A hard safety cap prevents accidental multi-thousand-node MCP responses.
      maxSubtaskNodes: 500,
    },
    0,
    args.__omnifocusMcpTaskTreeState,
  );
}
