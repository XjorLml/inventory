"use client";

import { useState } from "react";
import { fileBugReport } from "@/app/qa/actions";
import { Bug, Check, Copy, ExternalLink, Loader2 } from "lucide-react";

export default function ReportBugForm() {
  const [status, setStatus] = useState("idle"); // idle | loading | success | duplicate | error
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");

    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await fileBugReport(formData);

    if (res.error) {
      setStatus("error");
      setResult(res);
    } else if (res.duplicate) {
      setStatus("duplicate");
      setResult(res);
    } else if (res.success) {
      setStatus("success");
      setResult(res);
      form.reset();
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
  }

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="font-bold text-green-800 mb-1">Bug Filed!</h3>
        <p className="text-sm text-green-600 mb-4">
          Issue #{result.issueNumber} created.
        </p>
        <div className="flex gap-2 justify-center">
          <a
            href={result.issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
          >
            <ExternalLink className="w-4 h-4" />
            View on GitHub
          </a>
          <button
            onClick={reset}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-zinc-50"
          >
            Report Another
          </button>
        </div>
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Copy className="w-6 h-6 text-amber-600" />
        </div>
        <h3 className="font-bold text-amber-800 mb-1">Duplicate Found</h3>
        <p className="text-sm text-amber-600 mb-4">
          This bug is already reported as issue #{result.issueNumber}.
        </p>
        <div className="flex gap-2 justify-center">
          <a
            href={result.issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
          >
            <ExternalLink className="w-4 h-4" />
            View Existing Issue
          </a>
          <button
            onClick={reset}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-zinc-50"
          >
            Report Different Bug
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Bug Title *
        </label>
        <input
          name="title"
          required
          placeholder="e.g. Login form crashes on invalid email"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Description *
        </label>
        <textarea
          name="description"
          required
          rows={3}
          placeholder="What happened? What did you expect?"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Steps to Reproduce */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Steps to Reproduce
        </label>
        <textarea
          name="steps"
          rows={3}
          placeholder="1. Go to ...\n2. Click on ...\n3. See error"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Expected vs Actual */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Expected
          </label>
          <input
            name="expected"
            placeholder="What should happen"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Actual
          </label>
          <input
            name="actual"
            placeholder="What actually happened"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Environment */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Environment
        </label>
        <input
          name="environment"
          defaultValue={`${typeof navigator !== "undefined" ? navigator.userAgent : "Unknown"}`}
          placeholder="Browser, OS, device"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Logs */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Console Logs / Error Messages
        </label>
        <textarea
          name="logs"
          rows={3}
          placeholder="Paste any relevant error messages or console output..."
          className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Filing Bug...
          </>
        ) : (
          <>
            <Bug className="w-4 h-4" />
            Report Bug on GitHub
          </>
        )}
      </button>

      {status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {result?.error || "Something went wrong. Try again."}
        </div>
      )}
    </form>
  );
}
