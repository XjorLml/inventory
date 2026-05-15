import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './input';

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('data-slot', 'input');
    expect(input.tagName).toBe('INPUT');
  });

  it('renders with different types', () => {
    const types = ['text', 'email', 'password', 'number', 'tel', 'url'];

    types.forEach(type => {
      const { unmount } = render(<Input type={type} placeholder={`Type ${type}`} />);
      const input = screen.getByPlaceholderText(`Type ${type}`);
      expect(input).toHaveAttribute('type', type);
      unmount();
    });
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} placeholder="Test" />);

    const input = screen.getByPlaceholderText('Test');
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('renders with disabled state', () => {
    render(<Input disabled placeholder="Disabled" />);
    const input = screen.getByPlaceholderText('Disabled');
    expect(input).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" placeholder="Test" />);
    const input = screen.getByPlaceholderText('Test');
    expect(input).toHaveClass('custom-input');
  });

  it('renders with required attribute', () => {
    render(<Input required placeholder="Required field" />);
    const input = screen.getByPlaceholderText('Required field');
    expect(input).toHaveAttribute('required');
  });

  it('renders with name attribute', () => {
    render(<Input name="username" placeholder="Username" />);
    const input = screen.getByPlaceholderText('Username');
    expect(input).toHaveAttribute('name', 'username');
  });

  it('renders with min and max values for number type', () => {
    render(<Input type="number" min={0} max={100} placeholder="Number" />);
    const input = screen.getByPlaceholderText('Number');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
  });

  it('renders with aria-label for accessibility', () => {
    render(<Input aria-label="Search input" placeholder="Search" />);
    const input = screen.getByRole('textbox', { name: /search input/i });
    expect(input).toBeInTheDocument();
  });

  it('renders with placeholder text', () => {
    render(<Input placeholder="Enter your name" />);
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });
});
