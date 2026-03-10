import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import {
  buildPerspectiveTaskTree,
  PerspectiveDisplayMode,
  PerspectiveProjectGroup,
  PerspectiveTaskNode
} from './perspectiveTaskTree.js';

export interface GetCustomPerspectiveTasksOptions {
  perspectiveName: string;
  hideCompleted?: boolean;
  limit?: number;
  displayMode?: PerspectiveDisplayMode;
  // Legacy params retained for compatibility with existing callers.
  showHierarchy?: boolean;
  groupByProject?: boolean;
}

export async function getCustomPerspectiveTasks(options: GetCustomPerspectiveTasksOptions): Promise<string> {
  const {
    perspectiveName,
    hideCompleted = true,
    limit = 1000,
    displayMode = 'project_tree'
  } = options;

  if (!perspectiveName) {
    return 'Error: perspective name cannot be empty';
  }

  try {
    const result = await executeOmniFocusScript('@getCustomPerspectiveTasks.js', {
      perspectiveName
    });

    const data = parseScriptResult(result);
    if (!data.success) {
      throw new Error(data.error || 'Unknown error occurred');
    }

    const allTasks = Object.values(data.taskMap || {}) as any[];
    const tree = buildPerspectiveTaskTree(allTasks, {
      hideCompleted,
      inboxLabel: 'Inbox'
    });

    if (tree.flatTasks.length === 0) {
      return `**Perspective Tasks: ${perspectiveName}**\n\nNo ${hideCompleted ? 'incomplete ' : ''}tasks found.`;
    }

    if (displayMode === 'task_tree') {
      return formatTaskTree(perspectiveName, tree.rootTasks, tree.flatTasks.length, data.count || tree.flatTasks.length);
    }

    if (displayMode === 'flat') {
      return formatFlatTasks(perspectiveName, tree.flatTasks, limit, data.count || tree.flatTasks.length);
    }

    return formatProjectTree(perspectiveName, tree.projectGroups, tree.flatTasks.length, data.count || tree.flatTasks.length);
  } catch (error) {
    console.error('Error in getCustomPerspectiveTasks:', error);
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function parseScriptResult(result: unknown): any {
  if (typeof result === 'string') {
    try {
      return JSON.parse(result);
    } catch (_error) {
      throw new Error(`Failed to parse string result: ${result}`);
    }
  }

  if (typeof result === 'object' && result !== null) {
    return result;
  }

  throw new Error(`Script returned an invalid result type: ${typeof result}, value: ${result}`);
}

function formatProjectTree(
  perspectiveName: string,
  groups: PerspectiveProjectGroup[],
  visibleCount: number,
  totalCount: number
): string {
  const lines: string[] = [];
  lines.push(`## Perspective Tasks: ${perspectiveName}`);
  lines.push('');
  lines.push(`**Mode: Project Tree** · ${visibleCount} visible tasks`);

  groups.forEach((group) => {
    const heading = group.projectName === 'Inbox' ? '### 📥 Inbox' : `### 📁 ${group.projectName}`;
    lines.push('');
    lines.push(heading);
    lines.push('');
    renderTaskNodes(group.rootTasks, lines, '', false);
  });

  if (totalCount > visibleCount) {
    lines.push('');
    lines.push(`Found ${totalCount} tasks total, showing ${visibleCount}.`);
  }

  return lines.join('\n');
}

function formatTaskTree(
  perspectiveName: string,
  rootTasks: PerspectiveTaskNode[],
  visibleCount: number,
  totalCount: number
): string {
  const lines: string[] = [];
  lines.push(`## Perspective Tasks: ${perspectiveName}`);
  lines.push('');
  lines.push(`**Mode: Task Tree** · ${visibleCount} visible tasks`);
  lines.push('');
  renderTaskNodes(rootTasks, lines, '', true);

  if (totalCount > visibleCount) {
    lines.push('');
    lines.push(`Found ${totalCount} tasks total, showing ${visibleCount}.`);
  }

  return lines.join('\n');
}

function formatFlatTasks(
  perspectiveName: string,
  tasks: PerspectiveTaskNode[],
  limit: number,
  totalCount: number
): string {
  const displayTasks = limit > 0 ? tasks.slice(0, limit) : tasks;

  const lines: string[] = [];
  lines.push(`## Perspective Tasks: ${perspectiveName}`);
  lines.push('');
  lines.push(`**Mode: Flat List** · Showing ${displayTasks.length} / ${tasks.length}`);
  lines.push('');

  displayTasks.forEach((task, index) => {
    lines.push(`${index + 1}. ${formatTaskTitle(task)}`);
    formatTaskDetails(task, true).forEach((detail) => {
      lines.push(`   ${detail}`);
    });
    lines.push('');
  });

  if (totalCount > displayTasks.length) {
    lines.push(`Found ${totalCount} tasks total, showing ${displayTasks.length}.`);
  }

  return lines.join('\n').trimEnd();
}

function renderTaskNodes(
  tasks: PerspectiveTaskNode[],
  lines: string[],
  prefix: string,
  includeProject: boolean,
  ancestry: Set<string> = new Set()
): void {
  tasks.forEach((task, index) => {
    const isLast = index === tasks.length - 1;
    const branchPrefix = prefix + (isLast ? '└─ ' : '├─ ');
    const detailPrefix = prefix + (isLast ? '   ' : '│  ');

    lines.push(branchPrefix + formatTaskTitle(task));
    formatTaskDetails(task, includeProject).forEach((detail) => {
      lines.push(detailPrefix + detail);
    });

    if (task.children.length === 0) {
      return;
    }

    if (ancestry.has(task.id)) {
      lines.push(detailPrefix + '⚠️ Circular reference detected, stopping expansion');
      return;
    }

    const nextAncestry = new Set(ancestry);
    nextAncestry.add(task.id);
    const nextPrefix = prefix + (isLast ? '   ' : '│  ');
    renderTaskNodes(task.children, lines, nextPrefix, includeProject, nextAncestry);
  });
}

function formatTaskTitle(task: PerspectiveTaskNode): string {
  const statusIcon = task.completed || task.dropped ? '✅' : (task.flagged ? '🔶' : '○');
  const tags = task.displayTags.length > 0 ? ` ${task.displayTags.join(' ')}` : '';
  return `${statusIcon} **${task.name}**${tags}`;
}

function formatTaskDetails(task: PerspectiveTaskNode, includeProject: boolean): string[] {
  const details: string[] = [];

  if (includeProject && task.projectName) {
    details.push(`Project: ${task.projectName}`);
  }

  if (task.dueDate) {
    details.push(`Due: ${formatDate(task.dueDate)}`);
  }

  if (task.deferDate) {
    details.push(`Defer: ${formatDate(task.deferDate)}`);
  }

  if (task.plannedDate) {
    details.push(`Planned: ${formatDate(task.plannedDate)}`);
  }

  if (typeof task.estimatedMinutes === 'number') {
    const hours = Math.floor(task.estimatedMinutes / 60);
    const minutes = task.estimatedMinutes % 60;
    if (hours > 0) {
      details.push(`Estimate: ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`);
    } else {
      details.push(`Estimate: ${minutes}m`);
    }
  }

  const note = task.note.trim();
  if (note.length > 0) {
    const noteLines = note.split(/\r?\n/);
    noteLines.forEach((line, index) => {
      details.push(index === 0 ? `Note: ${line}` : `      ${line}`);
    });
  }

  return details;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-US');
}
