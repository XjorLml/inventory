"use client";

import { useState, useCallback, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SORT_OPTIONS = [
  { label: "Name A–Z", value: "name-asc" },
  { label: "Name Z–A", value: "name-desc" },
  { label: "Qty Low–High", value: "qty-asc" },
  { label: "Qty High–Low", value: "qty-desc" },
]

export default function HomeClient({ products, categories }) {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [adjusting, setAdjusting] = useState(null);
  const [newQty, setNewQty] = useState(0);
  const [sort, setSort] = useState("name-asc");
  const [refreshing, setRefreshing] = useState(false);
  const touchStart = useRef(0)
  const pulling = useRef(false)

  // Count per category
  const categoryCounts = {}
  for (const p of products) {
    const name = p.categories?.name ?? 'Uncategorized'
    categoryCounts[name] = (categoryCounts[name] || 0) + 1
  }

  // Filter by selected category
  const filtered =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.categories?.name === activeCategory);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "name-desc": return b.name.localeCompare(a.name)
      case "qty-asc": return a.quantity - b.quantity
      case "qty-desc": return b.quantity - a.quantity
      default: return a.name.localeCompare(b.name)
    }
  })

  // Pull-to-refresh
  const handleTouchStart = useCallback((e) => {
    if (window.scrollY > 0) return
    touchStart.current = e.touches[0].clientY
    pulling.current = false
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (window.scrollY > 0) return
    const diff = e.touches[0].clientY - touchStart.current
    if (diff > 0) {
      pulling.current = true
      if (diff > 80) {
        setRefreshing(true)
      }
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (pulling.current && refreshing) {
      router.refresh()
    }
    setRefreshing(false)
    pulling.current = false
  }, [refreshing, router])

  // Open adjust dialog
  const openAdjust = (product) => {
    setAdjusting(product);
    setNewQty(product.quantity);
  };

  // Save adjusted quantity
  const handleSaveQty = async () => {
    await supabase
      .from("products")
      .update({ quantity: Number(newQty) })
      .eq("id", adjusting.id);
    setAdjusting(null);
    router.refresh();
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div className="flex items-center justify-center py-3 text-sm text-green-600 font-medium">
          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
          </svg>
          Refreshing…
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Stock List</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none text-xs border rounded-lg px-2 py-1.5 pr-6 bg-white text-zinc-600 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ArrowUpDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
          </div>
          <Badge variant="secondary">{products.length} items</Badge>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {["All", ...categories.map((c) => c.name)].map((cat) => {
          const count = cat === "All" ? products.length : (categoryCounts[cat] || 0)
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium
                whitespace-nowrap transition-colors flex items-center gap-1.5
                ${
                  activeCategory === cat
                    ? "bg-green-600 text-white"
                    : "bg-white text-zinc-500 border"
                }
              `}
            >
              {cat}
              <span className={`text-[10px] ${activeCategory === cat ? 'text-green-200' : 'text-zinc-400'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="text-center py-24 text-zinc-400">
          <p className="text-5xl mb-3">📦</p>
          <p className="font-medium">No products here</p>
        </div>
      )}

      {/* Product rows */}
      <div className="flex flex-col gap-2">
        {sorted.map((product) => {
          const isLow = product.quantity <= product.low_stock_threshold;
          return (
            <div
              key={product.id}
              className={`
                bg-white rounded-xl px-4 py-3 border
                flex items-center justify-between
                ${isLow ? "border-red-200 bg-red-50" : "border-transparent"}
              `}
            >
              {/* Left — name + quantity */}
              <div>
                <p className="font-medium text-sm">{product.name}</p>
                <p
                  className={`text-xs font-semibold mt-0.5
                  ${isLow ? "text-red-500" : "text-zinc-400"}`}
                >
                  {product.quantity} {product.units?.name}
                  {isLow && " · Low Stock"}
                </p>
              </div>

              {/* Right — +/- buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (product.quantity <= 0) return;
                    await supabase
                      .from("products")
                      .update({ quantity: product.quantity - 1 })
                      .eq("id", product.id);
                    router.refresh();
                  }}
                  className="w-8 h-8 rounded-full border flex items-center justify-center text-zinc-600 font-bold hover:bg-zinc-100"
                >
                  −
                </button>

                <button
                  onClick={() => openAdjust(product)}
                  className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold hover:bg-green-700"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Adjust Quantity Dialog */}
      {adjusting && (
        <Dialog open={!!adjusting} onOpenChange={() => setAdjusting(null)}>
          <DialogContent className="max-w-sm mx-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adjust Quantity</DialogTitle>
              <p className="text-sm text-zinc-500">{adjusting.name}</p>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-2">
              {/* Big quantity control */}
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setNewQty((q) => Math.max(0, Number(q) - 1))}
                  className="w-10 h-10 rounded-full border-2 flex items-center
                             justify-center text-xl font-bold hover:bg-zinc-100"
                >
                  −
                </button>

                <div className="text-center">
                  <p className="text-4xl font-bold">{newQty}</p>
                  <p className="text-xs text-zinc-400">
                    {adjusting.units?.name}
                  </p>
                </div>

                <button
                  onClick={() => setNewQty((q) => Number(q) + 1)}
                  className="w-10 h-10 rounded-full border-2 flex items-center
                             justify-center text-xl font-bold hover:bg-zinc-100"
                >
                  +
                </button>
              </div>

              {/* Manual input */}
              <Input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="text-center w-32"
              />

              <Button
                onClick={handleSaveQty}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
