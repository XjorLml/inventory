import { createSupabaseServer } from "@/lib/supabase/server";
import ProductsClient from "@/components/settings/ProductsClient";

export default async function ProductsPage() {
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
    <ProductsClient
      products={products ?? []}
      categories={categories ?? []}
      units={units ?? []}
    />
  );
}
