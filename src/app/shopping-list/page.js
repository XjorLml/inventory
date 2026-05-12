import { createSupabaseServer } from "@/lib/supabase/server";
import ShoppingListClient from "@/components/ShoppingListClient";

export default async function ShoppingListPage() {
  const supabase = await createSupabaseServer();
  const { data: products } = await supabase
    .from("products")
    .select("*, categories(name), units(name)")
    .order("quantity", { ascending: true });

  const lowStock = (products ?? []).filter(
    (p) => p.quantity <= p.low_stock_threshold,
  );

  return <ShoppingListClient products={lowStock} />;
}
