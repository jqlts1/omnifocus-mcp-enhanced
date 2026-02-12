import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface FilterTasksOptions {
  // 🎯 任务状态过滤
  taskStatus?: string[];

  // 📍 透视范围
  perspective?: 'inbox' | 'flagged' | 'all' | 'custom';

  // 💫 自定义透视参数
  customPerspectiveName?: string;
  customPerspectiveId?: string;

  // 📁 项目/标签过滤
  projectFilter?: string;
  tagFilter?: string | string[];
  exactTagMatch?: boolean;

  // 📅 截止日期过滤
  dueBefore?: string;
  dueAfter?: string;
  dueToday?: boolean;
  dueThisWeek?: boolean;
  dueThisMonth?: boolean;
  overdue?: boolean;

  // 🚀 推迟日期过滤
  deferBefore?: string;
  deferAfter?: string;
  deferToday?: boolean;
  deferThisWeek?: boolean;
  deferAvailable?: boolean;

  // 🗓 计划日期过滤
  plannedBefore?: string;
  plannedAfter?: string;
  plannedToday?: boolean;
  plannedThisWeek?: boolean;
  plannedThisMonth?: boolean;

  // ✅ 完成日期过滤
  completedBefore?: string;
  completedAfter?: string;
  completedToday?: boolean;
  completedYesterday?: boolean;
  completedThisWeek?: boolean;
  completedThisMonth?: boolean;

  // 🚩 其他维度
  flagged?: boolean;
  searchText?: string;
  hasEstimate?: boolean;
  estimateMin?: number;
  estimateMax?: number;
  hasNote?: boolean;
  inInbox?: boolean;

  // 📊 输出控制
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isDateInTodayRange(date: Date): boolean {
  const todayStart = startOfDay(new Date());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);
  return date >= todayStart && date < tomorrowStart;
}

function isDateInCurrentWeek(date: Date): boolean {
  const today = new Date();
  const currentDay = today.getDay(); // Sunday = 0
  const mondayOffset = (currentDay + 6) % 7;
  const weekStart = startOfDay(today);
  weekStart.setDate(today.getDate() - mondayOffset);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return date >= weekStart && date < weekEnd;
}

function isDateInCurrentMonth(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function normalizeTaskTagNames(task: any): string[] {
  if (!Array.isArray(task?.tags)) {
    return [];
  }

  return task.tags
    .map((tag: any) => {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag.name === 'string') return tag.name;
      return '';
    })
    .filter((name: string) => name.trim() !== '')
    .map((name: string) => name.toLowerCase());
}

function matchesTagFilter(task: any, tagFilters: string[], exactTagMatch: boolean): boolean {
  const taskTagNames = normalizeTaskTagNames(task);
  if (taskTagNames.length === 0) return false;

  return tagFilters.some(filterTag => {
    return taskTagNames.some(taskTagName => {
      if (exactTagMatch) {
        return taskTagName === filterTag;
      }
      return taskTagName.includes(filterTag);
    });
  });
}

function shouldApplyClientSideFilters(options: FilterTasksOptions): boolean {
  return Boolean(
    options.tagFilter ||
    options.deferToday ||
    options.deferThisWeek ||
    options.deferAvailable ||
    options.deferBefore ||
    options.deferAfter ||
    options.plannedToday ||
    options.plannedThisWeek ||
    options.plannedThisMonth ||
    options.plannedBefore ||
    options.plannedAfter
  );
}

function sortTasks(tasks: any[], sortBy: string, sortOrder: 'asc' | 'desc'): any[] {
  const copy = [...tasks];
  const direction = sortOrder === 'desc' ? -1 : 1;

  const compareDate = (a: any, b: any, key: 'dueDate' | 'deferDate' | 'plannedDate' | 'completedDate') => {
    const dateA = parseDate(a?.[key]);
    const dateB = parseDate(b?.[key]);
    const valueA = dateA ? dateA.getTime() : Number.POSITIVE_INFINITY;
    const valueB = dateB ? dateB.getTime() : Number.POSITIVE_INFINITY;
    return (valueA - valueB) * direction;
  };

  copy.sort((a: any, b: any) => {
    switch (sortBy) {
      case 'dueDate':
        return compareDate(a, b, 'dueDate');
      case 'deferDate':
        return compareDate(a, b, 'deferDate');
      case 'plannedDate':
        return compareDate(a, b, 'plannedDate');
      case 'completedDate':
        return compareDate(a, b, 'completedDate');
      case 'flagged': {
        const flaggedA = a?.flagged ? 1 : 0;
        const flaggedB = b?.flagged ? 1 : 0;
        return (flaggedA - flaggedB) * direction;
      }
      case 'project': {
        const projectA = (a?.projectName || '').toLowerCase();
        const projectB = (b?.projectName || '').toLowerCase();
        return projectA.localeCompare(projectB) * direction;
      }
      case 'name':
      default: {
        const nameA = (a?.name || '').toLowerCase();
        const nameB = (b?.name || '').toLowerCase();
        return nameA.localeCompare(nameB) * direction;
      }
    }
  });

  return copy;
}

