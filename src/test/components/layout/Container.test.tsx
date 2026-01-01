import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Container } from '@/components/layout/Container';

describe('Container', () => {
  it('renders children correctly', () => {
    render(<Container>Test Content</Container>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies default xl size class', () => {
    render(<Container data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('max-w-screen-xl');
  });

  it('applies correct size classes for each size option', () => {
    const sizes = ['sm', 'md', 'lg', 'xl', 'full'] as const;
    const expectedClasses = {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      full: 'max-w-full',
    };

    sizes.forEach((size) => {
      const { unmount } = render(
        <Container size={size} data-testid="container">
          Content
        </Container>
      );
      const container = screen.getByTestId('container');
      expect(container).toHaveClass(expectedClasses[size]);
      unmount();
    });
  });

  it('merges custom className with default classes', () => {
    render(
      <Container className="custom-class" data-testid="container">
        Content
      </Container>
    );
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('custom-class');
    expect(container).toHaveClass('mx-auto');
    expect(container).toHaveClass('w-full');
  });

  it('passes through HTML attributes', () => {
    render(
      <Container id="test-id" aria-label="test label" data-testid="container">
        Content
      </Container>
    );
    const container = screen.getByTestId('container');
    expect(container).toHaveAttribute('id', 'test-id');
    expect(container).toHaveAttribute('aria-label', 'test label');
  });

  it('applies responsive padding classes', () => {
    render(<Container data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('px-4');
    expect(container).toHaveClass('sm:px-6');
    expect(container).toHaveClass('lg:px-8');
  });
});
