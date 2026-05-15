import { cn } from './utils';

describe('cn', () => {
  it('should merge class names correctly', () => {
    const result = cn('class1', 'class2', 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('should handle conditional class names with truthy values', () => {
    const result = cn('base', true && 'conditional', false && 'not-included');
    expect(result).toBe('base conditional');
  });

  it('should handle undefined, null, and empty strings', () => {
    const result = cn('base', undefined, null, '', 'valid');
    expect(result).toBe('base valid');
  });

  it('should merge Tailwind conflicting classes correctly', () => {
    const result = cn('p-4', 'p-2', 'm-4', 'm-2');
    expect(result).toContain('p-2'); // Last valid class should win
    expect(result).toContain('m-2');
  });

  it('should handle array inputs', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('should handle object inputs', () => {
    const result = cn('base', { 'conditional': true, 'not-included': false });
    expect(result).toBe('base conditional');
  });

  it('should work with empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });
});
