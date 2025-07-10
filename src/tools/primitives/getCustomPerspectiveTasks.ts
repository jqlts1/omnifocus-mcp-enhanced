import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface GetCustomPerspectiveTasksOptions {
  perspectiveName: string;
  hideCompleted?: boolean;
  limit?: number;
}

export async function getCustomPerspectiveTasks(options: GetCustomPerspectiveTasksOptions): Promise<string> {
  const { perspectiveName, hideCompleted = true, limit = 1000 } = options;
  
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
    
    // 过滤已完成任务（如果需要）
    let tasks = data.tasks || [];
    if (hideCompleted) {
      tasks = tasks.filter((task: any) => !task.completed);
    }
    
    // 限制任务数量
    if (limit && limit > 0) {
      tasks = tasks.slice(0, limit);
    }
    
    // 格式化输出
    if (tasks.length === 0) {
      return `📋 **透视任务：${perspectiveName}**\n\n暂无${hideCompleted ? '未完成' : ''}任务。`;
    }
    
    // 生成任务列表
    const taskList = tasks.map((task: any, index: number) => {
      let taskText = `${index + 1}. **${task.name}**`;
      
      if (task.project) {
        taskText += `\n   📁 项目: ${task.project}`;
      }
      
      if (task.tags && task.tags.length > 0) {
        taskText += `\n   🏷️ 标签: ${task.tags.join(', ')}`;
      }
      
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate).toLocaleDateString();
        taskText += `\n   📅 截止: ${dueDate}`;
      }
      
      if (task.flagged) {
        taskText += `\n   🚩 已标记`;
      }
      
      if (task.estimatedMinutes) {
        const hours = Math.floor(task.estimatedMinutes / 60);
        const minutes = task.estimatedMinutes % 60;
        if (hours > 0) {
          taskText += `\n   ⏱️ 预估: ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
        } else {
          taskText += `\n   ⏱️ 预估: ${minutes}m`;
        }
      }
      
      if (task.note && task.note.trim()) {
        const notePreview = task.note.trim().substring(0, 100);
        taskText += `\n   📝 备注: ${notePreview}${task.note.length > 100 ? '...' : ''}`;
      }
      
      return taskText;
    }).join('\n\n');
    
    const header = `📋 **透视任务：${perspectiveName}** (${tasks.length}个${hideCompleted ? '未完成' : ''}任务)\n\n`;
    const footer = data.count > tasks.length ? `\n\n💡 共找到 ${data.count} 个任务，显示${hideCompleted ? '未完成的' : ''} ${tasks.length} 个` : '';
    
    return header + taskList + footer;
    
  } catch (error) {
    console.error('Error in getCustomPerspectiveTasks:', error);
    return `❌ **错误**: ${error instanceof Error ? error.message : String(error)}`;
  }
}