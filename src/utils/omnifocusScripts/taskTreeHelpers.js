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

function omnifocusMcpScheduleTypeName(value) {
  const types = typeof Task !== "undefined" ? Task.RepetitionScheduleType : null;
  if (!types || value === null || value === undefined) return null;
  if (value === types.Regularly) return "Regularly";
  if (value === types.FromCompletion) return "FromCompletion";
  if (value === types.None) return "None";
  return null;
}

function omnifocusMcpAnchorDateKeyName(value) {
  const keys = typeof Task !== "undefined" ? Task.AnchorDateKey : null;
  if (!keys || value === null || value === undefined) return null;
  if (value === keys.DueDate) return "DueDate";
  if (value === keys.DeferDate) return "DeferDate";
  if (value === keys.PlannedDate) return "PlannedDate";
  return null;
}

function omnifocusMcpRepetition(task) {
  let rule = null;
  try {
    rule = task.repetitionRule || null;
  } catch (error) {
    rule = null;
  }
  if (!rule) return null;

  let nextOccurrence = null;
  try {
    const next = rule.firstDateAfterDate(new Date());
    nextOccurrence = next ? next.toISOString() : null;
  } catch (error) {
    nextOccurrence = null;
  }

  return {
    ruleString: rule.ruleString || "",
    scheduleType: omnifocusMcpScheduleTypeName(rule.scheduleType),
    anchorDateKey: omnifocusMcpAnchorDateKeyName(rule.anchorDateKey),
    catchUpAutomatically: !!rule.catchUpAutomatically,
    nextOccurrence,
  };
}

function omnifocusMcpIsRepeating(task) {
  try {
    return !!task.repetitionRule;
  } catch (error) {
    return false;
  }
}

const omnifocusMcpTagPathCache = {};

function omnifocusMcpSerializeTag(tag) {
  const leafId = tag && tag.id ? tag.id.primaryKey : null;
  if (leafId && omnifocusMcpTagPathCache[leafId]) {
    return omnifocusMcpTagPathCache[leafId];
  }

  const chain = [];
  const visited = {};
  let current = tag;
  let depth = 0;
  while (current && depth < 64) {
    let currentId = null;
    let currentName = null;
    let parent = null;
    try {
      currentId = current.id ? current.id.primaryKey : null;
      currentName = current.name || null;
      parent = current.parent || null;
    } catch (error) {
      break;
    }

    if (currentId && visited[currentId]) break;
    if (currentId) visited[currentId] = true;
    if (currentName) chain.push({ id: currentId, name: currentName });
    current = parent;
    depth += 1;
  }

  chain.reverse();
  const leaf = chain.length > 0
    ? chain[chain.length - 1]
    : { id: leafId, name: tag && tag.name ? tag.name : "" };
  const serialized = {
    id: leafId || leaf.id,
    name: leaf.name,
    path: chain.length > 0
      ? chain.map((item) => item.name).join(" / ")
      : leaf.name,
    ancestorIds: chain
      .slice(0, -1)
      .map((item) => item.id)
      .filter((id) => !!id),
  };

  if (leafId) omnifocusMcpTagPathCache[leafId] = serialized;
  return serialized;
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
    taskStatus: omnifocusMcpTaskStatus(task.taskStatus),
    flagged: !!task.flagged,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    deferDate: task.deferDate ? task.deferDate.toISOString() : null,
    plannedDate: task.plannedDate ? task.plannedDate.toISOString() : null,
    estimatedMinutes: task.estimatedMinutes,
    projectId: task.containingProject ? task.containingProject.id.primaryKey : null,
    projectName: task.containingProject ? task.containingProject.name : null,
    parentId: task.parent ? task.parent.id.primaryKey : null,
    inInbox: !!task.inInbox,
    isRepeating: omnifocusMcpIsRepeating(task),
    childrenCount: visibleChildren.length,
    children: [],
    childrenTruncated: false,
  };
  if (!options.compact) {
    node.note = task.note || "";
    node.tags = (task.tags || []).map((tag) => omnifocusMcpSerializeTag(tag));
  }

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
      compact: args.outputMode === "compact",
      // A hard safety cap prevents accidental multi-thousand-node MCP responses.
      maxSubtaskNodes: 500,
    },
    0,
    args.__omnifocusMcpTaskTreeState,
  );
}
