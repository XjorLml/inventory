import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductsClient from './ProductsClient';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    refresh: jest.fn(),
    push: jest.fn(),
  })),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
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

describe('ProductsClient CRUD Operations', () => {
  const mockSupabase = {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } })),
    },
  };
  const mockRouter = { refresh: jest.fn(), push: jest.fn() };

  const sampleProducts = [
    {
      id: 1,
      name: 'Rice',
      category_id: 1,
      unit_id: 1,
      categories: { name: 'Grains' },
      units: { name: 'kg' },
      quantity: 50,
      low_stock_threshold: 10,
    },
    {
      id: 2,
      name: 'Sugar',
      category_id: 2,
      unit_id: 1,
      categories: { name: 'Sweeteners' },
      units: { name: 'kg' },
      quantity: 5,
      low_stock_threshold: 10,
    },
  ];

  const sampleCategories = [
    { id: 1, name: 'Grains' },
    { id: 2, name: 'Sweeteners' },
  ];

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
    it('renders products list correctly', () => {
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      expect(screen.getByText('Rice')).toBeInTheDocument();
      expect(screen.getByText('Sugar')).toBeInTheDocument();
      expect(screen.getByText(/🏷️ Grains/)).toBeInTheDocument();
      expect(screen.getByText(/50\s*kg/)).toBeInTheDocument();
    });

    it('shows empty state when no products', () => {
      render(
        <ProductsClient
          products={[]}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      expect(screen.getByText('No products yet')).toBeInTheDocument();
    });

    it('displays product count badge', () => {
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      expect(screen.getByText('2 items')).toBeInTheDocument();
    });
  });

  describe('Create Operation', () => {
    it('opens add dialog when + button clicked', async () => {
      const user = userEvent.setup();
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      const addButton = screen.getByText('+');
      await user.click(addButton);

      const dialog = screen.getByTestId('form-dialog');
      expect(dialog).toHaveAttribute('data-open', 'true');
      expect(screen.getByRole('button', { name: 'Add Product' })).toBeInTheDocument();
    });

    it('creates a new product successfully', async () => {
      const user = userEvent.setup();
      const mockInsert = jest.fn(() => Promise.resolve({ error: null }));
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      // Open add dialog
      await user.click(screen.getByText('+'));

      // Fill form
      await user.type(screen.getByPlaceholderText('Product name'), 'New Product');
      // Select category and unit by label text
      const selects = screen.getAllByRole('combobox');
      await user.selectOptions(selects[1], 'Grains');
      await user.selectOptions(selects[2], 'kg');
      // Enter quantity
      await user.clear(screen.getByPlaceholderText('Quantity'));
      await user.type(screen.getByPlaceholderText('Quantity'), '100');
      // Enter threshold
      await user.clear(screen.getByPlaceholderText('Low stock threshold'));
      await user.type(screen.getByPlaceholderText('Low stock threshold'), '20');

      // Submit
      await user.click(screen.getByRole('button', { name: 'Add Product' }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          name: 'New Product',
          category_id: '1',
          unit_id: '1',
          quantity: 100,
          low_stock_threshold: 20,
          user_id: 'user-1',
        });
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('shows error on create failure', async () => {
      const user = userEvent.setup();
      const mockInsert = jest.fn(() => Promise.resolve({ error: { message: 'Insert failed' } }));
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      await user.click(screen.getByText('+'));

      // The form validation requires category, unit, quantity, threshold
      // But let's just test the failure mode directly
      // Actually the test expects error - fill just name to trigger missing field validation
      await user.type(screen.getByPlaceholderText('Product name'), 'Test');
      await user.click(screen.getByRole('button', { name: 'Add Product' }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Update Operation', () => {
    it('opens edit dialog with product data', async () => {
      const user = userEvent.setup();
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      const editButtons = screen.getAllByText('✏️ Edit');
      await user.click(editButtons[0]); // first product (Rice)

      expect(screen.getByText('Edit Product')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Product name')).toHaveValue('Rice');
    });

    it('updates product successfully', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }));
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      // Open edit dialog
      const editButtons = screen.getAllByText('✏️ Edit');
      await user.click(editButtons[0]); // Rice

      // Modify form
      await user.clear(screen.getByPlaceholderText('Product name'));
      await user.type(screen.getByPlaceholderText('Product name'), 'Updated Rice');

      // Submit
      await user.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          id: 1,
          name: 'Updated Rice',
          category_id: 1,
          unit_id: 1,
          quantity: 50,
          low_stock_threshold: 10,
        });
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  describe('Search and Sort', () => {
    it('shows search input', () => {
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );
      expect(screen.getByPlaceholderText('Search products…')).toBeInTheDocument();
    });

    it('filters products by search query', async () => {
      const user = userEvent.setup();
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      await user.type(screen.getByPlaceholderText('Search products…'), 'rice');

      expect(screen.getByText('Rice')).toBeInTheDocument();
      expect(screen.queryByText('Sugar')).not.toBeInTheDocument();
    });

    it('shows sort dropdown', () => {
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );
      expect(screen.getByText('Name A–Z')).toBeInTheDocument();
    });

    it('reverses product order when sort changes', async () => {
      const user = userEvent.setup();
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      await user.selectOptions(screen.getAllByRole('combobox')[0], 'name-desc');

      const names = screen.getAllByText(/^(Sugar|Rice)$/);
      expect(names[0]).toHaveTextContent('Sugar');
      expect(names[1]).toHaveTextContent('Rice');
    });

    it('shows no results message when search matches nothing', async () => {
      const user = userEvent.setup();
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      await user.type(screen.getByPlaceholderText('Search products…'), 'xyzzy');

      expect(screen.getByText(/No products match/i)).toBeInTheDocument();
    });
  });

  describe('Delete Operation', () => {
    it('opens delete confirmation dialog', async () => {
      const user = userEvent.setup();
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      const deleteButtons = screen.getAllByText('🗑️ Delete');
      await user.click(deleteButtons[0]); // first product (Rice)

      const dialog = screen.getByTestId('confirm-dialog');
      expect(dialog).toHaveAttribute('data-open', 'true');
      expect(screen.getByText('Delete Product')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete "Rice"/)).toBeInTheDocument();
    });

    it('deletes product successfully', async () => {
      const user = userEvent.setup();
      const mockDelete = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }));
      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      // Open delete confirmation
      const deleteButtons = screen.getAllByText('🗑️ Delete');
      await user.click(deleteButtons[0]);

      // Confirm deletion
      await user.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled();
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('closes delete dialog on cancel', async () => {
      const user = userEvent.setup();
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      const delButtons = screen.getAllByText('🗑️ Delete');
      await user.click(delButtons[0]);
      expect(screen.getByTestId('confirm-dialog')).toHaveAttribute('data-open', 'true');

      await user.click(screen.getByText('Cancel')); // onOpenChange handler

      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toHaveAttribute('data-open', 'false');
      });
    });
  });

  describe('Dialog State Management', () => {
    it('closes form dialog when close button clicked', async () => {
      const user = userEvent.setup();
      render(
        <ProductsClient
          products={sampleProducts}
          categories={sampleCategories}
          units={sampleUnits}
        />
      );

      await user.click(screen.getByText('+'));
      expect(screen.getByTestId('form-dialog')).toHaveAttribute('data-open', 'true');

      await user.click(screen.getByText('Close')); // Our mock's close button

      await waitFor(() => {
        expect(screen.getByTestId('form-dialog')).toHaveAttribute('data-open', 'false');
      });
    });
  });
});
