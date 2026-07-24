import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface ApplyTagsExclusiveResult {
  success: boolean;
  applied?: string[];
  removedSiblings?: string[];
  missing?: string[];
  error?: string;
}

/**
 * Apply tags to a task while respecting mutually exclusive tag groups.
 *
 * When a tag belongs to a mutually exclusive group (its parent tag has
 * childrenAreMutuallyExclusive === true), sibling tags from that group are
 * removed before the new tag is added.
 *
 * @param taskId OmniFocus task primary key
 * @param tagNames Tag names to apply
 * @param mode 'add' preserves existing tags; 'replace' clears existing tags first
 */
export async function applyTagsExclusive(
  taskId: string,
  tagNames: string[],
  mode: 'add' | 'replace' = 'add'
): Promise<ApplyTagsExclusiveResult> {
  const result = await executeOmniFocusScript('@applyTagsExclusive.js', {
    taskId,
    tagNames,
    mode,
  });

  if (typeof result === 'string') {
    try {
      return JSON.parse(result) as ApplyTagsExclusiveResult;
    } catch {
      return { success: false, error: result };
    }
  }

  return result as ApplyTagsExclusiveResult;
}

/**
 * Pure decision helper for tests: determine which sibling tags should be removed
 * when applying a tag from a mutually exclusive group.
 */
export function siblingsToRemove(
  parentExclusive: boolean,
  siblingNames: string[],
  currentTagNames: string[],
  targetTagName: string
): string[] {
  if (!parentExclusive) return [];
  return siblingNames.filter(name => name !== targetTagName && currentTagNames.includes(name));
}
