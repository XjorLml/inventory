/**
 * Environment Variable Loader
 *
 * Loads .env.local for standalone Node.js scripts (MCP server, QA agent).
 * Next.js auto-loads .env.local for the web app, but standalone scripts need help.
 *
 * Usage:
 *   import "./load-env.mjs";  // at the top of your entry point
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import fs from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

// Try .env.local first, then .env
const candidates = [".env.local", ".env"];

for (const file of candidates) {
  const fullPath = resolve(root, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      // Only set if not already set (allows OS env vars to take precedence)
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    break;
  }
}
