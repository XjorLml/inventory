import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, buttonVariants } from './button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-slot', 'button');
    expect(button).toHaveAttribute('data-variant', 'default');
    expect(button).toHaveAttribute('data-size', 'default');
  });

  it('renders with different variants', () => {
    const variants = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'];

    variants.forEach(variant => {
      const { unmount } = render(<Button variant={variant}>Test</Button>);
      const button = screen.getByRole('button', { name: /test/i });
      expect(button).toHaveAttribute('data-variant', variant);
      unmount();
    });
  });

  it('renders with different sizes', () => {
    const sizes = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'];

    sizes.forEach(size => {
      const { unmount } = render(<Button size={size}>Test</Button>);
      const button = screen.getAllByRole('button', { name: /test/i });
      expect(button[button.length - 1]).toHaveAttribute('data-size', size);
      unmount();
    });
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Test</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('renders as a child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveAttribute('data-slot', 'button');
  });

  it('renders with correct label (Submit)', () => {
    render(<Button>Submit</Button>);
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveTextContent('Submit');
  });

  it('renders icon correctly with size icon', () => {
    const { container } = render(<Button size="icon">★</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('★');
    expect(button).toHaveAttribute('data-size', 'icon');
  });
});

describe('buttonVariants', () => {
  it('returns the correct class string from cva', () => {
    const result = buttonVariants({ variant: 'default', size: 'default' });
    expect(typeof result).toBe('string');
    expect(result).toContain('inline-flex');
  });

  it('applies variant-specific classes', () => {
    const defaultVariant = buttonVariants({ variant: 'default' });
    const outlineVariant = buttonVariants({ variant: 'outline' });
    const linkVariant = buttonVariants({ variant: 'link' });

    expect(defaultVariant).toContain('bg-primary');
    expect(outlineVariant).toContain('border-border');
    expect(linkVariant).toContain('underline-offset-4');
  });

  it('applies size-specific classes', () => {
    const defaultSize = buttonVariants({ size: 'default' });
    const iconSize = buttonVariants({ size: 'icon' });

    expect(defaultSize).toContain('h-8');
    expect(iconSize).toContain('size-8');
  });
});
