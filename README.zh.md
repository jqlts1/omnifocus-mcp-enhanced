# OmniFocus MCP Pro

[![npm version](https://img.shields.io/npm/v/omnifocus-mcp-pro.svg)](https://www.npmjs.com/package/omnifocus-mcp-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![macOS](https://img.shields.io/badge/macOS-only-blue.svg)](https://www.apple.com/macos/)

macOS 上的 OmniFocus Pro MCP 服务器 — 19 个工具、统一查询引擎、MCP Resources、文本搜索、完整 GTD 工作流支持。合并自 [omnifocus-mcp](https://github.com/themotionmachine/OmniFocus-MCP) 和 [omnifocus-mcp-enhanced](https://github.com/jqlts1/omnifocus-mcp-enhanced)。

## 安装

### Claude Code（推荐）

```bash
claude mcp add omnifocus -- npx -y omnifocus-mcp-pro
```

### 其他 AI Agent（Cursor、Cline、Claude Desktop 等）

在 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "npx",
      "args": ["-y", "omnifocus-mcp-pro"]
    }
  }
}
```

| Agent | 配置文件路径 |
|-------|-------------|
| Claude Code | `~/.claude.json` 或 `.mcp.json` |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` |
| Cline (VS Code) | `.vscode/cline_mcp_settings.json` |

### 本地开发

```bash
git clone https://github.com/darrenyao/omnifocus-mcp-enhanced.git
cd omnifocus-mcp-enhanced
npm install && npm run build
claude mcp add omnifocus -- node "$(pwd)/dist/server.js"
```

## 系统要求

- **macOS 10.15+** — OmniFocus 仅支持 macOS
- **OmniFocus 3+** — 必须安装并运行
- **OmniFocus Pro** — 自定义透视功能需要 Pro 版本
- **Node.js 18+**

## 工具（19 个）

### 查询与搜索

| 工具 | 说明 |
|------|------|
| `query_omnifocus` | 统一查询引擎 — 按名称、备注、状态、标签、日期等过滤任务/项目/文件夹 |
| `get_task_by_id` | 通过 ID 或精确名称获取任务 |
| `dump_database` | 完整数据库快照（定向查询请用 `query_omnifocus`） |

`query_omnifocus` 是核心查询工具，用一个可组合的过滤接口替代了原来的收件箱/标记/预测/标签等专用查询工具。

**过滤示例：**

```jsonc
// 按任务名称搜索（不区分大小写，部分匹配）
{ "entity": "tasks", "filters": { "nameContains": "compression" } }

// 全文搜索（同时搜索名称和备注）
{ "entity": "tasks", "filters": { "keyword": "review" } }

// 组合过滤：7 天内到期的标记任务
{ "entity": "tasks", "filters": { "flagged": true, "dueWithin": 7 } }

// 特定项目中的可用任务
{ "entity": "tasks", "filters": { "projectName": "网站", "status": ["Available"] } }

// 搜索项目备注
{ "entity": "projects", "filters": { "noteContains": "deadline" } }
```

**可用过滤器：** `nameContains`、`noteContains`、`keyword`、`projectName`、`projectId`、`tags`、`status`、`flagged`、`dueWithin`、`dueOn`、`deferredUntil`、`deferOn`、`plannedWithin`、`plannedOn`、`hasNote`、`inbox`、`folderId`

**附加参数：** `fields`（选择返回字段）、`sortBy`、`sortOrder`、`limit`、`includeCompleted`、`summary`（仅返回数量）

### 透视

| 工具 | 说明 |
|------|------|
| `get_custom_perspective_tasks` | 以树形结构查看自定义透视中的任务 |
| `list_custom_perspectives` | 列出所有自定义透视 |
| `list_perspectives` | 列出所有透视（内置 + 自定义） |
| `get_perspective_view` | 查看任意命名透视 |

```jsonc
// 自定义透视的项目树视图
{ "perspectiveName": "今日复盘", "displayMode": "project_tree" }

// 平铺列表
{ "perspectiveName": "本周项目", "displayMode": "flat" }
```

### 任务与项目 CRUD

