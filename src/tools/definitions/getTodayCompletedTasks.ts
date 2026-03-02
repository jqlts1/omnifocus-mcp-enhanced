import { z } from 'zod';
import { getTodayCompletedTasks } from '../primitives/getTodayCompletedTasks.js';

export const schema = z.object({
  limit: z.number().min(1).max(100).default(20).optional().describe('Maximum number of tasks to return (default: 20)')
});

export async function handler(args: z.infer<typeof schema>) {
  const { limit } = args;
  
  const result = await getTodayCompletedTasks({ 
    limit 
  });
  
  return {
    content: [{ type: "text" as const, text: result }]
  };
}