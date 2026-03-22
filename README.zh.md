# 🚀 OmniFocus MCP Enhanced

[![npm version](https://img.shields.io/npm/v/omnifocus-mcp-enhanced.svg)](https://www.npmjs.com/package/omnifocus-mcp-enhanced)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![macOS](https://img.shields.io/badge/macOS-only-blue.svg)](https://www.apple.com/macos/)

> **🌟 新功能：原生自定义透视访问与层级显示！**

> **将 OmniFocus 转换为 AI 驱动的生产力强化工具，支持自定义透视**

增强版 OmniFocus 模型上下文协议（MCP）服务器，具备**原生自定义透视访问**、层级任务显示、AI 优化工具选择和全面的任务管理功能。

说人话：它可以让你的 AI 助手直接读取 OmniFocus、创建任务和项目、拆子任务、查看透视、做每日规划，不需要你自己在 OmniFocus 里来回点很多次。

## 🌠 这个项目为什么存在

OmniFocus 本身已经很强了，但它大多数时候仍然是一个需要你手动操作的工具。

这个项目想做的，其实很简单：

- 少点很多次按钮，多用自然对话
- 少做手工整理，多让 AI 帮你规划
- 少记工具名，多直接说你想完成什么

目标不只是继续往外暴露更多 OmniFocus 命令。
更重要的是，让你以后可以这样使用 OmniFocus：

```text
帮我规划今天。
帮我清理 Inbox。
把这段笔记变成一个项目。
告诉我哪些事情卡住了。
把这批任务安全地重新整理一下。
```

如果 README 读到这里，你已经能感受到这个方向，那这段说明就有价值了。

## 🆕 最新版本

- **v1.6.10** - 修复 `edit_item` 无法完成 Inbox 任务的问题，修复 AppleScript 对单引号/反斜杠等特殊字符的处理，修复特殊字符导致的 JSON 返回解析失败，并补充 `batch_add_items` / `mcporter` 的可直接运行示例与说明。
- **v1.6.9** - 新增任务附件支持：`get_task_by_id` 会返回附件元信息，`dump_database` 导出附件/链接元信息，并新增 `read_task_attachment`，可在支持时直接把图片附件作为 MCP 图片内容返回。
- **v1.6.6** - 新增 Planned Date（计划日期）全链路支持：创建/编辑/读取/过滤/排序/导出，包含 `plannedDate` / `newPlannedDate`。

## ✨ 核心特性

### 🌟 **新功能：原生自定义透视访问**
- **🎯 直接集成** - 通过 `Perspective.Custom` API 原生访问您的 OmniFocus 自定义透视
- **🌳 层级显示** - 树状任务可视化，显示父子关系
- **🧠 AI 优化** - 增强的工具描述防止 AI 混淆透视和标签概念
- **⚡ 零配置** - 与您现有的自定义透视无缝工作

### 🏗️ **完整任务管理**
- **🏗️ 完整子任务支持** - 创建带有父子关系的层级任务
- **🔍 内置透视** - 访问收件箱、已标记、预测和基于标签的视图
- **🚀 终极任务过滤器** - 超越 OmniFocus 原生功能的高级过滤
- **🎯 批量操作** - 高效添加/删除多个任务
- **📊 智能查询** - 通过 ID、名称或复杂条件查找任务
- **🔄 完整 CRUD 操作** - 创建、读取、更新、删除任务和项目
- **📅 时间管理** - 截止日期、推迟日期、计划日期、估时和计划
- **🏷️ 高级标签** - 基于标签的精确/模糊匹配过滤
- **🤖 AI 集成** - 与 Claude AI 无缝集成，实现智能工作流
- **🖼️ 附件感知读取** - 先暴露备注附件和链接文件的元信息，再决定是否让 AI 继续查看附件内容

## 📦 安装

### 快速安装（推荐）

```bash
# 一键安装
claude mcp add omnifocus-enhanced -- npx -y omnifocus-mcp-enhanced
```

### 其他安装方式

```bash
# 升级到最新版
npm install -g omnifocus-mcp-enhanced@latest

# 全局安装
npm install -g omnifocus-mcp-enhanced
claude mcp add omnifocus-enhanced -- omnifocus-mcp-enhanced

# 本地项目安装
git clone https://github.com/jqlts1/omnifocus-mcp-enhanced.git
cd omnifocus-mcp-enhanced
npm install && npm run build
claude mcp add omnifocus-enhanced -- node "/path/to/omnifocus-mcp-enhanced/dist/server.js"
```

## 📋 系统要求

- **macOS 10.15+** - OmniFocus 仅支持 macOS
- **OmniFocus 3+** - 必须安装并运行该应用程序
- **OmniFocus Pro** - 自定义透视功能需要 Pro 版本（v1.6.0 新功能）
- **Node.js 18+** - 运行 MCP 服务器
- **任意支持 MCP 的客户端** - 比如 Claude Code、`mcporter` 或其他 MCP Host

## 🚦 先看这里

如果你想最快理解这个项目，只要记住这 3 件事：

1. 把这个 MCP server 接到你的 AI 客户端里。
2. 直接用自然语言和 AI 说你要做什么。
3. 让 AI 帮你读 OmniFocus、整理任务、创建项目、拆子任务、做规划。

你一开始不需要背所有工具名。

## 🙋 这个项目最适合拿来做什么

- **每日规划**：让 AI 看今天到期、已标记、可快速完成的任务。
- **项目拆解**：给 AI 一个目标，让它自动建项目并拆成子任务。
- **Inbox 清理**：让 AI 帮你把收件箱分成“今天做 / 以后排 / 变项目”。
- **透视复盘**：让 AI 打开你的自定义透视并做总结。
- **批量录入**：把会议纪要、脑暴清单直接变成一批任务。
- **按需看附件**：先看任务有哪些附件，再决定要不要让 AI 打开。

## 💬 和大模型对话的示例

下面这些说法，在 Claude Code 或其他支持 MCP 的客户端里都很适合直接用。

### 1. 每日规划

你可以直接说：

```text
看看我今天的 Forecast 和已标记任务，然后告诉我今天最重要的 3 件事。
优先考虑 60 分钟以内能完成的任务。
```

### 2. 清理 Inbox

你可以直接说：

```text
帮我看一下 Inbox，把这些任务分成：
1. 今天做
2. 以后安排
3. 应该升级成项目
然后顺手把明显的项整理掉。
```

### 3. 把一个想法变成项目

你可以直接说：

```text
创建一个项目，名字叫“春季 newsletter 发布”。
把主要步骤拆成子任务，补上预计时间，并把最关键的一步设成 flagged。
```

### 4. 使用自定义透视

你可以直接说：

```text
打开我的自定义透视“今日工作安排”，帮我总结：
- 哪些快到期
- 哪些像是卡住了
- 哪些可以快速做完
```

### 5. 根据笔记批量创建任务

你可以直接说：

```text
把这段会议纪要整理成 OmniFocus 任务，放到“网站改版”项目下。
该拆成子任务的就拆，任务名尽量简短。
```

### 6. 只在需要时查看附件

你可以直接说：

```text
找到“检查设计稿”这个任务。
先告诉我它有哪些附件。
如果里面有图片，再帮我打开图片附件。
```

## 🧭 实用建议

- 如果你想更稳一点，可以先让 AI **先查看，再修改**。
- 如果有重名任务，优先用 **task ID**。
- 创建**子任务**时，让父任务决定项目，不要再额外传 `projectName`。
- 在 `mcporter` 里，复杂数组参数尽量用 `--args '{...}'`。

## 🎯 核心功能

### 1. 🏗️ 子任务管理

轻松创建复杂的任务层级：

```json
// 通过父任务名称创建子任务
{
  "name": "分析竞争对手关键词",
  "parentTaskName": "SEO 策略",
  "note": "重点关注前 10 名竞争对手",
  "dueDate": "2025-01-15",
  "estimatedMinutes": 120,
  "tags": ["SEO", "研究"]
}

// 通过父任务 ID 创建子任务
{
  "name": "编写内容大纲",
  "parentTaskId": "loK2xEAY4H1",
  "flagged": true,
  "estimatedMinutes": 60
}
```

### 2. 🔍 透视视图

程序化访问所有主要 OmniFocus 透视：

```bash
# 收件箱透视
get_inbox_tasks {"hideCompleted": true}

# 已标记任务
get_flagged_tasks {"projectFilter": "SEO 项目"}

# 预测（未来 7 天）
get_forecast_tasks {"days": 7, "hideCompleted": true}

# 按标签查找任务
get_tasks_by_tag {"tagName": "AI", "exactMatch": false}
```

### 3. 🚀 终极任务过滤器

创建任何可想象的透视，使用高级过滤：

```bash
# 时间管理视图（本周截止的 30 分钟任务）
filter_tasks {
  "taskStatus": ["Available", "Next"],
  "estimateMax": 30,
  "dueThisWeek": true
}

# 深度工作视图（60+ 分钟带备注的任务）
filter_tasks {
  "estimateMin": 60,
  "hasNote": true,
  "taskStatus": ["Available"]
}

# 计划日期视图（今天计划任务）
filter_tasks {
  "plannedToday": true,
  "sortBy": "plannedDate"
}

# 项目逾期任务
filter_tasks {
  "projectFilter": "网站重设计",
  "taskStatus": ["Overdue", "DueSoon"]
}
```

### 4. 🌟 **新功能：原生自定义透视访问**

通过层级任务显示访问您的 OmniFocus 自定义透视：

```bash
# 🌟 新功能：列出所有自定义透视
list_custom_perspectives {"format": "detailed"}

# 🌳 新功能：项目树视图（默认）
get_custom_perspective_tasks {
  "perspectiveName": "今日工作安排",  # 您的自定义透视名称
  "displayMode": "project_tree",    # project_tree | task_tree | flat
  "hideCompleted": true
}

# 全局任务树（等价于旧参数 showHierarchy=true）
get_custom_perspective_tasks {
  "perspectiveName": "今日复盘",
  "displayMode": "task_tree"
}

# 平铺视图（等价于旧参数 groupByProject=false）
get_custom_perspective_tasks {
  "perspectiveName": "本周项目",
  "displayMode": "flat"
}
```

**功能强大的原因：**
- ✅ **原生集成** - 直接使用 OmniFocus `Perspective.Custom` API
- ✅ **树状结构** - 使用 ├─、└─ 符号显示父子任务关系
- ✅ **项目优先分组** - 先按项目分组，再展示子任务层级
- ✅ **信息表达清晰** - 任务树中默认展示完整备注与 `#标签`
- ✅ **AI 友好** - 增强的描述防止工具选择混淆
- ✅ **专业输出** - 清晰、可读的任务层级

### 5. 🎯 批量操作

高效管理多个任务：

```json
{
  "items": [
    {
      "type": "task",
      "name": "网站技术 SEO",
      "projectName": "SEO 项目",
      "note": "优化技术方面"
    },
    {
      "type": "task",
      "name": "页面速度优化",
      "parentTaskName": "网站技术 SEO",
      "estimatedMinutes": 180,
      "flagged": true
    },
    {
      "type": "task",
      "name": "移动端响应式",
      "parentTaskName": "网站技术 SEO",
      "estimatedMinutes": 90
    }
  ]
}
```

`mcporter` 调用提示：

```bash
# 复杂数组 / 嵌套对象，建议明确使用 --args JSON
mcporter call omnifocus.batch_add_items --args '{
  "items": [
    {
      "type": "task",
      "name": "网站技术 SEO",
      "projectName": "SEO 项目"
    }
  ]
}'
```

如果某条子任务传了 `parentTaskId` 或 `parentTaskName`，就不要再传 `projectName`。子任务会自动继承父任务所在项目。

可直接运行的 `mcporter` 示例：

```bash
# 1）批量创建项目下的顶层任务
mcporter call omnifocus.batch_add_items --args '{
  "items": [
    {
      "type": "task",
      "name": "父任务：分类A",
      "projectName": "OmniFocus MCP 批量测试"
    },
    {
      "type": "task",
      "name": "父任务：分类B",
      "projectName": "OmniFocus MCP 批量测试"
    }
  ]
}'
```

```bash
# 2）单次批量里同时创建父任务和子任务
mcporter call omnifocus.batch_add_items --args '{
  "items": [
    {
      "type": "task",
      "name": "父任务：分类A",
      "projectName": "OmniFocus MCP 批量测试"
    },
    {
      "type": "task",
      "name": "子任务：A1",
      "parentTaskName": "父任务：分类A"
    }
  ]
}'
```

```bash
# 3）更稳妥的两步法：父任务已存在时，再批量创建多个子任务
mcporter call omnifocus.batch_add_items --args '{
  "items": [
    {
      "type": "task",
      "name": "子任务：A1",
      "parentTaskName": "父任务：分类A"
    },
    {
      "type": "task",
      "name": "子任务：A2",
      "parentTaskName": "父任务：分类A"
    },
    {
      "type": "task",
      "name": "子任务：B1",
      "parentTaskName": "父任务：分类B"
    }
  ]
}'
```

下面这种写法会失败，这属于预期行为：

```bash
mcporter call omnifocus.batch_add_items --args '{
  "items": [
    {
      "type": "task",
      "name": "子任务：A1",
      "projectName": "OmniFocus MCP 批量测试",
      "parentTaskName": "父任务：分类A"
    }
  ]
}'
```

因为子任务必须继承父任务所在项目，不能再单独传 `projectName`。

### 6. 🖼️ 附件查看

先读取任务和附件元信息，再按需打开具体附件：

```bash
# 读取任务详情和附件元信息
get_task_by_id {
  "taskId": "abc123"
}

# 打开 get_task_by_id 返回的某个附件
read_task_attachment {
  "taskId": "abc123",
  "attachmentId": "embedded-1"
}
```

`get_task_by_id` 现在会返回附件 ID、名称、推断出的 MIME 类型、来源（`embedded` 或 `linked`）以及可用时的大小。`read_task_attachment` 会尽量把图片作为 MCP 图片内容直接返回，这样 AI 客户端可以直接查看图片，而不是只能读一段 base64 文本。

## 🛠️ 完整工具参考

### 📊 数据库与任务管理
1. **dump_database** - 获取 OmniFocus 数据库状态
2. **add_omnifocus_task** - 创建任务（增强子任务支持）
3. **add_project** - 创建项目
4. **remove_item** - 删除任务或项目
5. **edit_item** - 编辑任务或项目（现已支持任务转移：项目/父任务/Inbox）
6. **move_task** - 将已有任务转移到项目/父任务/Inbox
7. **batch_add_items** - 批量添加（增强子任务支持）
8. **batch_remove_items** - 批量删除
9. **get_task_by_id** - 查询任务信息，并返回附件元信息
10. **read_task_attachment** - 读取 `get_task_by_id` 返回的任务附件

### 🔍 内置透视工具
11. **get_inbox_tasks** - 收件箱透视
12. **get_flagged_tasks** - 已标记透视
13. **get_forecast_tasks** - 预测透视（包含截止/推迟/计划日期任务数据）
14. **get_tasks_by_tag** - 基于标签的过滤
15. **filter_tasks** - 无限组合的终极过滤

### 🌟 自定义透视工具（新功能）
16. **list_custom_perspectives** - 🌟 **新功能**：列出所有自定义透视及详情
17. **get_custom_perspective_tasks** - 🌟 **新功能**：访问自定义透视，支持层级显示

### 📊 分析与跟踪
18. **get_today_completed_tasks** - 查看今日完成的任务

批量转移功能后续计划（Roadmap）：[docs/roadmap/2026-02-25-batch-move-tasks-plan.zh.md](docs/roadmap/2026-02-25-batch-move-tasks-plan.zh.md)

## 🚀 快速开始示例

### 基础任务创建
```bash
# 简单任务
add_omnifocus_task {
  "name": "回顾季度目标",
  "projectName": "规划",
  "dueDate": "2025-01-31",
  "plannedDate": "2025-01-28"
}
```

### 高级任务管理
```bash
# 创建父任务
add_omnifocus_task {
  "name": "启动产品活动",
  "projectName": "营销",
  "dueDate": "2025-02-15",
  "tags": ["活动", "优先级"]
}

# 添加子任务
add_omnifocus_task {
  "name": "设计落地页",
  "parentTaskName": "启动产品活动",
  "estimatedMinutes": 240,
  "flagged": true
}
```

### 任务转移操作
```bash
# 转移到项目
move_task {
  "id": "task-id-123",
  "targetProjectName": "规划"
}

# 转移到父任务下
move_task {
  "id": "task-id-123",
  "targetParentTaskId": "parent-task-id-456"
}

# 转移回 Inbox
move_task {
  "id": "task-id-123",
  "targetInbox": true
}
```

### 智能任务发现
```bash
# 找到高优先级工作
filter_tasks {
  "flagged": true,
  "taskStatus": ["Available"],
  "estimateMax": 120,
  "hasEstimate": true
}

# 今日完成的工作
filter_tasks {
  "completedToday": true,
  "taskStatus": ["Completed"],
  "sortBy": "project"
}
```

### 🌟 自定义透视使用
```bash
# 列出您的自定义透视
list_custom_perspectives {"format": "detailed"}

# 访问带项目树的自定义透视
get_custom_perspective_tasks {
  "perspectiveName": "今日复盘",
  "displayMode": "project_tree",
  "hideCompleted": true
}

# 快速查看周计划的平铺视图
get_custom_perspective_tasks {
  "perspectiveName": "本周项目",
  "displayMode": "flat"
}
```

## 🔧 配置

### 验证安装
```bash
# 检查 MCP 状态
claude mcp list

# 测试基本连接
get_inbox_tasks

# 测试新的自定义透视功能
list_custom_perspectives
```

### 故障排除
- 确保 OmniFocus 3+ 已安装并运行
- 验证 Node.js 18+ 已安装
- 检查 Claude Code MCP 配置
- 如需要，为终端应用启用辅助功能权限

## 🎯 使用场景

- **项目管理** - 创建带子任务的详细项目层级
- **GTD 工作流** - 利用透视进行 Getting Things Done 方法论
- **时间块规划** - 按估时过滤进行计划安排
- **回顾流程** - 使用自定义透视进行周/月回顾
- **团队协调** - 批量操作进行团队任务分配
- **AI 驱动规划** - 让 Claude 分析和组织您的任务

## 📈 性能

- **快速过滤** - 原生 AppleScript 性能
- **批量效率** - 多任务单次操作
- **内存优化** - 最小资源使用
- **可扩展** - 高效处理大型任务数据库

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 仓库
2. 创建功能分支
3. 进行更改
4. 如适用，添加测试
5. 提交 pull request

## 📄 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🔗 链接

- **NPM 包**: https://www.npmjs.com/package/omnifocus-mcp-enhanced
- **GitHub 仓库**: https://github.com/jqlts1/omnifocus-mcp-enhanced
- **OmniFocus**: https://www.omnigroup.com/omnifocus/
- **模型上下文协议**: https://modelcontextprotocol.io/
- **Claude Code**: https://docs.anthropic.com/en/docs/claude-code

## 🙏 致谢

基于 [themotionmachine](https://github.com/themotionmachine/OmniFocus-MCP) 的原始 OmniFocus MCP 服务器。增强了透视视图、高级过滤和完整的子任务支持。

---

**⭐ 如果这个项目帮助提升了您的生产力，请给仓库点个星！**
