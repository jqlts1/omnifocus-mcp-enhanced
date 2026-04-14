import { z } from "zod";
import { getProjects } from "../primitives/getProjects.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

export const schema = z.object({
  status: z
    .array(z.enum(["Active", "OnHold", "Done", "Dropped"]))
    .optional()
    .describe(
      "Filter by project status. OR logic — matches any. Default: all statuses.",
    ),
  folderName: z
    .string()
    .optional()
    .describe("Filter by folder name (case-insensitive partial match)."),
  includeReviewData: z
    .boolean()
    .optional()
    .describe(
      "Include review fields (nextReviewDate, lastReviewDate, reviewInterval). Default: true.",
    ),
});

export async function handler(
  args: z.infer<typeof schema>,
  extra: RequestHandlerExtra,
) {
  try {
    const result = await getProjects({
      status: args.status,
      folderName: args.folderName,
      includeReviewData: args.includeReviewData !== false,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: result,
        },
      ],
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text" as const,
          text: `Error getting projects: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
