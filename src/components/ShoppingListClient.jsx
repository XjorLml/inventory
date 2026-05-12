'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ShoppingListClient({ products }) {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [restocking, setRestocking] = useState(null)
  const [qty, setQty] = useState('')

  const handleRestock = async (product) => {
    const newQty = product.quantity + Number(qty)
    await supabase
      .from('products')
      .update({ quantity: newQty })
      .eq('id', product.id)
    setRestocking(null)
    setQty('')
    router.refresh()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Shopping List</h2>
        <Badge variant="destructive">{products.length} items</Badge>
      </div>

      {/* All stocked */}
      {products.length === 0 && (
        <div className="text-center py-24 text-zinc-400">
          <p className="text-5xl mb-3">✅</p>
          <p className="font-medium">All stocked up!</p>
          <p className="text-sm mt-1">Nothing needs restocking</p>
        </div>
      )}

      {/* Low stock items */}
      <div className="flex flex-col gap-3">
        {products.map(product => (
          <div
            key={product.id}
            className="bg-white rounded-xl border border-zinc-100 px-4 py-3"
          >
            {/* Top row */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-sm">{product.name}</p>
                <p className="text-xs text-zinc-400">
                  {product.categories?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-red-500">
                  {product.quantity} {product.units?.name}
                </p>
                <p className="text-xs text-zinc-400">
                  Current
                </p>
              </div>
            </div>

            {/* Restock input */}
            {restocking?.id === product.id ? (
              <div className="flex gap-2 mt-2">
                <Input
                  type="number"
                  placeholder="Add quantity"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleRestock(product)}
                >
                  Update
                </Button>
              </div>
            ) : (
              <button
                onClick={() => { setRestocking(product); setQty('') }}
                className="w-full text-xs border border-zinc-200
                           text-zinc-600 rounded-lg py-2 font-medium
                           hover:bg-zinc-50 transition-colors mt-1"
              >
                Restock to how many?
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
