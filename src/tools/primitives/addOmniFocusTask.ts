import { executeAppleScript } from '../../utils/scriptExecution.js';
import { appleScriptDateCode } from '../../utils/dateFormatter.js';
import { buildAppleScriptJsonHelpers } from '../../utils/appleScriptJson.js';
import { escapeAppleScriptString } from '../../utils/appleScriptString.js';
import { applyTagsExclusive } from './applyTagsExclusive.js';
import { removeItem } from './removeItem.js';
import { setRepetitionRule } from './setRepetitionRule.js';
import type { RepetitionErrorCode, RepetitionInput } from './repetitionRule.js';

// Interface for task creation parameters
export interface AddOmniFocusTaskParams {
  name: string;
  note?: string;
  dueDate?: string; // ISO date string
  deferDate?: string; // ISO date string
  plannedDate?: string; // ISO date string
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[]; // Tag names
  exclusiveTags?: boolean; // Respect mutually exclusive tag groups when applying tags (default: true)
  projectName?: string; // Project name to add task to
  parentTaskId?: string; // Parent task ID for subtask creation
  parentTaskName?: string; // Parent task name for subtask creation (alternative to ID)
  repetition?: RepetitionInput; // Optional recurrence applied and verified after creation
}

export function buildTagAssignmentScript(
  tags: string[],
  targetVar: string,
): string {
  if (!tags || tags.length === 0) {
    return '';
  }

  return tags
    .map((tag) => {
      const sanitizedTag = escapeAppleScriptString(tag);
      return `
          try
            set theTag to missing value
            try
              set theTag to first flattened tag where name = "${sanitizedTag}"
            end try
            if theTag is missing value then
              set theTag to make new tag with properties {name:"${sanitizedTag}"}
            end if
            add theTag to tags of ${targetVar}
          on error
            -- Ignore errors finding/adding tags
          end try`;
    })
    .join('\n');
}

/**
 * Generate pure AppleScript for task creation
 */
export function generateAppleScript(params: AddOmniFocusTaskParams): string {
  // Sanitize and prepare parameters for AppleScript
  const name = escapeAppleScriptString(params.name);
  const note = params.note ? escapeAppleScriptString(params.note) : '';
  // Build date variables outside OmniFocus tell block to avoid locale parsing issues.
  const dueDateCode = params.dueDate
    ? appleScriptDateCode(params.dueDate, 'dueDateValue')
    : '';
  const deferDateCode = params.deferDate
    ? appleScriptDateCode(params.deferDate, 'deferDateValue')
    : '';
  const plannedDateCode = params.plannedDate
    ? appleScriptDateCode(params.plannedDate, 'plannedDateValue')
    : '';
  const datePreamble = [dueDateCode, deferDateCode, plannedDateCode]
    .filter(Boolean)
    .join('\n');
  const flagged = params.flagged === true;
  const estimatedMinutes = params.estimatedMinutes?.toString() || '';
  const tags = params.tags || [];
  const projectName = params.projectName
    ? escapeAppleScriptString(params.projectName)
    : '';
  const parentTaskId = params.parentTaskId
    ? escapeAppleScriptString(params.parentTaskId)
    : '';
  const parentTaskName = params.parentTaskName
    ? escapeAppleScriptString(params.parentTaskName)
    : '';
  const jsonHelpers = buildAppleScriptJsonHelpers();
  const tagAssignmentScript = buildTagAssignmentScript(tags, 'newTask');

  // Construct AppleScript with error handling
  let script = `
${jsonHelpers}
  try
${datePreamble}
    tell application "OmniFocus"
      tell front document
        -- Determine the container (parent task, project, or inbox)
        if "${parentTaskId}" is not "" then
          -- Create subtask using parent task ID
          try
            set theParentTask to first flattened task where id = "${parentTaskId}"
            set newTask to make new task with properties {name:"${name}"} at end of tasks of theParentTask
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Parent task not found with ID: ${parentTaskId}") & "\\\"}"
          end try
        else if "${parentTaskName}" is not "" then
          -- Create subtask using parent task name
          try
            set theParentTask to first flattened task where name = "${parentTaskName}"
            set newTask to make new task with properties {name:"${name}"} at end of tasks of theParentTask
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Parent task not found with name: ${parentTaskName}") & "\\\"}"
          end try
        else if "${projectName}" is not "" then
          -- Use specified project
          try
            set theProject to first flattened project where name = "${projectName}"
            set newTask to make new task with properties {name:"${name}"} at end of tasks of theProject
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Project not found: ${projectName}") & "\\\"}"
          end try
        else
          -- Use inbox of the document
          set newTask to make new inbox task with properties {name:"${name}"}
        end if
        
        -- Set task properties
        ${note ? `set note of newTask to "${note}"` : ''}
        ${params.dueDate ? `set due date of newTask to dueDateValue` : ''}
        ${params.deferDate ? `set defer date of newTask to deferDateValue` : ''}
        ${params.plannedDate ? `set planned date of newTask to plannedDateValue` : ''}
        ${flagged ? `set flagged of newTask to true` : ''}
        ${estimatedMinutes ? `set estimated minutes of newTask to ${estimatedMinutes}` : ''}
        
        -- Get the task ID
        set taskId to id of newTask as string
        set taskNameValue to name of newTask
        
        -- Add tags if provided
        ${tagAssignmentScript}
        
        -- Return success with task ID
        return "{\\\"success\\\":true,\\\"taskId\\\":\\"" & my jsonEscape(taskId) & "\\",\\\"name\\\":\\"" & my jsonEscape(taskNameValue) & "\\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape(errorMessage) & "\\\"}"
  end try
  `;

  return script;
}

