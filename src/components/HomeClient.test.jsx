import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomeClient from './HomeClient';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    refresh: jest.fn(),
  })),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }) => (open ? <div data-testid="dialog">{children}<button onClick={() => onOpenChange?.(false)}>Close Dialog</button></div> : null),
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogDescription: ({ children }) => <p>{children}</p>,
  DialogFooter: ({ children }) => <div>{children}</div>,
  DialogOverlay: () => null,
  DialogPortal: ({ children }) => <>{children}</>,
  DialogClose: ({ children }) => <button>{children}</button>,
  DialogTrigger: ({ children }) => <>{children}</>,
}));

import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

describe('HomeClient CRUD Operations', () => {
  const mockSupabase = {
    from: jest.fn(),
  };
  const mockRouter = { refresh: jest.fn() };

  const sampleProducts = [
    {
      id: 1,
      name: 'Rice',
      quantity: 50,
      low_stock_threshold: 10,
      categories: { name: 'Grains' },
      units: { name: 'kg' },
    },
    {
      id: 2,
      name: 'Sugar',
      quantity: 5,
      low_stock_threshold: 10,
      categories: { name: 'Sweeteners' },
      units: { name: 'kg' },
    },
  ];

  const sampleCategories = [
    { name: 'Grains' },
    { name: 'Sweeteners' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    createSupabaseClient.mockReturnValue(mockSupabase);
    useRouter.mockReturnValue(mockRouter);
    jest.spyOn(mockSupabase, 'from').mockReturnValue(mockSupabase);
  });

  describe('Render', () => {
    it('renders products correctly', () => {
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);
      expect(screen.getByText('Rice')).toBeInTheDocument();
      expect(screen.getByText('Sugar')).toBeInTheDocument();
    });

    it('displays low stock badge for low quantity items', () => {
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);
      expect(screen.getByText(/Low Stock/)).toBeInTheDocument();
    });

    it('does not show low stock indicator for well-stocked items', () => {
      render(<HomeClient products={[sampleProducts[0]]} categories={sampleCategories} />);
      expect(screen.queryByText(/Low Stock/)).not.toBeInTheDocument();
    });

    it('renders category filter tabs with counts', () => {
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);
      expect(screen.getByRole('button', { name: /^All/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Grains/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Sweeteners/ })).toBeInTheDocument();
    });

    it('shows empty state when no products', () => {
      render(<HomeClient products={[]} categories={sampleCategories} />);
      expect(screen.getByText('No products here')).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('filters products by All category', () => {
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);
      // "All" should be active by default and show all products
      expect(screen.getByText('Rice')).toBeInTheDocument();
      expect(screen.getByText('Sugar')).toBeInTheDocument();
    });

    it('filters products by specific category', async () => {
      const user = userEvent.setup();
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      await user.click(screen.getByRole('button', { name: /^Grains/ }));

      expect(screen.getByText('Rice')).toBeInTheDocument();
      expect(screen.queryByText('Sugar')).not.toBeInTheDocument();
    });
  });

  describe('Adjust Quantity Dialog', () => {
    it('opens dialog when + button clicked', async () => {
      const user = userEvent.setup();
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      await user.click(screen.getAllByText('+', { exact: true })[0]);
      expect(screen.getByText('Adjust Quantity')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50')).toBeInTheDocument(); // initial quantity
    });

    it('dialog shows correct product name', async () => {
      const user = userEvent.setup();
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      await user.click(screen.getAllByText('+', { exact: true })[0]);
      const dialog = screen.getByTestId('dialog');
      expect(dialog).toHaveTextContent('Rice');
    });

    it('increments/decrements quantity with dialog buttons', async () => {
      const user = userEvent.setup();
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      await user.click(screen.getAllByText('+', { exact: true })[0]);

      // Click + button in dialog (third + overall: 2 per product card + 1 in dialog)
      const plusButtons = screen.getAllByText('+');
      await user.click(plusButtons[2]);
      expect(screen.getByText('51')).toBeInTheDocument();

      // Click - button in dialog (third - overall: 2 per product card + 1 in dialog)
      const minusButtons = screen.getAllByText('−');
      await user.click(minusButtons[2]);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('saves adjusted quantity successfully', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }));
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      await user.click(screen.getAllByText('+', { exact: true })[0]);
      const qtyInput = screen.getByDisplayValue('50');
      await user.clear(qtyInput);
      await user.type(qtyInput, '75');
      await user.click(screen.getByText('Done'));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          quantity: 75,
        });
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('closes dialog when cancel clicked', async () => {
      const user = userEvent.setup();
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      await user.click(screen.getAllByText('+', { exact: true })[0]);
      expect(screen.getByText('Adjust Quantity')).toBeInTheDocument();

      await user.click(screen.getByText('Close Dialog'));

      await waitFor(() => {
        expect(screen.queryByText('Adjust Quantity')).not.toBeInTheDocument();
      });
    });
  });

  describe('Quick Decrement', () => {
    it('decrements quantity by 1 when - button clicked', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }));
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      const minusButtons = screen.getAllByText('−');
      await user.click(minusButtons[0]); // first - button for Rice

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          quantity: 49, // 50 - 1
        });
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('does not decrement when quantity is zero', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }));
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      const zeroProduct = {
        ...sampleProducts[1],
        quantity: 0,
        id: 999, // unique id to avoid confusion
        name: 'Zero Item',
      };
      render(<HomeClient products={[sampleProducts[0], zeroProduct]} categories={sampleCategories} />);

      // Find the minus button inside the zero-product's card
      const cards = screen.getAllByText('Zero Item').map(el => el.closest('div'));
      const minusButtons = cards[0].querySelector('button');
      await user.click(minusButtons);

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Sort', () => {
    it('renders sort dropdown', () => {
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);
      expect(screen.getByText('Name A–Z')).toBeInTheDocument();
    });

    it('sorts products by quantity ascending', async () => {
      const user = userEvent.setup();
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      await user.selectOptions(screen.getByRole('combobox'), 'qty-asc');

      const names = screen.getAllByText(/^(Sugar|Rice)$/);
      expect(names[0]).toHaveTextContent('Sugar') // qty 5
      expect(names[1]).toHaveTextContent('Rice')  // qty 50
    });
  });

  describe('Low Stock Highlighting', () => {
    it('applies red styling for low stock items', () => {
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      const sugarRow = screen.getByText('Sugar').closest('[class*="bg-red-50"]');
      expect(sugarRow).toHaveClass('border-red-200');
      expect(sugarRow).toHaveClass('bg-red-50');
    });

    it('applies normal styling for well-stocked items', () => {
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      const riceRow = screen.getByText('Rice').closest('[class*="rounded-xl"]');
      expect(riceRow).toHaveClass('border-transparent');
      expect(riceRow).not.toHaveClass('bg-red-50');
    });
  });
});
