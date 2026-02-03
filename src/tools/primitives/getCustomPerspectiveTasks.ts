import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface GetCustomPerspectiveTasksOptions {
  perspectiveName: string;
  hideCompleted?: boolean;
  limit?: number;
  showHierarchy?: boolean;
  groupByProject?: boolean;
}

export async function getCustomPerspectiveTasks(options: GetCustomPerspectiveTasksOptions): Promise<string> {
  const { perspectiveName, hideCompleted = true, limit = 1000, showHierarchy = false, groupByProject = true } = options;

  if (!perspectiveName) {
    return "❌ **错误**: 透视名称不能为空";
  }

  try {
    // Execute the get custom perspective tasks script
    const result = await executeOmniFocusScript('@getCustomPerspectiveTasks.js', {
      perspectiveName: perspectiveName
    });

    // 处理各种可能的返回类型（避免之前的错误）
    let data: any;

    if (typeof result === 'string') {
      try {
        data = JSON.parse(result);
      } catch (parseError) {
        throw new Error(`解析字符串结果失败: ${result}`);
      }
    } else if (typeof result === 'object' && result !== null) {
      data = result;
    } else {
      throw new Error(`脚本执行返回了无效的结果类型: ${typeof result}, 值: ${result}`);
    }

    // 检查是否有错误
    if (!data.success) {
      throw new Error(data.error || 'Unknown error occurred');
    }

    // 处理taskMap数据（新的层级结构）
    const taskMap = data.taskMap || {};
    const allTasks = Object.values(taskMap);

    // 过滤已完成任务（如果需要）
    let filteredTasks = allTasks;
    if (hideCompleted) {
      filteredTasks = allTasks.filter((task: any) => !task.completed);
    }

    if (filteredTasks.length === 0) {
      return `**透视任务：${perspectiveName}**\n\n暂无${hideCompleted ? '未完成' : ''}任务。`;
    }

    // 根据显示模式选择不同的输出格式
    if (showHierarchy) {
      return formatHierarchicalTasks(perspectiveName, taskMap, hideCompleted);
    } else if (groupByProject) {
      return formatGroupedByProject(perspectiveName, filteredTasks, limit, data.count);
    } else {
      return formatFlatTasks(perspectiveName, filteredTasks, limit, data.count);
    }

  } catch (error) {
    console.error('Error in getCustomPerspectiveTasks:', error);
    return `❌ **错误**: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// 格式化层级任务显示
function formatHierarchicalTasks(perspectiveName: string, taskMap: any, hideCompleted: boolean): string {
  const header = `**透视任务：${perspectiveName}** (层级视图)\n\n`;

  // 找到所有根任务（parent为null的任务）
  const rootTasks = Object.values(taskMap).filter((task: any) => task.parent === null);

  // 过滤已完成任务
  const filteredRootTasks = hideCompleted
    ? rootTasks.filter((task: any) => !task.completed)
    : rootTasks;

  if (filteredRootTasks.length === 0) {
    return header + `暂无${hideCompleted ? '未完成' : ''}根任务。`;
  }

  // 递归渲染任务树
  const taskTreeLines: string[] = [];

  filteredRootTasks.forEach((rootTask: any, index: number) => {
    const isLast = index === filteredRootTasks.length - 1;
    renderTaskTree(rootTask, taskMap, hideCompleted, '', isLast, taskTreeLines);
  });

  return header + taskTreeLines.join('\n');
}

// 递归渲染任务树
function renderTaskTree(task: any, taskMap: any, hideCompleted: boolean, prefix: string, isLast: boolean, lines: string[]): void {
  // 当前任务的树状前缀
  const currentPrefix = prefix + (isLast ? '└─ ' : '├─ ');

  // 渲染当前任务
  let taskLine = currentPrefix + formatTaskName(task);
  lines.push(taskLine);

  // 添加任务详细信息（缩进显示）
  const detailPrefix = prefix + (isLast ? '   ' : '│  ');
  const taskDetails = formatTaskDetails(task);
  if (taskDetails.length > 0) {
    taskDetails.forEach(detail => {
      lines.push(detailPrefix + detail);
    });
  }

  // 处理子任务
  if (task.children && task.children.length > 0) {
    const childTasks = task.children
      .map((childId: string) => taskMap[childId])
      .filter((child: any) => child && (!hideCompleted || !child.completed));

    childTasks.forEach((childTask: any, index: number) => {
      const isLastChild = index === childTasks.length - 1;
      const childPrefix = prefix + (isLast ? '   ' : '│  ');
      renderTaskTree(childTask, taskMap, hideCompleted, childPrefix, isLastChild, lines);
    });
  }
}

// 格式化任务名称
function formatTaskName(task: any): string {
  let name = `**${task.name}**`;
  if (task.completed) {
    name = `~~${name}~~ [完成]`;
  } else if (task.flagged) {
    name = `[重要] ${name}`;
  }
  return name;
}

// 格式化任务详细信息
function formatTaskDetails(task: any): string[] {
  const details: string[] = [];

  if (task.project) {
    details.push(`项目: ${task.project}`);
  }

  if (task.tags && task.tags.length > 0) {
    details.push(`标签: ${task.tags.join(', ')}`);
  }

  if (task.dueDate) {
    const dueDate = new Date(task.dueDate).toLocaleDateString();
    details.push(`截止: ${dueDate}`);
  }

  if (task.estimatedMinutes) {
    const hours = Math.floor(task.estimatedMinutes / 60);
    const minutes = task.estimatedMinutes % 60;
    if (hours > 0) {
      details.push(`预估: ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`);
    } else {
      details.push(`预估: ${minutes}m`);
    }
  }

  if (task.note && task.note.trim()) {
    const notePreview = task.note.trim().substring(0, 60);
    details.push(`备注: ${notePreview}${task.note.length > 60 ? '...' : ''}`);
  }

  return details;
}

// 格式化平铺任务显示（保持原有功能）
function formatFlatTasks(perspectiveName: string, tasks: any[], limit: number, totalCount: number): string {
  // 限制任务数量
  let displayTasks = tasks;
  if (limit && limit > 0) {
    displayTasks = tasks.slice(0, limit);
  }

  // 生成任务列表
  const taskList = displayTasks.map((task: any, index: number) => {
    let taskText = `${index + 1}. **${task.name}**`;

    if (task.project) {
      taskText += `\n   项目: ${task.project}`;
    }

    if (task.tags && task.tags.length > 0) {
      taskText += `\n   标签: ${task.tags.join(', ')}`;
    }

    if (task.dueDate) {
      const dueDate = new Date(task.dueDate).toLocaleDateString();
      taskText += `\n   截止: ${dueDate}`;
    }

    if (task.flagged) {
      taskText += `\n   [重要]`;
    }

    if (task.estimatedMinutes) {
      const hours = Math.floor(task.estimatedMinutes / 60);
      const minutes = task.estimatedMinutes % 60;
      if (hours > 0) {
        taskText += `\n   预估: ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
      } else {
        taskText += `\n   预估: ${minutes}m`;
      }
    }

    if (task.note && task.note.trim()) {
      const notePreview = task.note.trim().substring(0, 100);
      taskText += `\n   备注: ${notePreview}${task.note.length > 100 ? '...' : ''}`;
    }

    return taskText;
  }).join('\n\n');

  const header = `**透视任务：${perspectiveName}** (${displayTasks.length}个任务)\n\n`;
  const footer = totalCount > displayTasks.length ? `\n\n提示: 共找到 ${totalCount} 个任务，显示 ${displayTasks.length} 个` : '';

  return header + taskList + footer;
}

