export type PerspectiveDisplayMode = 'project_tree' | 'task_tree' | 'flat';

export interface PerspectiveTaskInput {
  id: string;
  name: string;
  note?: string;
  completed?: boolean;
  dropped?: boolean;
  flagged?: boolean;
  dueDate?: string | null;
  deferDate?: string | null;
  plannedDate?: string | null;
  completionDate?: string | null;
  creationDate?: string | null;
  estimatedMinutes?: number | null;
  project?: string | null;
  projectName?: string | null;
  parent?: string | null;
  parentTaskInfo?: { id?: string; name?: string } | null;
  tags?: Array<string | { id?: string; name?: string }>;
}

export interface PerspectiveTaskNode {
  id: string;
  name: string;
  note: string;
  completed: boolean;
  dropped: boolean;
  flagged: boolean;
  dueDate: string | null;
  deferDate: string | null;
  plannedDate: string | null;
  completionDate: string | null;
  creationDate: string | null;
  estimatedMinutes: number | null;
  projectName: string | null;
  parentId: string | null;
  tags: string[];
  displayTags: string[];
  children: PerspectiveTaskNode[];
}

export interface PerspectiveProjectGroup {
  projectName: string;
  rootTasks: PerspectiveTaskNode[];
  taskCount: number;
}

export interface PerspectiveTaskTreeResult {
  rootTasks: PerspectiveTaskNode[];
  projectGroups: PerspectiveProjectGroup[];
  flatTasks: PerspectiveTaskNode[];
}

interface BuildTreeOptions {
  hideCompleted?: boolean;
  inboxLabel?: string;
}

export function buildPerspectiveTaskTree(
  tasks: PerspectiveTaskInput[],
  options: BuildTreeOptions = {}
): PerspectiveTaskTreeResult {
  const hideCompleted = options.hideCompleted !== false;
  const inboxLabel = options.inboxLabel || '收件箱';

  const rawById = new Map<string, PerspectiveTaskInput>();
  const orderById = new Map<string, number>();

  tasks.forEach((task, index) => {
    rawById.set(task.id, task);
    orderById.set(task.id, index);
  });

  const visibleTasks = tasks.filter((task) => !isHiddenTask(task, hideCompleted));
  const nodeById = new Map<string, PerspectiveTaskNode>();

  visibleTasks.forEach((task) => {
    const normalizedTags = normalizeTags(task.tags);
    nodeById.set(task.id, {
      id: task.id,
      name: task.name,
      note: String(task.note || ''),
      completed: Boolean(task.completed),
      dropped: Boolean(task.dropped),
      flagged: Boolean(task.flagged),
      dueDate: task.dueDate || null,
      deferDate: task.deferDate || null,
      plannedDate: task.plannedDate || null,
      completionDate: task.completionDate || null,
      creationDate: task.creationDate || null,
      estimatedMinutes: typeof task.estimatedMinutes === 'number' ? task.estimatedMinutes : null,
      projectName: resolveProjectName(task),
      parentId: null,
      tags: normalizedTags,
      displayTags: normalizedTags.map(toDisplayTag),
      children: [],
    });
  });

  const rootTasks: PerspectiveTaskNode[] = [];

  visibleTasks.forEach((task) => {
    const node = nodeById.get(task.id);
    if (!node) {
      return;
    }

    const parentId = findNearestVisibleParentId(task, rawById, nodeById);

    if (!parentId || parentId === task.id || createsCycle(task.id, parentId, rawById)) {
      node.parentId = null;
      rootTasks.push(node);
      return;
    }

    const parentNode = nodeById.get(parentId);
    if (!parentNode) {
      node.parentId = null;
      rootTasks.push(node);
      return;
    }

    node.parentId = parentId;
    parentNode.children.push(node);
  });

  sortTree(rootTasks, orderById);

  const flatTasks = visibleTasks
    .map((task) => nodeById.get(task.id))
    .filter((task): task is PerspectiveTaskNode => Boolean(task));

  const projectGroups = buildProjectGroups(rootTasks, inboxLabel);

  return {
    rootTasks,
    projectGroups,
    flatTasks,
  };
}

function isHiddenTask(task: PerspectiveTaskInput, hideCompleted: boolean): boolean {
  return hideCompleted && (Boolean(task.completed) || Boolean(task.dropped));
}

function resolveProjectName(task: PerspectiveTaskInput): string | null {
  const projectName = task.projectName ?? task.project ?? null;
  if (!projectName) {
    return null;
  }
  const normalized = String(projectName).trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveParentId(task: PerspectiveTaskInput): string | null {
  if (typeof task.parent === 'string' && task.parent.trim().length > 0) {
    return task.parent.trim();
  }

  if (task.parentTaskInfo?.id && task.parentTaskInfo.id.trim().length > 0) {
    return task.parentTaskInfo.id.trim();
  }

  return null;
}

function findNearestVisibleParentId(
  task: PerspectiveTaskInput,
  rawById: Map<string, PerspectiveTaskInput>,
  nodeById: Map<string, PerspectiveTaskNode>
): string | null {
  let parentId = resolveParentId(task);
  const visited = new Set<string>();

  while (parentId) {
    if (visited.has(parentId)) {
      return null;
    }
    visited.add(parentId);

    if (nodeById.has(parentId)) {
      return parentId;
    }

    const parentTask = rawById.get(parentId);
    if (!parentTask) {
      return null;
    }

    parentId = resolveParentId(parentTask);
  }

  return null;
}

function createsCycle(nodeId: string, parentId: string, rawById: Map<string, PerspectiveTaskInput>): boolean {
  let currentParentId: string | null = parentId;
  const visited = new Set<string>([nodeId]);

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      return true;
    }

    visited.add(currentParentId);
    const parentTask = rawById.get(currentParentId);
    if (!parentTask) {
      return false;
    }

    currentParentId = resolveParentId(parentTask);
  }

  return false;
}

function normalizeTags(tags: PerspectiveTaskInput['tags']): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalized = tags
    .map((tag) => {
      if (typeof tag === 'string') {
        return tag.trim();
      }
      if (tag && typeof tag === 'object' && typeof tag.name === 'string') {
        return tag.name.trim();
      }
      return '';
    })
    .filter((tag) => tag.length > 0);

  return [...new Set(normalized)];
}

function toDisplayTag(tag: string): string {
  return tag.startsWith('#') ? tag : `#${tag}`;
}

function sortTree(nodes: PerspectiveTaskNode[], orderById: Map<string, number>): void {
  nodes.sort((a, b) => (orderById.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderById.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  nodes.forEach((node) => sortTree(node.children, orderById));
}

function buildProjectGroups(rootTasks: PerspectiveTaskNode[], inboxLabel: string): PerspectiveProjectGroup[] {
  const groups = new Map<string, PerspectiveTaskNode[]>();
  const orderedNames: string[] = [];

  rootTasks.forEach((task) => {
    const projectName = task.projectName || inboxLabel;
    if (!groups.has(projectName)) {
      groups.set(projectName, []);
      orderedNames.push(projectName);
    }
    groups.get(projectName)!.push(task);
  });

  return orderedNames.map((projectName) => {
    const tasks = groups.get(projectName) || [];
    const taskCount = tasks.reduce((count, task) => count + countNodeTree(task), 0);
    return {
      projectName,
      rootTasks: tasks,
      taskCount,
    };
  });
}

function countNodeTree(node: PerspectiveTaskNode): number {
  return 1 + node.children.reduce((count, child) => count + countNodeTree(child), 0);
}
