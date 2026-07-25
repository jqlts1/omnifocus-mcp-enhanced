import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { OmniFocusTagSummary, parseListTagsResult } from './listTags.js';

export interface SearchTagsParams {
  query: string;
  exactMatch?: boolean;
  includeInactive?: boolean;
}

/**
 * Search OmniFocus tags by name (fuzzy by default).
 * Reuses the listTags OmniJS script and filters client-side.
 */
export async function searchTags(params: SearchTagsParams): Promise<string> {
  const includeInactive = params.includeInactive !== false;
  const exactMatch = params.exactMatch === true;
  const query = (params.query || '').trim();

  if (query === '') {
    throw new Error('query must not be empty');
  }

  const result = await executeOmniFocusScript('@listTags.js', { includeInactive });
  const data = parseListTagsResult(result);

  const needle = query.toLowerCase();
  const matches: OmniFocusTagSummary[] = data.tags.filter(tag => {
    const tagName = (tag.name || '').toLowerCase();
    return exactMatch ? tagName === needle : tagName.includes(needle);
  });

  if (matches.length === 0) {
    return `# Tag Search: "${query}"\n\nNo matching tags found.`;
  }

  const lines = matches.map(tag => {
    const parent = tag.parentTagID ? ` parent:${tag.parentTagID}` : '';
    const status = tag.active ? 'active' : 'inactive';
    return `- ${tag.name} [${status}] (id:${tag.id}${parent})`;
  });

  return `# Tag Search: "${query}" (${matches.length} match${matches.length === 1 ? '' : 'es'})\n\n${lines.join('\n')}`;
}
