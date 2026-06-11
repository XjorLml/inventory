import { useState } from "react";

export function useDialogState() {
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editing, setEditing] = useState(null);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setFormOpen(true);
  };

  const openDelete = (item) => setDeleteTarget(item);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const closeDelete = () => setDeleteTarget(null);

  return {
    formOpen,
    editing,
    deleteTarget,
    openAdd,
    openEdit,
    openDelete,
    closeForm,
    closeDelete,
  };
}
