import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface FilterTasksOptions {
  // 🎯 任务状态过滤
  taskStatus?: string[];
  
  // 📍 透视范围  
  perspective?: "inbox" | "flagged" | "all" | "custom";
  
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
  sortOrder?: "asc" | "desc";
}

export async function filterTasks(options: FilterTasksOptions = {}): Promise<string> {
  try {
    // 设置默认值
    const {
      perspective = "all",
      exactTagMatch = false,
      limit = 100,
      sortBy = "name",
      sortOrder = "asc"
    } = options;
    
    
    // 执行常规过滤脚本
    const result = await executeOmniFocusScript('@filterTasks.js', {
      ...options,
      perspective,
      exactTagMatch,
      limit,
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
        if (data.tasks.length === 0) {
          output += "🎯 No tasks match your filter criteria.\n";
          
          // 提供一些建议
          output += "\n**Tips**:\n";
          output += "- Try broadening your search criteria\n";
          output += "- Check if tasks exist in the specified project/tags\n";
          output += "- Use `get_inbox_tasks` or `get_flagged_tasks` for basic views\n";
        } else {
          const taskCount = data.tasks.length;
          const totalCount = data.totalCount || taskCount;
          
          output += `Found ${taskCount} task${taskCount === 1 ? '' : 's'}`;
          if (taskCount < totalCount) {
            output += ` (showing first ${taskCount} of ${totalCount})`;
          }
          output += `:\n\n`;
          
          // 按项目分组显示任务
          const tasksByProject = groupTasksByProject(data.tasks);
          
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
          if (data.sortedBy) {
            output += `\n📊 **Sorted by**: ${data.sortedBy} (${data.sortOrder || 'asc'})\n`;
          }
        }
      } else {
        output += "No task data available\n";
      }
      
      return output;
    }
    
    return "Unexpected result format from OmniFocus";
    
  } catch (error) {
    console.error("Error in filterTasks:", error);
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
    'Available': '⚪',
    'Next': '🔵',
    'Blocked': '🔴',
    'DueSoon': '🟡',
    'Overdue': '🔴',
    'Completed': '✅',
    'Dropped': '⚫'
  };
  
  return statusMap[status] || '⚪';
}