import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import {
  normalizeRepetitionRuleString,
  validateRepetitionInput,
  type RepetitionInput,
} from './repetitionRule.js';

export interface OutlineCoreFields {
  name: string;
  note?: string;
  tagIds?: string[];
  dueDate?: string;
  deferDate?: string;
  plannedDate?: string;
  flagged?: boolean;
  estimatedMinutes?: number;
  sequential?: boolean;
}

export interface TaskOutline extends OutlineCoreFields {
  children?: TaskOutline[];
  repetition?: RepetitionInput;
}

export interface ProjectOutline extends OutlineCoreFields {
  folderId?: string;
  tasks?: TaskOutline[];
}

export interface ProjectOutlinePlanNode extends OutlineCoreFields {
  planIndex: number;
  parentPlanIndex: number | null;
  path: string;
  tagIds: string[];
  repetition?: RepetitionInput;
}

export interface ProjectOutlinePlan {
  project: Omit<ProjectOutline, 'tasks'> & { tagIds: string[] };
  projectPath: string;
  tasks: ProjectOutlinePlanNode[];
  tagIds: string[];
}

export type CreateProjectOutlineErrorCode =
  | 'INVALID_OUTLINE'
  | 'REFERENCE_NOT_FOUND'
  | 'CREATE_FAILED_ROLLED_BACK'
  | 'VERIFICATION_FAILED_ROLLED_BACK'
  | 'ROLLBACK_UNCONFIRMED';

export interface CreatedOutlineItem {
  id: string;
  type: 'project' | 'task';
  path: string;
  parentId: string | null;
  verified: boolean;
}

export interface CreateProjectFromOutlineResult {
  success: boolean;
  code?: CreateProjectOutlineErrorCode;
  projectId?: string;
  taskCount?: number;
  items?: CreatedOutlineItem[];
  affectedPaths?: string[];
  residualProjectId?: string;
  recovery?: string;
  error?: string;
}

function validatedCoreFields(
  fields: OutlineCoreFields,
  path: string,
): OutlineCoreFields & { tagIds: string[] } {
  const name = typeof fields.name === 'string' ? fields.name.trim() : '';
  if (name === '') throw new Error(`${path}: name must not be empty`);

  for (const key of ['dueDate', 'deferDate', 'plannedDate'] as const) {
    const value = fields[key];
    if (value !== undefined && Number.isNaN(Date.parse(value))) {
      throw new Error(`${path}: ${key} must be a valid ISO date`);
    }
  }
  if (
    fields.estimatedMinutes !== undefined &&
    (!Number.isFinite(fields.estimatedMinutes) || fields.estimatedMinutes < 0)
  ) {
    throw new Error(
      `${path}: estimatedMinutes must be finite and non-negative`,
    );
  }

  const tagIds = fields.tagIds || [];
  if (tagIds.some((id) => typeof id !== 'string' || id.trim() === '')) {
    throw new Error(`${path}: tagIds must contain stable non-empty IDs`);
  }

  return { ...fields, name, tagIds: [...new Set(tagIds)] };
}

export function buildProjectOutlinePlan(
  outline: ProjectOutline,
): ProjectOutlinePlan {
  if (!outline || typeof outline !== 'object') {
    throw new Error('project: outline is required');
  }
  const project = validatedCoreFields(outline, 'project');
  if (
    outline.folderId !== undefined &&
    (typeof outline.folderId !== 'string' || outline.folderId.trim() === '')
  ) {
    throw new Error('project: folderId must be a stable non-empty ID');
  }

  const tasks: ProjectOutlinePlanNode[] = [];
  const walk = (
    nodes: TaskOutline[],
    parentPlanIndex: number | null,
    parentPath: string,
    depth: number,
  ): void => {
    if (depth > 8) throw new Error(`${parentPath}: exceeds eight task levels`);
    for (const node of nodes) {
      if (tasks.length >= 200) {
        throw new Error('project.tasks: exceeds 200 task nodes');
      }
      const tentativeName =
        typeof node?.name === 'string' && node.name.trim() !== ''
          ? node.name.trim()
          : '<unnamed>';
      const path = `${parentPath}/${tentativeName}`;
      const normalized = validatedCoreFields(node, path);
      if (node.repetition) {
        const repetition = validateRepetitionInput(node.repetition);
        if (!repetition.valid) {
          throw new Error(`${path}: ${repetition.error}`);
        }
      }
      const planIndex = tasks.length;
      tasks.push({
        ...normalized,
        planIndex,
        parentPlanIndex,
        path,
        repetition: node.repetition
          ? {
              ...node.repetition,
              ruleString: normalizeRepetitionRuleString(
                node.repetition.ruleString,
              ),
            }
          : undefined,
      });
      walk(node.children || [], planIndex, path, depth + 1);
    }
  };
  walk(outline.tasks || [], null, project.name, 1);

  const tagIds = new Set(project.tagIds);
  for (const task of tasks) {
    for (const tagId of task.tagIds) tagIds.add(tagId);
  }

  const { tasks: _tasks, ...projectWithoutTasks } = outline;
  return {
    project: {
      ...projectWithoutTasks,
      ...project,
      folderId: outline.folderId?.trim(),
    },
    projectPath: project.name,
    tasks,
    tagIds: [...tagIds],
  };
}

export async function createProjectFromOutline(
  outline: ProjectOutline,
): Promise<CreateProjectFromOutlineResult> {
  let plan: ProjectOutlinePlan;
  try {
    plan = buildProjectOutlinePlan(outline);
  } catch (error) {
    return {
      success: false,
      code: 'INVALID_OUTLINE',
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const result = await executeOmniFocusScript('@createProjectFromOutline.js', {
    plan,
  });
  if (!result || typeof result !== 'object') {
    return {
      success: false,
      code: 'ROLLBACK_UNCONFIRMED',
      error: 'Unexpected result from OmniFocus; creation state is unknown',
      recovery:
        'Inspect OmniFocus for a partially created project before retrying.',
    };
  }
  return result as CreateProjectFromOutlineResult;
}
