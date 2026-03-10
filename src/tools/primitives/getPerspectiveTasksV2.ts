import { PerspectiveEngine, TaskItem } from '../../utils/perspectiveEngine.js';
import {
  buildPerspectiveTaskTree,
  PerspectiveDisplayMode,
  PerspectiveProjectGroup,
  PerspectiveTaskNode
} from './perspectiveTaskTree.js';

// Perspective access interface based on the OmniFocus 4.2+ new API

export interface GetPerspectiveTasksV2Params {
  perspectiveName: string;
  hideCompleted?: boolean;
  limit?: number;
  displayMode?: PerspectiveDisplayMode;
}

export interface GetPerspectiveTasksV2Result {
  success: boolean;
  tasks?: TaskItem[];
  displayMode?: PerspectiveDisplayMode;
  projectTree?: PerspectiveProjectGroup[];
  taskTree?: PerspectiveTaskNode[];
  summary?: {
    projectGroupCount: number;
    rootTaskCount: number;
    nestedTaskCount: number;
  };
  perspectiveInfo?: {
    name: string;
    rulesCount: number;
    aggregation: string;
  };
  error?: string;
}

/**
 * Retrieve filtered tasks from a perspective - V2
 * Uses the OmniFocus 4.2+ new archivedFilterRules API
 *
 * Key advantages:
 * - 100% accuracy: fetches tasks truly filtered by the perspective, not the full dataset
 * - Zero configuration: uses the user's existing perspective settings directly
 * - Full support: supports all 27 filter rule types and 3 aggregation modes
 */
export async function getPerspectiveTasksV2(
  params: GetPerspectiveTasksV2Params
): Promise<GetPerspectiveTasksV2Result> {
  const displayMode = params.displayMode || 'project_tree';

  console.log(`[PerspectiveV2] Fetching tasks for perspective "${params.perspectiveName}"`);
  console.log(`[PerspectiveV2] Params:`, {
    hideCompleted: params.hideCompleted,
    limit: params.limit,
    displayMode
  });

  try {
    // Create a perspective engine instance
    const engine = new PerspectiveEngine();

    // Execute perspective filtering
    const result = await engine.getFilteredTasks(params.perspectiveName, {
      hideCompleted: params.hideCompleted,
      limit: params.limit
    });

    if (!result.success) {
      console.error(`[PerspectiveV2] Execution failed:`, result.error);
      return {
        success: false,
        error: result.error
      };
    }

    console.log(`[PerspectiveV2] Execution succeeded`);
    console.log(`[PerspectiveV2] Perspective info:`, result.perspectiveInfo);
    console.log(`[PerspectiveV2] Filtered to ${result.tasks?.length || 0} tasks`);

    // Log detailed task info for debugging
    if (result.tasks && result.tasks.length > 0) {
      console.log(`[PerspectiveV2] Sample task:`, {
        first: {
          name: result.tasks[0].name,
          flagged: result.tasks[0].flagged,
          dueDate: result.tasks[0].dueDate,
          projectName: result.tasks[0].projectName,
          tags: result.tasks[0].tags?.length || 0
        }
      });
    }

    const displayTree = buildPerspectiveTaskTree((result.tasks || []) as any[], {
      hideCompleted: params.hideCompleted !== false,
      inboxLabel: 'Inbox'
    });

    return {
      success: true,
      tasks: result.tasks,
      perspectiveInfo: result.perspectiveInfo,
      displayMode,
      projectTree: displayMode === 'project_tree' ? displayTree.projectGroups : undefined,
      taskTree: displayMode === 'task_tree' ? displayTree.rootTasks : undefined,
      summary: {
        projectGroupCount: displayTree.projectGroups.length,
        rootTaskCount: displayTree.rootTasks.length,
        nestedTaskCount: Math.max(displayTree.flatTasks.length - displayTree.rootTasks.length, 0)
      }
    };

  } catch (error: any) {
    console.error(`[PerspectiveV2] Perspective engine exception:`, error);

    return {
      success: false,
      error: `Perspective engine exception: ${error.message || 'Unknown error'}`
    };
  }
}
