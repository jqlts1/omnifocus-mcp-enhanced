import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface TaskNotificationInfo {
  index: number;
  kind: string;
  absoluteFireDate: string | null;
  relativeFireOffset: number | null;
  isSnoozed: boolean | null;
}

export interface NotificationScriptResult {
  success: boolean;
  taskId?: string;
  taskName?: string;
  notifications?: TaskNotificationInfo[];
  added?: TaskNotificationInfo | null;
  removed?: TaskNotificationInfo | null;
  removedCount?: number;
  error?: string;
}

interface BaseParams {
  taskId?: string;
  taskName?: string;
}

export interface AddNotificationParams extends BaseParams {
  absoluteDate?: string;    // ISO 8601 absolute fire date
  relativeMinutes?: number; // Minutes relative to due date (negative = before due)
}

export interface RemoveNotificationParams extends BaseParams {
  index?: number;
  removeAll?: boolean;
}

async function run(action: string, params: Record<string, unknown>): Promise<NotificationScriptResult> {
  const result = await executeOmniFocusScript('@taskNotifications.js', {
    action,
    ...params
  }) as NotificationScriptResult;

  if (!result || result.success !== true) {
    return { success: false, error: (result && result.error) || `Failed to ${action} notification` };
  }

  return result;
}

/**
 * Format a notification for human-readable output.
 */
export function formatNotification(notification: TaskNotificationInfo): string {
  if (notification.kind === 'absolute') {
    const when = notification.absoluteFireDate
      ? new Date(notification.absoluteFireDate).toLocaleString()
      : 'unknown time';
    return `[${notification.index}] absolute — fires at ${when}`;
  }

  if (notification.kind === 'dueRelative') {
    const offset = notification.relativeFireOffset;
    if (offset === null || offset === undefined) {
      return `[${notification.index}] due-relative — unknown offset`;
    }
    const minutes = Math.round(offset / 60);
    const label = minutes < 0 ? `${Math.abs(minutes)} min before due` : `${minutes} min after due`;
    return `[${notification.index}] due-relative — ${label}`;
  }

  return `[${notification.index}] ${notification.kind}`;
}

export async function listTaskNotifications(params: BaseParams): Promise<NotificationScriptResult> {
  if (!params.taskId && !params.taskName) {
    return { success: false, error: 'Either taskId or taskName must be provided' };
  }
  return run('list', {
    taskId: params.taskId || null,
    taskName: params.taskName || null
  });
}

export async function addTaskNotification(params: AddNotificationParams): Promise<NotificationScriptResult> {
  if (!params.taskId && !params.taskName) {
    return { success: false, error: 'Either taskId or taskName must be provided' };
  }
  if (params.absoluteDate === undefined && params.relativeMinutes === undefined) {
    return {
      success: false,
      error: 'Provide either absoluteDate (ISO 8601) or relativeMinutes (negative = before due date)'
    };
  }
  if (params.absoluteDate !== undefined && params.relativeMinutes !== undefined) {
    return {
      success: false,
      error: 'Provide only one of absoluteDate or relativeMinutes, not both'
    };
  }

  return run('add', {
    taskId: params.taskId || null,
    taskName: params.taskName || null,
    absoluteDate: params.absoluteDate ?? null,
    relativeMinutes: params.relativeMinutes ?? null
  });
}

export async function removeTaskNotification(params: RemoveNotificationParams): Promise<NotificationScriptResult> {
  if (!params.taskId && !params.taskName) {
    return { success: false, error: 'Either taskId or taskName must be provided' };
  }
  if (params.index === undefined && params.removeAll !== true) {
    return { success: false, error: 'Provide index (0-based) or removeAll: true' };
  }

  return run('remove', {
    taskId: params.taskId || null,
    taskName: params.taskName || null,
    index: params.index ?? null,
    removeAll: params.removeAll === true
  });
}
