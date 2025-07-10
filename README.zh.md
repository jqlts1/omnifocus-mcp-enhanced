# 🚀 OmniFocus MCP Enhanced

[![npm version](https://img.shields.io/npm/v/omnifocus-mcp-enhanced.svg)](https://www.npmjs.com/package/omnifocus-mcp-enhanced)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![macOS](https://img.shields.io/badge/macOS-only-blue.svg)](https://www.apple.com/macos/)

> **🌟 新功能：原生自定义透视访问与层级显示！**

> **将 OmniFocus 转换为 AI 驱动的生产力强化工具，支持自定义透视**

增强版 OmniFocus 模型上下文协议（MCP）服务器，具备**原生自定义透视访问**、层级任务显示、AI 优化工具选择和全面的任务管理功能。与 Claude AI 完美集成，实现智能工作流。

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
- **📅 时间管理** - 截止日期、推迟日期、估时和计划
- **🏷️ 高级标签** - 基于标签的精确/模糊匹配过滤
- **🤖 AI 集成** - 与 Claude AI 无缝集成，实现智能工作流

## 📦 安装

### 快速安装（推荐）

```bash
# 一键安装
claude mcp add omnifocus-enhanced -- npx -y omnifocus-mcp-enhanced
```

### 其他安装方式

```bash
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
- **Claude Code** - MCP 集成

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

# 🌳 新功能：从自定义透视获取任务，支持树状显示
get_custom_perspective_tasks {
  "perspectiveName": "今日工作安排",  # 您的自定义透视名称
  "showHierarchy": true,            # 启用树状显示
  "hideCompleted": true
}

# 不同透视的示例
get_custom_perspective_tasks {
  "perspectiveName": "今日复盘",
  "showHierarchy": true
}

get_custom_perspective_tasks {
  "perspectiveName": "本周项目",
  "showHierarchy": false  # 平铺显示
}
```

**功能强大的原因：**
- ✅ **原生集成** - 直接使用 OmniFocus `Perspective.Custom` API
- ✅ **树状结构** - 使用 ├─、└─ 符号显示父子任务关系
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

## 🛠️ 完整工具参考

### 📊 数据库与任务管理
1. **dump_database** - 获取 OmniFocus 数据库状态
2. **add_omnifocus_task** - 创建任务（增强子任务支持）
3. **add_project** - 创建项目
4. **remove_item** - 删除任务或项目
5. **edit_item** - 编辑任务或项目
6. **batch_add_items** - 批量添加（增强子任务支持）
7. **batch_remove_items** - 批量删除
8. **get_task_by_id** - 查询任务信息

### 🔍 内置透视工具
9. **get_inbox_tasks** - 收件箱透视
10. **get_flagged_tasks** - 已标记透视
11. **get_forecast_tasks** - 预测透视（截止/推迟任务）
12. **get_tasks_by_tag** - 基于标签的过滤
13. **filter_tasks** - 无限组合的终极过滤

### 🌟 自定义透视工具（新功能）
14. **list_custom_perspectives** - 🌟 **新功能**：列出所有自定义透视及详情
15. **get_custom_perspective_tasks** - 🌟 **新功能**：访问自定义透视，支持层级显示

### 📊 分析与跟踪
16. **get_today_completed_tasks** - 查看今日完成的任务

## 🚀 快速开始示例

### 基础任务创建
```bash
# 简单任务
add_omnifocus_task {
  "name": "回顾季度目标",
  "projectName": "规划",
  "dueDate": "2025-01-31"
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

# 访问带层级的自定义透视
get_custom_perspective_tasks {
  "perspectiveName": "今日复盘",
  "showHierarchy": true,
  "hideCompleted": true
}

# 快速查看周计划的平铺视图
get_custom_perspective_tasks {
  "perspectiveName": "本周项目",
  "showHierarchy": false
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