# 🚀 OmniFocus MCP Enhanced

[![npm version](https://img.shields.io/npm/v/omnifocus-mcp-enhanced.svg)](https://www.npmjs.com/package/omnifocus-mcp-enhanced)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![macOS](https://img.shields.io/badge/macOS-only-blue.svg)](https://www.apple.com/macos/)

> **🌟 NEW: Native Custom Perspective Access with Hierarchical Display!**

> **Transform OmniFocus into an AI-powered productivity powerhouse with custom perspective support**

<a href="https://glama.ai/mcp/servers/@jqlts1/omnifocus-mcp-enhanced">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@jqlts1/omnifocus-mcp-enhanced/badge" alt="OmniFocus Enhanced MCP server" />
</a>

Enhanced Model Context Protocol (MCP) server for OmniFocus featuring **native custom perspective access**, hierarchical task display, AI-optimized tool selection, and comprehensive task management. Perfect integration with Claude AI for intelligent workflows.

## 🆕 Latest Release

- **v1.6.9** - Added task attachment support: `get_task_by_id` now lists attachment metadata, `dump_database` exports attachment/link metadata, and new `read_task_attachment` returns image attachments as MCP image content when possible.
- **v1.6.8** - Added stable task move support via `move_task` and `edit_item` (`newProjectId/newProjectName/newParentTaskId/newParentTaskName/moveToInbox`) with duplicate-name protection and cycle-prevention checks.
- **v1.6.6** - Added full Planned Date support (create/edit/read/filter/sort/export), including `plannedDate`/`newPlannedDate` and updated task displays.

## ✨ Key Features

### 🌟 **NEW: Native Custom Perspective Access**
- **🎯 Direct Integration** - Native access to your OmniFocus custom perspectives via `Perspective.Custom` API
- **🌳 Hierarchical Display** - Tree-style task visualization with parent-child relationships
- **🧠 AI-Optimized** - Enhanced tool descriptions prevent AI confusion between perspectives and tags
- **⚡ Zero Setup** - Works with your existing custom perspectives instantly

### 🏗️ **Complete Task Management**
- **🏗️ Complete Subtask Support** - Create hierarchical tasks with parent-child relationships
- **🔍 Built-in Perspectives** - Access Inbox, Flagged, Forecast, and Tag-based views
- **🚀 Ultimate Task Filter** - Advanced filtering beyond OmniFocus native capabilities  
- **🎯 Batch Operations** - Add/remove multiple tasks efficiently
- **📊 Smart Querying** - Find tasks by ID, name, or complex criteria
- **🔄 Full CRUD Operations** - Create, read, update, delete tasks and projects
- **📅 Time Management** - Due, defer, planned dates, estimates, and scheduling
- **🏷️ Advanced Tagging** - Tag-based filtering with exact/partial matching
- **🤖 AI Integration** - Seamless Claude AI integration for intelligent workflows
- **🖼️ Attachment-Aware Reads** - Surface note attachments and linked files before deciding whether AI should inspect them

## 📦 Installation

### Quick Install (Recommended)

```bash
# One-line installation
claude mcp add omnifocus-enhanced -- npx -y omnifocus-mcp-enhanced
```

### Alternative Installation Methods

```bash
# Upgrade to latest
npm install -g omnifocus-mcp-enhanced@latest

# Global installation
npm install -g omnifocus-mcp-enhanced
claude mcp add omnifocus-enhanced -- omnifocus-mcp-enhanced

# Local project installation
git clone https://github.com/jqlts1/omnifocus-mcp-enhanced.git
cd omnifocus-mcp-enhanced
npm install && npm run build
claude mcp add omnifocus-enhanced -- node "/path/to/omnifocus-mcp-enhanced/dist/server.js"
```

## 📋 Requirements

- **macOS 10.15+** - OmniFocus is macOS-only
- **OmniFocus 3+** - The application must be installed and running
- **OmniFocus Pro** - Required for custom perspectives (new features in v1.6.0)
- **Node.js 18+** - For running the MCP server
- **Claude Code** - For MCP integration

## 🎯 Core Capabilities

### 1. 🏗️ Subtask Management

Create complex task hierarchies with ease:

```json
// Create subtask by parent task name
{
  "name": "Analyze competitor keywords",
  "parentTaskName": "SEO Strategy",
  "note": "Focus on top 10 competitors",
  "dueDate": "2025-01-15",
  "estimatedMinutes": 120,
  "tags": ["SEO", "Research"]
}

// Create subtask by parent task ID
{
  "name": "Write content outline",
  "parentTaskId": "loK2xEAY4H1",
  "flagged": true,
  "estimatedMinutes": 60
}
```

### 2. 🔍 Perspective Views

Access all major OmniFocus perspectives programmatically:

```bash
# Inbox perspective
get_inbox_tasks {"hideCompleted": true}

# Flagged tasks
get_flagged_tasks {"projectFilter": "SEO Project"}

# Forecast (next 7 days)
get_forecast_tasks {"days": 7, "hideCompleted": true}

# Tasks by tag
get_tasks_by_tag {"tagName": "AI", "exactMatch": false}
```

### 3. 🚀 Ultimate Task Filter

Create any perspective imaginable with advanced filtering:

```bash
# Time management view (30min tasks due this week)
filter_tasks {
  "taskStatus": ["Available", "Next"],
  "estimateMax": 30,
  "dueThisWeek": true
}

# Deep work view (60+ minute tasks with notes)
filter_tasks {
  "estimateMin": 60,
  "hasNote": true,
  "taskStatus": ["Available"]
}

# Planned work view (tasks planned for today)
filter_tasks {
  "plannedToday": true,
  "sortBy": "plannedDate"
}

# Project overdue tasks
filter_tasks {
  "projectFilter": "Website Redesign",
  "taskStatus": ["Overdue", "DueSoon"]
}
```

### 4. 🌟 **NEW: Native Custom Perspective Access**

Access your OmniFocus custom perspectives with hierarchical task display:

```bash
# 🌟 NEW: List all your custom perspectives
list_custom_perspectives {"format": "detailed"}

# 🌳 NEW: Project tree view (default)
get_custom_perspective_tasks {
  "perspectiveName": "今日工作安排",  # Your custom perspective name
  "displayMode": "project_tree",    # project_tree | task_tree | flat
  "hideCompleted": true
}

# Global task tree (legacy showHierarchy=true equivalent)
get_custom_perspective_tasks {
  "perspectiveName": "Today Review",
  "displayMode": "task_tree"
}

# Flat list (legacy groupByProject=false equivalent)
get_custom_perspective_tasks {
  "perspectiveName": "Weekly Planning",
  "displayMode": "flat"
}
```

**Why This Is Powerful:**
- ✅ **Native Integration** - Uses OmniFocus `Perspective.Custom` API directly
- ✅ **Tree Structure** - Visual parent-child task relationships with ├─, └─ symbols
- ✅ **Project-First Grouping** - Project header first, then nested subtasks
- ✅ **Readable Metadata** - Full notes and `#tags` in tree output
- ✅ **AI-Friendly** - Enhanced descriptions prevent tool selection confusion
- ✅ **Professional Output** - Clean, readable task hierarchies

### 5. 🎯 Batch Operations

Efficiently manage multiple tasks:

```json
{
  "items": [
    {
      "type": "task",
      "name": "Website Technical SEO",
      "projectName": "SEO Project",
      "note": "Optimize technical aspects"
    },
    {
      "type": "task",
      "name": "Page Speed Optimization",
      "parentTaskName": "Website Technical SEO",
      "estimatedMinutes": 180,
      "flagged": true
    },
    {
      "type": "task",
      "name": "Mobile Responsiveness",
      "parentTaskName": "Website Technical SEO",
      "estimatedMinutes": 90
    }
  ]
}
```

### 6. 🖼️ Attachment Inspection

Discover images and linked files on a task first, then read only the attachment you need:

```bash
# List task details plus attachment metadata
get_task_by_id {
  "taskId": "abc123"
}

# Open an attachment returned by get_task_by_id
read_task_attachment {
  "taskId": "abc123",
  "attachmentId": "embedded-1"
}
```

`get_task_by_id` now reports attachment IDs, names, MIME guesses, source (`embedded` vs `linked`), and sizes when available. `read_task_attachment` returns images as MCP image content when possible, so AI clients can inspect the image directly instead of parsing base64 from plain text.

## 🛠️ Complete Tool Reference

### 📊 Database & Task Management
1. **dump_database** - Get OmniFocus database state
2. **add_omnifocus_task** - Create tasks (enhanced with subtask support)
3. **add_project** - Create projects
4. **remove_item** - Delete tasks or projects
5. **edit_item** - Edit tasks or projects (now supports task moves: project/parent/inbox)
6. **move_task** - Move an existing task to project/parent task/inbox
7. **batch_add_items** - Bulk add (enhanced with subtask support)
8. **batch_remove_items** - Bulk remove
9. **get_task_by_id** - Query task information, including attachment metadata
10. **read_task_attachment** - Read an attachment reported by `get_task_by_id`

### 🔍 Built-in Perspective Tools
11. **get_inbox_tasks** - Inbox perspective
12. **get_flagged_tasks** - Flagged perspective
13. **get_forecast_tasks** - Forecast perspective (due/deferred/planned task data included)
14. **get_tasks_by_tag** - Tag-based filtering
15. **filter_tasks** - Ultimate filtering with unlimited combinations

### 🌟 Custom Perspective Tools (NEW)
16. **list_custom_perspectives** - 🌟 **NEW**: List all custom perspectives with details
17. **get_custom_perspective_tasks** - 🌟 **NEW**: Access custom perspective with hierarchical display

### 📊 Analytics & Tracking
18. **get_today_completed_tasks** - View today's completed tasks

Batch move feature roadmap (future): [docs/roadmap/2026-02-25-batch-move-tasks-plan.md](docs/roadmap/2026-02-25-batch-move-tasks-plan.md)

## 🚀 Quick Start Examples

### Basic Task Creation
```bash
# Simple task
add_omnifocus_task {
  "name": "Review quarterly goals",
  "projectName": "Planning",
  "dueDate": "2025-01-31",
  "plannedDate": "2025-01-28"
}
```

### Advanced Task Management
```bash
# Create parent task
add_omnifocus_task {
  "name": "Launch Product Campaign",
  "projectName": "Marketing",
  "dueDate": "2025-02-15",
  "tags": ["Campaign", "Priority"]
}

# Add subtasks
add_omnifocus_task {
  "name": "Design landing page",
  "parentTaskName": "Launch Product Campaign",
  "estimatedMinutes": 240,
  "flagged": true
}
```

### Task Move Operations
```bash
# Move task to a project
move_task {
  "id": "task-id-123",
  "targetProjectName": "Planning"
}

# Move task under another task
move_task {
  "id": "task-id-123",
  "targetParentTaskId": "parent-task-id-456"
}

# Move task back to inbox
move_task {
  "id": "task-id-123",
  "targetInbox": true
}
```

Task move safety rules:
- Name lookups fail fast on duplicates and ask you to use IDs.
- Destination must be exactly one type: project OR parent task OR inbox.
- Moving a task into itself/its descendants is blocked to prevent cycles.

You can also move with `edit_item` and combine move + field updates:
```bash
edit_item {
  "itemType": "task",
  "id": "task-id-123",
  "newProjectName": "Planning",
  "newName": "Review tmux workflow",
  "newFlagged": true
}
```

### Smart Task Discovery
```bash
# Find high-priority work
filter_tasks {
  "flagged": true,
  "taskStatus": ["Available"],
  "estimateMax": 120,
  "hasEstimate": true
}

# Today's completed work
filter_tasks {
  "completedToday": true,
  "taskStatus": ["Completed"],
  "sortBy": "project"
}
```

### 🌟 Custom Perspective Usage
```bash
# List your custom perspectives
list_custom_perspectives {"format": "detailed"}

# Access a custom perspective with project tree
get_custom_perspective_tasks {
  "perspectiveName": "Today Review",
  "displayMode": "project_tree",
  "hideCompleted": true
}

# Quick flat view of weekly planning
get_custom_perspective_tasks {
  "perspectiveName": "Weekly Planning",
  "displayMode": "flat"
}
```

## 🔧 Configuration

### Verify Installation
```bash
# Check MCP status
claude mcp list

# Test basic connection
get_inbox_tasks

# Test new custom perspective features
list_custom_perspectives
```

### Troubleshooting
- Ensure OmniFocus 3+ is installed and running
- Verify Node.js 18+ is installed
- Check Claude Code MCP configuration
- Enable accessibility permissions for terminal apps if needed

## 🎯 Use Cases

- **Project Management** - Create detailed project hierarchies with subtasks
- **GTD Workflow** - Leverage perspectives for Getting Things Done methodology
- **Time Blocking** - Filter by estimated time for schedule planning
- **Review Process** - Use custom perspectives for weekly/monthly reviews
- **Team Coordination** - Batch operations for team task assignment
- **AI-Powered Planning** - Let Claude analyze and organize your tasks

## 📈 Performance

- **Fast Filtering** - Native AppleScript performance
- **Batch Efficiency** - Single operation for multiple tasks
- **Memory Optimized** - Minimal resource usage
- **Scalable** - Handles large task databases efficiently

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **NPM Package**: https://www.npmjs.com/package/omnifocus-mcp-enhanced
- **GitHub Repository**: https://github.com/jqlts1/omnifocus-mcp-enhanced
- **OmniFocus**: https://www.omnigroup.com/omnifocus/
- **Model Context Protocol**: https://modelcontextprotocol.io/
- **Claude Code**: https://docs.anthropic.com/en/docs/claude-code

## 🙏 Acknowledgments

Based on the original OmniFocus MCP server by [themotionmachine](https://github.com/themotionmachine/OmniFocus-MCP). Enhanced with perspective views, advanced filtering, and complete subtask support.

---

**⭐ Star this repo if it helps boost your productivity!**
