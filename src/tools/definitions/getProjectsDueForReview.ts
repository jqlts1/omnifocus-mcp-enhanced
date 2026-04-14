import { z } from "zod";
import { getProjectsDueForReview } from "../primitives/getProjectsDueForReview.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

export const schema = z.object({
  includeOnHold: z
    .boolean()
    .optional()
    .describe("Include on-hold projects in results. Default: false."),
});

export async function handler(
  args: z.infer<typeof schema>,
  extra: RequestHandlerExtra,
) {
  try {
    const result = await getProjectsDueForReview({
      includeOnHold: args.includeOnHold || false,
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
          text: `Error getting projects due for review: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