export function applyClientSideFilters(tasks: any[], options: FilterTasksOptions): any[] {
  let filteredTasks = tasks;

  if (options.tagFilter) {
    const exactTagMatch = options.exactTagMatch ?? false;
    const rawFilters = Array.isArray(options.tagFilter) ? options.tagFilter : [options.tagFilter];
    const normalizedFilters = rawFilters
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    if (normalizedFilters.length > 0) {
      filteredTasks = filteredTasks.filter(task =>
        matchesTagFilter(task, normalizedFilters, exactTagMatch)
      );
    }
  }

  if (options.deferToday) {
    filteredTasks = filteredTasks.filter(task => {
      const deferDate = parseDate(task?.deferDate);
      return deferDate ? isDateInTodayRange(deferDate) : false;
    });
  }

  if (options.deferThisWeek) {
    filteredTasks = filteredTasks.filter(task => {
      const deferDate = parseDate(task?.deferDate);
      return deferDate ? isDateInCurrentWeek(deferDate) : false;
    });
  }

  if (options.deferBefore) {
    const deferBefore = parseDate(options.deferBefore);
    if (deferBefore) {
      filteredTasks = filteredTasks.filter(task => {
        const deferDate = parseDate(task?.deferDate);
        return deferDate ? deferDate < deferBefore : false;
      });
    }
  }

  if (options.deferAfter) {
    const deferAfter = parseDate(options.deferAfter);
    if (deferAfter) {
      filteredTasks = filteredTasks.filter(task => {
        const deferDate = parseDate(task?.deferDate);
        return deferDate ? deferDate > deferAfter : false;
      });
    }
  }

  if (options.deferAvailable) {
    const now = new Date();
    filteredTasks = filteredTasks.filter(task => {
      const deferDate = parseDate(task?.deferDate);
      return !deferDate || deferDate <= now;
    });
  }

  if (options.plannedToday) {
    filteredTasks = filteredTasks.filter(task => {
      const plannedDate = parseDate(task?.plannedDate);
      return plannedDate ? isDateInTodayRange(plannedDate) : false;
    });
  }

  if (options.plannedThisWeek) {
    filteredTasks = filteredTasks.filter(task => {
      const plannedDate = parseDate(task?.plannedDate);
      return plannedDate ? isDateInCurrentWeek(plannedDate) : false;
    });
  }

  if (options.plannedThisMonth) {
    filteredTasks = filteredTasks.filter(task => {
      const plannedDate = parseDate(task?.plannedDate);
      return plannedDate ? isDateInCurrentMonth(plannedDate) : false;
    });
  }

  if (options.plannedBefore) {
    const plannedBefore = parseDate(options.plannedBefore);
    if (plannedBefore) {
      filteredTasks = filteredTasks.filter(task => {
        const plannedDate = parseDate(task?.plannedDate);
        return plannedDate ? plannedDate < plannedBefore : false;
      });
    }
  }

  if (options.plannedAfter) {
    const plannedAfter = parseDate(options.plannedAfter);
    if (plannedAfter) {
      filteredTasks = filteredTasks.filter(task => {
        const plannedDate = parseDate(task?.plannedDate);
        return plannedDate ? plannedDate > plannedAfter : false;
      });
    }
  }

  return filteredTasks;
}

