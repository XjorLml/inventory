"use client";

import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/FormDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDialogState } from "@/hooks/useDialogState";

const emptyForm = {
  name: "",
  sku: "",
  category_id: "",
  unit_id: "",
  quantity: 0,
  low_stock_threshold: 10,
};

export default function ProductsClient({ products, categories, units }) {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const {
    formOpen,
    editing,
    deleteTarget,
    openAdd,
    openEdit,
    openDelete,
    closeForm,
    closeDelete,
  } = useDialogState();

  const handleChange = (e) => {
    const value =
      e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const handleEdit = (product) => {
    setForm({ ...product });
    openEdit(product);
  };

  const handleSubmit = async () => {
    const { error } = editing
      ? await supabase.from("products").update(form).eq("id", editing.id)
      : await supabase.from("products").insert(form);

    if (error) {
      toast.error("Operation failed");
      return;
    }
    closeForm();
    setForm(emptyForm);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(`Failed to delete "${name}"`);
      return;
    }
    closeDelete();
    router.refresh();
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Products</h2>
        <Badge variant="secondary">{products.length} items</Badge>
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <div className="text-center py-24 text-zinc-400">
          <p className="text-5xl mb-3">🗂️</p>
          <p className="font-medium">No products yet</p>
          <p className="text-sm mt-1">Tap + to add your first product</p>
        </div>
      )}

      {/* Product cards */}
      <div className="flex flex-col gap-3">
        {products.map((product) => {
          const isLow = product.quantity <= product.low_stock_threshold;
          return (
            <div
              key={product.id}
              className={[
                "bg-white rounded-xl border px-4 py-3",
                isLow ? "border-red-200 bg-red-50" : "border-transparent",
              ].join(" ")}
            >
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-semibold text-sm">{product.name}</p>
                  <p className="text-xs text-zinc-400">{product.sku}</p>
                </div>
                {isLow ? (
                  <Badge variant="destructive" className="text-xs">
                    Low Stock
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    OK
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
                <span>🏷️ {product.categories?.name ?? "—"}</span>
                <span>·</span>
                <span>
                  {product.quantity} {product.units?.name ?? ""}
                </span>
                <span>·</span>
                <span>Min: {product.low_stock_threshold}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => handleEdit(product)}
                >
                  ✏️ Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 text-xs"
                  onClick={() => openDelete(product)}
                >
                  🗑️ Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={openAdd}
        className={[
          "fixed bottom-20 right-4 w-14 h-14",
          "bg-black text-white rounded-full text-2xl",
          "shadow-lg flex items-center justify-center",
        ].join(" ")}
      >
        +
      </button>

      <FormDialog
        open={formOpen}
        onOpenChange={closeForm}
        title={editing ? "Edit Product" : "Add Product"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save Changes" : "Add Product"}
      >
        <Input
          placeholder="Product name"
          name="name"
          value={form.name}
          onChange={handleChange}
        />
        <Input
          placeholder="SKU (e.g. RICE-001)"
          name="sku"
          value={form.sku}
          onChange={handleChange}
        />
        <select
          name="category_id"
          value={form.category_id}
          onChange={handleChange}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="unit_id"
          value={form.unit_id}
          onChange={handleChange}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Select unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Quantity</label>
          <Input
            placeholder="Quantity"
            name="quantity"
            type="number"
            value={form.quantity}
            onChange={handleChange}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">
            Low Stock Threshold
          </label>
          <Input
            placeholder="Low stock threshold"
            name="low_stock_threshold"
            type="number"
            value={form.low_stock_threshold}
            onChange={handleChange}
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={closeDelete}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
