import { test, expect } from '@playwright/test';
import {
  collectPerformanceMetrics,
  injectPerformanceObservers,
  analyzePerformance,
  formatMetricsReport,
  simulateNetworkConditions,
  simulateCPUThrottling,
  PerformanceMetrics,
  PerformanceIssue,
  PERFORMANCE_THRESHOLDS,
} from './performance-utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * All pages in the Birds App to test
 * Grouped by access level for proper test organization
 */
const PUBLIC_PAGES = [
  { path: '/', name: 'Login Page' },
  { path: '/auth/error', name: 'Auth Error Page' },
];

// Pre-flight check to verify server is running
test.describe('Pre-flight Check', () => {
  test('Server is accessible', async ({ page }) => {
    console.log('\n🔍 Checking server connectivity...');
    console.log(`   Target: ${process.env.TEST_URL || 'http://localhost:3000'}`);

    try {
      const response = await page.goto('/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      if (!response) {
        throw new Error('No response received from server');
      }

      const status = response.status();
      console.log(`   Response status: ${status}`);

      if (status >= 500) {
        const body = await page.content();
        console.error('\n❌ Server returned an error:');
        console.error(body.substring(0, 500));
        throw new Error(`Server error: ${status}`);
      }

      console.log('   ✅ Server is accessible\n');
    } catch (error) {
      console.error('\n❌ Failed to connect to server!');
      console.error('\nPossible causes:');
      console.error('  1. Dev server is not running (run: npm run dev)');
      console.error('  2. Missing .env.local file');
      console.error('  3. Database connection failed');
      console.error('  4. Port 3000 is not available');
      console.error('\nTo debug, run: npm run dev');
      console.error(`\nError: ${error}`);
      throw error;
    }
  });
});

const PROTECTED_PAGES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/twitch', name: 'Bird Submission Form' },
  { path: '/submissions', name: 'Submissions History' },
  { path: '/region', name: 'Region Selector' },
  { path: '/profile', name: 'User Profile' },
  { path: '/about', name: 'About Page' },
  { path: '/community', name: 'Community Leaderboard' },
  { path: '/activity', name: 'Activity Feed' },
  { path: '/monthly-form', name: 'Monthly Form' },
];

const ADMIN_PAGES = [
  { path: '/admin', name: 'Admin Dashboard' },
  { path: '/admin/users', name: 'User Management' },
  { path: '/admin/settings', name: 'Admin Settings' },
  { path: '/admin/elimination', name: 'Elimination Management' },
];

// Store all results for summary report
const allResults: {
  pageName: string;
  path: string;
  metrics: PerformanceMetrics;
  issues: PerformanceIssue[];
}[] = [];

test.describe('Performance Tests - Public Pages', () => {
  for (const page of PUBLIC_PAGES) {
    test(`${page.name} (${page.path})`, async ({ page: browserPage }) => {
      // Inject observers before navigation
      await injectPerformanceObservers(browserPage);

      // Navigate to the page
      const startTime = Date.now();
      await browserPage.goto(page.path, { waitUntil: 'networkidle' });
      const navigationTime = Date.now() - startTime;

      // Wait a bit for LCP and CLS to stabilize
      await browserPage.waitForTimeout(1000);

      // Collect metrics
      const metrics = await collectPerformanceMetrics(browserPage);
      const issues = analyzePerformance(metrics);

      // Store for summary
      allResults.push({ pageName: page.name, path: page.path, metrics, issues });

      // Log report
      console.log(formatMetricsReport(metrics, issues));

      // Assert Core Web Vitals are within acceptable range
      expect(metrics.ttfb, 'TTFB should be acceptable').toBeLessThan(
        PERFORMANCE_THRESHOLDS.TTFB.needsImprovement
      );
      expect(metrics.fcp, 'FCP should be acceptable').toBeLessThan(
        PERFORMANCE_THRESHOLDS.FCP.needsImprovement
      );

      // Soft assertion for warnings (test passes but logs issues)
      if (issues.filter(i => i.severity === 'critical').length > 0) {
        console.warn(`⚠️ Critical performance issues found on ${page.name}`);
      }
    });
  }
});

