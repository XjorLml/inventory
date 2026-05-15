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

describe('ProductsClient CRUD Operations', () => {
  const mockSupabase = {
    from: jest.fn(),
  };
  const mockRouter = { refresh: jest.fn(), push: jest.fn() };
  const mockToast = { error: jest.fn(), success: jest.fn() };

  const sampleProducts = [
    {
      id: 1,
      name: 'Rice',
      sku: 'RICE-001',
      category: { id: 1, name: 'Grains' },
      unit: { id: 1, name: 'kg' },
      quantity: 50,
      low_stock_threshold: 10,
    },
    {
      id: 2,
      name: 'Sugar',
      sku: 'SUG-001',
      category: { id: 2, name: 'Sweeteners' },
      unit: { id: 1, name: 'kg' },
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
      expect(screen.getByText('RICE-001')).toBeInTheDocument();
      expect(screen.getByText(/Grains/)).toBeInTheDocument();
      expect(screen.getByText(/50 kg/)).toBeInTheDocument();
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
      expect(screen.getByText('Add Product')).toBeInTheDocument();
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
      await user.type(screen.getByPlaceholderText('SKU (e.g. RICE-001)'), 'NEW-001');
      await user.selectOptions(screen.getByRole('combobox', { name: '' }), '1'); // category
      await user.selectOptions(screen.getAllByRole('combobox')[1], '1'); // unit
      await user.type(screen.getByPlaceholderText('Quantity'), '100');
      await user.type(screen.getByPlaceholderText('Low stock threshold'), '20');

      // Submit
      await user.click(screen.getByText('Add Product'));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          name: 'New Product',
          sku: 'NEW-001',
          category_id: '1',
          unit_id: '1',
          quantity: 100,
          low_stock_threshold: 20,
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
      await user.type(screen.getByPlaceholderText('Product name'), 'Test');
      await user.click(screen.getByText('Add Product'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Operation failed');
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

      await user.click(screen.getByText('✏️ Edit'));

      expect(screen.getByText('Edit Product')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Product name')).toHaveValue('Rice');
      expect(screen.getByPlaceholderText('SKU (e.g. RICE-001)')).toHaveValue('RICE-001');
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
      await user.click(screen.getByText('✏️ Edit'));

      // Modify form
      await user.clear(screen.getByPlaceholderText('Product name'));
      await user.type(screen.getByPlaceholderText('Product name'), 'Updated Rice');

      // Submit
      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          id: 1,
          name: 'Updated Rice',
          sku: 'RICE-001',
          category_id: 1,
          unit_id: 1,
          quantity: 50,
          low_stock_threshold: 10,
        });
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
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

      await user.click(screen.getByText('🗑️ Delete'));

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
      await user.click(screen.getByText('🗑️ Delete'));

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

      await user.click(screen.getByText('🗑️ Delete'));
      expect(screen.getByTestId('confirm-dialog')).toHaveAttribute('data-open', 'true');

      await user.click(screen.getByText('Cancel')); // onOpenChange handler

      // The dialog should close - but close actually sets deleteTarget to null, so need to check state.
      // In our mock, onOpenChange is called, which calls closeDelete, which sets deleteTarget to null
      // The component re-renders and dialog is not rendered (open={!!deleteTarget})
      await waitFor(() => {
        expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
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
        expect(screen.queryByTestId('form-dialog')).not.toBeInTheDocument();
      });
    });
  });
});
