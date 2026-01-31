import { defineConfig, devices } from '@playwright/test';

/**
 * Performance Testing Configuration for Birds App
 *
 * This config is optimized for measuring page performance metrics
 * including Core Web Vitals (LCP, CLS, FCP, INP, TTFB)
 */
export default defineConfig({
  testDir: './tests/performance',
  fullyParallel: false, // Run sequentially for consistent performance measurements
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for performance tests - we want accurate measurements
  workers: 1, // Single worker for consistent CPU usage
  timeout: 60000, // 60 second timeout per test
  expect: {
    timeout: 10000, // 10 second timeout for assertions
  },
  reporter: [
    ['html', { outputFolder: 'performance-reports' }],
    ['json', { outputFile: 'performance-reports/results.json' }],
    ['list']
  ],

  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    trace: 'on', // Capture traces for debugging
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 30000, // 30 second navigation timeout
    actionTimeout: 15000, // 15 second action timeout
  },

  projects: [
    // Desktop Chrome - Primary testing target
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      },
    },
    // Mobile viewport for responsive performance
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      },
    },
    // Simulated slow network
    {
      name: 'Slow 3G',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info']
        },
      },
    },
  ],

  // Web server for local testing
  // IMPORTANT: Make sure your .env.local file exists and has valid DATABASE_URL
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse if available
    timeout: 180000, // 3 minute timeout for server startup
    stdout: 'pipe', // Show server output for debugging
    stderr: 'pipe',
  },
});
