import ReportBugForm from "@/components/qa/ReportBugForm";
import { Bug } from "lucide-react";

export const metadata = {
  title: "Report a Bug — QA",
  description: "Manually file a bug report as a GitHub issue.",
};

export default function QAPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
          <Bug className="w-4 h-4 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Report a Bug</h2>
          <p className="text-sm text-zinc-500">
            Files directly to GitHub Issues — dedup checked automatically.
          </p>
        </div>
      </div>

      <ReportBugForm />

      <p className="text-xs text-zinc-400 mt-6 text-center">
        Bugs are filed to{" "}
        <code className="bg-zinc-100 px-1 rounded">XjorLml/inventory</code>{" "}
        with labels <code className="bg-zinc-100 px-1 rounded">bug</code> and{" "}
        <code className="bg-zinc-100 px-1 rounded">manual-qa</code>.
      </p>
    </div>
  );
}
