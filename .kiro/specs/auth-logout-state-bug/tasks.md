# Implementation Plan

## Overview

Bugfix untuk auth logout state bug menggunakan exploratory methodology: tulis test SEBELUM fix untuk membuktikan bug ada, kemudian implementasi fix, lalu verifikasi bahwa test lulus dan tidak ada regresi. Dua file yang dimodifikasi: `features/auth/services/authService.ts` (propagate errors dari `logout()`) dan `features/profile/hooks/useAccountDropdown.ts` (graceful error handling di `handleLogout()`).

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3.1", "3.2"] },
    { "wave": 3, "tasks": ["3.3", "3.4"] },
    { "wave": 4, "tasks": ["4"] }
  ]
}
```

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Silent Logout Failure (Cookie Not Cleared)
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate that `logout()` swallows errors silently, leaving the cookie intact
  - **Scoped PBT Approach**: For each failure mode (network error, `res.ok = false`), scope the property to that concrete case
  - Create `__tests__/auth/logout.bugcondition.test.ts`
  - Mock `signOut` to resolve successfully, mock `fetch` to throw a network error
  - Assert: `logout()` does NOT throw — this proves the bug (caller never knows cookie was not cleared)
  - Mock `fetch` to return `{ ok: false, status: 500 }` and assert `logout()` still does NOT throw — proves missing `res.ok` check
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS on unfixed code (proving silent failure — that is the counterexample)
  - Document counterexamples found: "`logout()` returns `undefined` even when fetch fails — cookie remains in browser"
  - Mark task complete when test is written, run, and silent-failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Logout Auth Flows Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Create `__tests__/auth/logout.preservation.test.ts`
  - Observe on UNFIXED code: `loginWithEmail()` calls `fetch('/api/auth/session')` and resolves for valid credentials
  - Observe on UNFIXED code: `proxy()` returns `isAuthenticated = true` for request with valid non-expired `__session` cookie
  - Observe on UNFIXED code: `proxy()` returns `isAuthenticated = false` for request without cookie
  - Observe on UNFIXED code: `proxy()` returns `isAuthenticated = false` for request with expired cookie (`exp ≤ Date.now()/1000`)
  - Write property-based test using `fast-check`: for all `(uid, role, futureExp)` where `futureExp > Date.now()/1000`, a cookie decoded to `{ uid, role, exp: futureExp }` makes `proxy()` return `isAuthenticated = true`
  - Write property-based test: for all `expiredExp ≤ Date.now()/1000`, cookie is rejected → `isAuthenticated = false`
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms baseline to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix: propagate logout errors and add res.ok check

  - [x] 3.1 Fix `logout()` in `features/auth/services/authService.ts`
    - Replace sequential `signOut → fetch(best-effort)` with `Promise.allSettled([signOut(auth), fetch(...)])`
    - After `allSettled`, check `signOutResult.status === 'rejected'` and rethrow `signOutResult.reason`
    - Check `fetchResult.status === 'rejected'` and throw `new Error('Cookie logout failed')` with `console.warn`
    - Check `!fetchResult.value.ok` and throw `new Error('Cookie logout returned non-ok status')` with `console.warn`
    - Remove the silent `catch` block that previously swallowed errors
    - _Bug_Condition: `isBugCondition(X)` where `X.firebaseUser = null AND X.sessionCookie IS NOT NULL AND X.sessionCookie.exp > Date.now()/1000`_
    - _Expected_Behavior: after `logout()` resolves, `__session` cookie is absent → `proxy()` evaluates `isAuthenticated = false`_
    - _Preservation: changes are scoped to `logout()` only — `loginWithEmail`, `loginWithGoogle`, `proxy`, `AuthProvider`, and `/api/auth/logout` are untouched_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Fix `handleLogout()` in `features/profile/hooks/useAccountDropdown.ts`
    - Wrap `await logout()` in `try/catch/finally`
    - In `catch`: `console.error('[handleLogout] Logout gagal:', error)` — do not rethrow (graceful degradation)
    - In `finally`: `setIsLoggingOut(false)` — ensures state is always reset
    - Move `close()` and `router.push('/')` to after the try/catch/finally block so they always run
    - _Bug_Condition: same as 3.1 — `router.push('/')` was called before cookie was cleared_
    - _Expected_Behavior: user is always redirected to `/` after logout attempt, even if `logout()` throws_
    - _Preservation: `handleLogout` still navigates to `/`, still closes dropdown, still sets `isLoggingOut`_
    - _Requirements: 2.1, 2.5, 3.2_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - `logout()` Propagates Errors
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes expected behavior (error propagation and `res.ok` check)
    - After fix, `logout()` must throw when `fetch` fails → test expectations must now FAIL (asserting no-throw), proving the fix works
    - Update assertions in `logout.bugcondition.test.ts` to assert that `logout()` DOES throw on fetch failure and non-ok response
    - Re-run the updated test
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed — errors are now propagated)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Logout Auth Flows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `__tests__/auth/logout.preservation.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions in login flow, proxy evaluation, and expired-cookie handling)
    - Confirm `loginWithEmail`, `loginWithGoogle`, `proxy` behavior unchanged

- [x] 4. Checkpoint — Ensure all tests pass
  - Run `npx jest --testPathPattern="auth" --run` (or equivalent single-run command)
  - Verify `logout.bugcondition.test.ts` passes
  - Verify `logout.preservation.test.ts` passes
  - Verify existing `authService.test.ts` still passes (no regression in `updateUserProfile`)
  - If any test fails, investigate before marking complete
  - Ensure all tests pass; ask the user if questions arise

## Notes

- **Test file lokasi**: `__tests__/auth/logout.bugcondition.test.ts` dan `__tests__/auth/logout.preservation.test.ts`
- **Property-based testing**: Gunakan `fast-check` (sudah tersedia di project) untuk preservation tests
- **Task 1 adalah exploratory** — test DIHARAPKAN LULUS pada kode unfixed karena membuktikan silent failure (bukan membuktikan crash). Ini berbeda dari bugfix biasa.
- **Task 3.3 mengubah assertions** — setelah fix, assertions di `logout.bugcondition.test.ts` perlu dibalik: dari "tidak throw" menjadi "throw", karena fix mengubah perilaku `logout()`.
- **Graceful degradation**: `handleLogout()` tetap mengarahkan user ke `/` meski `logout()` throw — jangan ubah perilaku navigasi ini.
- **Scope perubahan sangat sempit**: Hanya dua fungsi yang dimodifikasi (`logout()` dan `handleLogout()`). `proxy.ts`, `/api/auth/logout`, dan `AuthProvider` tidak disentuh.
