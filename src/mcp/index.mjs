#!/usr/bin/env node

/**
 * QA Bug Ticketing MCP Server
 *
 * Exposes tools for creating and managing bug tickets in GitHub Issues.
 * Designed to be used by a QA testing agent that auto-files bugs from test failures.
 *
 * Usage:
 *   node src/mcp/index.mjs
 *
 * Environment variables (loaded from .env.local automatically):
 *   GITHUB_TOKEN     - Personal Access Token (issues:write permission)
 *   GITHUB_OWNER     - Owner (auto-detected from git remote, or set explicitly)
 *   GITHUB_REPO      - Repo name (auto-detected from git remote, or set explicitly)
 */

import "../lib/load-env.mjs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";

import * as github from "./github.mjs";

// ─── Server Setup ──────────────────────────────────────────────────

const server = new McpServer(
  {
    name: "qa-bug-ticketing",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
    instructions: `QA & Project Management MCP Server — GitHub

CAPABILITIES:
  Issues   — search, create, comment, update, dedup by fingerprint
  Pull Requests — create, list, get, merge
  Projects — list kanban boards, add issues, move between columns

REQUIREMENTS:
  - GITHUB_TOKEN with "repo" or "issues:write" + "project:write" scope
  - Repo auto-detected from "git remote get-url origin"

WORKFLOWS:
  QA Bug Filing:     search → dedup → create issue → add to project
  Bug Fixing:        read issue → fix code → create PR → move to "In Review"
  Project Management: list projects → add issues → move columns → track progress
`,
  }
);

// ─── GitHub Issues Tools ───────────────────────────────────────────

server.registerTool("github_search_issues", {
  title: "Search GitHub Issues",
  description: "Search for issues across the repository. Use for deduplication before filing a new bug — search by test name, error fingerprint, or labels.",
  inputSchema: {
    query: z.string().describe("Search query (e.g. 'LoginForm validation' or fingerprint hash)"),
    state: z.enum(["open", "closed", "all"]).optional().default("open").describe("Filter by issue state"),
    labels: z.array(z.string()).optional().describe("Filter by label names (e.g. ['bug', 'auto-filed'])"),
    perPage: z.number().optional().default(20).describe("Results per page (max 100)"),
  },
}, async ({ query, state, labels, perPage }) => {
  try {
    const result = await github.searchIssues({ query, state, labels, perPage });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error searching issues: ${err.message}` }],
    };
  }
});

server.registerTool("github_create_issue", {
  title: "Create GitHub Issue",
  description: "Create a new bug issue in GitHub. Use after deduplication via github_search_issues. The repo is auto-detected from git remote.",
  inputSchema: {
    title: z.string().describe("Issue title — should include [Bug] prefix and brief summary"),
    body: z.string().optional().describe("Issue body in markdown — include fingerprint, steps, stack trace, environment"),
    labels: z.array(z.string()).optional().describe("Labels to attach (e.g. ['bug', 'auto-filed', 'test-failure'])"),
    assignees: z.array(z.string()).optional().describe("GitHub usernames to assign"),
  },
}, async ({ title, body, labels, assignees }) => {
  try {
    const issue = await github.createIssue({ title, body, labels, assignees });
    return {
      content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error creating issue: ${err.message}` }],
    };
  }
});

server.registerTool("github_add_comment", {
  title: "Add GitHub Comment",
  description: "Add a comment to an existing issue (e.g., 'Re-produced on YYYY-MM-DD in CI build #1234').",
  inputSchema: {
    issueNumber: z.number().describe("Issue number (e.g. 42 for issue #42)"),
    body: z.string().describe("Comment body in markdown"),
  },
}, async ({ issueNumber, body }) => {
  try {
    const result = await github.addComment({ issueNumber, body });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error adding comment: ${err.message}` }],
    };
  }
});

server.registerTool("github_get_issue", {
  title: "Get GitHub Issue",
  description: "Get full details of a specific issue by number.",
  inputSchema: {
    issueNumber: z.number().describe("Issue number (e.g. 42)"),
  },
}, async ({ issueNumber }) => {
  try {
    const issue = await github.getIssue({ issueNumber });
    return {
      content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error fetching issue: ${err.message}` }],
    };
  }
});

