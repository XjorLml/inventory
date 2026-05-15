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
  Dialog: ({ children, open }) => (open ? <div data-testid="dialog">{children}</div> : null),
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

    it('displays OK badge for normal stock items', () => {
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);
      expect(screen.getAllByText('OK').length).toBeGreaterThan(0);
    });

    it('renders category filter tabs', () => {
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Grains')).toBeInTheDocument();
      expect(screen.getByText('Sweeteners')).toBeInTheDocument();
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

      await user.click(screen.getByText('Grains'));

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
      expect(screen.getByText('Rice')).toBeInTheDocument(); // product name
    });

    it('increments/decrements quantity with dialog buttons', async () => {
      const user = userEvent.setup();
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      await user.click(screen.getByText('+', { exact: true }));

      const display = screen.getByText('50', { exact: true });

      // Click + button in dialog
      const plusButtons = screen.getAllByText('+');
      await user.click(plusButtons[1]); // second + is in dialog
      expect(screen.getByText('51')).toBeInTheDocument();

      // Click - button in dialog
      const minusButtons = screen.getAllByText('−');
      await user.click(minusButtons[1]); // second - is in dialog
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
      await user.type(screen.getByPlaceholderText(/quantity/), '75');
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

      await user.click(screen.getByText('+', { exact: true }));
      expect(screen.getByText('Adjust Quantity')).toBeInTheDocument();

      // The close button is inside the Dialog
      // For simplicity, we can click outside or the X button
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      await user.click(closeButtons[0]);

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

      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      // Find the product with quantity 0 and try to click its minus button
      // Actually Sugar has quantity 5, not 0. Let's add a product with 0
      const zeroProduct = {
        ...sampleProducts[1],
        quantity: 0,
      };
      render(<HomeClient products={[sampleProducts[0], zeroProduct]} categories={sampleCategories} />);

      const minusButtons = screen.getAllByText('−');
      // The component checks if quantity <= 0 and returns early, so the button should still be clickable but no update happens
      await user.click(minusButtons[1]);

      // The mockUpdate should NOT be called if quantity is 0
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Low Stock Highlighting', () => {
    it('applies red styling for low stock items', () => {
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      const sugarRow = screen.getByText('Sugar').closest('div');
      expect(sugarRow).toHaveClass('border-red-200');
      expect(sugarRow).toHaveClass('bg-red-50');
    });

    it('applies normal styling for well-stocked items', () => {
      render(<HomeClient products={sampleProducts} categories={sampleCategories} />);

      const riceRow = screen.getByText('Rice').closest('div');
      expect(riceRow).toHaveClass('border-transparent');
      expect(riceRow).not.toHaveClass('bg-red-50');
    });
  });
});