/**
 * Validate parent task parameters to prevent conflicts
 */
async function validateParentTaskParams(
  params: AddOmniFocusTaskParams,
): Promise<{ valid: boolean; error?: string }> {
  // Check if both parentTaskId and parentTaskName are provided
  if (params.parentTaskId && params.parentTaskName) {
    return {
      valid: false,
      error:
        'Cannot specify both parentTaskId and parentTaskName. Please use only one.',
    };
  }

  // Check if parent task is specified along with projectName
  if ((params.parentTaskId || params.parentTaskName) && params.projectName) {
    return {
      valid: false,
      error:
        'Cannot specify both parent task and project. Subtasks inherit project from their parent.',
    };
  }

  return { valid: true };
}

/**
 * Add a task to OmniFocus
 */
export interface AddOmniFocusTaskResult {
  success: boolean;
  taskId?: string;
  error?: string;
  code?: RepetitionErrorCode;
  removedSiblings?: string[];
  missingTags?: string[];
  repetition?: {
    ruleString?: string;
    scheduleType?: string;
    anchorDateKey?: string;
    catchUpAutomatically?: boolean;
    nextOccurrence?: string | null;
  };
}

/**
 * Apply the confirmed recurrence to a freshly created task. A failure leaves a task whose
 * recurrence the user never approved, so the task is removed again before reporting.
 */
async function applyCreationRepetition(
  taskId: string,
  repetition: RepetitionInput,
): Promise<
  | { failure: AddOmniFocusTaskResult }
  | { applied: NonNullable<AddOmniFocusTaskResult['repetition']> }
> {
  const result = await setRepetitionRule({ taskId, ...repetition });
  if (result.success) {
    return {
      applied: {
        ruleString: result.ruleString,
        scheduleType: result.scheduleType,
        anchorDateKey: result.anchorDateKey,
        catchUpAutomatically: result.catchUpAutomatically,
        nextOccurrence: result.nextOccurrence,
      },
    };
  }

  const removal = await removeItem({ id: taskId, itemType: 'task' });
  const cleanup = removal.success
    ? 'The created task was removed.'
    : `The created task ${taskId} could not be removed automatically.`;

  return {
    failure: {
      success: false,
      code: result.code,
      error: `${result.error || 'Failed to set repetition rule'} ${cleanup}`,
    },
  };
}

export async function addOmniFocusTask(
  params: AddOmniFocusTaskParams,
): Promise<AddOmniFocusTaskResult> {
  try {
    // Validate parent task parameters
    const validation = await validateParentTaskParams(params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Generate AppleScript
    const script = generateAppleScript(params);

    console.error('Generated AppleScript:');
    console.error(script);
    console.error('Executing AppleScript...');

    // Execute AppleScript using temp file (avoids shell escaping issues)
    const stdout = await executeAppleScript(script);

    console.error('AppleScript stdout:', stdout);

    // Parse the result
    try {
      const result = JSON.parse(stdout);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      const taskId = result.taskId as string;
      const tags = params.tags || [];
      const exclusiveTags = params.exclusiveTags !== false;

      // If tags were applied and exclusivity is enabled, enforce mutually exclusive groups.
      const exclusivity =
        taskId && tags.length > 0 && exclusiveTags
          ? await applyTagsExclusive(taskId, tags, 'add')
          : null;

      let repetition: AddOmniFocusTaskResult['repetition'];
      if (taskId && params.repetition) {
        const outcome = await applyCreationRepetition(
          taskId,
          params.repetition,
        );
        if ('failure' in outcome) return outcome.failure;
        repetition = outcome.applied;
      }

      return {
        success: true,
        taskId,
        removedSiblings: exclusivity?.removedSiblings,
        missingTags: exclusivity?.missing,
        repetition,
      };
    } catch (parseError) {
      console.error('Error parsing AppleScript result:', parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`,
      };
    }
  } catch (error: any) {
    console.error('Error in addOmniFocusTask:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error in addOmniFocusTask',
    };
  }
}
