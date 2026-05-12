"use client";

import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/FormDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDialogState } from "@/hooks/useDialogState";

export default function UnitsClient({ units }) {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const [name, setName] = useState("");
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

  const handleEdit = (unit) => {
    setName(unit.name);
    openEdit(unit);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty");
      return;
    }

    const { error } = editing
      ? await supabase
          .from("units")
          .update({ name: trimmed })
          .eq("id", editing.id)
      : await supabase.from("units").insert({ name: trimmed });

    if (error) {
      toast.error("Operation failed");
      return;
    }

    closeForm();
    setName("");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) {
      toast.error(`Failed to delete "${name}"`);
      return;
    }
    closeDelete();
    router.refresh();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Units</h2>
        <Badge variant="secondary">{units.length} items</Badge>
      </div>

      {/* Empty state */}
      {units.length === 0 && (
        <div className="text-center py-24 text-zinc-400">
          <p className="text-5xl mb-3">📏</p>
          <p className="font-medium">No units yet</p>
          <p className="text-sm mt-1">Tap + to add one</p>
        </div>
      )}

      {/* Unit cards */}
      <div className="flex flex-col gap-3">
        {units.map((unit) => (
          <div
            key={unit.id}
            className="bg-white rounded-xl border border-transparent px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📏</span>
              <p className="font-medium text-sm">{unit.name}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => handleEdit(unit)}
              >
                ✏️ Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="text-xs"
                onClick={() => openDelete(unit)}
              >
                🗑️
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => {
          setName("");
          openAdd();
        }}
        className="fixed bottom-20 right-4 w-14 h-14 bg-black text-white rounded-full text-2xl shadow-lg flex items-center justify-center z-50"
      >
        +
      </button>

      <FormDialog
        open={formOpen}
        onOpenChange={closeForm}
        title={editing ? "Edit Unit" : "Add Unit"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save Changes" : "Add Unit"}
      >
        <Input
          placeholder="Unit name (e.g. kg, pcs, bottles)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={closeDelete}
        title="Delete Unit"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
