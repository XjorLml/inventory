import { createSupabaseClient } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

// GET /api/health
// Lightweight, unauthenticated endpoint that touches the database
// to keep Supabase free-tier from pausing due to inactivity.
export async function GET() {
  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from("products")
      .select("id", { head: true, count: "exact" });

    if (error) {
      return NextResponse.json(
        { status: "error", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ status: "ok" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 },
    );
  }
}
