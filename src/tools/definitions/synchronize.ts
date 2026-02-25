import { z } from 'zod';
import { synchronize } from '../primitives/synchronize.js';

export const schema = z.object({});

export async function handler() {
  try {
    const result = await synchronize();

    if (result.success) {
      return {
        content: [{
          type: "text" as const,
          text: "OmniFocus sync triggered successfully."
        }]
      };
    } else {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to sync: ${result.error}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    return {
      content: [{
        type: "text" as const,
        text: `Error triggering sync: ${error.message}`
      }],
      isError: true
    };
  }
}
