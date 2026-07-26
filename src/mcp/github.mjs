/**
 * GitHub Issues API Client for MCP Server
 *
 * Uses GitHub REST API to create and manage issues.
 * Environment variables:
 *   GITHUB_TOKEN      - Personal Access Token (classic or fine-grained with issues:write)
 *   GITHUB_OWNER      - Repository owner (user or org), defaults to 'repo' owner from git remote
 *   GITHUB_REPO       - Repository name, defaults to current repo name
 */

import { execSync } from "node:child_process";

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Try to detect the current GitHub repo from git remote.
 */
function detectRepo() {
  try {
    const origin = execSync("git remote get-url origin", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    // Handle both HTTPS and SSH formats
    const match =
      origin.match(/github\.com[:/](.+?)\/(.+?)\.git$/) ||
      origin.match(/github\.com[:/](.+?)\/(.+?)$/);

    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch {
    // Not a git repo or no remote
  }
  return null;
}

/**
 * Get auth headers for GitHub API.
 */
function authHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is required. Create one at: https://github.com/settings/tokens"
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent": "qa-bug-ticketing-mcp",
  };
}

/**
 * Resolve owner/repo from env vars or git remote detection.
 */
function resolveRepo() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (owner && repo) return `repos/${owner}/${repo}`;

  const detected = detectRepo();
  if (detected) {
    return `repos/${detected.owner}/${detected.repo}`;
  }

  // Fall back to env-based single value
  const full = process.env.GITHUB_REPO_FULL;
  if (full) return `repos/${full}`;

  throw new Error(
    "Could not determine GitHub repository. Set GITHUB_OWNER + GITHUB_REPO, " +
    "or GITHUB_REPO_FULL (e.g. 'owner/repo')."
  );
}

/**
 * Build a full GitHub API URL.
 */
function githubUrl(path) {
  return `${GITHUB_API_BASE}${path}`;
}

/**
 * Generic fetch helper with error handling.
 */
async function githubFetch(url, options = {}) {
  const headers = { ...authHeaders(), ...options.headers };
  const res = await fetch(url, { headers, ...options });
  const body = await res.json();

  if (!res.ok) {
    const msg =
      body?.message || body?.errors?.[0]?.message || JSON.stringify(body);
    throw new Error(`GitHub API error (${res.status}): ${msg}`);
  }

  return body;
}

// ─── Tool Implementations ──────────────────────────────────────────

/**
 * Search for issues by query (title, label, state).
 */
export async function searchIssues({ query, state = "open", labels, perPage = 20 }) {
  const repo = resolveRepo();

  // Build a search query
  const q = [`repo:${repo.replace("repos/", "")}`];
  if (query) q.push(query);
  if (state) q.push(`state:${state}`);
  if (labels?.length) q.push(`label:${labels.map(l => `"${l}"`).join(",")}`);

  const url = githubUrl(
    `/search/issues?q=${encodeURIComponent(q.join(" "))}&per_page=${perPage}`
  );
  return githubFetch(url);
}

/**
 * Create a new issue.
 */
