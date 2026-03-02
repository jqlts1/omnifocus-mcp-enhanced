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
    
    // If result is an object, format it
    if (result && typeof result === 'object') {
      const data = result as any;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Format completed tasks
      let output = `# ✅ Tasks Completed Today\n\n`;

      if (data.tasks && Array.isArray(data.tasks)) {
        if (data.tasks.length === 0) {
          output += "No tasks completed today yet.\n";
        } else {
          const taskCount = data.tasks.length;
          const totalCount = data.filteredCount || taskCount;

          output += `Completed **${totalCount}** tasks today`;
          if (taskCount < totalCount) {
            output += ` (showing first ${taskCount})`;
          }
          output += `:\n\n`;

          // Group tasks by project
          const tasksByProject = groupTasksByProject(data.tasks);

          tasksByProject.forEach((tasks, projectName) => {
            if (tasksByProject.size > 1) {
              output += `## 📁 ${projectName}\n`;
            }

            tasks.forEach((task: any) => {
              output += formatCompletedTask(task);
              output += '\n';
            });

            if (tasksByProject.size > 1) {
              output += '\n';
            }
          });

          // Summary
          output += `\n---\n📊 **Today's total**: ${totalCount} tasks completed\n`;
          output += `📅 **Query time**: ${new Date().toLocaleString()}\n`;
        }
      } else {
        output += "Unable to retrieve task data\n";
      }
      
      return output;
    }
    
    return "Unable to parse OmniFocus result";
    
  } catch (error) {
    console.error("Error in getTodayCompletedTasks:", error);
    throw new Error(`Failed to get today's completed tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

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

function formatCompletedTask(task: any): string {
  let output = '';
  
  const flagSymbol = task.flagged ? '🚩 ' : '';
  
  const idStr = task.id ? ` [${task.id}]` : '';
  output += `✅ ${flagSymbol}${task.name}${idStr}`;
  
  if (task.completedDate) {
    const completedTime = new Date(task.completedDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    output += ` *(completed ${completedTime})*`;
  }
  
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
  
  output += '\n';

  if (task.note && task.note.trim()) {
    output += `  📝 ${task.note.trim()}\n`;
  }

  if (task.tags && task.tags.length > 0) {
    const tagNames = task.tags.map((tag: any) => tag.name).join(', ');
    output += `  🏷 ${tagNames}\n`;
  }
  
  return output;
}