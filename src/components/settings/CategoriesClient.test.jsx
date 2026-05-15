import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoriesClient from './CategoriesClient';

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

import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

describe('CategoriesClient CRUD Operations', () => {
  const mockSupabase = {
    from: jest.fn(),
  };
  const mockRouter = { refresh: jest.fn() };
  const mockToast = { error: jest.fn() };

  const sampleCategories = [
    { id: 1, name: 'Grains' },
    { id: 2, name: 'Sweeteners' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    createSupabaseClient.mockReturnValue(mockSupabase);
    useRouter.mockReturnValue(mockRouter);
    jest.spyOn(mockSupabase, 'from').mockReturnValue(mockSupabase);
  });

  describe('Render', () => {
    it('renders categories list correctly', () => {
      render(<CategoriesClient categories={sampleCategories} />);

      expect(screen.getByText('Grains')).toBeInTheDocument();
      expect(screen.getByText('Sweeteners')).toBeInTheDocument();
    });

    it('shows empty state when no categories', () => {
      render(<CategoriesClient categories={[]} />);

      expect(screen.getByText('No categories yet')).toBeInTheDocument();
    });

    it('displays category count badge', () => {
      render(<CategoriesClient categories={sampleCategories} />);
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });
  });

  describe('Create Operation', () => {
    it('opens add dialog when + button clicked', async () => {
      const user = userEvent.setup();
      render(<CategoriesClient categories={sampleCategories} />);

      await user.click(screen.getByText('+'));
      expect(screen.getByTestId('form-dialog')).toHaveAttribute('data-open', 'true');
      expect(screen.getByText('Add Category')).toBeInTheDocument();
    });

    it('creates a new category successfully', async () => {
      const user = userEvent.setup();
      const mockInsert = jest.fn(() => Promise.resolve({ error: null }));
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      render(<CategoriesClient categories={sampleCategories} />);

      await user.click(screen.getByText('+'));
      await user.type(screen.getByPlaceholderText('Category name'), 'Beverages');
      await user.click(screen.getByText('Add Category'));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({ name: 'Beverages' });
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('shows error on create failure', async () => {
      const user = userEvent.setup();
      const mockInsert = jest.fn(() => Promise.resolve({ error: { message: 'Failed' } }));
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      render(<CategoriesClient categories={sampleCategories} />);

      await user.click(screen.getByText('+'));
      await user.type(screen.getByPlaceholderText('Category name'), 'Test');
      await user.click(screen.getByText('Add Category'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Operation failed');
      });
    });
  });

  describe('Update Operation', () => {
    it('opens edit dialog with category data', async () => {
      const user = userEvent.setup();
      render(<CategoriesClient categories={sampleCategories} />);

      await user.click(screen.getByText('✏️ Edit'));
      expect(screen.getByText('Edit Category')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Category name')).toHaveValue('Grains');
    });

    it('updates category successfully', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }));
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      render(<CategoriesClient categories={sampleCategories} />);

      await user.click(screen.getByText('✏️ Edit'));
      await user.clear(screen.getByPlaceholderText('Category name'));
      await user.type(screen.getByPlaceholderText('Category name'), 'Updated Grains');
      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          name: 'Updated Grains',
        });
        // eq should be chained after update
        expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  describe('Delete Operation', () => {
    it('opens delete confirmation dialog', async () => {
      const user = userEvent.setup();
      render(<CategoriesClient categories={sampleCategories} />);

      await user.click(screen.getByText('🗑️'));
      expect(screen.getByTestId('confirm-dialog')).toHaveAttribute('data-open', 'true');
      expect(screen.getByText('Delete Category')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete "Grains"/)).toBeInTheDocument();
    });

    it('deletes category successfully', async () => {
      const user = userEvent.setup();
      const mockDelete = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }));
      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      render(<CategoriesClient categories={sampleCategories} />);

      await user.click(screen.getByText('🗑️'));
      await user.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled();
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });
});