export async function createIssue({ title, body, labels, assignees }) {
  const repo = resolveRepo();
  if (!title) throw new Error("Issue title is required");

  const payload = { title };
  if (body) payload.body = body;
  if (labels?.length) payload.labels = labels;
  if (assignees?.length) payload.assignees = assignees;

  const url = githubUrl(`/${repo}/issues`);
  return githubFetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Add a comment to an existing issue.
 */
export async function addComment({ issueNumber, body }) {
  const repo = resolveRepo();
  if (!issueNumber) throw new Error("issueNumber is required");
  if (!body) throw new Error("Comment body is required");

  const url = githubUrl(`/${repo}/issues/${issueNumber}/comments`);
  return githubFetch(url, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

/**
 * Get issue details.
 */
export async function getIssue({ issueNumber }) {
  const repo = resolveRepo();
  if (!issueNumber) throw new Error("issueNumber is required");

  const url = githubUrl(`/${repo}/issues/${issueNumber}`);
  return githubFetch(url);
}

/**
 * Update an issue (change title, body, state, labels, assignees).
 */
export async function updateIssue({ issueNumber, ...fields }) {
  const repo = resolveRepo();
  if (!issueNumber) throw new Error("issueNumber is required");

  const url = githubUrl(`/${repo}/issues/${issueNumber}`);
  return githubFetch(url, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

/**
 * List all labels in the repository.
 */
export async function getLabels() {
  const repo = resolveRepo();
  const url = githubUrl(`/${repo}/labels?per_page=100`);
  return githubFetch(url);
}

/**
 * List all issues in the repository (no search indexing delay).
 * Use this for real-time dedup instead of searchIssues.
 */
export async function listIssues({ state = "open", labels, perPage = 100 } = {}) {
  const repo = resolveRepo();
  let url = githubUrl(`/${repo}/issues?state=${state}&per_page=${perPage}&sort=updated&direction=desc`);
  if (labels?.length) url += `&labels=${encodeURIComponent(labels.join(","))}`;
  return githubFetch(url);
}

/**
 * Check if an issue with the given fingerprint already exists (local dedup).
 * Searches issue bodies directly — no search indexing delay.
 */
export async function findByFingerprint({ fingerprint, state = "open" }) {
  if (!fingerprint) throw new Error("fingerprint is required");

  const issues = await listIssues({ state, perPage: 100 });
  return issues.find((i) => (i.body || "").includes(fingerprint)) || null;
}

/**
 * Get repository info.
 */
export async function getRepo() {
  const repo = resolveRepo();
  const url = githubUrl(`/${repo}`);
  return githubFetch(url);
}

/**
 * List milestones in the repository.
 */
export async function getMilestones({ state = "open" } = {}) {
  const repo = resolveRepo();
  const url = githubUrl(`/${repo}/milestones?state=${state}&per_page=100`);
  return githubFetch(url);
}

// ─── Pull Requests ──────────────────────────────────────────────────

/**
 * Create a pull request.
 */
export async function createPullRequest({ title, body, head, base = "main", draft = false }) {
  const repo = resolveRepo();
  if (!title) throw new Error("PR title is required");
  if (!head) throw new Error("head branch is required");

  const url = githubUrl(`/${repo}/pulls`);
  return githubFetch(url, {
    method: "POST",
    body: JSON.stringify({ title, body, head, base, draft }),
  });
}

/**
 * List pull requests.
 */
export async function listPullRequests({ state = "open", perPage = 100 } = {}) {
  const repo = resolveRepo();
  const url = githubUrl(`/${repo}/pulls?state=${state}&per_page=${perPage}`);
  return githubFetch(url);
}

/**
 * Get a pull request by number.
 */
export async function getPullRequest({ prNumber }) {
  const repo = resolveRepo();
  if (!prNumber) throw new Error("prNumber is required");
  const url = githubUrl(`/${repo}/pulls/${prNumber}`);
  return githubFetch(url);
}

/**
 * Merge a pull request.
 */
export async function mergePullRequest({ prNumber, commitTitle, mergeMethod = "squash" }) {
  const repo = resolveRepo();
  if (!prNumber) throw new Error("prNumber is required");
  const url = githubUrl(`/${repo}/pulls/${prNumber}/merge`);
  return githubFetch(url, {
    method: "PUT",
    body: JSON.stringify({ commit_title: commitTitle, merge_method: mergeMethod }),
  });
}

// ─── GitHub Projects v2 (GraphQL) ───────────────────────────────────

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

/**
 * Execute a GraphQL query against the GitHub API.
 */
function graphqlHeaders() {
  return {
    ...authHeaders(),
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

async function graphql(query, variables = {}) {
  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: graphqlHeaders(),
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) {
    const msgs = body.errors.map((e) => e.message).join("; ");
    throw new Error(`GitHub GraphQL error: ${msgs}`);
  }
  return body.data;
}

/**
 * Get the owner (user or org) from the resolved repo.
 */
function getOwner() {
  const repo = resolveRepo(); // e.g. "repos/owner/repo"
  return repo.split("/")[1];
}

/**
 * List projects (v2) for the repository's owner (user or org).
 * Uses two independent queries to handle user vs org owners gracefully.
 */
export async function listProjects({ perPage = 20 } = {}) {
  const owner = getOwner();
  const projects = [];

  // Try user query
  try {
    const userQuery = `
      query($owner: String!, $first: Int!) {
        user(login: $owner) {
          projectsV2(first: $first) {
            nodes { id title url closed }
          }
        }
      }
    `;
    const userData = await graphql(userQuery, { owner, first: perPage });
    const userProjects = userData.user?.projectsV2?.nodes || [];
    projects.push(...userProjects);
  } catch { /* not a user — skip */ }

  // Try org query
  try {
    const orgQuery = `
      query($owner: String!, $first: Int!) {
        organization(login: $owner) {
          projectsV2(first: $first) {
            nodes { id title url closed }
          }
        }
      }
    `;
    const orgData = await graphql(orgQuery, { owner, first: perPage });
    const orgProjects = orgData.organization?.projectsV2?.nodes || [];
    projects.push(...orgProjects);
  } catch { /* not an org — skip */ }

  return projects;
}

/**
 * Find a project by title (returns the first match).
 */
export async function findProject({ title }) {
  if (!title) throw new Error("Project title is required");
  const projects = await listProjects({ perPage: 50 });
  const match = projects.find((p) => p.title.toLowerCase() === title.toLowerCase());
  return match || null;
}

/**
 * Add an issue to a project board.
 */
export async function addIssueToProject({ projectId, issueId }) {
  if (!projectId) throw new Error("projectId is required");
  if (!issueId) throw new Error("issueId is required (node ID, not number)");

  const mutation = `
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }
  `;

  const data = await graphql(mutation, { projectId, contentId: issueId });
  return data.addProjectV2ItemById.item;
}

/**
 * Get the node ID of an issue (needed for addIssueToProject).
 */
export async function getIssueNodeId({ issueNumber }) {
  const repo = resolveRepo();
  const owner = repo.split("/")[1];
  const name = repo.split("/")[2];

  const query = `
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) { id }
      }
    }
  `;

  const data = await graphql(query, { owner, repo: name, number: issueNumber });
  return data.repository?.issue?.id || null;
}

/**
 * Get the Status field ID and options for a project.
 */
export async function getProjectStatusField({ projectId }) {
  if (!projectId) throw new Error("projectId is required");

  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id name options { id name }
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphql(query, { projectId });
  const fields = data.node?.fields?.nodes || [];
  // Find the Status field
  return fields.find((f) => f.name === "Status") || fields[0] || null;
}

/**
 * Update the status of a project item (move between columns).
 */
export async function updateProjectItemStatus({ projectId, itemId, fieldId, singleSelectOptionId }) {
  if (!projectId) throw new Error("projectId is required");
  if (!itemId) throw new Error("itemId is required");
  if (!fieldId) throw new Error("fieldId is required");
  if (!singleSelectOptionId) throw new Error("singleSelectOptionId is required");

  const mutation = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(
        input: { projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: $value }
      ) { projectV2Item { id } }
    }
  `;

  const data = await graphql(mutation, {
    projectId,
    itemId,
    fieldId,
    value: { singleSelectOptionId },
  });

  return data.updateProjectV2ItemFieldValue.projectV2Item;
}

/**
 * List items on a project board with their status.
 */
export async function listProjectItems({ projectId, perPage = 50 }) {
  if (!projectId) throw new Error("projectId is required");

  const query = `
    query($projectId: ID!, $first: Int!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: $first) {
            nodes {
              id
              content {
                ... on Issue {
                  number title url state
                }
                ... on PullRequest {
                  number title url state
                }
              }
              fieldValues(first: 10) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name field { ... on ProjectV2SingleSelectField { name } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphql(query, { projectId, first: perPage });
  return data.node?.items?.nodes || [];
}
