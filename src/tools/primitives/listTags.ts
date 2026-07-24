import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface OmniFocusTagSummary {
  id: string;
  name: string;
  parentTagID: string | null;
  active: boolean;
}

interface ListTagsResult {
  success: boolean;
  count: number;
  tags: OmniFocusTagSummary[];
  error?: string;
}

function parseListTagsResult(result: unknown): ListTagsResult {
  const data = typeof result === 'string' ? JSON.parse(result) : result;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid list_tags response');
  }

  const response = data as Partial<ListTagsResult>;
  if (response.success !== true) {
    throw new Error(response.error || 'Unable to list OmniFocus tags');
  }
  if (!Array.isArray(response.tags)) {
    throw new Error('Invalid list_tags response: tags must be an array');
  }

  return {
    success: true,
    count: response.tags.length,
    tags: response.tags
  };
}

export async function listTags(includeInactive = true): Promise<string> {
  const result = await executeOmniFocusScript('@listTags.js', { includeInactive });
  const data = parseListTagsResult(result);

  if (data.tags.length === 0) {
    return '# OmniFocus Tags\n\nNo tags found.';
  }

  const lines = data.tags.map(tag => {
    const parent = tag.parentTagID ? ` parent:${tag.parentTagID}` : '';
    const status = tag.active ? 'active' : 'inactive';
    return `- ${tag.name} [${status}] (id:${tag.id}${parent})`;
  });

  return `# OmniFocus Tags (${data.count})\n\n${lines.join('\n')}`;
}

export { parseListTagsResult };
