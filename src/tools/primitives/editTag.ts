import { executeAppleScript } from '../../utils/scriptExecution.js';
import { buildAppleScriptJsonHelpers } from '../../utils/appleScriptJson.js';
import { escapeAppleScriptString } from '../../utils/appleScriptString.js';

export type TagStatus = 'active' | 'onHold' | 'dropped';

export interface EditTagParams {
  id?: string;
  name?: string;
  newName?: string;
  newStatus?: TagStatus;
  newParentTagName?: string; // Move under another tag; empty string "" moves to root
}

export function validateEditTagParams(params: EditTagParams): { valid: boolean; error?: string } {
  if (!params.id && !params.name) {
    return { valid: false, error: 'Either id or name must be provided' };
  }

  if (
    params.newName === undefined &&
    params.newStatus === undefined &&
    params.newParentTagName === undefined
  ) {
    return {
      valid: false,
      error: 'Nothing to update: provide newName, newStatus, and/or newParentTagName.'
    };
  }

  return { valid: true };
}

/**
 * Generate pure AppleScript for tag editing.
 */
export function generateAppleScript(params: EditTagParams): string {
  const id = params.id ? escapeAppleScriptString(params.id) : '';
  const name = params.name ? escapeAppleScriptString(params.name) : '';
  const jsonHelpers = buildAppleScriptJsonHelpers();

  if (!id && !name) {
    return `return "{\\\"success\\\":false,\\\"error\\\":\\\"Either id or name must be provided\\\"}"`;
  }

  let script = `
${jsonHelpers}
  try
    tell application "OmniFocus"
      tell front document
        set foundTag to missing value
`;

  if (id) {
    script += `
        try
          set foundTag to first flattened tag where id = "${id}"
        end try
`;
  }

  if (name) {
    script += `
        if foundTag is missing value then
          set nameMatches to (flattened tags where name = "${name}")
          set nameMatchCount to count of nameMatches

          if nameMatchCount = 1 then
            set foundTag to item 1 of nameMatches
          else if nameMatchCount > 1 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Ambiguous tag name: ${name}. Multiple matches found; please use id.") & "\\\"}"
          end if
        end if
`;
  }

  script += `
        if foundTag is not missing value then
          set tagName to name of foundTag
          set tagId to id of foundTag as string
          set changedProperties to {}
`;

  // Move to a new parent tag (or root when empty string)
  if (params.newParentTagName !== undefined) {
    if (params.newParentTagName === '') {
      script += `
          -- Move tag to the root level
          move foundTag to end of tags
          set end of changedProperties to "parent (root)"
`;
    } else {
      const destName = escapeAppleScriptString(params.newParentTagName);
      script += `
          -- Resolve destination parent tag with duplicate protection
          set destMatches to (flattened tags where name = "${destName}")
          set destMatchCount to count of destMatches

          if destMatchCount = 0 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Destination parent tag not found: ${destName}") & "\\\"}"
          else if destMatchCount > 1 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Ambiguous destination parent tag name: ${destName}. Multiple matches found; please rename or use a unique tag.") & "\\\"}"
          end if

          set destTag to item 1 of destMatches

          -- Prevent cycles: destination cannot be this tag or any of its descendants
          set cursorTag to destTag
          repeat while cursorTag is not missing value
            if (id of cursorTag as string) is tagId then
              return "{\\\"success\\\":false,\\\"error\\\":\\\"Invalid move target: cannot move a tag into itself or its descendants.\\\"}"
            end if

            set nextCursorTag to missing value
            try
              set cursorContainer to container of cursorTag
              if class of cursorContainer is tag then
                set nextCursorTag to cursorContainer
              end if
            end try
            set cursorTag to nextCursorTag
          end repeat

          move foundTag to end of tags of destTag
          set end of changedProperties to "parent"
`;
    }
  }

  if (params.newName !== undefined) {
    script += `
          set name of foundTag to "${escapeAppleScriptString(params.newName)}"
          set end of changedProperties to "name"
`;
  }

  if (params.newStatus !== undefined) {
    // OmniFocus AppleScript exposes tag availability via `hidden` / `allows next action`.
    // Status mapping: active = not hidden, onHold/dropped = hidden.
    if (params.newStatus === 'active') {
      script += `
          set hidden of foundTag to false
          set end of changedProperties to "status (active)"
`;
    } else if (params.newStatus === 'onHold') {
      script += `
          set allows next action of foundTag to false
          set end of changedProperties to "status (on hold)"
`;
    } else {
      script += `
          set hidden of foundTag to true
          set end of changedProperties to "status (dropped)"
`;
    }
  }

  script += `
          set changedPropsText to ""
          repeat with i from 1 to count of changedProperties
            set changedPropsText to changedPropsText & item i of changedProperties
            if i < count of changedProperties then
              set changedPropsText to changedPropsText & ", "
            end if
          end repeat

          set tagName to name of foundTag
          set tagId to id of foundTag as string

          return "{\\\"success\\\":true,\\\"id\\\":\\"" & my jsonEscape(tagId) & "\\",\\\"name\\\":\\"" & my jsonEscape(tagName) & "\\",\\\"changedProperties\\\":\\"" & my jsonEscape(changedPropsText) & "\\\"}"
        else
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Tag not found\\\"}"
        end if
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape(errorMessage) & "\\\"}"
  end try
  `;

  return script;
}

/**
 * Edit a tag in OmniFocus.
 */
export async function editTag(params: EditTagParams): Promise<{
  success: boolean,
  id?: string,
  name?: string,
  changedProperties?: string,
  error?: string
}> {
  try {
    const validation = validateEditTagParams(params);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const script = generateAppleScript(params);

    console.error('Executing AppleScript for tag editing...');

    const stdout = await executeAppleScript(script);

    console.error('AppleScript stdout:', stdout);

    try {
      const result = JSON.parse(stdout);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        id: result.id,
        name: result.name,
        changedProperties: result.changedProperties
      };
    } catch (parseError) {
      console.error('Error parsing AppleScript result:', parseError);
      return { success: false, error: `Failed to parse result: ${stdout}` };
    }
  } catch (error: any) {
    console.error('Error in editTag:', error);
    return { success: false, error: error?.message || 'Unknown error in editTag' };
  }
}
