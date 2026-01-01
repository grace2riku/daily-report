import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Grid } from '@/components/layout/Grid';

describe('Grid', () => {
  it('renders children correctly', () => {
    render(
      <Grid>
        <div>Item 1</div>
        <div>Item 2</div>
      </Grid>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('applies default grid class', () => {
    render(<Grid data-testid="grid">Content</Grid>);
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid');
  });

  it('applies default cols (1) and gap (md) classes', () => {
    render(<Grid data-testid="grid">Content</Grid>);
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('gap-4');
  });

  it('applies correct cols classes for each option', () => {
    const colsOptions = [1, 2, 3, 4, 6, 12] as const;
    const expectedClasses = {
      1: 'grid-cols-1',
      2: 'sm:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
      6: 'lg:grid-cols-6',
      12: 'lg:grid-cols-12',
    };

    colsOptions.forEach((cols) => {
      const { unmount } = render(
        <Grid cols={cols} data-testid="grid">
          Content
        </Grid>
      );
      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass(expectedClasses[cols]);
      unmount();
    });
  });

  it('applies correct gap classes for each option', () => {
    const gapOptions = ['none', 'sm', 'md', 'lg', 'xl'] as const;
    const expectedClasses = {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    gapOptions.forEach((gap) => {
      const { unmount } = render(
        <Grid gap={gap} data-testid="grid">
          Content
        </Grid>
      );
      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass(expectedClasses[gap]);
      unmount();
    });
  });

  it('merges custom className with default classes', () => {
    render(
      <Grid className="custom-class" data-testid="grid">
        Content
      </Grid>
    );
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('custom-class');
    expect(grid).toHaveClass('grid');
  });

  it('passes through HTML attributes', () => {
    render(
      <Grid id="test-id" aria-label="test label" data-testid="grid">
        Content
      </Grid>
    );
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveAttribute('id', 'test-id');
    expect(grid).toHaveAttribute('aria-label', 'test label');
  });

  it('combines cols and gap props correctly', () => {
    render(
      <Grid cols={3} gap="lg" data-testid="grid">
        Content
      </Grid>
    );
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('lg:grid-cols-3');
    expect(grid).toHaveClass('gap-6');
  });
});
