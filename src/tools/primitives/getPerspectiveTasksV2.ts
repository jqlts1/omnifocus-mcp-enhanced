import { PerspectiveEngine, TaskItem } from '../../utils/perspectiveEngine.js';

// 基于 OmniFocus 4.2+ 新 API 的透视访问接口

export interface GetPerspectiveTasksV2Params {
  perspectiveName: string;
  hideCompleted?: boolean;
  limit?: number;
}

export interface GetPerspectiveTasksV2Result {
  success: boolean;
  tasks?: TaskItem[];
  perspectiveInfo?: {
    name: string;
    rulesCount: number;
    aggregation: string;
  };
  error?: string;
}

/**
 * 获取透视筛选后的任务 - V2版本
 * 使用 OmniFocus 4.2+ 新的 archivedFilterRules API
 * 
 * 主要优势：
 * - 100% 准确性：获取真正透视筛选后的任务，而非全量数据
 * - 零配置：直接使用用户现有的透视设置
 * - 完整支持：支持所有 27 种筛选规则类型和 3 种聚合方式
 */
export async function getPerspectiveTasksV2(
  params: GetPerspectiveTasksV2Params
): Promise<GetPerspectiveTasksV2Result> {
  
  console.log(`[PerspectiveV2] 开始获取透视 "${params.perspectiveName}" 的任务`);
  console.log(`[PerspectiveV2] 参数:`, {
    hideCompleted: params.hideCompleted,
    limit: params.limit
  });

  try {
    // 创建透视引擎实例
    const engine = new PerspectiveEngine();
    
    // 执行透视筛选
    const result = await engine.getFilteredTasks(params.perspectiveName, {
      hideCompleted: params.hideCompleted,
      limit: params.limit
    });

    if (!result.success) {
      console.error(`[PerspectiveV2] 执行失败:`, result.error);
      return {
        success: false,
        error: result.error
      };
    }

    console.log(`[PerspectiveV2] 执行成功`);
    console.log(`[PerspectiveV2] 透视信息:`, result.perspectiveInfo);
    console.log(`[PerspectiveV2] 筛选到 ${result.tasks?.length || 0} 个任务`);

    // 记录详细的任务信息用于调试
    if (result.tasks && result.tasks.length > 0) {
      console.log(`[PerspectiveV2] 任务示例:`, {
        first: {
          name: result.tasks[0].name,
          flagged: result.tasks[0].flagged,
          dueDate: result.tasks[0].dueDate,
          projectName: result.tasks[0].projectName,
          tags: result.tasks[0].tags?.length || 0
        }
      });
    }

    return {
      success: true,
      tasks: result.tasks,
      perspectiveInfo: result.perspectiveInfo
    };

  } catch (error: any) {
    console.error(`[PerspectiveV2] 透视引擎异常:`, error);
    
    return {
      success: false,
      error: `透视引擎执行异常: ${error.message || '未知错误'}`
    };
  }
}