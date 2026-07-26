"use server";

/**
 * QA Bug Filing — Server Actions
 *
 * These actions run server-side and have access to GITHUB_TOKEN.
 */

import { createHash } from "node:crypto";

// ─── Helpers ───────────────────────────────────────────────────────

function getGitHubToken() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");
  return token;
}

function getRepo() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (owner && repo) return { owner, repo };
  return { owner: "XjorLml", repo: "inventory" };
}

function generateFingerprint(testName, stackTrace) {
  const firstFrame = (stackTrace || "").split("\n").find(
    (l) => l.includes("at ") && !l.includes("node_modules")
  ) || "no-stack";
  return createHash("sha256")
    .update(`${testName}|${firstFrame.trim()}`)
    .digest("hex")
    .slice(0, 16);
}

async function githubFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getGitHubToken()}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "inventory-app",
    },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.message || `GitHub API error (${res.status})`);
  return body;
}

// ─── Actions ───────────────────────────────────────────────────────

/**
 * Search for existing bugs by fingerprint (dedup).
 */
export async function searchByFingerprint(fingerprint) {
  const { owner, repo } = getRepo();
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`;
  const issues = await githubFetch(url);
  return issues.find((i) => (i.body || "").includes(fingerprint)) || null;
}

/**
 * File a new bug report as a GitHub issue.
 */
export async function fileBugReport(formData) {
  const title = formData.get("title");
  const description = formData.get("description");
  const steps = formData.get("steps");
  const expected = formData.get("expected");
  const actual = formData.get("actual");
  const environment = formData.get("environment") || "Browser: Unknown";
  const logs = formData.get("logs") || "";

  if (!title || !description) {
    return { error: "Title and description are required." };
  }

  const fingerprint = generateFingerprint(title, "");

  try {
    // Step 1: Dedup check
    const existing = await searchByFingerprint(fingerprint);
    if (existing) {
      return {
        duplicate: true,
        issueUrl: existing.html_url,
        issueNumber: existing.number,
        message: "This bug has already been reported.",
      };
    }

    // Step 2: Build issue body
    const body = [
      "## Bug Report (Manual QA)",
      "",
      `**Fingerprint:** \`${fingerprint}\``,
      `**Reported by:** Manual QA`,
      `**Date:** ${new Date().toISOString().split("T")[0]}`,
      "",
      "### Description",
      description,
      "",
      "### Steps to Reproduce",
      steps || "N/A",
      "",
      "### Expected",
      expected || "N/A",
      "",
      "### Actual",
      actual || "N/A",
      "",
      "### Environment",
      environment,
    ];

    if (logs) {
      body.push("", "### Logs", "```", logs, "```");
    }

    // Step 3: Create issue
    const { owner, repo } = getRepo();
    const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
    const issue = await githubFetch(url, {
      method: "POST",
      body: JSON.stringify({
        title: `[Bug] ${title}`,
        body: body.join("\n"),
        labels: ["bug", "manual-qa"],
      }),
    });

    return {
      success: true,
      issueUrl: issue.html_url,
      issueNumber: issue.number,
    };
  } catch (err) {
    return { error: err.message };
  }
}
