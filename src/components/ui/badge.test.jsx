import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from './badge';

describe('Badge', () => {
  it('renders with default props', () => {
    render(<Badge>Status</Badge>);
    const badge = screen.getByText('Status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-slot', 'badge');
    expect(badge).toHaveAttribute('data-variant', 'default');
  });

  it('renders with all variants', () => {
    const variants = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'];

    variants.forEach(variant => {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>);
      const badge = screen.getByText(variant);
      expect(badge).toHaveAttribute('data-variant', variant);
      unmount();
    });
  });

  it('applies custom className', () => {
    render(<Badge className="custom-badge">Test</Badge>);
    const badge = screen.getByText('Test');
    expect(badge).toHaveClass('custom-badge');
  });

  it('renders as a child component when asChild is true', () => {
    render(
      <Badge asChild>
        <a href="/status">Status Link</a>
      </Badge>
    );

    const link = screen.getByRole('link', { name: /status link/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/status');
    expect(link).toHaveAttribute('data-slot', 'badge');
  });

  it('renders children correctly', () => {
    render(<Badge>Active <span>12 items</span></Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('12 items')).toBeInTheDocument();
  });
});

describe('badgeVariants', () => {
  it('returns the correct class string from cva', () => {
    const result = badgeVariants({ variant: 'default' });
    expect(typeof result).toBe('string');
    expect(result).toContain('inline-flex');
    expect(result).toContain('h-5');
  });

  it('applies variant-specific classes', () => {
    const defaultVariant = badgeVariants({ variant: 'default' });
    const destructiveVariant = badgeVariants({ variant: 'destructive' });
    const linkVariant = badgeVariants({ variant: 'link' });

    expect(defaultVariant).toContain('bg-primary');
    expect(defaultVariant).toContain('text-primary-foreground');
    expect(destructiveVariant).toContain('bg-destructive/10');
    expect(linkVariant).toContain('underline-offset-4');
  });
});
