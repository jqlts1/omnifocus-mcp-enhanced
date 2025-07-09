import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface GetFlaggedTasksOptions {
  hideCompleted?: boolean;
  projectFilter?: string;
}

export async function getFlaggedTasks(options: GetFlaggedTasksOptions = {}): Promise<string> {
  const { hideCompleted = true, projectFilter } = options;
  
  try {
    // Execute the flagged tasks script
    const result = await executeOmniFocusScript('@flaggedTasks.js', { 
      hideCompleted: hideCompleted,
      projectFilter: projectFilter
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
      
      // Format the flagged tasks
      let output = `# 🚩 FLAGGED TASKS\n\n`;
      
      if (projectFilter) {
        output = `# 🚩 FLAGGED TASKS - Project: ${projectFilter}\n\n`;
      }
      
      if (data.tasks && Array.isArray(data.tasks)) {
        if (data.tasks.length === 0) {
          output += projectFilter 
            ? `No flagged tasks found in project "${projectFilter}"\n`
            : "🎉 No flagged tasks - nice and clean!\n";
        } else {
          const taskCount = data.tasks.length;
          output += `Found ${taskCount} flagged task${taskCount === 1 ? '' : 's'}:\n\n`;
          
          // Group tasks by project for better organization
          const tasksByProject = new Map<string, any[]>();
          
          data.tasks.forEach((task: any) => {
            const projectName = task.projectName || '📥 Inbox';
            if (!tasksByProject.has(projectName)) {
              tasksByProject.set(projectName, []);
            }
            tasksByProject.get(projectName)!.push(task);
          });
          
          // Display tasks grouped by project
          tasksByProject.forEach((tasks, projectName) => {
            if (tasksByProject.size > 1) {
              output += `## 📁 ${projectName}\n`;
            }
            
            tasks.forEach((task: any, index: number) => {
              const dueDateStr = task.dueDate ? ` [DUE: ${new Date(task.dueDate).toLocaleDateString()}]` : '';
              const deferDateStr = task.deferDate ? ` [DEFER: ${new Date(task.deferDate).toLocaleDateString()}]` : '';
              const statusStr = task.taskStatus !== 'Available' ? ` (${task.taskStatus})` : '';
              const estimateStr = task.estimatedMinutes ? ` ⏱${task.estimatedMinutes}m` : '';
              
              output += `• 🚩 ${task.name}${dueDateStr}${deferDateStr}${statusStr}${estimateStr}\n`;
              
              if (task.note && task.note.trim()) {
                output += `  📝 ${task.note.trim()}\n`;
              }
              
              if (task.tags && task.tags.length > 0) {
                const tagNames = task.tags.map((tag: any) => tag.name).join(', ');
                output += `  🏷 ${tagNames}\n`;
              }
              
              output += '\n';
            });
          });
        }
      } else {
        output += "No flagged tasks data available\n";
      }
      
      return output;
    }
    
    return "Unexpected result format from OmniFocus";
    
  } catch (error) {
    console.error("Error in getFlaggedTasks:", error);
    throw new Error(`Failed to get flagged tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}