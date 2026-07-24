import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface GetForecastTasksOptions {
  days?: number;
  hideCompleted?: boolean;
  includeDeferredOnly?: boolean;
}

export function parseLocalDateKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid forecast date: ${dateKey}`);
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    throw new Error(`Invalid forecast date: ${dateKey}`);
  }

  return date;
}

export function getForecastDateCategory(taskDate: Date, now = new Date()): 'overdue' | 'today' | 'tomorrow' | 'future' {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (taskDate < today) return 'overdue';
  if (taskDate.getTime() === today.getTime()) return 'today';
  if (taskDate.getTime() === tomorrow.getTime()) return 'tomorrow';
  return 'future';
}

export async function getForecastTasks(options: GetForecastTasksOptions = {}): Promise<string> {
  const { days = 7, hideCompleted = true, includeDeferredOnly = false } = options;
  
  try {
    // Execute the forecast tasks script
    const result = await executeOmniFocusScript('@forecastTasks.js', { 
      days: days,
      hideCompleted: hideCompleted,
      includeDeferredOnly: includeDeferredOnly
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
      
      // Format the forecast tasks
      let output = `# 📅 FORECAST - Next ${days} days\n\n`;
      
      if (data.tasksByDate && typeof data.tasksByDate === 'object') {
        const dates = Object.keys(data.tasksByDate).sort();
        
        if (dates.length === 0) {
          output += "🎉 No tasks due in the forecast period - enjoy the calm!\n";
        } else {
          dates.forEach(dateStr => {
            const tasks = data.tasksByDate[dateStr];
            if (!tasks || tasks.length === 0) return;
            
            const taskDate = parseLocalDateKey(dateStr);
            const category = getForecastDateCategory(taskDate);
            
            let dateHeader = '';
            if (category === 'overdue') {
              dateHeader = `## ⚠️ OVERDUE - ${taskDate.toLocaleDateString()}`;
            } else if (category === 'today') {
              dateHeader = `## 🔥 TODAY - ${taskDate.toLocaleDateString()}`;
            } else if (category === 'tomorrow') {
              dateHeader = `## ⏰ TOMORROW - ${taskDate.toLocaleDateString()}`;
            } else {
              const dayOfWeek = taskDate.toLocaleDateString('en-US', { weekday: 'long' });
              dateHeader = `## 📅 ${dayOfWeek} - ${taskDate.toLocaleDateString()}`;
            }
            
            output += `${dateHeader}\n`;
            
            tasks.forEach((task: any) => {
              const flagSymbol = task.flagged ? '🚩 ' : '';
              const projectStr = task.projectName ? ` (${task.projectName})` : ' (Inbox)';
              const statusStr = task.taskStatus !== 'Available' ? ` [${task.taskStatus}]` : '';
              const estimateStr = task.estimatedMinutes ? ` ⏱${task.estimatedMinutes}m` : '';
              const typeIndicator = task.isDue ? '📅' : '🚀'; // Due vs Deferred
              
              output += `• ${typeIndicator} ${flagSymbol}${task.name}${projectStr}${statusStr}${estimateStr}\n`;
              
              if (task.note && task.note.trim()) {
                output += `  📝 ${task.note.trim()}\n`;
              }
            });
            
            output += '\n';
          });
          
          // Summary
          const totalTasks = dates.reduce((sum, date) => sum + data.tasksByDate[date].length, 0);
          output += `📊 **Summary**: ${totalTasks} task${totalTasks === 1 ? '' : 's'} in forecast\n`;
        }
      } else {
        output += "No forecast data available\n";
      }
      
      return output;
    }
    
    return "Unexpected result format from OmniFocus";
    
  } catch (error) {
    console.error("Error in getForecastTasks:", error);
    throw new Error(`Failed to get forecast tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
