// Feature: firebase-auth-module, Property 4: sanitizeInput menghapus chars berbahaya
import * as fc from 'fast-check';
import { sanitizeInput } from '@/features/auth/services/authService';

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => [{ name: '[DEFAULT]' }]),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  browserLocalPersistence: {},
  setPersistence: jest.fn(() => Promise.resolve()),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _seconds: 0 })),
}));

describe('sanitizeInput', () => {
  // Property 4: sanitizeInput should never add dangerous characters

  it('result length should not exceed input length', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeInput(input);
        expect(result.length).toBeLessThanOrEqual(input.length);
      }),
      { numRuns: 200 }
    );
  });

  it('result should not contain HTML tags', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeInput(input);
        expect(result).not.toMatch(/<[^>]*>/);
      }),
      { numRuns: 200 }
    );
  });

  it('result should not contain control characters', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeInput(input);
        expect(result).not.toMatch(/[\x00-\x1F]/);
      }),
      { numRuns: 200 }
    );
  });

  it('should remove HTML tags from input', () => {
    // sanitizeInput strips the tag delimiters (<...>) but keeps text content between tags
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(sanitizeInput('Hello <b>World</b>')).toBe('Hello World');
    // Self-closing tag with no text content → empty after trim
    expect(sanitizeInput('<img src="x" onerror="evil()">')).toBe('');
  });

  it('should remove control characters', () => {
    expect(sanitizeInput('Hello\x00World')).toBe('HelloWorld');
    // \t (0x09) and \n (0x0A) are control chars — stripped in-place (no replacement space)
    // 'Tab\t Newline\nHere': \t removed → 'Tab Newline\nHere'; \n removed → 'Tab NewlineHere'
    expect(sanitizeInput('Tab\t Newline\nHere')).toBe('Tab NewlineHere');
    expect(sanitizeInput('\x1FHidden')).toBe('Hidden');
  });

  it('should trim leading and trailing whitespace (regular spaces)', () => {
    // Regular spaces (0x20) are NOT control chars and should be preserved mid-string,
    // but leading/trailing spaces are trimmed
    expect(sanitizeInput('  Hello World  ')).toBe('Hello World');
  });

  it('should return empty string for input consisting only of control chars/tags', () => {
    expect(sanitizeInput('\x00\x01\x1F')).toBe('');
    expect(sanitizeInput('<>')).toBe('');
  });
});
