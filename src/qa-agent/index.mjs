#!/usr/bin/env node

/**
 * QA Agent Orchestrator
 *
 * Processes structured test failure input and files bug tickets in GitHub Issues
 * using the qa-bug-ticketing MCP server.
 *
 * Usage:
 *   node src/qa-agent/index.mjs --input test-failures.json
 *
 * Input JSON format (array of failures):
 * [
 *   {
 *     "testName": "Component should render",
 *     "filePath": "src/components/Button.test.jsx",
 *     "errorMessage": "Expected true to be false",
 *     "stackTrace": "    at Object.<anonymous> ...",
 *     "environment": "Node v24, CI build #1234",
 *     "commitSha": "abc123def456",
 *     "stepsToReproduce": ["Render component with propX=false", "Click submit"],
 *     "screenshots": [],
 *     "logs": ""
 *   }
 * ]
 */

import "../lib/load-env.mjs";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// ─── Helpers ───────────────────────────────────────────────────────

function generateFingerprint(testName, stackTrace) {
  const firstFrame = (stackTrace || "").split("\n").find(
    (l) => l.includes("at ") && !l.includes("node_modules")
  ) || "no-stack";
  const hash = crypto
    .createHash("sha256")
    .update(`${testName}|${firstFrame.trim()}`)
    .digest("hex")
    .slice(0, 16);
  return hash;
}

function determinePriority(errorMessage) {
  const msg = (errorMessage || "").toLowerCase();
  if (msg.includes("crash") || msg.includes("500") || msg.includes("timeout") || msg.includes("segfault")) return "high";
  if (msg.includes("assertion") || msg.includes("expected") || msg.includes("to be")) return "high";
  if (msg.includes("visual") || msg.includes("snapshot") || msg.includes("style")) return "medium";
  if (msg.includes("warn") || msg.includes("deprecat")) return "low";
  return "medium";
}

function buildDescription(failure, fingerprint) {
  const lines = [
    `## Bug Report (Auto-filed)`,
    ``,
    `**Fingerprint:** \`${fingerprint}\``,
    `**Test:** ${failure.testName}`,
    `**File:** ${failure.filePath}`,
    `**Environment:** ${failure.environment || "N/A"}`,
    `**Commit:** ${failure.commitSha || "N/A"}`,
    `**Date:** ${new Date().toISOString().split("T")[0]}`,
    ``,
    `### Steps to Reproduce`,
  ];

  if (failure.stepsToReproduce?.length) {
    failure.stepsToReproduce.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  } else {
    lines.push("Run the failing test.");
  }

  lines.push(
    ``,
    `### Error`,
    "```",
    failure.errorMessage || "No error message",
    "```",
    ``,
    `### Stack Trace`,
    "```",
    failure.stackTrace || "No stack trace",
    "```",
  );

  if (failure.logs) {
    lines.push(``, `### Logs`, "```", failure.logs, "```");
  }

  return lines.join("\n");
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input");
  let failures = [];

  if (inputIndex !== -1 && args[inputIndex + 1]) {
    const inputPath = path.resolve(args[inputIndex + 1]);
    const raw = await fs.readFile(inputPath, "utf-8");
    failures = JSON.parse(raw);
  } else {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf-8");
    try {
      failures = JSON.parse(raw);
    } catch {
      console.error("No valid JSON input provided. Use --input <file> or pipe JSON to stdin.");
      process.exit(1);
    }
  }

  if (!Array.isArray(failures) || failures.length === 0) {
    console.error("No test failures to process.");
    process.exit(0);
  }

  // GitHub Issues is the only supported ticketing system
  const useGitHub = !!process.env.GITHUB_TOKEN;

  if (!useGitHub) {
    console.error(
      "GITHUB_TOKEN is not set.\n" +
      "  Create one at: https://github.com/settings/tokens (needs issues:write scope)"
    );
    process.exit(1);
  }

  console.log(`Processing ${failures.length} test failure(s)...`);
  console.log("Ticketing system: GitHub Issues");
  console.log("");

  for (const failure of failures) {
    const fingerprint = generateFingerprint(failure.testName, failure.stackTrace);
    const ticketTitle = `[Bug] ${failure.testName} - ${(failure.errorMessage || "").slice(0, 80)}`;
    const description = buildDescription(failure, fingerprint);
    const priority = determinePriority(failure.errorMessage);

    console.log(`---`);
    console.log(`Test: ${failure.testName}`);
    console.log(`Fingerprint: ${fingerprint}`);
    console.log(`Priority: ${priority}`);
    console.log(`Title: ${ticketTitle}`);
    console.log(``);

    console.log(`→ Would file in GitHub Issues (agent will call MCP tools: github_search_issues, github_create_issue)`);

    console.log(``);
  }

  // Output structured summary for downstream agent consumption
  const summary = failures.map((f) => ({
    testName: f.testName,
    fingerprint: generateFingerprint(f.testName, f.stackTrace),
    priority: determinePriority(f.errorMessage),
    title: `[Bug] ${f.testName} - ${(f.errorMessage || "").slice(0, 80)}`,
    description: buildDescription(f, generateFingerprint(f.testName, f.stackTrace)),
    environment: f.environment || "N/A",
    commitSha: f.commitSha || "N/A",
  }));

  console.log("=== SUMMARY (JSON) ===");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error("QA Agent error:", err);
  process.exit(1);
});
