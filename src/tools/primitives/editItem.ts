import { executeAppleScript } from '../../utils/scriptExecution.js';
import { appleScriptDateCode } from '../../utils/dateFormatter.js';
import { sanitizeForAppleScript } from '../../utils/sanitize.js';

// Status options for tasks and projects
type TaskStatus = 'incomplete' | 'completed' | 'dropped';
type ProjectStatus = 'active' | 'completed' | 'dropped' | 'onHold';

// Interface for item edit parameters
export interface EditItemParams {
  id?: string;                  // ID of the task or project to edit
  name?: string;                // Name of the task or project to edit (as fallback if ID not provided)
  itemType: 'task' | 'project'; // Type of item to edit

  // Common editable fields
  newName?: string;             // New name for the item
  newNote?: string;             // New note for the item
  newDueDate?: string;          // New due date in ISO format (empty string to clear)
  newDeferDate?: string;        // New defer date in ISO format (empty string to clear)
  newPlannedDate?: string;      // New planned date in ISO format (empty string to clear)
  newFlagged?: boolean;         // New flagged status (false to remove flag, true to add flag)
  newEstimatedMinutes?: number; // New estimated minutes

  // Task-specific fields
  newStatus?: TaskStatus;       // New status for tasks (incomplete, completed, dropped)
  addTags?: string[];           // Tags to add to the task
  removeTags?: string[];        // Tags to remove from the task
  replaceTags?: string[];       // Tags to replace all existing tags with
  newProjectId?: string;        // Move task to a new project by ID
  newProjectName?: string;      // Move task to a new project by name
  newParentTaskId?: string;     // Move task under a new parent task by ID
  newParentTaskName?: string;   // Move task under a new parent task by name
  moveToInbox?: boolean;        // Move task to inbox

  // Project-specific fields
  newSequential?: boolean;      // Whether the project should be sequential
  newFolderName?: string;       // New folder to move the project to
  newProjectStatus?: ProjectStatus; // New status for projects
}

function hasTaskMoveTarget(params: EditItemParams): boolean {
  return Boolean(
    params.newProjectId ||
    params.newProjectName ||
    params.newParentTaskId ||
    params.newParentTaskName ||
    params.moveToInbox === true
  );
}

/**
 * Validate edit parameters before script generation.
 */
export function validateEditItemParams(params: EditItemParams): { valid: boolean; error?: string } {
  if (!params.id && !params.name) {
    return {
      valid: false,
      error: 'Either id or name must be provided'
    };
  }

  const hasMoveTarget = hasTaskMoveTarget(params);

  if (params.itemType !== 'task' && hasMoveTarget) {
    return {
      valid: false,
      error: 'Task move parameters are only supported when itemType is "task".'
    };
  }

  if (params.itemType === 'task') {
    if (params.newProjectId && params.newProjectName) {
      return {
        valid: false,
        error: 'Cannot specify both newProjectId and newProjectName. Please use only one.'
      };
    }

    if (params.newParentTaskId && params.newParentTaskName) {
      return {
        valid: false,
        error: 'Cannot specify both newParentTaskId and newParentTaskName. Please use only one.'
      };
    }

    const destinationTypeCount = [
      params.newProjectId || params.newProjectName ? 1 : 0,
      params.newParentTaskId || params.newParentTaskName ? 1 : 0,
      params.moveToInbox === true ? 1 : 0
    ].reduce((sum, val) => sum + val, 0);

    if (destinationTypeCount > 1) {
      return {
        valid: false,
        error: 'Invalid destination selection: specify exactly one destination type (project, parent task, or inbox).'
      };
    }
  }

  return { valid: true };
}

/**
 * Generate pure AppleScript for item editing
 */
