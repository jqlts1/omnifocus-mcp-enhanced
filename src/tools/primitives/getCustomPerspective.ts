import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface GetCustomPerspectiveOptions {
  perspectiveName?: string;
  perspectiveId?: string;
  hideCompleted?: boolean;
  limit?: number;
}

export async function getCustomPerspective(options: GetCustomPerspectiveOptions): Promise<string> {
  const { perspectiveName, perspectiveId, hideCompleted = true, limit = 100 } = options;
  
  if (!perspectiveName && !perspectiveId) {
    throw new Error("Either perspectiveName or perspectiveId must be provided");
  }
  
  try {
    // Execute the custom perspective script
    const result = await executeOmniFocusScript('@customPerspective.js', {
      perspectiveName,
      perspectiveId,
      hideCompleted,
      limit
    });
    
    if (typeof result === 'string') {
      return result;
    }
    
    // If result is an object, format it
    if (result && typeof result === 'object') {
      const data = result as any;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Format the custom perspective result
      let output = `# 🎯 CUSTOM PERSPECTIVE: ${data.perspectiveName || perspectiveName || perspectiveId}\n\n`;
      
      if (data.note) {
        output += `⚠️ ${data.note}\n\n`;
      }
      
      if (data.tasks && Array.isArray(data.tasks)) {
        if (data.tasks.length === 0) {
          output += "📪 No tasks found in this perspective.\n";
          output += "\n**Tips**:\n";
          output += "- Check if the perspective has any tasks\n";
          output += "- Try adjusting hideCompleted setting\n";
          output += "- Use `list_custom_perspectives` to see available perspectives\n";
        } else {
          const taskCount = data.tasks.length;
          output += `Found ${taskCount} task${taskCount === 1 ? '' : 's'}:\n\n`;
          
          // Group tasks by project for better organization
          const tasksByProject = groupTasksByProject(data.tasks);
          
          tasksByProject.forEach((tasks, projectName) => {
            if (tasksByProject.size > 1) {
              output += `## 📁 ${projectName}\n`;
            }
            
            tasks.forEach((task: any) => {
              output += formatCustomPerspectiveTask(task);
              output += '\n';
            });
            
            if (tasksByProject.size > 1) {
              output += '\n';
            }
          });
          
          // Add perspective metadata
          if (data.perspectiveId) {
            output += `\n📊 **Perspective ID**: ${data.perspectiveId}\n`;
          }
          
          if (data.isBuiltIn) {
            output += `💡 **Built-in Perspective**: Consider using dedicated tools for better performance\n`;
          }
        }
      } else {
        output += "No task data available from perspective\n";
      }
      
      return output;
    }
    
    return "Unexpected result format from OmniFocus";
    
  } catch (error) {
    console.error("Error in getCustomPerspective:", error);
    throw new Error(`Failed to get custom perspective: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Group tasks by project for better organization
function groupTasksByProject(tasks: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  
  tasks.forEach(task => {
    const projectName = task.projectName || (task.inInbox ? '📥 Inbox' : '📂 No Project');
    if (!groups.has(projectName)) {
      groups.set(projectName, []);
    }
    groups.get(projectName)!.push(task);
  });
  
  return groups;
}

// Format a task from custom perspective
function formatCustomPerspectiveTask(task: any): string {
  let output = '';
  
  // Task basic information with status emoji
  const flagSymbol = task.flagged ? '🚩 ' : '';
  const statusEmoji = getStatusEmoji(task.taskStatus);
  output += `${statusEmoji} ${flagSymbol}${task.name}`;
  
  // Date information
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
  
  // Additional information
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
  
  // Task note
  if (task.note && task.note.trim()) {
    output += `  📝 ${task.note.trim()}\n`;
  }
  
  // Tags
  if (task.tags && task.tags.length > 0) {
    const tagNames = task.tags.map((tag: any) => tag.name).join(', ');
    output += `  🏷 ${tagNames}\n`;
  }
  
  return output;
}

// Get status emoji for task status
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