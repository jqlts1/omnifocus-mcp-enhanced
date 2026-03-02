import { z } from 'zod';
import { batchAddItems, BatchAddItemsParams } from '../primitives/batchAddItems.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  items: z.array(z.object({
    type: z.enum(['task', 'project']).describe("Type of item to add ('task' or 'project')"),
    name: z.string().max(500).describe("The name of the item"),
    note: z.string().max(10000).optional().describe("Additional notes for the item"),
    dueDate: z.string().max(50).optional().describe("The due date in ISO format (YYYY-MM-DD or full ISO date)"),
    deferDate: z.string().max(50).optional().describe("The defer date in ISO format (YYYY-MM-DD or full ISO date)"),
    plannedDate: z.string().max(50).optional().describe("The planned date in ISO format (YYYY-MM-DD or full ISO date)"),
    flagged: z.boolean().optional().describe("Whether the item is flagged or not"),
    estimatedMinutes: z.number().int().min(0).max(525600).optional().describe("Estimated time to complete the item, in minutes"),
    tags: z.array(z.string().max(200)).max(50).optional().describe("Tags to assign to the item"),

    // Task-specific properties
    projectName: z.string().max(500).optional().describe("For tasks: The name of the project to add the task to"),
    parentTaskId: z.string().max(200).optional().describe("For tasks: The ID of the parent task to create this task as a subtask"),
    parentTaskName: z.string().max(500).optional().describe("For tasks: The name of the parent task to create this task as a subtask"),

    // Project-specific properties
    folderName: z.string().max(500).optional().describe("For projects: The name of the folder to add the project to"),
    sequential: z.boolean().optional().describe("For projects: Whether tasks in the project should be sequential")
  })).max(100).describe("Array of items (tasks or projects) to add")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Call the batchAddItems function
    const result = await batchAddItems(args.items as BatchAddItemsParams[]);

    if (result.success) {
      const successCount = result.results.filter(r => r.success).length;
      const failureCount = result.results.filter(r => !r.success).length;

      let message = `✅ Successfully added ${successCount} items.`;

      if (failureCount > 0) {
        message += ` ⚠️ Failed to add ${failureCount} items.`;
      }

      // Include details about added items
      const details = result.results.map((item, index) => {
        if (item.success) {
          const itemType = args.items[index].type;
          const itemName = args.items[index].name;
          return `- ✅ ${itemType}: "${itemName}"`;
        } else {
          const itemType = args.items[index].type;
          const itemName = args.items[index].name;
          return `- ❌ ${itemType}: "${itemName}" - Error: ${item.error}`;
        }
      }).join('\n');

      return {
        content: [{
          type: "text" as const,
          text: `${message}\n\n${details}`
        }]
      };
    } else {
      // Batch operation failed completely
      return {
        content: [{
          type: "text" as const,
          text: `Failed to process batch operation: ${result.error}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error processing batch operation: ${error.message}`
      }],
      isError: true
    };
  }
}