export function generateAppleScript(params: EditItemParams): string {
  // Sanitize and prepare parameters for AppleScript
  const id = params.id ? sanitizeForAppleScript(params.id) : '';
  const name = params.name ? sanitizeForAppleScript(params.name) : '';
  const itemType = params.itemType;
  const listName = itemType === 'task' ? 'flattened tasks' : 'flattened projects';
  const singularTypeLabel = itemType === 'task' ? 'task' : 'project';

  const newProjectId = params.newProjectId ? sanitizeForAppleScript(params.newProjectId) : '';
  const newProjectName = params.newProjectName ? sanitizeForAppleScript(params.newProjectName) : '';
  const newParentTaskId = params.newParentTaskId ? sanitizeForAppleScript(params.newParentTaskId) : '';
  const newParentTaskName = params.newParentTaskName ? sanitizeForAppleScript(params.newParentTaskName) : '';

  const datePreambleParts: string[] = [];

  if (params.newDueDate !== undefined && params.newDueDate !== '') {
    datePreambleParts.push(appleScriptDateCode(params.newDueDate, 'newDueDateValue'));
  }
  if (params.newDeferDate !== undefined && params.newDeferDate !== '') {
    datePreambleParts.push(appleScriptDateCode(params.newDeferDate, 'newDeferDateValue'));
  }
  if (params.newPlannedDate !== undefined && params.newPlannedDate !== '') {
    datePreambleParts.push(appleScriptDateCode(params.newPlannedDate, 'newPlannedDateValue'));
  }
  const datePreamble = datePreambleParts.join('\n');

  // Verify we have at least one identifier
  if (!id && !name) {
    return `return "{\\\"success\\\":false,\\\"error\\\":\\\"Either id or name must be provided\\\"}"`;
  }

  // Construct AppleScript with error handling
  let script = `
  try
${datePreamble}
    tell application "OmniFocus"
      tell front document
        -- Find the item to edit
        set foundItem to missing value
`;

  if (id) {
    script += `
        -- Try to find by ID first
        try
          set foundItem to first ${itemType === 'task' ? 'flattened task' : 'flattened project'} where id = "${id}"
        end try
`;
  }

  if (name) {
    script += `
        -- Resolve by name with duplicate protection
        if foundItem is missing value then
          set nameMatches to (${listName} where name = "${name}")
          set nameMatchCount to count of nameMatches

          if nameMatchCount = 1 then
            set foundItem to item 1 of nameMatches
          else if nameMatchCount > 1 then
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Ambiguous ${singularTypeLabel} name: ${name}. Multiple matches found; please use id.\\\"}"
          end if
        end if
`;
  }

  // Add the item editing logic
  script += `
        -- If we found the item, edit it
        if foundItem is not missing value then
          set itemName to name of foundItem
          set itemId to id of foundItem as string
          set changedProperties to {}
`;

  if (itemType === 'task' && hasTaskMoveTarget(params)) {
    if (params.moveToInbox === true) {
      script += `
          -- Move task to inbox first (before property edits)
          move foundItem to end of inbox tasks
          set end of changedProperties to "moved (inbox)"
`;
    } else if (params.newProjectId || params.newProjectName) {
      if (params.newProjectId) {
        script += `
          -- Resolve destination project by ID
          set destinationProject to missing value
          try
            set destinationProject to first flattened project where id = "${newProjectId}"
          end try

          if destinationProject is missing value then
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Destination project not found with ID: ${newProjectId}\\\"}"
          end if

          -- Move task to destination project first (before property edits)
          move foundItem to end of tasks of destinationProject
          set end of changedProperties to "moved (project)"
`;
      } else {
        script += `
          -- Resolve destination project by name with duplicate protection
          set destinationProjects to (flattened projects where name = "${newProjectName}")
          set destinationProjectCount to count of destinationProjects

          if destinationProjectCount = 0 then
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Destination project not found with name: ${newProjectName}\\\"}"
          else if destinationProjectCount > 1 then
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Ambiguous destination project name: ${newProjectName}. Multiple matches found; please use project id.\\\"}"
          end if

          set destinationProject to item 1 of destinationProjects

          -- Move task to destination project first (before property edits)
          move foundItem to end of tasks of destinationProject
          set end of changedProperties to "moved (project)"
`;
      }
    } else if (params.newParentTaskId || params.newParentTaskName) {
      if (params.newParentTaskId) {
        script += `
          -- Resolve destination parent task by ID
          set destinationParentTask to missing value
          try
            set destinationParentTask to first flattened task where id = "${newParentTaskId}"
          end try

          if destinationParentTask is missing value then
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Destination parent task not found with ID: ${newParentTaskId}\\\"}"
          end if
`;
      } else {
        script += `
          -- Resolve destination parent task by name with duplicate protection
          set destinationParentTasks to (flattened tasks where name = "${newParentTaskName}")
          set destinationParentTaskCount to count of destinationParentTasks

          if destinationParentTaskCount = 0 then
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Destination parent task not found with name: ${newParentTaskName}\\\"}"
          else if destinationParentTaskCount > 1 then
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Ambiguous destination parent task name: ${newParentTaskName}. Multiple matches found; please use parent task id.\\\"}"
          end if

          set destinationParentTask to item 1 of destinationParentTasks
`;
      }

      script += `
          -- Prevent cycles: destination parent cannot be this task or any descendant of this task
          set cursorTask to destinationParentTask
          repeat while cursorTask is not missing value
            if (id of cursorTask as string) is itemId then
              return "{\\\"success\\\":false,\\\"error\\\":\\\"Invalid move target: cannot move a task into itself or its descendants.\\\"}"
            end if

            set nextCursorTask to missing value
            try
              set cursorContainer to container of cursorTask
              if class of cursorContainer is task then
                set nextCursorTask to cursorContainer
              end if
            end try
            set cursorTask to nextCursorTask
          end repeat

          -- Move task under destination parent first (before property edits)
          move foundItem to end of tasks of destinationParentTask
          set end of changedProperties to "moved (parent task)"
`;
    }
  }

  // Common property updates for both tasks and projects
  if (params.newName !== undefined) {
    script += `
          -- Update name
          set name of foundItem to "${sanitizeForAppleScript(params.newName)}"
          set end of changedProperties to "name"
`;
  }

  if (params.newNote !== undefined) {
    script += `
          -- Update note
          set note of foundItem to "${sanitizeForAppleScript(params.newNote)}"
          set end of changedProperties to "note"
`;
  }

  if (params.newDueDate !== undefined) {
    if (params.newDueDate === '') {
      script += `
          -- Clear due date
          set due date of foundItem to missing value
          set end of changedProperties to "due date"
`;
    } else {
      script += `
          -- Update due date
          set due date of foundItem to newDueDateValue
          set end of changedProperties to "due date"
`;
    }
  }

  if (params.newDeferDate !== undefined) {
    if (params.newDeferDate === '') {
      script += `
          -- Clear defer date
          set defer date of foundItem to missing value
          set end of changedProperties to "defer date"
`;
    } else {
      script += `
          -- Update defer date
          set defer date of foundItem to newDeferDateValue
          set end of changedProperties to "defer date"
`;
    }
  }

  if (params.newPlannedDate !== undefined) {
    if (params.newPlannedDate === '') {
      script += `
          -- Clear planned date
          set planned date of foundItem to missing value
          set end of changedProperties to "planned date"
`;
    } else {
      script += `
          -- Update planned date
          set planned date of foundItem to newPlannedDateValue
          set end of changedProperties to "planned date"
`;
    }
  }

  if (params.newFlagged !== undefined) {
    script += `
          -- Update flagged status
          set flagged of foundItem to ${params.newFlagged}
          set end of changedProperties to "flagged"
`;
  }

  if (params.newEstimatedMinutes !== undefined) {
    script += `
          -- Update estimated minutes
          set estimated minutes of foundItem to ${params.newEstimatedMinutes}
          set end of changedProperties to "estimated minutes"
`;
  }

  // Task-specific updates
  if (itemType === 'task') {
    // Update task status
    if (params.newStatus !== undefined) {
      if (params.newStatus === 'completed') {
        script += `
          -- Mark task as completed
          set completed of foundItem to true
          set end of changedProperties to "status (completed)"
`;
      } else if (params.newStatus === 'dropped') {
        script += `
          -- Mark task as dropped
          set dropped of foundItem to true
          set end of changedProperties to "status (dropped)"
`;
      } else if (params.newStatus === 'incomplete') {
        script += `
          -- Mark task as incomplete
          set completed of foundItem to false
          set dropped of foundItem to false
          set end of changedProperties to "status (incomplete)"
`;
      }
    }

    // Handle tag operations
    if (params.replaceTags && params.replaceTags.length > 0) {
      const tagsList = params.replaceTags.map(tag => `"${sanitizeForAppleScript(tag)}"`).join(', ');
      script += `
          -- Replace all tags
          set tagNames to {${tagsList}}
          set existingTags to tags of foundItem

          -- First clear all existing tags
          repeat with existingTag in existingTags
            remove existingTag from tags of foundItem
          end repeat

          -- Then add new tags
          repeat with tagName in tagNames
            set tagObj to missing value
            try
              set tagObj to first flattened tag where name = tagName
            end try
            if tagObj is missing value then
              set tagObj to make new tag with properties {name:tagName}
            end if
            add tagObj to tags of foundItem
          end repeat
          set end of changedProperties to "tags (replaced)"
`;
    } else {
      // Add tags if specified
      if (params.addTags && params.addTags.length > 0) {
        const tagsList = params.addTags.map(tag => `"${sanitizeForAppleScript(tag)}"`).join(', ');
        script += `
          -- Add tags
          set tagNames to {${tagsList}}
          repeat with tagName in tagNames
            set tagObj to missing value
            try
              set tagObj to first flattened tag where name = tagName
            end try
            if tagObj is missing value then
              set tagObj to make new tag with properties {name:tagName}
            end if
            add tagObj to tags of foundItem
          end repeat
          set end of changedProperties to "tags (added)"
`;
      }

      // Remove tags if specified
      if (params.removeTags && params.removeTags.length > 0) {
        const tagsList = params.removeTags.map(tag => `"${sanitizeForAppleScript(tag)}"`).join(', ');
        script += `
          -- Remove tags
          set tagNames to {${tagsList}}
          repeat with tagName in tagNames
            try
              set tagObj to first flattened tag where name = tagName
              remove tagObj from tags of foundItem
            end try
          end repeat
          set end of changedProperties to "tags (removed)"
`;
      }
    }
  }

  // Project-specific updates
  if (itemType === 'project') {
    // Update sequential status
    if (params.newSequential !== undefined) {
      script += `
          -- Update sequential status
          set sequential of foundItem to ${params.newSequential}
          set end of changedProperties to "sequential"
`;
    }

    // Update project status
    if (params.newProjectStatus !== undefined) {
      const statusValue = params.newProjectStatus === 'active' ? 'active status' :
        params.newProjectStatus === 'completed' ? 'done status' :
          params.newProjectStatus === 'dropped' ? 'dropped status' :
            'on hold status';
      script += `
          -- Update project status
          set status of foundItem to ${statusValue}
          set end of changedProperties to "status"
`;
    }

    // Move to a new folder
    if (params.newFolderName !== undefined) {
      const folderName = sanitizeForAppleScript(params.newFolderName);
      script += `
          -- Move to new folder
          set destFolder to missing value
          try
            set destFolder to first flattened folder where name = "${folderName}"
          end try

          if destFolder is missing value then
            -- Create the folder if it doesn't exist
            set destFolder to make new folder with properties {name:"${folderName}"}
          end if

          -- Move project to the folder
          move foundItem to destFolder
          set end of changedProperties to "folder"
`;
    }
  }

  script += `
          -- Prepare the changed properties as a string
          set changedPropsText to ""
          repeat with i from 1 to count of changedProperties
            set changedPropsText to changedPropsText & item i of changedProperties
            if i < count of changedProperties then
              set changedPropsText to changedPropsText & ", "
            end if
          end repeat

          -- Return success with details
          return "{\\\"success\\\":true,\\\"id\\\":\\"" & itemId & "\\",\\\"name\\\":\\"" & itemName & "\\",\\\"changedProperties\\\":\\"" & changedPropsText & "\\"}"
        else
          -- Item not found
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Item not found\\\"}"
        end if
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
  end try
  `;

  return script;
}

