/**
 * Property-based tests for admin user management utility functions.
 * Uses fast-check for property generation.
 * Feature: admin-user-management
 */

// Feature: admin-user-management, Property 1: validateCreateUserInput correctness

import * as fc from 'fast-check';
import {
  validateCreateUserInput,
} from '@/lib/admin/utils';
import type { CreateUserInput } from '@/lib/admin/utils';

// ---------------------------------------------------------------------------
// Property 1: Input validation correctness
// Validates: Requirements 1.3, 2.2, 6.2, 6.3, 6.4
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Determine expected validity for each field independently. */
function isEmailValid(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
function isPasswordValid(password: string): boolean {
  return password.length >= 6 && password.length <= 256;
}
function isNameValid(name: string): boolean {
  return name.trim().length >= 1 && name.trim().length <= 100;
}
function isSchoolValid(school: string): boolean {
  return school.trim().length >= 1 && school.trim().length <= 100;
}

describe('Property 1: validateCreateUserInput correctness', () => {
  it('valid === true iff all four conditions are satisfied', () => {
    // Feature: admin-user-management, Property 1: validateCreateUserInput correctness
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string(),
          password: fc.string(),
          name: fc.string(),
          school: fc.string(),
        }),
        (input: CreateUserInput) => {
          const result = validateCreateUserInput(input);

          const allValid =
            isEmailValid(input.email) &&
            isPasswordValid(input.password) &&
            isNameValid(input.name) &&
            isSchoolValid(input.school);

          // valid must be true iff all four conditions are satisfied
          if (allValid !== result.valid) {
            return false;
          }

          // When a condition fails, the corresponding error key must be present
          if (!isEmailValid(input.email) && !result.errors.email) {
            return false;
          }
          if (!isPasswordValid(input.password) && !result.errors.password) {
            return false;
          }
          if (!isNameValid(input.name) && !result.errors.name) {
            return false;
          }
          if (!isSchoolValid(input.school) && !result.errors.school) {
            return false;
          }

          // When a condition passes, that key must NOT be present in errors
          if (isEmailValid(input.email) && result.errors.email) {
            return false;
          }
          if (isPasswordValid(input.password) && result.errors.password) {
            return false;
          }
          if (isNameValid(input.name) && result.errors.name) {
            return false;
          }
          if (isSchoolValid(input.school) && result.errors.school) {
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
