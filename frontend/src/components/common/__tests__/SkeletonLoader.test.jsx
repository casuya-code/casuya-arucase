import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SkeletonLoader from '../SkeletonLoader';

describe('SkeletonLoader component', () => {
  it('renders default type', () => {
    const { container } = render(<SkeletonLoader />);
    expect(container.querySelector('.skeleton-loader')).toBeTruthy();
  });

  it('renders text type with specified lines', () => {
    const { container } = render(<SkeletonLoader type="text" lines={5} />);
    const lines = container.querySelectorAll('.skeleton-line');
    expect(lines).toHaveLength(5);
  });

  it('renders card type', () => {
    const { container } = render(<SkeletonLoader type="card" />);
    expect(container.querySelector('.skeleton-loader')).toBeTruthy();
  });

  it('renders table type', () => {
    const { container } = render(<SkeletonLoader type="table" />);
    expect(container.querySelector('.skeleton-loader')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonLoader className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });

  it('applies custom width and height for text type', () => {
    const { container } = render(<SkeletonLoader type="text" width="50%" height="2rem" />);
    const skeleton = container.querySelector('.skeleton-loader');
    expect(skeleton.style.width).toBe('50%');
    const line = container.querySelector('.skeleton-line');
    expect(line.style.height).toBe('2rem');
  });
});
