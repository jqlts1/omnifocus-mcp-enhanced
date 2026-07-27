import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface ReviewedProjectResult {
  id: string;
  name: string;
  status: string;
  lastReviewDate: string;
  nextReviewDate: string;
  reviewInterval: { steps: number; unit: string; fixed: boolean };
  verified: boolean;
}

export interface MarkProjectsReviewedResult {
  success: boolean;
  reviewedAt?: string;
  count?: number;
  projects?: ReviewedProjectResult[];
  error?: string;
}

export async function markProjectsReviewed(projectIds: string[]): Promise<MarkProjectsReviewedResult> {
  const result = await executeOmniFocusScript('@markProjectsReviewed.js', { projectIds });

  if (!result || typeof result !== 'object') {
    return { success: false, error: 'Unexpected result from OmniFocus' };
  }

  return result as MarkProjectsReviewedResult;
}
