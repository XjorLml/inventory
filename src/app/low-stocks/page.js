import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function LowStockPage() {
  const supabase = await createSupabaseServer();
  const { data: products, error } = await supabase
    .from("products")
    .select("*, categories(name), units(name)")
    .order("quantity", { ascending: true });

  if (error) return <p className="text-red-500">Error: {error.message}</p>;

  const lowStock = products.filter((p) => p.quantity <= p.low_stock_threshold);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Low Stock</h2>
        <Badge variant="destructive">{lowStock.length} items</Badge>
      </div>

      {/* Empty state — good news */}
      {lowStock.length === 0 && (
        <div className="text-center py-24 text-zinc-400">
          <p className="text-5xl mb-3">✅</p>
          <p className="font-medium">All items are well stocked</p>
          <p className="text-sm mt-1">Nothing to restock right now</p>
        </div>
      )}

      {/* Low stock cards */}
      <div className="flex flex-col gap-3">
        {lowStock.map((product) => (
          <div
            key={product.id}
            className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"
          >
            {/* Top row */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-semibold text-sm">{product.name}</p>
              </div>
              <Badge variant="destructive" className="text-xs">
                Low Stock
              </Badge>
            </div>

            {/* Details */}
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
              <span>🏷️ {product.categories?.name ?? "—"}</span>
              <span>·</span>
              <span className="font-semibold text-red-500">
                {product.quantity} {product.units?.name ?? ""}
              </span>
              <span>·</span>
              <span>Min: {product.low_stock_threshold}</span>
            </div>

            {/* Restock shortcut */}
            <Link href="/products">
              <button
                className="w-full text-xs border border-red-300
                                 text-red-600 rounded-lg py-2 font-medium
                                 hover:bg-red-100 transition-colors"
              >
                ➕ Restock via Products
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