test.describe('Performance Tests - Protected Pages (Simulated)', () => {
  // Note: These tests simulate protected page access
  // For full testing, you'll need to set up authentication
  // See the auth-setup.ts file for session persistence

  for (const page of PROTECTED_PAGES) {
    test(`${page.name} (${page.path}) - Unauthenticated redirect timing`, async ({
      page: browserPage,
    }) => {
      await injectPerformanceObservers(browserPage);

      // Test redirect performance (without auth, will redirect to login)
      const startTime = Date.now();
      const response = await browserPage.goto(page.path, { waitUntil: 'networkidle' });
      const navigationTime = Date.now() - startTime;

      // Check redirect happened and measure timing
      const finalUrl = browserPage.url();
      const wasRedirected = !finalUrl.includes(page.path);

      if (wasRedirected) {
        console.log(
          `📍 ${page.name}: Redirected to ${finalUrl} in ${navigationTime}ms`
        );
        // Redirect should be fast
        expect(navigationTime, 'Redirect should be fast').toBeLessThan(3000);
      } else {
        // Page loaded directly (shouldn't happen without auth)
        const metrics = await collectPerformanceMetrics(browserPage);
        const issues = analyzePerformance(metrics);
        allResults.push({ pageName: page.name, path: page.path, metrics, issues });
        console.log(formatMetricsReport(metrics, issues));
      }
    });
  }
});

test.describe('Performance Tests - Network Conditions', () => {
  test('Dashboard on Slow 3G', async ({ page: browserPage }) => {
    await injectPerformanceObservers(browserPage);
    await simulateNetworkConditions(browserPage, 'slow-3g');

    const startTime = Date.now();
    await browserPage.goto('/', { waitUntil: 'networkidle', timeout: 60000 });
    const loadTime = Date.now() - startTime;

    console.log(`\n📱 Slow 3G Load Time: ${loadTime}ms\n`);

    const metrics = await collectPerformanceMetrics(browserPage);
    const issues = analyzePerformance(metrics);
    console.log(formatMetricsReport(metrics, issues));

    // On slow 3G, we allow more generous thresholds
    expect(loadTime, 'Page should load within 30s on slow 3G').toBeLessThan(30000);
  });

  test('Dashboard on Fast 3G', async ({ page: browserPage }) => {
    await injectPerformanceObservers(browserPage);
    await simulateNetworkConditions(browserPage, 'fast-3g');

    const startTime = Date.now();
    await browserPage.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    const loadTime = Date.now() - startTime;

    console.log(`\n📱 Fast 3G Load Time: ${loadTime}ms\n`);

    const metrics = await collectPerformanceMetrics(browserPage);
    console.log(formatMetricsReport(metrics, analyzePerformance(metrics)));

    expect(loadTime, 'Page should load within 15s on fast 3G').toBeLessThan(15000);
  });
});

test.describe('Performance Tests - CPU Throttling', () => {
  test('Login page with 4x CPU slowdown (simulating low-end device)', async ({
    page: browserPage,
  }) => {
    await injectPerformanceObservers(browserPage);
    await simulateCPUThrottling(browserPage, 4);

    const startTime = Date.now();
    await browserPage.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    await browserPage.waitForTimeout(2000); // Wait for any animations

    const metrics = await collectPerformanceMetrics(browserPage);
    const issues = analyzePerformance(metrics);

    console.log(`\n🐌 4x CPU Slowdown Load Time: ${loadTime}ms`);
    console.log(formatMetricsReport(metrics, issues));

    // Check for blocking time issues (more likely with CPU throttling)
    const tbtIssues = issues.filter(i => i.metric === 'TBT');
    if (tbtIssues.length > 0) {
      console.warn('⚠️ High blocking time detected with CPU throttling');
      console.warn('   This indicates JavaScript execution is heavy');
    }
  });
});

