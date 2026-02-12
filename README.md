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

# 🌳 NEW: Get tasks from custom perspective with tree display
get_custom_perspective_tasks {
  "perspectiveName": "今日工作安排",  # Your custom perspective name
  "showHierarchy": true,            # Enable tree display
  "hideCompleted": true
}

# Examples with different perspectives
get_custom_perspective_tasks {
  "perspectiveName": "Today Review",
  "showHierarchy": true
}

get_custom_perspective_tasks {
  "perspectiveName": "Weekly Planning",
  "showHierarchy": false  # Flat display
}
```

**Why This Is Powerful:**
- ✅ **Native Integration** - Uses OmniFocus `Perspective.Custom` API directly
- ✅ **Tree Structure** - Visual parent-child task relationships with ├─, └─ symbols
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

## 🛠️ Complete Tool Reference

### 📊 Database & Task Management
1. **dump_database** - Get OmniFocus database state
2. **add_omnifocus_task** - Create tasks (enhanced with subtask support)
3. **add_project** - Create projects
4. **remove_item** - Delete tasks or projects
5. **edit_item** - Edit tasks or projects
6. **batch_add_items** - Bulk add (enhanced with subtask support)
7. **batch_remove_items** - Bulk remove
8. **get_task_by_id** - Query task information

### 🔍 Built-in Perspective Tools
9. **get_inbox_tasks** - Inbox perspective
10. **get_flagged_tasks** - Flagged perspective
11. **get_forecast_tasks** - Forecast perspective (due/deferred/planned task data included)
12. **get_tasks_by_tag** - Tag-based filtering
13. **filter_tasks** - Ultimate filtering with unlimited combinations

### 🌟 Custom Perspective Tools (NEW)
14. **list_custom_perspectives** - 🌟 **NEW**: List all custom perspectives with details
15. **get_custom_perspective_tasks** - 🌟 **NEW**: Access custom perspective with hierarchical display

### 📊 Analytics & Tracking
16. **get_today_completed_tasks** - View today's completed tasks

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

# Access a custom perspective with hierarchy
get_custom_perspective_tasks {
  "perspectiveName": "Today Review",
  "showHierarchy": true,
  "hideCompleted": true
}

# Quick flat view of weekly planning
get_custom_perspective_tasks {
  "perspectiveName": "Weekly Planning",
  "showHierarchy": false
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
