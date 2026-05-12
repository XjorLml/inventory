'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function HomeClient({ products, categories }) {
    const supabase = createSupabaseClient()
    const router = useRouter()
    const [activeCategory, setActiveCategory] = useState('All')
    const [adjusting, setAdjusting] = useState(null)
    const [newQty, setNewQty] = useState(0)

  // Filter by selected category
  const filtered = activeCategory === 'All'
    ? products
    : products.filter(p => p.categories?.name === activeCategory)

  // Open adjust dialog
  const openAdjust = (product) => {
    setAdjusting(product)
    setNewQty(product.quantity)
  }

  // Save adjusted quantity
  const handleSaveQty = async () => {
    await supabase
      .from('products')
      .update({ quantity: Number(newQty) })
      .eq('id', adjusting.id)
    setAdjusting(null)
    router.refresh()
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Stock List</h2>
        <Badge variant="secondary">{products.length} items</Badge>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {['All', ...categories.map(c => c.name)].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`
              px-3 py-1 rounded-full text-xs font-medium
              whitespace-nowrap transition-colors
              ${activeCategory === cat
                ? 'bg-green-600 text-white'
                : 'bg-white text-zinc-500 border'
              }
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-24 text-zinc-400">
          <p className="text-5xl mb-3">📦</p>
          <p className="font-medium">No products here</p>
        </div>
      )}

      {/* Product rows */}
      <div className="flex flex-col gap-2">
        {filtered.map(product => {
          const isLow = product.quantity <= product.low_stock_threshold
          return (
            <div
              key={product.id}
              className={`
                bg-white rounded-xl px-4 py-3 border
                flex items-center justify-between
                ${isLow ? 'border-red-200 bg-red-50' : 'border-transparent'}
              `}
            >
              {/* Left — name + quantity */}
              <div>
                <p className="font-medium text-sm">{product.name}</p>
                <p className={`text-xs font-semibold mt-0.5
                  ${isLow ? 'text-red-500' : 'text-zinc-400'}`}>
                  {product.quantity} {product.units?.name}
                  {isLow && ' · Low Stock'}
                </p>
              </div>

              {/* Right — +/- buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (product.quantity <= 0) return          
                    await supabase.from('products')
                    .update({ quantity: product.quantity - 1 })
                    .eq('id', product.id)
                    router.refresh()
                  }}
                  className="w-8 h-8 rounded-full border flex items-center justify-center text-zinc-600 font-bold hover:bg-zinc-100"
                >
                  −
                </button>

                <button
                  onClick={() => openAdjust(product)}
                  className="w-8 h-8 rounded-full bg-green-600 text-white
                             flex items-center justify-center font-bold
                             hover:bg-green-700"
                >
                  +
                </button>
              </div>
            </div>
          )
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
                  onClick={() => setNewQty(q => Math.max(0, Number(q) - 1))}
                  className="w-10 h-10 rounded-full border-2 flex items-center
                             justify-center text-xl font-bold hover:bg-zinc-100"
                >
                  −
                </button>

                <div className="text-center">
                  <p className="text-4xl font-bold">{newQty}</p>
                  <p className="text-xs text-zinc-400">{adjusting.units?.name}</p>
                </div>

                <button
                  onClick={() => setNewQty(q => Number(q) + 1)}
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
                onChange={e => setNewQty(e.target.value)}
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
  )
}