test.describe('Performance Tests - Interactions', () => {
  test('Measure interaction responsiveness on login page', async ({ page: browserPage }) => {
    await browserPage.goto('/', { waitUntil: 'networkidle' });

    // Find interactive elements
    const buttons = browserPage.locator('button');
    const links = browserPage.locator('a');

    const buttonCount = await buttons.count();
    const linkCount = await links.count();

    console.log(`\n🖱️ Interactive elements found:`);
    console.log(`   Buttons: ${buttonCount}`);
    console.log(`   Links: ${linkCount}`);

    // Test click responsiveness on first button (if any)
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      const isVisible = await firstButton.isVisible();

      if (isVisible) {
        const startTime = Date.now();
        await firstButton.click({ trial: true }); // trial: true = don't actually click
        const responseTime = Date.now() - startTime;

        console.log(`   Button response time: ${responseTime}ms`);
        expect(responseTime, 'Button should respond quickly').toBeLessThan(100);
      }
    }
  });
});

// Generate summary report after all tests
test.afterAll(async () => {
  if (allResults.length === 0) return;

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              PERFORMANCE TEST SUMMARY                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Sort by LCP (worst first)
  const sorted = [...allResults].sort((a, b) => b.metrics.lcp - a.metrics.lcp);

  console.log('\n📊 Pages Ranked by LCP (slowest first):');
  console.log('─'.repeat(60));

  sorted.forEach((result, i) => {
    const criticalCount = result.issues.filter(i => i.severity === 'critical').length;
    const warningCount = result.issues.filter(i => i.severity === 'warning').length;
    const status =
      criticalCount > 0 ? '🔴' : warningCount > 0 ? '🟡' : '✅';

    console.log(
      `${status} ${i + 1}. ${result.pageName.padEnd(25)} LCP: ${result.metrics.lcp
        .toFixed(0)
        .padStart(6)}ms | FCP: ${result.metrics.fcp
        .toFixed(0)
        .padStart(5)}ms | TBT: ${result.metrics.totalBlockingTime
        .toFixed(0)
        .padStart(5)}ms`
    );
  });

  // Common issues across pages
  const allIssues = allResults.flatMap(r => r.issues);
  const issuesByMetric = allIssues.reduce((acc, issue) => {
    const key = issue.metric;
    if (!acc[key]) acc[key] = { count: 0, severity: issue.severity };
    acc[key].count++;
    if (issue.severity === 'critical') acc[key].severity = 'critical';
    return acc;
  }, {} as Record<string, { count: number; severity: string }>);

  if (Object.keys(issuesByMetric).length > 0) {
    console.log('\n📋 Most Common Issues:');
    console.log('─'.repeat(60));

    Object.entries(issuesByMetric)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([metric, data]) => {
        const icon = data.severity === 'critical' ? '🔴' : '🟡';
        console.log(`${icon} ${metric}: Found on ${data.count} page(s)`);
      });
  }

  // Write detailed JSON report
  const reportPath = path.join(process.cwd(), 'performance-reports', 'detailed-results.json');
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        summary: {
          totalPages: allResults.length,
          criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
          warnings: allIssues.filter(i => i.severity === 'warning').length,
        },
        results: allResults.map(r => ({
          page: r.pageName,
          path: r.path,
          coreWebVitals: {
            ttfb: r.metrics.ttfb,
            fcp: r.metrics.fcp,
            lcp: r.metrics.lcp,
            cls: r.metrics.cls,
            tbt: r.metrics.totalBlockingTime,
          },
          resources: {
            count: r.metrics.resourceCount,
            totalSize: r.metrics.totalTransferSize,
            jsSize: r.metrics.jsTransferSize,
            cssSize: r.metrics.cssTransferSize,
            imageSize: r.metrics.imageTransferSize,
          },
          issues: r.issues,
        })),
      },
      null,
      2
    )
  );

  console.log(`\n📁 Detailed report saved to: ${reportPath}`);
  console.log('─'.repeat(60));
});
