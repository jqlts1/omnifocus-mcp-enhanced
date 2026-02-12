import { z } from 'zod';
import { getPerspectiveTasksV2 } from '../primitives/getPerspectiveTasksV2.js';

// 基于 OmniFocus 4.2+ 新 API 的真正透视访问工具
// 与原有 get_custom_perspective 工具的区别：
// - 使用新的 archivedFilterRules API，获得 100% 准确的透视筛选结果
// - 支持所有 27 种筛选规则类型
// - 自动处理聚合逻辑（all/any/none）
// - 无需手动配置筛选条件

export const schema = z.object({
  perspectiveName: z.string().describe("透视名称。使用你在 OmniFocus 中创建的自定义透视名称，如 '今日工作安排'、'今日复盘' 等"),
  
  hideCompleted: z.boolean().optional().default(true).describe("是否隐藏已完成和已放弃的任务（默认: true）"),
  
  limit: z.number().optional().default(100).describe("返回任务的最大数量（默认: 100，设为 0 表示无限制）")
});

export type GetPerspectiveTasksV2Params = z.infer<typeof schema>;

export async function handler(params: GetPerspectiveTasksV2Params) {
  try {
    const result = await getPerspectiveTasksV2(params);
    
    if (!result.success) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: result.error
          }, null, 2)
        }]
      };
    }

    // 格式化返回结果
    const response: any = {
      success: true,
      perspective: result.perspectiveInfo,
      tasks: result.tasks || [],
      totalTasks: result.tasks?.length || 0,
      options: {
        hideCompleted: params.hideCompleted,
        limit: params.limit
      },
      metadata: {
        timestamp: new Date().toISOString(),
        apiVersion: "v2",
        engine: "OmniFocus 4.2+ archivedFilterRules"
      }
    };

    // 如果有任务，添加汇总信息
    if (result.tasks && result.tasks.length > 0) {
      const summary = {
        flaggedTasks: result.tasks.filter(t => t.flagged).length,
        tasksWithDueDate: result.tasks.filter(t => t.dueDate).length,
        tasksWithDeferDate: result.tasks.filter(t => t.deferDate).length,
        tasksWithPlannedDate: result.tasks.filter(t => t.plannedDate).length,
        projectTasks: result.tasks.filter(t => t.projectName).length,
        inboxTasks: result.tasks.filter(t => !t.projectName).length
      };
      
      response.summary = summary;
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(response, null, 2)
      }]
    };

  } catch (error: any) {
    console.error('getPerspectiveTasksV2 handler error:', error);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          success: false,
          error: error.message || 'Unknown error in getPerspectiveTasksV2',
          metadata: {
            timestamp: new Date().toISOString(),
            apiVersion: "v2",
            engine: "OmniFocus 4.2+ archivedFilterRules"
          }
        }, null, 2)
      }]
    };
  }
}