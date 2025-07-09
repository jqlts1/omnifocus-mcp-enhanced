import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface GetTodayCompletedTasksOptions {
  limit?: number;
}

export async function getTodayCompletedTasks(options: GetTodayCompletedTasksOptions = {}): Promise<string> {
  try {
    const { limit = 20 } = options;
    
    const result = await executeOmniFocusScript('@todayCompletedTasks.js', { limit });
    
    if (typeof result === 'string') {
      return result;
    }
    
    // 如果结果是对象，格式化它
    if (result && typeof result === 'object') {
      const data = result as any;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 格式化完成任务结果
      let output = `# ✅ 今天完成的任务\\n\\n`;
      
      if (data.tasks && Array.isArray(data.tasks)) {
        if (data.tasks.length === 0) {
          output += "🎯 今天还没有完成任何任务。\\n";
          output += "\\n**加油！** 完成一些任务来让这个列表变得丰富起来！\\n";
        } else {
          const taskCount = data.tasks.length;
          const totalCount = data.filteredCount || taskCount;
          
          output += `🎉 恭喜！今天已完成 **${totalCount}** 个任务`;
          if (taskCount < totalCount) {
            output += `（显示前 ${taskCount} 个）`;
          }
          output += `：\\n\\n`;
          
          // 按项目分组显示任务
          const tasksByProject = groupTasksByProject(data.tasks);
          
          tasksByProject.forEach((tasks, projectName) => {
            if (tasksByProject.size > 1) {
              output += `## 📁 ${projectName}\\n`;
            }
            
            tasks.forEach((task: any) => {
              output += formatCompletedTask(task);
              output += '\\n';
            });
            
            if (tasksByProject.size > 1) {
              output += '\\n';
            }
          });
          
          // 显示总结
          output += `\\n---\\n📊 **今日完成总结**: ${totalCount} 个任务已完成\\n`;
          output += `📅 **查询时间**: ${new Date().toLocaleString()}\\n`;
        }
      } else {
        output += "无法获取任务数据\\n";
      }
      
      return output;
    }
    
    return "无法解析 OmniFocus 返回结果";
    
  } catch (error) {
    console.error("Error in getTodayCompletedTasks:", error);
    throw new Error(`获取今天完成的任务失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 按项目分组任务
function groupTasksByProject(tasks: any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();
  
  tasks.forEach(task => {
    const projectName = task.projectName || (task.inInbox ? '📥 收件箱' : '📂 无项目');
    
    if (!grouped.has(projectName)) {
      grouped.set(projectName, []);
    }
    grouped.get(projectName)!.push(task);
  });
  
  return grouped;
}

// 格式化单个完成任务
function formatCompletedTask(task: any): string {
  let output = '';
  
  // 任务基本信息
  const flagSymbol = task.flagged ? '🚩 ' : '';
  
  output += `✅ ${flagSymbol}${task.name}`;
  
  // 完成时间
  if (task.completedDate) {
    const completedTime = new Date(task.completedDate).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    output += ` *(${completedTime}完成)*`;
  }
  
  // 其他信息
  const additionalInfo: string[] = [];
  
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
  
  output += '\\n';
  
  // 任务备注
  if (task.note && task.note.trim()) {
    output += `  📝 ${task.note.trim()}\\n`;
  }
  
  // 标签
  if (task.tags && task.tags.length > 0) {
    const tagNames = task.tags.map((tag: any) => tag.name).join(', ');
    output += `  🏷 ${tagNames}\\n`;
  }
  
  return output;
}