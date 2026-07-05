import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Loading from '../Loading';

describe('Loading component', () => {
  it('renders default loading state with spinner and message', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.spinner')).toBeTruthy();
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('renders custom message', () => {
    render(<Loading message="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeTruthy();
  });

  it('renders minimal variant with spinner-mini', () => {
    const { container } = render(<Loading minimal />);
    expect(container.querySelector('.spinner-mini')).toBeTruthy();
  });

  it('renders minimal variant without message when message is empty', () => {
    const { container } = render(<Loading minimal message="" />);
    expect(container.querySelector('.spinner-mini')).toBeTruthy();
    expect(container.querySelector('span')).toBeFalsy();
  });

  it('renders skeleton variant', () => {
    const { container } = render(<Loading skeleton />);
    expect(container.querySelector('.skeleton-loader')).toBeTruthy();
  });

  it('renders skeleton with custom type', () => {
    const { container } = render(<Loading skeleton skeletonType="card" />);
    expect(container.querySelector('.skeleton-loader')).toBeTruthy();
    expect(container.textContent).toBe('');
  });
});