| 工具 | 说明 |
|------|------|
| `add_omnifocus_task` | 创建任务（通过 `parentTaskName`/`parentTaskId` 支持子任务） |
| `add_project` | 创建项目 |
| `edit_item` | 编辑任务或项目属性 |
| `remove_item` | 删除任务或项目 |
| `batch_add_items` | 批量创建任务和项目 |
| `batch_remove_items` | 批量删除 |

### 组织管理

| 工具 | 说明 |
|------|------|
| `list_tags` | 浏览标签层级 |
| `delete_folder` | 删除文件夹 |
| `rename_folder` | 重命名文件夹 |
| `synchronize` | 触发 OmniFocus 同步 |

### GTD 回顾

| 工具 | 说明 |
|------|------|
| `get_completed_tasks_in_range` | 最近 N 天完成的任务 — 周回顾利器 |
| `get_today_completed_tasks` | 今日完成的任务 |

```jsonc
// 周回顾：过去 7 天完成了什么？
{ "daysBack": 7, "limit": 50 }
```

## MCP Resources

预加载数据端点 — Agent 无需调用工具即可直接读取：

| 资源 | URI | 说明 |
|------|-----|------|
| 收件箱 | `omnifocus://inbox` | 当前收件箱项目 |
| 今日 | `omnifocus://today` | 到期、计划、逾期任务 |
| 已标记 | `omnifocus://flagged` | 所有已标记项目 |
| 统计 | `omnifocus://stats` | 数据库统计信息 |
| 项目 | `omnifocus://project/{name}` | 特定项目中的任务 |
| 透视 | `omnifocus://perspective/{name}` | 命名透视中的项目 |

## GTD 工作流映射

| GTD 阶段 | 对应工具 |
|----------|----------|
| **收集** | `add_omnifocus_task`、`batch_add_items` |
| **厘清** | `query_omnifocus`（收件箱）、`get_task_by_id`、`edit_item` |
| **整理** | `add_project`、`edit_item`、`list_tags`、`delete_folder`、`rename_folder` |
| **回顾** | `get_completed_tasks_in_range`、`get_today_completed_tasks`、`get_perspective_view`、`query_omnifocus`（项目） |
| **执行** | `query_omnifocus`（status: Next/Available）、`edit_item`（标记完成）、`synchronize` |

## 服务器内置指引

服务器包含内置的 Server Instructions，引导 AI Agent 正确选择工具：

- 优先使用 `query_omnifocus` 而非 `dump_database`（节省 85-95% 上下文）
- 使用 `fields` 参数只请求需要的字段
- 使用 `summary: true` 快速获取数量
- 优先使用批量操作而非重复单次调用

## 架构

从 [omnifocus-mcp-enhanced](https://github.com/jqlts1/omnifocus-mcp-enhanced) fork，并迁入了 [omnifocus-mcp](https://github.com/themotionmachine/OmniFocus-MCP) 的所有独占功能：

- **统一查询引擎**（`query_omnifocus`）替代了 5 个专用查询工具
- **文本搜索**（`nameContains`、`noteContains`、`keyword`）— 不区分大小写的部分匹配
- **MCP Resources** — 4 个固定资源 + 2 个模板资源（带自动补全）
- **Server Instructions** — 内置的 AI 工具选择指引
- **Logger** — MCP 协议级结构化日志
- **CacheManager** — 基于 TTL 的缓存，带数据库校验和验证
- **GTD 工具** — `get_completed_tasks_in_range`（周回顾）、`synchronize`、`delete_folder`、`rename_folder`

## 链接

- **npm**: https://www.npmjs.com/package/omnifocus-mcp-pro
- **GitHub**: https://github.com/darrenyao/omnifocus-mcp-enhanced
- **OmniFocus**: https://www.omnigroup.com/omnifocus/
- **MCP 规范**: https://modelcontextprotocol.io/

## 致谢

基于 themotionmachine 的 [omnifocus-mcp](https://github.com/themotionmachine/OmniFocus-MCP) 和 jqlts1 的 [omnifocus-mcp-enhanced](https://github.com/jqlts1/omnifocus-mcp-enhanced) 构建。

## 许可证

MIT
