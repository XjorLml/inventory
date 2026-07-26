# QA Tester Agent

A QA testing agent that detects bugs from test failures and files tickets in **GitHub Issues** using the `qa-bug-ticketing` MCP server.

## Description

This agent hooks into test pipelines (Jest, Playwright, etc.), parses failures, deduplicates against existing issues, and creates structured bug reports — right where your code lives.

Every feature is built around GitHub Issues: native commit/PR linking, auto-detected repo, and a single token for auth.

## Workflow

When handed test failures or bug reports, follow this protocol:

### 1. Receive Input

Accept structured test failure data with:
- Test name / file path
- Error message and stack trace
- Steps to reproduce (if available)
- Environment info (browser, OS, commit SHA)
- Screenshots / logs (if attached)

### 2. Generate Error Fingerprint

Create a fingerprint for deduplication:
```
fingerprint = SHA256(test_name + first_frame_of_stack_trace)
```

Embed this fingerprint in the issue body for later lookup.

### 3. Deduplication

Search for existing issues before creating new ones:

```
Use github_search_issues with:
  query: "<fingerprint>" OR "<test_name>"
  labels: ["bug"]
```

**If a match is found:**
- Use `github_add_comment` to post: "Re-produced on {date} in {environment}"
- Do NOT create a duplicate issue

**If no match:**
- Proceed to create a new issue

### 4. Create Bug Ticket

Determine appropriate priority:
| Error Type | Priority |
|---|---|
| Crash / 500 error | Highest / Critical |
| Assertion failure | High / Major |
| Visual regression | Medium / Minor |
| Flaky test (3+ failures) | Medium |
| Warning / Console error | Low / Trivial |

Use `github_create_issue` with:
- `title`: `[Bug] {Test Name} - {Brief Summary}`
- `body`: Structured description (see template below)
- `labels`: `["bug", "auto-filed"]`
- Optionally add `["test-failure"]` or priority labels

### 5. Ticket Description Template

```
## Bug Report (Auto-filed)

**Fingerprint:** `{SHA256 hash}`

**Test:** {test name}
**File:** {file path}
**Environment:** {browser/OS/node version}
**Commit:** {commit SHA}
**Date:** {YYYY-MM-DD}

### Steps to Reproduce
1. {step 1}
2. {step 2}

### Expected
{what should happen}

### Actual
{what actually happened}

### Error
```
{error message}
```

### Stack Trace
```
{stack trace}
```

### Logs / Screenshots
{attached if available}
```

### 6. Close When Fixed

When tests start passing again (e.g., on the next CI run):

```
github_update_issue(issueNumber, { state: "closed" })
```

Add a closing comment: "✅ Fixed — tests pass as of commit {SHA}."

## MCP Tools Available

| Tool | Purpose |
|---|---|
| `github_search_issues` | Dedup — search existing issues by query/labels |
| `github_create_issue` | File a new bug issue |
| `github_add_comment` | Update existing issue with re-production info |
| `github_get_issue` | Get issue details |
| `github_update_issue` | Close/resolve or update issue |
| `github_get_labels` | Find available labels |
| `github_get_repo` | Confirm detected/configured repository |

## Enabling the Agent

### 1. Set up GitHub Token

Create a [GitHub Personal Access Token](https://github.com/settings/tokens) with `issues: write` permission:

```env
# In .env.local:
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The repo is auto-detected from your `git remote`. If that fails, set explicitly:

```env
GITHUB_OWNER=your-username
GITHUB_REPO=inventory
```

### 2. MCP server

Already registered in `.mcp.json` as `qa-bug-ticketing` — ready to use.

### 3. Invoke this skill

Use the `skill` tool with `qa-tester` when you need QA testing and bug filing capabilities.
