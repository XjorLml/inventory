import { createSupabaseServer } from "@/lib/supabase/server";
import CategoriesClient from "@/components/settings/CategoriesClient";

export default async function CategoriesPage() {
  const supabase = await createSupabaseServer();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  return <CategoriesClient categories={categories ?? []} />;
}
