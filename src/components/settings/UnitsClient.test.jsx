import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnitsClient from './UnitsClient';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    refresh: jest.fn(),
  })),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock('@/components/ui/FormDialog', () => ({
  FormDialog: ({ children, ...props }) => (
    <div data-testid="form-dialog" data-open={props.open}>
      <h2>{props.title}</h2>
      <button onClick={props.onSubmit}>{props.submitLabel}</button>
      <button onClick={props.onOpenChange}>Close</button>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: ({ children, ...props }) => (
    <div data-testid="confirm-dialog" data-open={props.open}>
      <h2>{props.title}</h2>
      <p>{props.description}</p>
      <button onClick={props.onConfirm}>Confirm</button>
      <button onClick={props.onOpenChange}>Cancel</button>
    </div>
  ),
}));

import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

describe('UnitsClient CRUD Operations', () => {
  const mockSupabase = {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } })),
    },
  };
  const mockRouter = { refresh: jest.fn() };

  const sampleUnits = [
    { id: 1, name: 'kg' },
    { id: 2, name: 'pcs' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    createSupabaseClient.mockReturnValue(mockSupabase);
    useRouter.mockReturnValue(mockRouter);
    jest.spyOn(mockSupabase, 'from').mockReturnValue(mockSupabase);
  });

  describe('Render', () => {
    it('renders units list correctly', () => {
      render(<UnitsClient units={sampleUnits} />);

      expect(screen.getByText('kg')).toBeInTheDocument();
      expect(screen.getByText('pcs')).toBeInTheDocument();
    });

    it('shows empty state when no units', () => {
      render(<UnitsClient units={[]} />);

      expect(screen.getByText('No units yet')).toBeInTheDocument();
    });

    it('displays units count badge', () => {
      render(<UnitsClient units={sampleUnits} />);
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });
  });

  describe('Create Operation', () => {
    it('opens add dialog when + button clicked', async () => {
      const user = userEvent.setup();
      render(<UnitsClient units={sampleUnits} />);

      await user.click(screen.getByText('+'));
      expect(screen.getByTestId('form-dialog')).toHaveAttribute('data-open', 'true');
      expect(screen.getByRole('button', { name: 'Add Unit' })).toBeInTheDocument();
    });

    it('creates a new unit successfully', async () => {
      const user = userEvent.setup();
      const mockInsert = jest.fn(() => Promise.resolve({ error: null }));
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      render(<UnitsClient units={sampleUnits} />);

      await user.click(screen.getByText('+'));
      await user.type(screen.getByPlaceholderText(/Unit name/), 'liters');
      await user.click(screen.getByRole('button', { name: 'Add Unit' }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({ name: 'liters', user_id: 'user-1' });
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('validates empty name', async () => {
      const user = userEvent.setup();
      render(<UnitsClient units={sampleUnits} />);

      await user.click(screen.getByText('+'));
      await user.click(screen.getByRole('button', { name: 'Add Unit' }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Name cannot be empty');
      });
    });
  });

  describe('Update Operation', () => {
    it('opens edit dialog with unit data', async () => {
      const user = userEvent.setup();
      render(<UnitsClient units={sampleUnits} />);

      await user.click(screen.getAllByText('✏️ Edit')[0]);
      expect(screen.getByText('Edit Unit')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Unit name/)).toHaveValue('kg');
    });

    it('updates unit successfully', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }));
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      render(<UnitsClient units={sampleUnits} />);

      await user.click(screen.getAllByText('✏️ Edit')[0]);
      await user.clear(screen.getByPlaceholderText(/Unit name/));
      await user.type(screen.getByPlaceholderText(/Unit name/), 'grams');
      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          name: 'grams',
        });
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  describe('Delete Operation', () => {
    it('opens delete confirmation dialog', async () => {
      const user = userEvent.setup();
      render(<UnitsClient units={sampleUnits} />);

      await user.click(screen.getAllByText('🗑️')[0]);
      expect(screen.getByTestId('confirm-dialog')).toHaveAttribute('data-open', 'true');
      expect(screen.getByText('Delete Unit')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete "kg"/)).toBeInTheDocument();
    });

    it('deletes unit successfully', async () => {
      const user = userEvent.setup();
      const mockDelete = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }));
      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      render(<UnitsClient units={sampleUnits} />);

      await user.click(screen.getAllByText('🗑️')[0]);
      await user.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled();
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });
});
