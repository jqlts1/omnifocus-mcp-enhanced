# 批量任务转移计划（Roadmap）

日期：2026-02-25

## 背景
当前版本先落地稳定的单任务转移能力（`edit_item` + `move_task`）。
为降低首版风险，批量转移功能暂不进入本次交付。

## 目标
后续新增 `batch_move_tasks`，用于高频任务重组，并支持部分成功汇总返回。

## API 草案
```json
{
  "items": [
    {
      "id": "task-id-1",
      "targetProjectId": "project-id-1"
    },
    {
      "name": "任务 B",
      "targetParentTaskId": "parent-id-2"
    },
    {
      "id": "task-id-3",
      "targetInbox": true
    }
  ]
}
```

每一项包含：
- source：`id` 或 `name`
- destination：项目 / 父任务 / Inbox 三选一

## 失败模型
批量执行返回部分成功模型：
- `total`
- `succeeded`
- `failed`
- `details[]`（逐项成功/失败原因）

错误语义与单任务保持一致：
- 目标不存在
- 名称重名（需改用 id）
- 目标选择冲突
- 非法循环转移（移到自身或后代）

## 里程碑
- V1（本阶段完成）：单任务转移稳定可用。
- V2（后续）：上线 `batch_move_tasks` 与逐项结果聚合。

## 非目标（V2 首版）
- 首版不做位置控制（before/after/start/end）。
- 首版不做复杂路径匹配。
