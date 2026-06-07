import { createSupabaseServer } from "@/lib/supabase/server";
import SettingsClient from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServer();
  const [{ data: products }, { data: categories }, { data: units }] =
    await Promise.all([
      supabase
        .from("products")
        .select("*, categories(name), units(name)")
        .order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("units").select("*").order("name"),
    ]);

  return (
    <SettingsClient
      products={products ?? []}
      categories={categories ?? []}
      units={units ?? []}
    />
  );
}
