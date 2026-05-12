import { createSupabaseServer } from "@/lib/supabase/server";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const supabase = await createSupabaseServer();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*, categories(name), units(name)")
      .order("name"),
    supabase.from("categories").select("*").order("name"),
  ]);
  return (
    <HomeClient
      products={(products ?? []).filter(Boolean)}
      categories={(categories ?? []).filter(Boolean)}
    />
  );
}
