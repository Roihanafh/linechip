/**
 * @jest-environment jsdom
 *
 * Unit tests for StatCard component.
 * Feature: admin-dashboard
 * Requirements: 2.1, 2.2
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import StatCard from '@/components/admin/StatCard';

describe('StatCard', () => {
  it('renders the label', () => {
    render(<StatCard label="Total Pengguna" value={42} icon="group" colorScheme="blue" />);
    expect(screen.getByText('Total Pengguna')).toBeTruthy();
  });

  it('displays the numeric value when value is provided', () => {
    render(<StatCard label="Total Pengguna" value={42} icon="group" colorScheme="blue" />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('shows skeleton with animate-pulse class when value is null', () => {
    const { container } = render(
      <StatCard label="Total Pengguna" value={null} icon="group" colorScheme="blue" />
    );
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();
  });

  it('does not show skeleton when value is provided', () => {
    const { container } = render(
      <StatCard label="Total Pengguna" value={42} icon="group" colorScheme="blue" />
    );
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeNull();
  });

  it('renders value 0 as text (not skeleton)', () => {
    const { container } = render(
      <StatCard label="Nonaktif" value={0} icon="block" colorScheme="red" />
    );
    expect(screen.getByText('0')).toBeTruthy();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  it('renders icon name inside material-symbols span', () => {
    const { container } = render(
      <StatCard label="Skor" value={100} icon="leaderboard" colorScheme="orange" />
    );
    const iconEl = container.querySelector('.material-symbols-outlined');
    expect(iconEl?.textContent?.trim()).toBe('leaderboard');
  });

  it('includes aria-label with "memuat" text when value is null', () => {
    const { container } = render(
      <StatCard label="Total Pengguna" value={null} icon="group" colorScheme="blue" />
    );
    const card = container.firstElementChild;
    expect(card?.getAttribute('aria-label')).toContain('memuat');
  });
});
