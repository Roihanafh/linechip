/**
 * @jest-environment jsdom
 *
 * Unit tests for ConfirmationDialog component.
 * Feature: admin-dashboard
 * Requirements: 7.2, 7.3
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';

// ConfirmationDialog uses createPortal — patch document.body before each test
beforeEach(() => {
  document.body.innerHTML = '';
});

const defaultProps = {
  isOpen: true,
  title: 'Konfirmasi Tindakan',
  description: 'Apakah Anda yakin?',
  confirmLabel: 'Konfirmasi',
  confirmVariant: 'danger' as const,
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

describe('ConfirmationDialog', () => {
  it('renders nothing when isOpen is false', () => {
    render(<ConfirmationDialog {...defaultProps} isOpen={false} />);
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('renders dialog with role="dialog" when isOpen is true', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('sets aria-labelledby on dialog element', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe('dialog-title');
  });

  it('sets aria-describedby on dialog element', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-describedby')).toBe('dialog-desc');
  });

  it('sets aria-modal="true" on dialog element', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('renders title text', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    expect(screen.getByText('Konfirmasi Tindakan')).toBeTruthy();
  });

  it('renders description text', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    expect(screen.getByText('Apakah Anda yakin?')).toBeTruthy();
  });

  it('renders confirm button with correct label', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Konfirmasi' })).toBeTruthy();
  });

  it('renders cancel button', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Batal' })).toBeTruthy();
  });

  it('disables confirm button when isLoading is true', () => {
    render(<ConfirmationDialog {...defaultProps} isLoading={true} />);
    const confirmBtn = screen.getByRole('button', { name: /konfirmasi/i });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables cancel button when isLoading is true', () => {
    render(<ConfirmationDialog {...defaultProps} isLoading={true} />);
    const cancelBtn = screen.getByRole('button', { name: 'Batal' });
    expect((cancelBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not disable buttons when isLoading is false', () => {
    render(<ConfirmationDialog {...defaultProps} isLoading={false} />);
    const confirmBtn = screen.getByRole('button', { name: 'Konfirmasi' });
    const cancelBtn = screen.getByRole('button', { name: 'Batal' });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false);
    expect((cancelBtn as HTMLButtonElement).disabled).toBe(false);
  });
});
