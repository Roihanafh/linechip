// Feature: firebase-auth-module, Property 2: Error message mapping non-kosong
import * as fc from 'fast-check';
import {
  getErrorMessage,
  getErrorField,
} from '@/features/auth/utils/errorMessages';

describe('errorMessages', () => {
  describe('getErrorMessage', () => {
    // Property 2: every error code returns a displayable (non-empty, non-whitespace) message
    it('should always return a non-empty non-whitespace string for any error code', () => {
      fc.assert(
        fc.property(fc.string(), (code) => {
          const msg = getErrorMessage(code);
          expect(typeof msg).toBe('string');
          expect(msg.length).toBeGreaterThan(0);
          expect(msg.trim().length).toBeGreaterThan(0);
        }),
        { numRuns: 200 },
      );
    });

    it('should return Indonesian message for known error codes', () => {
      expect(getErrorMessage('auth/email-already-in-use')).toContain('sudah terdaftar');
      expect(getErrorMessage('auth/invalid-email')).toContain('Format email');
      expect(getErrorMessage('auth/wrong-password')).toContain('kata sandi');
      expect(getErrorMessage('auth/network-request-failed')).toContain('koneksi');
    });

    it('should return fallback message for unknown code', () => {
      const fallback = getErrorMessage('unknown');
      expect(getErrorMessage('this-is-not-a-real-code')).toBe(fallback);
    });

    it('should NOT return empty string for popup-closed-by-user (fallback to unknown)', () => {
      const msg = getErrorMessage('auth/popup-closed-by-user');
      expect(msg.trim().length).toBeGreaterThan(0);
    });
  });

  describe('getErrorField', () => {
    it('should return "email" for email-related error codes', () => {
      expect(getErrorField('auth/email-already-in-use')).toBe('email');
      expect(getErrorField('auth/invalid-email')).toBe('email');
      expect(getErrorField('auth/user-not-found')).toBe('email');
      expect(getErrorField('auth/invalid-credential')).toBe('email');
    });

    it('should return "password" for password-related error codes', () => {
      expect(getErrorField('auth/wrong-password')).toBe('password');
      expect(getErrorField('auth/weak-password')).toBe('password');
    });

    it('should return undefined for non-field-specific codes', () => {
      expect(getErrorField('auth/too-many-requests')).toBeUndefined();
      expect(getErrorField('auth/network-request-failed')).toBeUndefined();
      expect(getErrorField('unknown')).toBeUndefined();
      expect(getErrorField('random-code')).toBeUndefined();
    });
  });
});
