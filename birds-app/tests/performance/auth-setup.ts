import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

/**
 * Authentication Setup for Performance Tests
 *
 * This file handles authentication state persistence so protected pages
 * can be tested. There are two approaches:
 *
 * 1. Mock Authentication (recommended for CI/automated testing)
 * 2. Real OAuth flow (for local development)
 *
 * Since this app uses NextAuth with Google OAuth, you'll need to either:
 * - Set up a test user in your database
 * - Use the mock approach below
 * - Or manually authenticate once and save the session
 */

const authFile = path.join(__dirname, '../../.auth/user.json');

/**
 * Setup: Authenticate and save session state
 *
 * For Google OAuth, you have several options:
 *
 * Option 1: Manual Login (Development)
 * Run: npx playwright test --headed --debug
 * Then manually log in and the session will be saved
 *
 * Option 2: Database User (Testing)
 * Create a test user directly in the database and use session cookies
 *
 * Option 3: Mock NextAuth Session (CI)
 * Override the session at the API level for testing
 */
setup('authenticate', async ({ page }) => {
  // Check if we should skip auth (for public page tests)
  if (process.env.SKIP_AUTH === 'true') {
    console.log('Skipping authentication setup');
    return;
  }

  // For CI/automated testing, we can bypass auth for public pages
  // For protected pages, you'll need to implement one of these approaches:

  console.log('\n🔐 Authentication Setup');
  console.log('─'.repeat(40));
  console.log('For testing protected pages, you need to authenticate.');
  console.log('');
  console.log('Options:');
  console.log('1. Run with --headed flag and login manually');
  console.log('2. Set up a test user via database seeding');
  console.log('3. Use API route to create mock session');
  console.log('');
  console.log('Running in public-pages-only mode for now...');
  console.log('─'.repeat(40));

  // Navigate to login page
  await page.goto('/');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Check if already authenticated (redirected to dashboard)
  const currentUrl = page.url();
  if (currentUrl.includes('/dashboard')) {
    console.log('✅ Already authenticated!');
    await page.context().storageState({ path: authFile });
    return;
  }

  // If manual login is needed, pause for user interaction
  // Uncomment the following for interactive authentication:
  // await page.pause(); // Opens Playwright Inspector for manual login

  // For now, we'll save empty state and only test public pages
  await page.context().storageState({ path: authFile });
});

/**
 * Creates a mock authenticated session for testing
 *
 * This is useful when you want to test protected pages without
 * going through the full OAuth flow.
 *
 * Usage:
 * 1. Add a test API route that sets up a session
 * 2. Call this function before testing protected pages
 *
 * Note: This requires modifying your app to support test auth
 */
export async function createMockSession(page: import('@playwright/test').Page) {
  // Example implementation - customize for your auth setup

  // Option 1: Set cookies directly (if you know the session cookie format)
  // await page.context().addCookies([
  //   {
  //     name: 'next-auth.session-token',
  //     value: 'test-session-token',
  //     domain: 'localhost',
  //     path: '/',
  //   },
  // ]);

  // Option 2: Call a test-only API endpoint
  // await page.goto('/api/test/create-session');

  // Option 3: Use environment variables with NextAuth
  // Set NEXTAUTH_SECRET and create a valid JWT token

  console.log('Mock session created (implement based on your auth setup)');
}

/**
 * Helper to check if current page requires authentication
 */
export function isProtectedRoute(path: string): boolean {
  const protectedPaths = [
    '/dashboard',
    '/twitch',
    '/submissions',
    '/region',
    '/profile',
    '/about',
    '/community',
    '/activity',
    '/monthly-form',
    '/success',
    '/admin',
  ];

  return protectedPaths.some(
    protectedPath => path === protectedPath || path.startsWith(protectedPath + '/')
  );
}

/**
 * Helper to check if current page requires admin role
 */
export function isAdminRoute(path: string): boolean {
  return path.startsWith('/admin');
}
