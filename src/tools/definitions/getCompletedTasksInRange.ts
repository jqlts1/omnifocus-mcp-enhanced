import { z } from 'zod';
import { getCompletedTasksInRange } from '../primitives/getCompletedTasksInRange.js';

export const schema = z.object({
  daysBack: z.number().optional().describe("Number of days to look back for completed tasks. Default: 7 (one week). Use 1 for yesterday+today, 30 for past month."),
  limit: z.number().optional().describe("Maximum number of completed tasks to return. Default: 50")
});

export async function handler(args: z.infer<typeof schema>) {
  try {
    const result = await getCompletedTasksInRange({
      daysBack: args.daysBack ?? 7,
      limit: args.limit ?? 50
    });

    if (result.error) {
      return {
        content: [{ type: "text" as const, text: `Error: ${result.error}` }],
        isError: true
      };
    }

    const tasks = result.tasks || [];
    const total = result.totalCompleted || tasks.length;

    if (tasks.length === 0) {
      return {
        content: [{ type: "text" as const, text: `No tasks completed in the past ${args.daysBack ?? 7} days.` }]
      };
    }

    // Group by date
    const byDate = new Map<string, any[]>();
    tasks.forEach((task: any) => {
      const dateKey = task.completedDate
        ? new Date(task.completedDate).toLocaleDateString()
        : 'Unknown';
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(task);
    });

    let output = `## Completed Tasks (past ${args.daysBack ?? 7} days): ${total} total\n\n`;

    byDate.forEach((dateTasks, date) => {
      output += `### ${date} (${dateTasks.length} tasks)\n`;
      dateTasks.forEach((task: any) => {
        const flag = task.flagged ? '🚩 ' : '';
        const project = task.projectName ? ` (${task.projectName})` : '';
        const tags = task.tags?.length > 0
          ? ` <${task.tags.map((t: any) => t.name).join(',')}>`
          : '';
        output += `- ${flag}${task.name}${project}${tags}\n`;
      });
      output += '\n';
    });

    if (tasks.length < total) {
      output += `\n⚠️ Showing ${tasks.length} of ${total} completed tasks. Increase limit for more.`;
    }

    return {
      content: [{ type: "text" as const, text: output }]
    };

  } catch (err: unknown) {
    const error = err as Error;
    return {
      content: [{ type: "text" as const, text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
