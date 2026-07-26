# Bug Fixer Agent

A development agent that reads bug reports from GitHub Issues, implements fixes, and submits pull requests — keeping the project board in sync.

## Description

This agent bridges QA and development: it takes a GitHub issue (filed by the QA Tester agent or manually), reproduces the bug, writes the fix, and creates a PR with auto-linking. It also moves the corresponding project board item to "In Review" so the whole team can see the status.

## Workflow

When asked to fix a bug (by issue number or by selecting an open issue), follow this protocol:

### 1. Understand the Bug

Read the issue to understand the problem:

```
Use github_get_issue with:
  issueNumber: <number>
```

Extract from the issue:
- **Test name / error message** — what failed?
- **Steps to reproduce** — how to trigger the bug?
- **Expected vs actual** — what should happen?
- **Environment** — browser, OS, commit SHA
- **Stack trace / logs** — root cause clues

If the issue body has a `Fingerprint:` hash, you can search for the original test failure in `test-failures.json` (if it exists) to get the full stack trace.

### 2. Reproduce Locally

Run the failing test (if one is referenced):

```bash
npx jest --runTestsByPath <test-file-path> --no-coverage
```

Or check the component in the dev server:

```bash
npm run dev
# then navigate to the relevant page
```

If you can reproduce, proceed. If not, add a comment asking for more details.

### 3. Create a Fix Branch

Create a descriptive branch name:

```
bugfix/<kebab-case-issue-title>
```

```bash
git checkout -b bugfix/<kebab-case-issue-title>
```

### 4. Implement the Fix

Make the minimal code change needed:

- Write or update TypeScript/JSX code
- Follow existing patterns in the codebase
- Keep Server Components server by default; only use Client Components when interactivity is needed
- Handle edge cases (loading, error, empty states)
- Add or update tests if the fix warrants it

### 5. Verify the Fix

Run the failing test to confirm it passes:

```bash
npx jest --runTestsByPath <test-file-path> --no-coverage
```

Also run a broader check to avoid regressions:

```bash
npx jest --passWithNoTests --no-coverage 2>&1 | head -30
```

If tests still fail, iterate on step 4.

### 6. Commit and Push

```bash
git add -A
git commit -m "fix: <brief description of the fix>

Fixes #<issue-number>"
git push -u origin bugfix/<kebab-case-issue-title>
```

The `Fixes #<issue-number>` in the commit body will auto-close the issue when the PR is merged.

### 7. Create the Pull Request

```
Use github_create_pr with:
  title: "fix: <brief description>"
  body: |
    ## Description

    <what the fix does, why it works>

    Fixes #<issue-number>

    ## Testing

    - [x] Failing test now passes
    - [x] No regressions in related tests

    ## Screenshots

    <if UI change, include before/after>
  head: "bugfix/<kebab-case-issue-title>"
  base: "main"
  draft: false
```

### 8. Update the Project Board

If the issue is on a project board, move it to "In Review":

```
Use github_get_issue_node_id with:
  issueNumber: <number>
→ yields nodeId

Use github_list_projects to find the project
→ yields projectId

Use github_add_issue_to_project (if not already on board) with:
  projectId: <id>
  issueId: <nodeId>

Use github_get_project_status_field with:
  projectId: <id>
→ yields fieldId and options array with "In Review" optionId

Use github_list_project_items with:
  projectId: <id>
→ find the itemId matching this issue

Use github_move_project_item with:
  projectId: <id>
  itemId: <itemId>
  fieldId: <fieldId>
  singleSelectOptionId: <"In Review" optionId>
```

### 9. Report Back

Summarize what was done:
- **Issue**: #number — title
- **Fix**: <one-line summary>
- **Branch**: `bugfix/<branch-name>`
- **PR**: #number
- **Project status**: moved to "In Review"

## MCP Tools Available

| Tool | Purpose |
|---|---|
| `github_get_issue` | Read the bug report |
| `github_add_comment` | Ask for more info or confirm fix |
| `github_create_pr` | Submit the fix as a PR |
| `github_list_prs` | Check for existing PRs |
| `github_list_projects` | Find the project board |
| `github_get_issue_node_id` | Get GraphQL node ID for project ops |
| `github_add_issue_to_project` | Add issue to a project board |
| `github_get_project_status_field` | Get Status column options |
| `github_list_project_items` | Find the item on the board |
| `github_move_project_item` | Move item to "In Review" or "Done" |
| `github_get_repo` | Confirm repository configuration |

## GitHub Actions Automation

This project has three GitHub Actions workflows for automated bug ticketing and fixing:

### 1. CI Tests (`ci-tests.yml`)
- Runs on every push/PR to main and daily at 6 AM UTC
- Runs all Jest tests with the QA reporter
- When `QA_AUTO_FILE=true` (on schedule/main branch), auto-files GitHub issues for test failures
- Test results are uploaded as artifacts

### 2. OpenCode Agent (`opencode-agent.yml`)
- Triggers when someone comments `/opencode fix this` on an issue
- OpenCode reads the issue, creates a fix branch, implements the fix, and opens a PR
- Also triggers on `/opencode explain this` to analyze issues
- **Requires:** `ANTHROPIC_API_KEY` secret in GitHub

### 3. Manual Bug Fix (`bug-fix-manual.yml`)
- Triggered manually via GitHub Actions UI (`workflow_dispatch`)
- Takes an issue number as input
- Fetches the issue details and runs OpenCode to fix it
- Creates a branch + PR automatically

### Required GitHub Secrets
| Secret | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | LLM provider for OpenCode auto-fixing |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions (has write permissions) |

### How to Use

**Auto-fix an issue via comment:**
> Comment `/opencode fix this` on any GitHub issue

**Manual fix from Actions tab:**
> Go to Actions → Bug Fix - Manual Trigger → Run workflow → Enter issue number

## Enabling the Agent

### 1. Prerequisites

Already set up if `qa-tester` works:
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Make sure the token has `repo` scope (needed for PR creation and project access).

### 2. MCP server

Already registered in `.mcp.json` as `qa-bug-ticketing`.

### 3. Invoke this skill

Use the `skill` tool with `bug-fixer` when you need to fix a filed bug.

### 4. Example prompt

> "Fix issue #3 — the SQL injection vulnerability in the login endpoint."
>
> "Read issue #5 and implement the fix. Create a PR and move it to In Review."
