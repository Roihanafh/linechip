/**
 * Unit tests for validateCreateUserInput.
 * Feature: admin-user-management
 * Requirements: 1.3, 2.2, 6.2, 6.3, 6.4
 */

import { validateCreateUserInput } from '@/lib/admin/utils';
import type { CreateUserInput } from '@/lib/admin/utils';

/** A fully valid baseline input. */
const validInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  name: 'John Doe',
  school: 'SMP Negeri 1',
};

describe('validateCreateUserInput', () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('returns valid: true when all fields are valid', () => {
    const result = validateCreateUserInput(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  // -------------------------------------------------------------------------
  // Email validation
  // -------------------------------------------------------------------------

  it('returns error on email when email is empty string', () => {
    const result = validateCreateUserInput({ ...validInput, email: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it('returns error on email when email has no @', () => {
    const result = validateCreateUserInput({ ...validInput, email: 'notanemail' });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it('returns error on email when email has no domain', () => {
    const result = validateCreateUserInput({ ...validInput, email: 'user@' });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Password validation
  // -------------------------------------------------------------------------

  it('returns error on password when password is 5 characters (too short)', () => {
    const result = validateCreateUserInput({ ...validInput, password: 'abcde' });
    expect(result.valid).toBe(false);
    expect(result.errors.password).toBeDefined();
  });

  it('returns valid: true when password is exactly 6 characters (boundary)', () => {
    const result = validateCreateUserInput({ ...validInput, password: 'abc123' });
    expect(result.valid).toBe(true);
    expect(result.errors.password).toBeUndefined();
  });

  it('returns error on password when password is 257 characters (too long)', () => {
    const result = validateCreateUserInput({ ...validInput, password: 'a'.repeat(257) });
    expect(result.valid).toBe(false);
    expect(result.errors.password).toBeDefined();
  });

  it('returns valid: true when password is exactly 256 characters (boundary)', () => {
    const result = validateCreateUserInput({ ...validInput, password: 'a'.repeat(256) });
    expect(result.valid).toBe(true);
    expect(result.errors.password).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Name validation
  // -------------------------------------------------------------------------

  it('returns error on name when name is empty string', () => {
    const result = validateCreateUserInput({ ...validInput, name: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('returns error on name when name is only whitespace', () => {
    const result = validateCreateUserInput({ ...validInput, name: '   ' });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('returns error on name when name exceeds 100 characters after trim', () => {
    const result = validateCreateUserInput({ ...validInput, name: 'a'.repeat(101) });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('returns valid: true when name is exactly 100 characters (boundary)', () => {
    const result = validateCreateUserInput({ ...validInput, name: 'a'.repeat(100) });
    expect(result.valid).toBe(true);
    expect(result.errors.name).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // School validation
  // -------------------------------------------------------------------------

  it('returns error on school when school is empty string', () => {
    const result = validateCreateUserInput({ ...validInput, school: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.school).toBeDefined();
  });

  it('returns error on school when school is 101 characters (too long)', () => {
    const result = validateCreateUserInput({ ...validInput, school: 'a'.repeat(101) });
    expect(result.valid).toBe(false);
    expect(result.errors.school).toBeDefined();
  });

  it('returns valid: true when school is exactly 100 characters (boundary)', () => {
    const result = validateCreateUserInput({ ...validInput, school: 'a'.repeat(100) });
    expect(result.valid).toBe(true);
    expect(result.errors.school).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Multiple failures simultaneously
  // -------------------------------------------------------------------------

  it('returns all four errors when all fields are invalid', () => {
    const result = validateCreateUserInput({
      email: 'not-an-email',
      password: 'abc', // 3 chars — too short
      name: '',
      school: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
    expect(result.errors.name).toBeDefined();
    expect(result.errors.school).toBeDefined();
  });

  it('returns errors only for invalid fields when some fields are valid', () => {
    const result = validateCreateUserInput({
      email: 'valid@email.com',
      password: 'abcde', // 5 chars — too short
      name: 'Valid Name',
      school: 'a'.repeat(101), // too long
    });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeUndefined();
    expect(result.errors.password).toBeDefined();
    expect(result.errors.name).toBeUndefined();
    expect(result.errors.school).toBeDefined();
  });
});
