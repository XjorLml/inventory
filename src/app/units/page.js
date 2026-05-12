import { createSupabaseServer } from "@/lib/supabase/server";
import UnitsClient from "@/components/settings/UnitsClient";

export default async function UnitsPage() {
  const supabase = await createSupabaseServer();
  const { data: units } = await supabase
    .from("units")
    .select("*")
    .order("name");

  return <UnitsClient units={units ?? []} />;
}
