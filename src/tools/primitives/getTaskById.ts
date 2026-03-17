import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { RawTaskAttachment, TaskAttachmentInfo, normalizeTaskAttachments } from './taskAttachments.js';

// Interface for task lookup parameters
export interface GetTaskByIdParams {
  taskId?: string;
  taskName?: string;
}

// Interface for task information result
export interface TaskInfo {
  id: string;
  name: string;
  note: string;
  parentId?: string;
  parentName?: string;
  projectId?: string;
  projectName?: string;
  hasChildren: boolean;
  childrenCount: number;
  tags: string[];
  dueDate?: string;
  deferDate?: string;
  plannedDate?: string;
  flagged: boolean;
  completed: boolean;
  estimatedMinutes?: number;
  attachments: TaskAttachmentInfo[];
  linkedFileURLs: string[];
}

interface RawTaskInfo {
  id: string;
  name: string;
  note?: string;
  parentId?: string | null;
  parentName?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  hasChildren: boolean;
  childrenCount: number;
  tags?: string[];
  dueDate?: string | null;
  deferDate?: string | null;
  plannedDate?: string | null;
  flagged: boolean;
  completed: boolean;
  estimatedMinutes?: number | null;
  attachments?: RawTaskAttachment[];
  linkedFileURLs?: string[];
}

interface GetTaskByIdScriptResult {
  success: boolean;
  task?: RawTaskInfo;
  error?: string;
}

/**
 * Get task information by ID or name from OmniFocus
 */
export async function getTaskById(params: GetTaskByIdParams): Promise<{ success: boolean, task?: TaskInfo, error?: string }> {
  try {
    // Validate parameters
    if (!params.taskId && !params.taskName) {
      return {
        success: false,
        error: "Either taskId or taskName must be provided"
      };
    }

    const result = await executeOmniFocusScript('@getTaskById.js', params) as GetTaskByIdScriptResult;

    if (!result.success || !result.task) {
      return {
        success: false,
        error: result.error || 'Failed to retrieve task'
      };
    }

    const rawTask = result.task;
    const taskInfo: TaskInfo = {
      id: rawTask.id,
      name: rawTask.name,
      note: rawTask.note || '',
      parentId: rawTask.parentId || undefined,
      parentName: rawTask.parentName || undefined,
      projectId: rawTask.projectId || undefined,
      projectName: rawTask.projectName || undefined,
      hasChildren: Boolean(rawTask.hasChildren),
      childrenCount: rawTask.childrenCount || 0,
      tags: rawTask.tags || [],
      dueDate: rawTask.dueDate || undefined,
      deferDate: rawTask.deferDate || undefined,
      plannedDate: rawTask.plannedDate || undefined,
      flagged: Boolean(rawTask.flagged),
      completed: Boolean(rawTask.completed),
      estimatedMinutes: rawTask.estimatedMinutes ?? undefined,
      attachments: normalizeTaskAttachments(rawTask.attachments, rawTask.linkedFileURLs),
      linkedFileURLs: rawTask.linkedFileURLs || []
    };

    return {
      success: true,
      task: taskInfo
    };
  } catch (error: any) {
    console.error("Error in getTaskById:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in getTaskById"
    };
  }
}