// 按项目分组格式化任务显示
function formatGroupedByProject(perspectiveName: string, tasks: any[], limit: number, totalCount: number): string {
  // 限制任务数量
  let displayTasks = tasks;
  if (limit && limit > 0) {
    displayTasks = tasks.slice(0, limit);
  }

  // 按项目分组
  const projectGroups: Map<string, any[]> = new Map();
  const noProjectTasks: any[] = [];

  displayTasks.forEach((task: any) => {
    if (task.project) {
      const projectName = task.project;
      if (!projectGroups.has(projectName)) {
        projectGroups.set(projectName, []);
      }
      projectGroups.get(projectName)!.push(task);
    } else {
      noProjectTasks.push(task);
    }
  });

  // 生成按项目分组的输出
  const lines: string[] = [];

  // 输出有项目的任务
  projectGroups.forEach((projectTasks, projectName) => {
    lines.push(`\n### 📁 ${projectName}`);
    lines.push('');
    projectTasks.forEach((task: any) => {
      lines.push(formatTaskForGroup(task));
    });
  });

  // 输出没有项目的任务（收件箱任务）
  if (noProjectTasks.length > 0) {
    lines.push(`\n### 📥 收件箱`);
    lines.push('');
    noProjectTasks.forEach((task: any) => {
      lines.push(formatTaskForGroup(task));
    });
  }

  const header = `## 透视任务：${perspectiveName}\n\n**共 ${displayTasks.length} 个任务，${projectGroups.size} 个项目**`;
  const footer = totalCount > displayTasks.length ? `\n\n---\n💡 *共找到 ${totalCount} 个任务，显示 ${displayTasks.length} 个*` : '';

  return header + lines.join('\n') + footer;
}

// 格式化单个任务（用于分组视图）
function formatTaskForGroup(task: any): string {
  // 任务状态图标
  const statusIcon = task.completed ? '✅' : (task.flagged ? '🔶' : '○');

  let taskLine = `- ${statusIcon} **${task.name}**`;

  // 添加标签
  if (task.tags && task.tags.length > 0) {
    taskLine += ` \`${task.tags.join('` `')}\``;
  }

  // 添加截止日期
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    taskLine += ` 📅 ${dueDate}`;
  }

  // 添加预估时间
  if (task.estimatedMinutes) {
    const hours = Math.floor(task.estimatedMinutes / 60);
    const minutes = task.estimatedMinutes % 60;
    if (hours > 0) {
      taskLine += ` ⏱️ ${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
    } else {
      taskLine += ` ⏱️ ${minutes}m`;
    }
  }

  return taskLine;
}