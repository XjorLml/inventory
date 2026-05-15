import { renderHook, act } from '@testing-library/react';
import { useDialogState } from './useDialogState';

describe('useDialogState', () => {
  describe('initial state', () => {
    it('should initialize with formOpen as false', () => {
      const { result } = renderHook(() => useDialogState());
      expect(result.current.formOpen).toBe(false);
    });

    it('should initialize with editing as null', () => {
      const { result } = renderHook(() => useDialogState());
      expect(result.current.editing).toBeNull();
    });

    it('should initialize with deleteTarget as null', () => {
      const { result } = renderHook(() => useDialogState());
      expect(result.current.deleteTarget).toBeNull();
    });
  });

  describe('openAdd', () => {
    it('should set formOpen to true', () => {
      const { result } = renderHook(() => useDialogState());
      act(() => {
        result.current.openAdd();
      });
      expect(result.current.formOpen).toBe(true);
    });

    it('should clear editing item when opening add mode', () => {
      const { result } = renderHook(() => useDialogState());
      const mockItem = { id: 1, name: 'Test' };

      act(() => {
        result.current.openEdit(mockItem);
      });
      expect(result.current.editing).toEqual(mockItem);

      act(() => {
        result.current.openAdd();
      });
      expect(result.current.editing).toBeNull();
    });
  });

  describe('openEdit', () => {
    it('should set formOpen to true', () => {
      const { result } = renderHook(() => useDialogState());
      const mockItem = { id: 1, name: 'Test' };

      act(() => {
        result.current.openEdit(mockItem);
      });
      expect(result.current.formOpen).toBe(true);
    });

    it('should set editing to the provided item', () => {
      const { result } = renderHook(() => useDialogState());
      const mockItem = { id: 1, name: 'Test' };

      act(() => {
        result.current.openEdit(mockItem);
      });
      expect(result.current.editing).toEqual(mockItem);
    });
  });

  describe('openDelete', () => {
    it('should set deleteTarget to the provided item', () => {
      const { result } = renderHook(() => useDialogState());
      const mockItem = { id: 1, name: 'Test' };

      act(() => {
        result.current.openDelete(mockItem);
      });
      expect(result.current.deleteTarget).toEqual(mockItem);
    });

    it('should not affect formOpen or editing states', () => {
      const { result } = renderHook(() => useDialogState());
      const mockItem = { id: 1, name: 'Test' };

      act(() => {
        result.current.openEdit(mockItem);
      });
      expect(result.current.formOpen).toBe(true);
      expect(result.current.editing).toEqual(mockItem);

      act(() => {
        result.current.openDelete(mockItem);
      });
      expect(result.current.formOpen).toBe(true); // unchanged
      expect(result.current.editing).toEqual(mockItem); // unchanged
    });
  });

  describe('closeForm', () => {
    it('should set formOpen to false', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.openAdd();
      });
      expect(result.current.formOpen).toBe(true);

      act(() => {
        result.current.closeForm();
      });
      expect(result.current.formOpen).toBe(false);
    });

    it('should clear editing item when closing form', () => {
      const { result } = renderHook(() => useDialogState());
      const mockItem = { id: 1, name: 'Test' };

      act(() => {
        result.current.openEdit(mockItem);
      });
      expect(result.current.editing).toEqual(mockItem);

      act(() => {
        result.current.closeForm();
      });
      expect(result.current.editing).toBeNull();
    });

    it('should not affect deleteTarget state', () => {
      const { result } = renderHook(() => useDialogState());
      const mockItem = { id: 1, name: 'Test' };

      act(() => {
        result.current.openDelete(mockItem);
      });
      expect(result.current.deleteTarget).toEqual(mockItem);

      act(() => {
        result.current.closeForm();
      });
      expect(result.current.deleteTarget).toEqual(mockItem); // unchanged
    });
  });

  describe('closeDelete', () => {
    it('should set deleteTarget to null', () => {
      const { result } = renderHook(() => useDialogState());
      const mockItem = { id: 1, name: 'Test' };

      act(() => {
        result.current.openDelete(mockItem);
      });
      expect(result.current.deleteTarget).toEqual(mockItem);

      act(() => {
        result.current.closeDelete();
      });
      expect(result.current.deleteTarget).toBeNull();
    });

    it('should not affect formOpen state', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.openAdd();
      });
      expect(result.current.formOpen).toBe(true);

      act(() => {
        result.current.closeDelete();
      });
      expect(result.current.formOpen).toBe(true); // unchanged
    });
  });

  describe('complex scenarios', () => {
    it('should handle opening edit, then switching to add, then closing', () => {
      const { result } = renderHook(() => useDialogState());
      const item1 = { id: 1, name: 'Item1' };
      const item2 = { id: 2, name: 'Item2' };

      act(() => {
        result.current.openEdit(item1);
      });
      expect(result.current.editing).toEqual(item1);
      expect(result.current.formOpen).toBe(true);

      act(() => {
        result.current.openAdd();
      });
      expect(result.current.editing).toBeNull();
      expect(result.current.formOpen).toBe(true);

      act(() => {
        result.current.closeForm();
      });
      expect(result.current.formOpen).toBe(false);
      expect(result.current.editing).toBeNull();
    });

    it('should handle multiple delete operations independently', () => {
      const { result } = renderHook(() => useDialogState());
      const item1 = { id: 1, name: 'Item1' };
      const item2 = { id: 2, name: 'Item2' };

      act(() => {
        result.current.openDelete(item1);
      });
      expect(result.current.deleteTarget).toEqual(item1);

      act(() => {
        result.current.openDelete(item2);
      });
      expect(result.current.deleteTarget).toEqual(item2);

      act(() => {
        result.current.closeDelete();
      });
      expect(result.current.deleteTarget).toBeNull();
    });
  });
});