/**
 * Edit a task or project in OmniFocus
 */
export async function editItem(params: EditItemParams): Promise<{
  success: boolean,
  id?: string,
  name?: string,
  changedProperties?: string,
  error?: string
}> {
  try {
    const validation = validateEditItemParams(params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Generate AppleScript
    const script = generateAppleScript(params);

    if (process.env.DEBUG) {
      console.error('Executing AppleScript for editing...');
      console.error(`Item type: ${params.itemType}, ID: ${params.id || 'not provided'}, Name: ${params.name || 'not provided'}`);
      const scriptPreview = script.split('\n').slice(0, 10).join('\n') + '\n...';
      console.error('AppleScript preview:\n', scriptPreview);
    }

    // Execute AppleScript using temp file (avoids shell escaping issues)
    const stdout = await executeAppleScript(script);

    console.error('AppleScript stdout:', stdout);

    // Parse the result
    try {
      const result = JSON.parse(stdout);

      // Return the result
      return {
        success: result.success,
        id: result.id,
        name: result.name,
        changedProperties: result.changedProperties,
        error: result.error
      };
    } catch (parseError) {
      console.error('Error parsing AppleScript result:', parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    console.error('Error in editItem execution:', error);

    // Include more detailed error information
    if (error.message && error.message.includes('syntax error')) {
      console.error('This appears to be an AppleScript syntax error. Review the script generation logic.');
    }

    return {
      success: false,
      error: error?.message || 'Unknown error in editItem'
    };
  }
}