server.registerTool("github_update_issue", {
  title: "Update GitHub Issue",
  description: "Update an issue — close it, change title, add labels, change assignees.",
  inputSchema: {
    issueNumber: z.number().describe("Issue number"),
    title: z.string().optional().describe("New title"),
    body: z.string().optional().describe("New body"),
    state: z.enum(["open", "closed"]).optional().describe("'closed' to mark as fixed"),
    labels: z.array(z.string()).optional().describe("Replace labels"),
    assignees: z.array(z.string()).optional().describe("Replace assignees"),
  },
}, async ({ issueNumber, ...fields }) => {
  try {
    const result = await github.updateIssue({ issueNumber, ...fields });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error updating issue: ${err.message}` }],
    };
  }
});

server.registerTool("github_get_labels", {
  title: "Get GitHub Labels",
  description: "List all labels in the repository for categorizing bugs.",
  inputSchema: {},
}, async () => {
  try {
    const labels = await github.getLabels();
    return {
      content: [{ type: "text", text: JSON.stringify(labels, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error fetching labels: ${err.message}` }],
    };
  }
});

server.registerTool("github_get_repo", {
  title: "Get GitHub Repo Info",
  description: "Get repository information to confirm the detected or configured repo.",
  inputSchema: {},
}, async () => {
  try {
    const repo = await github.getRepo();
    return {
      content: [{ type: "text", text: JSON.stringify(repo, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error fetching repo: ${err.message}` }],
    };
  }
});

server.registerTool("github_list_issues", {
  title: "List GitHub Issues",
  description: "List all issues in the repository with optional filters. Faster than search for real-time dedup — no search indexing delay.",
  inputSchema: {
    state: z.enum(["open", "closed", "all"]).optional().default("open").describe("Filter by state"),
    labels: z.array(z.string()).optional().describe("Filter by labels"),
  },
}, async ({ state, labels }) => {
  try {
    const issues = await github.listIssues({ state, labels });
    return {
      content: [{ type: "text", text: JSON.stringify(issues, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error listing issues: ${err.message}` }],
    };
  }
});

server.registerTool("github_find_by_fingerprint", {
  title: "Find Issue by Fingerprint",
  description: "Search for an existing issue by error fingerprint hash (scans issue bodies locally). Use this for dedup before filing a new bug.",
  inputSchema: {
    fingerprint: z.string().describe("SHA256 fingerprint hash embedded in the issue body"),
    state: z.enum(["open", "closed", "all"]).optional().default("open").describe("Filter by state"),
  },
}, async ({ fingerprint, state }) => {
  try {
    const issue = await github.findByFingerprint({ fingerprint, state });
    if (issue) {
      return {
        content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ found: false, message: "No matching issue found" }, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error finding by fingerprint: ${err.message}` }],
    };
  }
});

// ─── Pull Request Tools ───────────────────────────────────────────

server.registerTool("github_create_pr", {
  title: "Create Pull Request",
  description: "Create a pull request from a branch. Used by the Bug Fixer agent to submit fixes.",
  inputSchema: {
    title: z.string().describe("PR title"),
    body: z.string().optional().describe("PR body in markdown (include 'Fixes #issue' to auto-link)"),
    head: z.string().describe("The branch with changes (e.g. 'fix-login-validation')"),
    base: z.string().optional().default("main").describe("Target branch"),
    draft: z.boolean().optional().default(false).describe("Create as draft PR"),
  },
}, async ({ title, body, head, base, draft }) => {
  try {
    const pr = await github.createPullRequest({ title, body, head, base, draft });
    return {
      content: [{ type: "text", text: JSON.stringify(pr, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error creating PR: ${err.message}` }],
    };
  }
});

