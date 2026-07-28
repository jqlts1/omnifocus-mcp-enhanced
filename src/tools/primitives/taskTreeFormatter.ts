export interface TaskTreeNode {
  id: string;
  name: string;
  note?: string;
  taskStatus?: string;
  flagged?: boolean;
  dueDate?: string | null;
  deferDate?: string | null;
  plannedDate?: string | null;
  estimatedMinutes?: number | null;
  projectId?: string | null;
  projectName?: string | null;
  parentId?: string | null;
  inInbox?: boolean;
  isRepeating?: boolean;
  tags?: Array<{ id?: string; name: string }>;
  childrenCount?: number;
  children?: TaskTreeNode[];
  childrenTruncated?: boolean;
}

export interface TaskTreeFormatOptions {
  showSubtasks?: boolean;
  numberTopLevel?: boolean;
  bullet?: string;
  forceFlag?: boolean;
  matchedTags?: string[];
}

export function subtaskCountLabel(count: number): string {
  return `[${count} ${count === 1 ? 'subtask' : 'subtasks'}]`;
}

function statusIcon(status?: string): string {
  const icons: Record<string, string> = {
    Available: '⚪',
    Next: '🔵',
    Blocked: '🔴',
    DueSoon: '🟡',
    Overdue: '🔴',
    Completed: '✅',
    Dropped: '⚫',
  };
  return icons[status || ''] || '⚪';
}

function metadata(task: TaskTreeNode, includeProject = false): string {
  const parts: string[] = [];
  if (task.dueDate)
    parts.push(`DUE: ${new Date(task.dueDate).toLocaleDateString()}`);
  if (task.deferDate)
    parts.push(`DEFER: ${new Date(task.deferDate).toLocaleDateString()}`);
  if (task.plannedDate)
    parts.push(`PLAN: ${new Date(task.plannedDate).toLocaleDateString()}`);
  if (task.taskStatus && task.taskStatus !== 'Available')
    parts.push(task.taskStatus);
  if (task.estimatedMinutes) parts.push(`⏱${task.estimatedMinutes}m`);
  if (includeProject) parts.push(task.projectName || 'Inbox');
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

function formatChild(
  task: TaskTreeNode,
  prefix: string,
  isLast: boolean,
  options: TaskTreeFormatOptions,
): string {
  const branch = isLast ? '└──' : '├──';
  const count = task.childrenCount || 0;
  let output = `${prefix}${branch} ${statusIcon(task.taskStatus)} `;
  if (task.flagged) output += '🚩 ';
  output += `${task.name}${metadata(task)} ${subtaskCountLabel(count)}\n`;

  const continuation = prefix + (isLast ? '    ' : '│   ');
  if (task.note && task.note.trim()) {
    output += `${continuation}📝 ${task.note.trim()}\n`;
  }

  if (task.tags && task.tags.length > 0) {
    output += `${continuation}🏷 ${task.tags.map((tag) => tag.name).join(', ')}\n`;
  }

  if (options.showSubtasks && task.children && task.children.length > 0) {
    task.children.forEach((child, index) => {
      output += formatChild(
        child,
        continuation,
        index === task.children!.length - 1,
        options,
      );
    });
  }

  if (task.childrenTruncated && count > (task.children?.length || 0)) {
    output += `${continuation}… ${count - (task.children?.length || 0)} subtask(s) not expanded\n`;
  }

  return output;
}

export function formatTaskTreeNode(
  task: TaskTreeNode,
  topLevelPrefix: string,
  options: TaskTreeFormatOptions = {},
): string {
  const count = task.childrenCount || 0;
  let output = topLevelPrefix;
  if (options.forceFlag || task.flagged) output += '🚩 ';
  output += `${task.name}${metadata(task)} ${subtaskCountLabel(count)}\n`;

  if (task.note && task.note.trim()) {
    output += `   📝 ${task.note.trim()}\n`;
  }

  if (task.tags && task.tags.length > 0) {
    const matched = new Set(options.matchedTags || []);
    const names = task.tags.map((tag) =>
      matched.has(tag.name) ? `**${tag.name}**` : tag.name,
    );
    output += `   🏷 ${names.join(', ')}\n`;
  }

  if (options.showSubtasks && task.children && task.children.length > 0) {
    output += `   │\n`;
    task.children.forEach((child, index) => {
      output += formatChild(
        child,
        '   ',
        index === task.children!.length - 1,
        options,
      );
    });
  }

  if (task.childrenTruncated && count > (task.children?.length || 0)) {
    output += `   … ${count - (task.children?.length || 0)} subtask(s) not expanded\n`;
  }

  return output;
}

function collectDescendantIds(task: TaskTreeNode, ids: Set<string>): void {
  for (const child of task.children || []) {
    ids.add(child.id);
    collectDescendantIds(child, ids);
  }
}

export function dedupeExpandedTopLevelTasks(
  tasks: TaskTreeNode[],
  showSubtasks: boolean,
): TaskTreeNode[] {
  if (!showSubtasks) return tasks;

  const descendantIds = new Set<string>();
  for (const task of tasks) collectDescendantIds(task, descendantIds);
  return tasks.filter((task) => !descendantIds.has(task.id));
}
