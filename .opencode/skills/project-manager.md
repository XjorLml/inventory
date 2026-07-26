# GitHub Projects Manager Agent

A project management agent that provides kanban-board visibility and workflow management for issues and pull requests.

## Description

This agent manages GitHub Projects (v2) — the kanban-style project boards. It can list projects, show all items with their current status, add new issues to a board, and move items between columns. Use it to track the QA-to-deployment workflow.

## Workflow

When asked to manage project boards, follow this protocol:

### 1. List Available Projects

Show all accessible projects for the repository owner:

```
Use github_list_projects
```

Each project returns:
- `id` — GraphQL node ID (used in all other project commands)
- `title` — project name (e.g., "Sprint 23", "Bug Tracking")
- `url` — direct link to the project board
- `closed` — whether the project is archived

### 2. View a Project Board

List all items on a specific project board with their current status:

```
Use github_list_project_items with:
  projectId: "<id from step 1>"
```

Each item returns:
- `id` — item node ID
- `content.number` — issue/PR number
- `content.title` — issue/PR title
- `content.url` — direct link
- `content.state` — OPEN/CLOSED/MERGED
- `fieldValues` — array of field values including the Status column

### 3. Get Status Field Configuration

Before moving items, inspect the Status field to find option IDs:

```
Use github_get_project_status_field with:
  projectId: "<project id>"
```

Returns:
- `id` — field ID (needed for move operations)
- `name` — field name (usually "Status")
- `options` — array of `{ id, name }` pairs like:
  - "Todo" → `optionId_1`
  - "In Progress" → `optionId_2`
  - "In Review" → `optionId_3`
  - "Done" → `optionId_4`

### 4. Add an Issue to a Project

Two-step process:

**Step A — Get the issue's GraphQL node ID:**

```
Use github_get_issue_node_id with:
  issueNumber: <number>
```

**Step B — Add it to the project:**

```
Use github_add_issue_to_project with:
  projectId: "<project id>"
  issueId: "<node id from step A>"
```

### 5. Move an Item Between Columns

```
Use github_move_project_item with:
  projectId: "<project id>"
  itemId: "<item id from list_project_items>"
  fieldId: "<field id from get_project_status_field>"
  singleSelectOptionId: "<option id for target column>"
```

Common status transitions:
| From | To | Workflow Step |
|---|---|---|
| Todo | In Progress | Developer starts working |
| In Progress | In Review | PR submitted (used by Bug Fixer) |
| In Review | Done | PR merged / issue closed |

### 6. Track Workflow Progress

Provide a summary of the board:

```
Project: <title>

By Status:
- 📋 Todo (2): #12 Login timeout, #14 Export CSV
- 🚧 In Progress (1): #13 Fix pagination (@user)
- 👀 In Review (1): #15 SQL injection fix (PR #4)
- ✅ Done (3): #10, #11, #9

Total: 7 items  •  3 completed
```

## MCP Tools Available

| Tool | Purpose |
|---|---|
| `github_list_projects` | List all project boards |
| `github_get_project_status_field` | Get column/status options |
| `github_list_project_items` | View all items on a board |
| `github_get_issue_node_id` | Get GraphQL node ID for an issue |
| `github_add_issue_to_project` | Add an issue to a board |
| `github_move_project_item` | Move item between columns |
| `github_get_issue` | Get issue details for item context |
| `github_list_issues` | Find issues not yet on the board |
| `github_get_repo` | Confirm repository configuration |

## Enabling the Agent

### 1. Prerequisites

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Token needs `project:write` scope (in addition to `repo` or `issues:write`).

### 2. MCP server

Already registered in `.mcp.json` as `qa-bug-ticketing`.

### 3. Invoke this skill

Use the `skill` tool with `project-manager` when you need kanban board operations.

### 4. Example prompts

> "Show me all project boards and their current status."
>
> "Add issue #3 to the 'Bug Tracking' project and set it to In Progress."
>
> "Move issue #3 on the Bug Tracking board from 'In Progress' to 'In Review'."
>
> "What's the current sprint status? Show me what's Todo, In Progress, and Done."