server.registerTool("github_list_prs", {
  title: "List Pull Requests",
  description: "List pull requests in the repository.",
  inputSchema: {
    state: z.enum(["open", "closed", "all"]).optional().default("open").describe("Filter by state"),
  },
}, async ({ state }) => {
  try {
    const prs = await github.listPullRequests({ state });
    return {
      content: [{ type: "text", text: JSON.stringify(prs, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error listing PRs: ${err.message}` }],
    };
  }
});

server.registerTool("github_get_pr", {
  title: "Get Pull Request",
  description: "Get details of a specific pull request.",
  inputSchema: {
    prNumber: z.number().describe("PR number (e.g. 1)"),
  },
}, async ({ prNumber }) => {
  try {
    const pr = await github.getPullRequest({ prNumber });
    return {
      content: [{ type: "text", text: JSON.stringify(pr, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error fetching PR: ${err.message}` }],
    };
  }
});

server.registerTool("github_merge_pr", {
  title: "Merge Pull Request",
  description: "Merge a pull request (squash by default).",
  inputSchema: {
    prNumber: z.number().describe("PR number to merge"),
    commitTitle: z.string().optional().describe("Custom commit title"),
    mergeMethod: z.enum(["merge", "squash", "rebase"]).optional().default("squash").describe("Merge method"),
  },
}, async ({ prNumber, commitTitle, mergeMethod }) => {
  try {
    const result = await github.mergePullRequest({ prNumber, commitTitle, mergeMethod });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error merging PR: ${err.message}` }],
    };
  }
});

// ─── GitHub Projects (Kanban) Tools ─────────────────────────────

server.registerTool("github_list_projects", {
  title: "List GitHub Projects",
  description: "List all GitHub Projects (v2 kanban boards) accessible by the repo owner.",
  inputSchema: {},
}, async () => {
  try {
    const projects = await github.listProjects();
    return {
      content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error listing projects: ${err.message}` }],
    };
  }
});

server.registerTool("github_add_issue_to_project", {
  title: "Add Issue to Project",
  description: "Add an issue to a GitHub Project (v2 kanban board). Requires the issue node ID (use get_issue_node_id first).",
  inputSchema: {
    projectId: z.string().describe("Project node ID (from github_list_projects)"),
    issueId: z.string().describe("Issue node ID (from github_get_issue_node_id)"),
  },
}, async ({ projectId, issueId }) => {
  try {
    const result = await github.addIssueToProject({ projectId, issueId });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error adding issue to project: ${err.message}` }],
    };
  }
});

server.registerTool("github_get_issue_node_id", {
  title: "Get Issue Node ID",
  description: "Get the GraphQL node ID of an issue (needed for adding issues to projects).",
  inputSchema: {
    issueNumber: z.number().describe("Issue number (e.g. 3)"),
  },
}, async ({ issueNumber }) => {
  try {
    const id = await github.getIssueNodeId({ issueNumber });
    return {
      content: [{ type: "text", text: JSON.stringify({ nodeId: id }, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error getting node ID: ${err.message}` }],
    };
  }
});

server.registerTool("github_get_project_status_field", {
  title: "Get Project Status Field",
  description: "Get the Status field and its options for a project board. Use this to find option IDs for moving items between columns.",
  inputSchema: {
    projectId: z.string().describe("Project node ID"),
  },
}, async ({ projectId }) => {
  try {
    const field = await github.getProjectStatusField({ projectId });
    return {
      content: [{ type: "text", text: JSON.stringify(field, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error getting status field: ${err.message}` }],
    };
  }
});

server.registerTool("github_move_project_item", {
  title: "Move Project Item",
  description: "Move an item to a different column/status on a project board.",
  inputSchema: {
    projectId: z.string().describe("Project node ID"),
    itemId: z.string().describe("Item node ID (from github_list_project_items)"),
    fieldId: z.string().describe("Status field ID (from github_get_project_status_field)"),
    singleSelectOptionId: z.string().describe("Option ID for the target column"),
  },
}, async ({ projectId, itemId, fieldId, singleSelectOptionId }) => {
  try {
    const result = await github.updateProjectItemStatus({ projectId, itemId, fieldId, singleSelectOptionId });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error moving project item: ${err.message}` }],
    };
  }
});

server.registerTool("github_list_project_items", {
  title: "List Project Items",
  description: "List all items on a project board with their current status/column.",
  inputSchema: {
    projectId: z.string().describe("Project node ID"),
  },
}, async ({ projectId }) => {
  try {
    const items = await github.listProjectItems({ projectId });
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error listing project items: ${err.message}` }],
    };
  }
});

// ─── Start Server ──────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QA Bug Ticketing MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
