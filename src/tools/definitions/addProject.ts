import { z } from 'zod';
import { addProject, AddProjectParams } from '../primitives/addProject.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  name: z.string().describe("The name of the project"),
  note: z.string().optional().describe("Additional notes for the project"),
  dueDate: z.string().optional().describe("Due date in full ISO 8601 format with timezone (e.g., 2026-03-05T09:00:00-06:00). Bare dates like YYYY-MM-DD will display on the wrong day."),
  deferDate: z.string().optional().describe("Defer date in full ISO 8601 format with timezone (e.g., 2026-03-05T09:00:00-06:00). Bare dates like YYYY-MM-DD will display on the wrong day."),
  plannedDate: z.string().optional().describe("Planned date in full ISO 8601 format with timezone (e.g., 2026-03-05T09:00:00-06:00). Bare dates like YYYY-MM-DD will display on the wrong day."),
  flagged: z.boolean().optional().describe("Whether the project is flagged or not"),
  estimatedMinutes: z.number().optional().describe("Estimated time to complete the project, in minutes"),
  tags: z.array(z.string()).optional().describe("Tags to assign to the project"),
  folderName: z.string().optional().describe("The name of the folder to add the project to (will add to root if not specified)"),
  sequential: z.boolean().optional().describe("Whether tasks in the project should be sequential (default: false)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Call the addProject function
    const result = await addProject(args as AddProjectParams);

    if (result.success) {
      // Project was added successfully
      let locationText = args.folderName
        ? `in folder "${args.folderName}"`
        : "at the root level";

      let tagText = args.tags && args.tags.length > 0
        ? ` with tags: ${args.tags.join(', ')}`
        : "";

      let dueDateText = args.dueDate
        ? ` due on ${new Date(args.dueDate).toLocaleDateString()}`
        : "";

      let plannedDateText = args.plannedDate
        ? ` planned for ${new Date(args.plannedDate).toLocaleDateString()}`
        : "";

      let sequentialText = args.sequential
        ? " (sequential)"
        : " (parallel)";

      return {
        content: [{
          type: "text" as const,
          text: `✅ Project "${args.name}" created successfully ${locationText}${dueDateText}${plannedDateText}${tagText}${sequentialText}.`
        }]
      };
    } else {
      // Project creation failed
      return {
        content: [{
          type: "text" as const,
          text: `Failed to create project: ${result.error}`
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
        text: `Error creating project: ${error.message}`
      }],
      isError: true
    };
  }
}
