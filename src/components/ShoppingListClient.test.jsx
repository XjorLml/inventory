import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShoppingListClient from './ShoppingListClient';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    refresh: jest.fn(),
  })),
}));

import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

describe('ShoppingListClient CRUD Operations', () => {
  const mockSupabase = {
    from: jest.fn(),
  };
  const mockRouter = { refresh: jest.fn() };

  const sampleProducts = [
    {
      id: 1,
      name: 'Rice',
      categories: { name: 'Grains' },
      quantity: 5,
      units: { name: 'kg' },
    },
    {
      id: 2,
      name: 'Sugar',
      categories: { name: 'Sweeteners' },
      quantity: 0,
      units: { name: 'kg' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    createSupabaseClient.mockReturnValue(mockSupabase);
    useRouter.mockReturnValue(mockRouter);
    jest.spyOn(mockSupabase, 'from').mockReturnValue(mockSupabase);
  });

  describe('Render', () => {
    it('renders shopping list items correctly', () => {
      render(<ShoppingListClient products={sampleProducts} />);

      expect(screen.getByText('Rice')).toBeInTheDocument();
      expect(screen.getByText('Sugar')).toBeInTheDocument();
      expect(screen.getByText(/5 kg/)).toBeInTheDocument();
      expect(screen.getByText(/0 kg/)).toBeInTheDocument();
    });

    it('shows empty state when no items need restocking', () => {
      render(<ShoppingListClient products={[]} />);

      expect(screen.getByText('All stocked up!')).toBeInTheDocument();
      expect(screen.getByText('Nothing needs restocking')).toBeInTheDocument();
    });

    it('displays item count in badge', () => {
      render(<ShoppingListClient products={sampleProducts} />);
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    it('displays current quantity for each item', () => {
      render(<ShoppingListClient products={sampleProducts} />);
      expect(screen.getByText(/5\s*kg/)).toBeInTheDocument();
      expect(screen.getByText(/0\s*kg/)).toBeInTheDocument();
    });
  });

  describe('Restock Operation (Update)', () => {
    it('shows input and Update button when Restock clicked', async () => {
      const user = userEvent.setup();
      render(<ShoppingListClient products={sampleProducts} />);

      await user.click(screen.getAllByText('Restock to how many?', { exact: false })[0]);
      expect(screen.getByPlaceholderText('Add quantity')).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('switches restock target when different product clicked', async () => {
      const user = userEvent.setup();
      render(<ShoppingListClient products={sampleProducts} />);

      // Open restock for first product
      await user.click(screen.getAllByText('Restock to how many?', { exact: false })[0]);
      await user.type(screen.getByPlaceholderText('Add quantity'), '10');

      // Click second product's restock button — first product's input disappears
      await user.click(screen.getAllByText('Restock to how many?', { exact: false })[0]);

      // The new input should have empty value
      expect(screen.getByPlaceholderText('Add quantity')).toHaveValue(null);
    });

    it('restocks product successfully', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }));
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      render(<ShoppingListClient products={sampleProducts} />);

      await user.click(screen.getAllByText('Restock to how many?', { exact: false })[0]);
      await user.type(screen.getByPlaceholderText('Add quantity'), '20');
      await user.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          quantity: 25, // current 5 + 20
        });
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('restocks product from zero correctly', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }));
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      render(<ShoppingListClient products={sampleProducts} />);

      // Sugar has quantity 0
      const restockButtons = screen.getAllByText('Restock to how many?', { exact: false });
      await user.click(restockButtons[1]); // Sugar
      await user.type(screen.getByPlaceholderText('Add quantity'), '5');
      await user.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          quantity: 5, // 0 + 5
        });
      });
    });

    it('handles update failure', async () => {
      const user = userEvent.setup();
      // Since we don't have toast mock here, we just ensure error doesn't crash
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: { message: 'Failed' } }))
      }));
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      render(<ShoppingListClient products={sampleProducts} />);

      await user.click(screen.getAllByText('Restock to how many?', { exact: false })[0]);
      await user.type(screen.getByPlaceholderText('Add quantity'), '10');
      await user.click(screen.getByText('Update'));

      // The component does not show an error toast in this code? Actually it doesn't handle errors explicitly.
      // It just does: await supabase.update... then setRestocking(null) and setQty('')
      // No error handling in ShoppingListClient, so we just verify it doesn't crash
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled();
      });
    });
  });
});