export async function filterTasks(options: FilterTasksOptions = {}): Promise<string> {
  try {
    // 设置默认值
    const {
      perspective = 'all',
      exactTagMatch = false,
      limit = 100,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    const needsClientSideFiltering = shouldApplyClientSideFilters(options);
    const needsClientSideSorting = !['name', 'completedDate'].includes(sortBy);
    const sourceLimit = (needsClientSideFiltering || needsClientSideSorting) ? Math.max(limit * 20, 1000) : limit;

    // 执行常规过滤脚本
    const result = await executeOmniFocusScript('@filterTasks.js', {
      ...options,
      perspective,
      exactTagMatch,
      limit: sourceLimit,
      sortBy,
      sortOrder
    });

    if (typeof result === 'string') {
      return result;
    }

    // 如果结果是对象，格式化它
    if (result && typeof result === 'object') {
      const data = result as any;

      if (data.error) {
        throw new Error(data.error);
      }

      // 格式化过滤结果
      let output = `# 🔍 FILTERED TASKS\n\n`;

      // 显示过滤条件摘要
      const filterSummary = buildFilterSummary(options);
      if (filterSummary) {
        output += `**Filter**: ${filterSummary}\n\n`;
      }

      if (data.tasks && Array.isArray(data.tasks)) {
        const postFilteredTasks = applyClientSideFilters(data.tasks, options);
        const sortedTasks = sortTasks(postFilteredTasks, sortBy, sortOrder);
        const limitedTasks = sortedTasks.slice(0, limit);
        const taskCount = limitedTasks.length;
        const totalCount = sortedTasks.length;

        if (taskCount === 0) {
          output += '🎯 No tasks match your filter criteria.\n';

          // 提供一些建议
          output += '\n**Tips**:\n';
          output += '- Try broadening your search criteria\n';
          output += '- Check if tasks exist in the specified project/tags\n';
          output += '- Use `get_inbox_tasks` or `get_flagged_tasks` for basic views\n';
        } else {
          output += `Found ${taskCount} task${taskCount === 1 ? '' : 's'}`;
          if (taskCount < totalCount) {
            output += ` (showing first ${taskCount} of ${totalCount})`;
          }
          output += ':\n\n';

          // 按项目分组显示任务
          const tasksByProject = groupTasksByProject(limitedTasks);

          tasksByProject.forEach((tasks, projectName) => {
            if (tasksByProject.size > 1) {
              output += `## 📁 ${projectName}\n`;
            }

            tasks.forEach((task: any) => {
              output += formatTask(task);
              output += '\n';
            });

            if (tasksByProject.size > 1) {
              output += '\n';
            }
          });

          // 显示排序信息
          output += `\n📊 **Sorted by**: ${sortBy} (${sortOrder})\n`;
        }
      } else {
        output += 'No task data available\n';
      }

      return output;
    }

    return 'Unexpected result format from OmniFocus';
  } catch (error) {
    console.error('Error in filterTasks:', error);
    throw new Error(`Failed to filter tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 构建过滤条件摘要
function buildFilterSummary(options: FilterTasksOptions): string {
  const conditions: string[] = [];

  if (options.taskStatus && options.taskStatus.length > 0) {
    conditions.push(`Status: ${options.taskStatus.join(', ')}`);
  }

  if (options.perspective && options.perspective !== 'all') {
    conditions.push(`Perspective: ${options.perspective}`);
  }

  if (options.projectFilter) {
    conditions.push(`Project: "${options.projectFilter}"`);
  }

  if (options.tagFilter) {
    const tags = Array.isArray(options.tagFilter) ? options.tagFilter.join(', ') : options.tagFilter;
    conditions.push(`Tags: ${tags}`);
  }

  if (options.flagged !== undefined) {
    conditions.push(`Flagged: ${options.flagged ? 'Yes' : 'No'}`);
  }

  if (options.dueToday) conditions.push('Due: Today');
  else if (options.dueThisWeek) conditions.push('Due: This Week');
  else if (options.dueThisMonth) conditions.push('Due: This Month');
  else if (options.overdue) conditions.push('Due: Overdue');

  if (options.completedToday) conditions.push('Completed: Today');
  else if (options.completedYesterday) conditions.push('Completed: Yesterday');
  else if (options.completedThisWeek) conditions.push('Completed: This Week');
  else if (options.completedThisMonth) conditions.push('Completed: This Month');

  if (options.deferAvailable) conditions.push('Defer: Available');
  else if (options.deferToday) conditions.push('Defer: Today');
  else if (options.deferThisWeek) conditions.push('Defer: This Week');

  if (options.plannedToday) conditions.push('Planned: Today');
  else if (options.plannedThisWeek) conditions.push('Planned: This Week');
  else if (options.plannedThisMonth) conditions.push('Planned: This Month');
  else if (options.plannedBefore) conditions.push(`Planned Before: ${options.plannedBefore}`);
  else if (options.plannedAfter) conditions.push(`Planned After: ${options.plannedAfter}`);

  if (options.estimateMin !== undefined || options.estimateMax !== undefined) {
    let estimate = 'Estimate: ';
    if (options.estimateMin !== undefined && options.estimateMax !== undefined) {
      estimate += `${options.estimateMin}-${options.estimateMax}min`;
    } else if (options.estimateMin !== undefined) {
      estimate += `≥${options.estimateMin}min`;
    } else {
      estimate += `≤${options.estimateMax}min`;
    }
    conditions.push(estimate);
  }

  if (options.searchText) {
    conditions.push(`Search: "${options.searchText}"`);
  }

  return conditions.length > 0 ? conditions.join(' | ') : '';
}

// 按项目分组任务
function groupTasksByProject(tasks: any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();

  tasks.forEach(task => {
    const projectName = task.projectName || (task.inInbox ? '📥 Inbox' : '📂 No Project');

    if (!grouped.has(projectName)) {
      grouped.set(projectName, []);
    }
    grouped.get(projectName)!.push(task);
  });

  return grouped;
}

// 格式化单个任务
function formatTask(task: any): string {
  let output = '';

  // 任务基本信息
  const flagSymbol = task.flagged ? '🚩 ' : '';
  const statusEmoji = getStatusEmoji(task.taskStatus);

  output += `${statusEmoji} ${flagSymbol}${task.name}`;

  // 日期信息
  const dateInfo: string[] = [];
  if (task.dueDate) {
    const dueDateStr = new Date(task.dueDate).toLocaleDateString();
    const isOverdue = new Date(task.dueDate) < new Date();
    dateInfo.push(isOverdue ? `⚠️ DUE: ${dueDateStr}` : `📅 DUE: ${dueDateStr}`);
  }

  if (task.deferDate) {
    const deferDateStr = new Date(task.deferDate).toLocaleDateString();
    dateInfo.push(`🚀 DEFER: ${deferDateStr}`);
  }

  if (task.plannedDate) {
    const plannedDateStr = new Date(task.plannedDate).toLocaleDateString();
    dateInfo.push(`🗓 PLAN: ${plannedDateStr}`);
  }

  if (task.completedDate) {
    const completedDateStr = new Date(task.completedDate).toLocaleDateString();
    dateInfo.push(`✅ DONE: ${completedDateStr}`);
  }

  if (dateInfo.length > 0) {
    output += ` [${dateInfo.join(', ')}]`;
  }

  // 其他信息
  const additionalInfo: string[] = [];

  if (task.taskStatus && task.taskStatus !== 'Available') {
    additionalInfo.push(task.taskStatus);
  }

  if (task.estimatedMinutes) {
    const hours = Math.floor(task.estimatedMinutes / 60);
    const minutes = task.estimatedMinutes % 60;
    if (hours > 0) {
      additionalInfo.push(`⏱ ${hours}h${minutes > 0 ? `${minutes}m` : ''}`);
    } else {
      additionalInfo.push(`⏱ ${minutes}m`);
    }
  }

  if (additionalInfo.length > 0) {
    output += ` (${additionalInfo.join(', ')})`;
  }

  output += '\n';

  // 任务备注
  if (task.note && task.note.trim()) {
    output += `  📝 ${task.note.trim()}\n`;
  }

  // 标签
  if (task.tags && task.tags.length > 0) {
    const tagNames = task.tags.map((tag: any) => tag.name).join(', ');
    output += `  🏷 ${tagNames}\n`;
  }

  return output;
}

// 获取状态对应的emoji
function getStatusEmoji(status: string): string {
  const statusMap: { [key: string]: string } = {
    Available: '⚪',
    Next: '🔵',
    Blocked: '🔴',
    DueSoon: '🟡',
    Overdue: '🔴',
    Completed: '✅',
    Dropped: '⚫'
  };

  return statusMap[status] || '⚪';
}
