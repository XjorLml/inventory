/**
 * QA Agent Jest Reporter
 *
 * A custom Jest reporter that captures test failures in structured JSON format
 * consumable by the QA agent (src/qa-agent/index.mjs).
 *
 * Usage in jest.config.js:
 *
 *   reporters: [
 *     "default",
 *     ["./src/qa-agent/jest-reporter.mjs", {
 *       outputFile: "test-failures.json",     // optional: where to write failures
 *       environment: process.env.NODE_ENV,     // optional: context info
 *       commitSha: process.env.COMMIT_SHA,     // optional: git commit
 *       autoFile: false,                        // optional: auto-file tickets (requires env vars)
 *     }]
 *   ]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class QaAgentJestReporter {
  /**
   * @param {import("@jest/reporters").GlobalConfig} globalConfig
   * @param {object} reporterOptions
   */
  constructor(globalConfig, reporterOptions = {}) {
    this._globalConfig = globalConfig;
    this._options = reporterOptions;
    this._failures = [];
  }

  /**
   * Called when a test file completes.
   * @param {import("@jest/reporters").Test} test
   * @param {import("@jest/reporters").TestResult} testResult
   */
  onTestFileResult(test, testResult) {
    if (!testResult.numFailingTests) return;

    const filePath = path.relative(this._globalConfig.rootDir || process.cwd(), test.path);

    for (const assertionResult of testResult.testResults) {
      if (assertionResult.status !== "failed") continue;

      const failureMessage = assertionResult.failureMessages?.[0] || "";
      const [errorMessage, ...stackLines] = failureMessage.split("\n");

      this._failures.push({
        testName: assertionResult.fullName || assertionResult.title,
        filePath,
        errorMessage: errorMessage || assertionResult.failureMessages?.[0] || "Unknown error",
        stackTrace: failureMessage,
        environment: this._options.environment || process.env.NODE_ENV || "development",
        commitSha: this._options.commitSha || process.env.COMMIT_SHA || "unknown",
        stepsToReproduce: [
          `Run tests in ${filePath}`,
          `Test: ${assertionResult.fullName || assertionResult.title}`,
        ],
        logs: "",
        screenshots: [],
      });
    }
  }

  /**
   * Called when the entire test run finishes.
   * @param {import("@jest/reporters").AggregatedResult} aggregatedResult
   */
  async onRunComplete(_, aggregatedResult) {
    if (this._failures.length === 0) return;

    const outputFile = this._options.outputFile || "test-failures.json";
    const outputPath = path.resolve(this._globalConfig.rootDir || process.cwd(), outputFile);

    // Write failures to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(this._failures, null, 2), "utf-8");
    console.error(`\n[QA Agent] ${this._failures.length} test failure(s) written to ${outputPath}`);

    // Auto-file tickets if enabled AND environment variables are set
    if (this._options.autoFile) {
      if (!process.env.GITHUB_TOKEN) {
        console.error(
          "[QA Agent] Auto-filing enabled but GITHUB_TOKEN is not set.\n" +
          "  Create one at: https://github.com/settings/tokens (needs issues:write scope)"
        );
        return;
      }

      try {
        // Write to temp file and invoke the QA agent
        const tempFile = outputPath + ".tmp";
        fs.writeFileSync(tempFile, JSON.stringify(this._failures, null, 2), "utf-8");

        const { spawnSync } = await import("node:child_process");
        const result = spawnSync("node", [
          path.resolve(__dirname, "index.mjs"),
          "--input", tempFile,
        ], {
          stdio: "inherit",
          env: process.env,
        });

        if (result.status !== 0) {
          console.error(`[QA Agent] Process exited with code ${result.status}`);
        }

        // Cleanup
        try { fs.unlinkSync(tempFile); } catch {}
      } catch (err) {
        console.error(`[QA Agent] Error auto-filing tickets: ${err.message}`);
      }
    }
  }
}

export default QaAgentJestReporter;
