import { executeAppleScript } from '../../utils/scriptExecution.js';
import { generateAppleScriptDateCode } from '../../utils/dateFormatter.js';

// Interface for task creation parameters
export interface AddOmniFocusTaskParams {
  name: string;
  note?: string;
  dueDate?: string; // ISO date string
  deferDate?: string; // ISO date string
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[]; // Tag names
  projectName?: string; // Project name to add task to
  parentTaskId?: string; // Parent task ID for subtask creation
  parentTaskName?: string; // Parent task name for subtask creation (alternative to ID)
}

/**
 * Generate pure AppleScript for task creation
 */
function generateAppleScript(params: AddOmniFocusTaskParams): string {
  // Sanitize and prepare parameters for AppleScript
  const name = params.name.replace(/['"\\]/g, '\\$&'); // Escape quotes and backslashes
  const note = params.note?.replace(/['"\\]/g, '\\$&') || '';
  // Generate locale-independent date code
  const dueDateCode = params.dueDate ? generateAppleScriptDateCode(params.dueDate, "taskDueDate") : '';
  const deferDateCode = params.deferDate ? generateAppleScriptDateCode(params.deferDate, "taskDeferDate") : '';
  const flagged = params.flagged === true;
  const estimatedMinutes = params.estimatedMinutes?.toString() || '';
  const tags = params.tags || [];
  const projectName = params.projectName?.replace(/['"\\]/g, '\\$&') || '';
  const parentTaskId = params.parentTaskId?.replace(/['"\\]/g, '\\$&') || '';
  const parentTaskName = params.parentTaskName?.replace(/['"\\]/g, '\\$&') || '';

  // Construct AppleScript with error handling
  let script = `
  try
    -- Build date objects OUTSIDE the tell block (avoids permission issues)
    ${dueDateCode}
    ${deferDateCode}
    tell application "OmniFocus"
      tell front document
        -- Determine the container (parent task, project, or inbox)
        if "${parentTaskId}" is not "" then
          -- Create subtask using parent task ID
          try
            set theParentTask to first flattened task where id = "${parentTaskId}"
            set newTask to make new task with properties {name:"${name}"} at end of tasks of theParentTask
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Parent task not found with ID: ${parentTaskId}\\\"}"
          end try
        else if "${parentTaskName}" is not "" then
          -- Create subtask using parent task name
          try
            set theParentTask to first flattened task where name = "${parentTaskName}"
            set newTask to make new task with properties {name:"${name}"} at end of tasks of theParentTask
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Parent task not found with name: ${parentTaskName}\\\"}"
          end try
        else if "${projectName}" is not "" then
          -- Use specified project
          try
            set theProject to first flattened project where name = "${projectName}"
            set newTask to make new task with properties {name:"${name}"} at end of tasks of theProject
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Project not found: ${projectName}\\\"}"
          end try
        else
          -- Use inbox of the document
          set newTask to make new inbox task with properties {name:"${name}"}
        end if
        
        -- Set task properties
        ${note ? `set note of newTask to "${note}"` : ''}
        ${dueDateCode ? `
        -- Set due date (using pre-built date object)
        set due date of newTask to taskDueDate` : ''}
        ${deferDateCode ? `
        -- Set defer date (using pre-built date object)
        set defer date of newTask to taskDeferDate` : ''}
        ${flagged ? `set flagged of newTask to true` : ''}
        ${estimatedMinutes ? `set estimated minutes of newTask to ${estimatedMinutes}` : ''}
        
        -- Get the task ID
        set taskId to id of newTask as string
        
        -- Add tags if provided
        ${tags.length > 0 ? tags.map(tag => {
    const sanitizedTag = tag.replace(/['"\\]/g, '\\$&');
    return `
          try
            set theTag to first flattened tag where name = "${sanitizedTag}"
            add theTag to tags of newTask
          on error
            -- Ignore errors finding/adding tags
          end try`;
  }).join('\n') : ''}
        
        -- Return success with task ID
        return "{\\\"success\\\":true,\\\"taskId\\\":\\"" & taskId & "\\",\\\"name\\\":\\"${name}\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
  end try
  `;

  return script;
}

/**
 * Validate parent task parameters to prevent conflicts
 */
async function validateParentTaskParams(params: AddOmniFocusTaskParams): Promise<{ valid: boolean, error?: string }> {
  // Check if both parentTaskId and parentTaskName are provided
  if (params.parentTaskId && params.parentTaskName) {
    return {
      valid: false,
      error: "Cannot specify both parentTaskId and parentTaskName. Please use only one."
    };
  }

  // Check if parent task is specified along with projectName
  if ((params.parentTaskId || params.parentTaskName) && params.projectName) {
    return {
      valid: false,
      error: "Cannot specify both parent task and project. Subtasks inherit project from their parent."
    };
  }

  return { valid: true };
}

/**
 * Add a task to OmniFocus
 */
export async function addOmniFocusTask(params: AddOmniFocusTaskParams): Promise<{ success: boolean, taskId?: string, error?: string }> {
  try {
    // Validate parent task parameters
    const validation = await validateParentTaskParams(params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Generate AppleScript
    const script = generateAppleScript(params);

    console.error("Generated AppleScript:");
    console.error(script);
    console.error("Executing AppleScript...");

    // Execute AppleScript using temp file (avoids shell escaping issues)
    const stdout = await executeAppleScript(script);

    console.error("AppleScript stdout:", stdout);

    // Parse the result
    try {
      const result = JSON.parse(stdout);

      // Return the result
      return {
        success: result.success,
        taskId: result.taskId,
        error: result.error
      };
    } catch (parseError) {
      console.error("Error parsing AppleScript result:", parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    console.error("Error in addOmniFocusTask:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in addOmniFocusTask"
    };
  }
} 