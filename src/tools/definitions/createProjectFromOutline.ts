import { z } from 'zod';
import {
  createProjectFromOutline,
  type ProjectOutline,
} from '../primitives/createProjectFromOutline.js';
import type { ToolHandlerExtra } from './toolHandler.js';

const isoDatePattern =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/;
const isoDate = z
  .string()
  .regex(isoDatePattern, 'Must be an ISO 8601 date or date-time with timezone')
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    'Must be a valid ISO date',
  )
  .describe('ISO 8601 date or date-time');

const coreFields = {
  name: z.string().trim().min(1).describe('Name shown in OmniFocus'),
  note: z.string().optional().describe('Optional note'),
  tagIds: z
    .array(z.string().trim().min(1))
    .max(100)
    .optional()
    .describe('Stable OmniFocus tag IDs; missing tags are never created'),
  dueDate: isoDate.optional(),
  deferDate: isoDate.optional(),
  plannedDate: isoDate.optional(),
  flagged: z.boolean().optional(),
  estimatedMinutes: z.number().finite().nonnegative().optional(),
  sequential: z.boolean().optional(),
};

const repetitionSchema = z
  .object({
    ruleString: z
      .string()
      .min(1)
      .describe(
        'ICS recurrence rule, e.g. FREQ=WEEKLY;BYDAY=FR. Encode UNTIL/COUNT here.',
      ),
    scheduleType: z.enum(['Regularly', 'FromCompletion']).optional(),
    anchorDateKey: z.enum(['DueDate', 'DeferDate', 'PlannedDate']).optional(),
    catchUpAutomatically: z.boolean().optional(),
  })
  .strict()
  .describe(
    'Recurrence applied and verified inside the same creation transaction',
  );

type TaskNodeInput = z.infer<typeof taskNodeSchema>;
const taskNodeSchema: z.ZodType<{
  name: string;
  note?: string;
  tagIds?: string[];
  dueDate?: string;
  deferDate?: string;
  plannedDate?: string;
  flagged?: boolean;
  estimatedMinutes?: number;
  sequential?: boolean;
  repetition?: {
    ruleString: string;
    scheduleType?: 'Regularly' | 'FromCompletion';
    anchorDateKey?: 'DueDate' | 'DeferDate' | 'PlannedDate';
    catchUpAutomatically?: boolean;
  };
  children?: TaskNodeInput[];
}> = z.lazy(() =>
  z
    .object({
      ...coreFields,
      repetition: repetitionSchema.optional(),
      children: z.array(taskNodeSchema).optional(),
    })
    .strict(),
);

const projectSchemaBase = z
  .object({
    ...coreFields,
    folderId: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Stable OmniFocus folder ID'),
    tasks: z.array(taskNodeSchema).optional(),
  })
  .strict();

function outlineBounds(project: z.infer<typeof projectSchemaBase>): {
  taskCount: number;
  maxDepth: number;
} {
  let taskCount = 0;
  let maxDepth = 0;
  const stack = (project.tasks || []).map((task) => ({ task, depth: 1 }));
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    taskCount += 1;
    maxDepth = Math.max(maxDepth, current.depth);
    for (const child of current.task.children || []) {
      stack.push({ task: child, depth: current.depth + 1 });
    }
  }
  return { taskCount, maxDepth };
}

const projectSchema = projectSchemaBase.superRefine((project, context) => {
  const bounds = outlineBounds(project);
  if (bounds.taskCount > 200) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tasks'],
      message: 'An outline may contain at most 200 task nodes',
    });
  }
  if (bounds.maxDepth > 8) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tasks'],
      message: 'An outline may contain at most eight task levels',
    });
  }
});

export const schema = z.object({ project: projectSchema }).strict();

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    const result = await createProjectFromOutline(
      args.project as ProjectOutline,
    );
    if (!result.success || !result.projectId || !result.items) {
      const residual = result.residualProjectId
        ? `\nResidual project ID: ${result.residualProjectId}`
        : '';
      const recovery = result.recovery ? `\nRecovery: ${result.recovery}` : '';
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to create project outline [${result.code || 'CREATE_FAILED'}]: ${result.error || 'Unknown error'}${residual}${recovery}`,
          },
        ],
        isError: true,
      };
    }

    const lines = result.items.map(
      (item) => `- ${item.path} (${item.type}: ${item.id})`,
    );
    return {
      content: [
        {
          type: 'text' as const,
          text: `Created and verified project ${result.projectId} with ${result.taskCount || 0} task(s).\n\n${lines.join('\n')}`,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error creating project outline: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
