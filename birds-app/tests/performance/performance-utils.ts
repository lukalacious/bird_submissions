import { Page, CDPSession } from '@playwright/test';

/**
 * Core Web Vitals thresholds (in milliseconds unless noted)
 * Based on Google's recommendations for good user experience
 */
export const PERFORMANCE_THRESHOLDS = {
  // Largest Contentful Paint - should be < 2.5s
  LCP: { good: 2500, needsImprovement: 4000 },
  // First Contentful Paint - should be < 1.8s
  FCP: { good: 1800, needsImprovement: 3000 },
  // Time to First Byte - should be < 800ms
  TTFB: { good: 800, needsImprovement: 1800 },
  // Cumulative Layout Shift - should be < 0.1 (unitless)
  CLS: { good: 0.1, needsImprovement: 0.25 },
  // Total Blocking Time - should be < 200ms
  TBT: { good: 200, needsImprovement: 600 },
  // Time to Interactive - should be < 3.8s
  TTI: { good: 3800, needsImprovement: 7300 },
  // Speed Index - should be < 3.4s
  SI: { good: 3400, needsImprovement: 5800 },
};

export interface PerformanceMetrics {
  url: string;
  timestamp: Date;

  // Navigation Timing API metrics
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  domContentLoaded: number;
  loadComplete: number;

  // Layout Shift
  cls: number; // Cumulative Layout Shift

  // JavaScript execution
  totalBlockingTime: number;
  longTasks: LongTaskMetric[];

  // Resource metrics
  resourceCount: number;
  totalTransferSize: number;
  jsTransferSize: number;
  cssTransferSize: number;
  imageTransferSize: number;

  // Memory (if available)
  jsHeapSize?: number;

  // Custom metrics
  hydrationTime?: number;
}

export interface LongTaskMetric {
  duration: number;
  startTime: number;
  attribution?: string;
}

export interface PerformanceIssue {
  severity: 'critical' | 'warning' | 'info';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  cause: string;
  solution: string;
}

/**
 * Collects comprehensive performance metrics from a page
 */
export async function collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    // Get FCP
    const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
    const fcp = fcpEntry?.startTime || 0;

    // Get LCP via PerformanceObserver result (we'll inject this)
    const lcpValue = (window as unknown as { __LCP_VALUE__?: number }).__LCP_VALUE__ || 0;

    // Get CLS via PerformanceObserver result
    const clsValue = (window as unknown as { __CLS_VALUE__?: number }).__CLS_VALUE__ || 0;

    // Get Long Tasks
    const longTasks = (window as unknown as { __LONG_TASKS__?: LongTaskMetric[] }).__LONG_TASKS__ || [];

    // Calculate resource sizes by type
    let jsSize = 0, cssSize = 0, imageSize = 0, totalSize = 0;
    resourceEntries.forEach(entry => {
      const size = entry.transferSize || 0;
      totalSize += size;
      if (entry.initiatorType === 'script' || entry.name.endsWith('.js')) {
        jsSize += size;
      } else if (entry.initiatorType === 'css' || entry.name.endsWith('.css')) {
        cssSize += size;
      } else if (entry.initiatorType === 'img' || /\.(png|jpg|jpeg|gif|webp|svg|ico)/.test(entry.name)) {
        imageSize += size;
      }
    });

    // Memory info (Chrome only)
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;

    return {
      ttfb: navigation.responseStart - navigation.requestStart,
      fcp,
      lcp: lcpValue,
      cls: clsValue,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
      loadComplete: navigation.loadEventEnd - navigation.startTime,
      longTasks,
      resourceCount: resourceEntries.length,
      totalTransferSize: totalSize,
      jsTransferSize: jsSize,
      cssTransferSize: cssSize,
      imageTransferSize: imageSize,
      jsHeapSize: memory?.usedJSHeapSize,
    };
  });

  // Calculate Total Blocking Time from long tasks
  const tbt = metrics.longTasks.reduce((sum, task) => {
    const blockingTime = Math.max(0, task.duration - 50); // Tasks > 50ms are blocking
    return sum + blockingTime;
  }, 0);

  return {
    url: page.url(),
    timestamp: new Date(),
    ttfb: metrics.ttfb,
    fcp: metrics.fcp,
    lcp: metrics.lcp,
    cls: metrics.cls,
    domContentLoaded: metrics.domContentLoaded,
    loadComplete: metrics.loadComplete,
    totalBlockingTime: tbt,
    longTasks: metrics.longTasks,
    resourceCount: metrics.resourceCount,
    totalTransferSize: metrics.totalTransferSize,
    jsTransferSize: metrics.jsTransferSize,
    cssTransferSize: metrics.cssTransferSize,
    imageTransferSize: metrics.imageTransferSize,
    jsHeapSize: metrics.jsHeapSize,
  };
}

/**
 * Injects performance observers before navigation
 * This must be called before navigating to capture LCP, CLS, and Long Tasks
 */
export async function injectPerformanceObservers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // LCP Observer
    (window as unknown as { __LCP_VALUE__: number }).__LCP_VALUE__ = 0;
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      (window as unknown as { __LCP_VALUE__: number }).__LCP_VALUE__ = lastEntry.startTime;
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // CLS Observer
    (window as unknown as { __CLS_VALUE__: number }).__CLS_VALUE__ = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as unknown as { hadRecentInput: boolean; value: number };
        if (!layoutShift.hadRecentInput) {
          (window as unknown as { __CLS_VALUE__: number }).__CLS_VALUE__ += layoutShift.value;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Long Tasks Observer
    (window as unknown as { __LONG_TASKS__: LongTaskMetric[] }).__LONG_TASKS__ = [];
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as unknown as { __LONG_TASKS__: LongTaskMetric[] }).__LONG_TASKS__.push({
          duration: entry.duration,
          startTime: entry.startTime,
        });
      }
    });
    try {
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {
      // Long task observer not supported in all browsers
    }
  });
}

/**
 * Analyzes metrics and returns identified performance issues
 */
export function analyzePerformance(metrics: PerformanceMetrics): PerformanceIssue[] {
  const issues: PerformanceIssue[] = [];

  // Check TTFB
  if (metrics.ttfb > PERFORMANCE_THRESHOLDS.TTFB.needsImprovement) {
    issues.push({
      severity: 'critical',
      metric: 'TTFB',
      value: metrics.ttfb,
      threshold: PERFORMANCE_THRESHOLDS.TTFB.good,
      message: `Time to First Byte is ${metrics.ttfb.toFixed(0)}ms (should be < ${PERFORMANCE_THRESHOLDS.TTFB.good}ms)`,
      cause: 'Slow server response, database queries, or network latency',
      solution: `
        1. Optimize database queries (add indexes, reduce N+1 queries)
        2. Add server-side caching (Redis, in-memory cache)
        3. Use CDN for static assets
        4. Consider edge functions for dynamic content
        5. Check Prisma query performance with logging
      `.trim(),
    });
  } else if (metrics.ttfb > PERFORMANCE_THRESHOLDS.TTFB.good) {
    issues.push({
      severity: 'warning',
      metric: 'TTFB',
      value: metrics.ttfb,
      threshold: PERFORMANCE_THRESHOLDS.TTFB.good,
      message: `Time to First Byte is ${metrics.ttfb.toFixed(0)}ms (should be < ${PERFORMANCE_THRESHOLDS.TTFB.good}ms)`,
      cause: 'Moderately slow server response',
      solution: 'Review server-side data fetching and consider caching strategies',
    });
  }

  // Check FCP
  if (metrics.fcp > PERFORMANCE_THRESHOLDS.FCP.needsImprovement) {
    issues.push({
      severity: 'critical',
      metric: 'FCP',
      value: metrics.fcp,
      threshold: PERFORMANCE_THRESHOLDS.FCP.good,
      message: `First Contentful Paint is ${metrics.fcp.toFixed(0)}ms (should be < ${PERFORMANCE_THRESHOLDS.FCP.good}ms)`,
      cause: 'Render-blocking resources, large initial bundle, or slow fonts',
      solution: `
        1. Reduce JavaScript bundle size with dynamic imports
        2. Use next/font for optimized font loading
        3. Preload critical resources
        4. Remove unused CSS/JS with tree-shaking
        5. Consider skeleton loaders for perceived performance
      `.trim(),
    });
  } else if (metrics.fcp > PERFORMANCE_THRESHOLDS.FCP.good) {
    issues.push({
      severity: 'warning',
      metric: 'FCP',
      value: metrics.fcp,
      threshold: PERFORMANCE_THRESHOLDS.FCP.good,
      message: `First Contentful Paint is ${metrics.fcp.toFixed(0)}ms`,
      cause: 'Some render-blocking resources or initial bundle size',
      solution: 'Audit render-blocking resources and consider code splitting',
    });
  }

  // Check LCP
  if (metrics.lcp > PERFORMANCE_THRESHOLDS.LCP.needsImprovement) {
    issues.push({
      severity: 'critical',
      metric: 'LCP',
      value: metrics.lcp,
      threshold: PERFORMANCE_THRESHOLDS.LCP.good,
      message: `Largest Contentful Paint is ${metrics.lcp.toFixed(0)}ms (should be < ${PERFORMANCE_THRESHOLDS.LCP.good}ms)`,
      cause: 'Slow-loading hero image, large text blocks, or delayed data fetching',
      solution: `
        1. Optimize images with next/image and priority prop
        2. Preload LCP images: <link rel="preload" as="image">
        3. Use responsive images with srcset
        4. Reduce server data fetching time
        5. Consider static generation for content pages
        6. Lazy load below-the-fold content
      `.trim(),
    });
  } else if (metrics.lcp > PERFORMANCE_THRESHOLDS.LCP.good) {
    issues.push({
      severity: 'warning',
      metric: 'LCP',
      value: metrics.lcp,
      threshold: PERFORMANCE_THRESHOLDS.LCP.good,
      message: `Largest Contentful Paint is ${metrics.lcp.toFixed(0)}ms`,
      cause: 'LCP element loading could be optimized',
      solution: 'Identify LCP element and optimize its loading priority',
    });
  }

  // Check CLS
  if (metrics.cls > PERFORMANCE_THRESHOLDS.CLS.needsImprovement) {
    issues.push({
      severity: 'critical',
      metric: 'CLS',
      value: metrics.cls,
      threshold: PERFORMANCE_THRESHOLDS.CLS.good,
      message: `Cumulative Layout Shift is ${metrics.cls.toFixed(3)} (should be < ${PERFORMANCE_THRESHOLDS.CLS.good})`,
      cause: 'Images without dimensions, dynamic content injection, or web fonts',
      solution: `
        1. Always set width/height on images (next/image does this)
        2. Reserve space for dynamic content with CSS
        3. Use font-display: optional or swap with fallback
        4. Avoid inserting content above existing content
        5. Use CSS transforms for animations instead of layout properties
      `.trim(),
    });
  } else if (metrics.cls > PERFORMANCE_THRESHOLDS.CLS.good) {
    issues.push({
      severity: 'warning',
      metric: 'CLS',
      value: metrics.cls,
      threshold: PERFORMANCE_THRESHOLDS.CLS.good,
      message: `Cumulative Layout Shift is ${metrics.cls.toFixed(3)}`,
      cause: 'Minor layout shifts detected',
      solution: 'Review dynamic content loading and ensure dimensions are reserved',
    });
  }

  // Check Total Blocking Time
  if (metrics.totalBlockingTime > PERFORMANCE_THRESHOLDS.TBT.needsImprovement) {
    issues.push({
      severity: 'critical',
      metric: 'TBT',
      value: metrics.totalBlockingTime,
      threshold: PERFORMANCE_THRESHOLDS.TBT.good,
      message: `Total Blocking Time is ${metrics.totalBlockingTime.toFixed(0)}ms (should be < ${PERFORMANCE_THRESHOLDS.TBT.good}ms)`,
      cause: 'Long JavaScript execution blocking main thread',
      solution: `
        1. Break up long tasks with requestIdleCallback or setTimeout
        2. Use Web Workers for heavy computations
        3. Defer non-critical JavaScript
        4. Code-split large components with dynamic imports
        5. Optimize React re-renders with memo/useMemo/useCallback
        6. Check for expensive Framer Motion animations
      `.trim(),
    });
  } else if (metrics.totalBlockingTime > PERFORMANCE_THRESHOLDS.TBT.good) {
    issues.push({
      severity: 'warning',
      metric: 'TBT',
      value: metrics.totalBlockingTime,
      threshold: PERFORMANCE_THRESHOLDS.TBT.good,
      message: `Total Blocking Time is ${metrics.totalBlockingTime.toFixed(0)}ms`,
      cause: 'Some long tasks detected',
      solution: 'Review JavaScript execution and consider breaking up long tasks',
    });
  }

  // Check bundle sizes
  const jsSizeMB = metrics.jsTransferSize / 1024 / 1024;
  if (jsSizeMB > 1) {
    issues.push({
      severity: 'critical',
      metric: 'JS Bundle Size',
      value: metrics.jsTransferSize,
      threshold: 500 * 1024,
      message: `JavaScript bundle is ${jsSizeMB.toFixed(2)}MB (should be < 500KB)`,
      cause: 'Large dependencies, no code splitting, or bundled unused code',
      solution: `
        1. Analyze bundle with next build --analyze
        2. Use dynamic imports for heavy components
        3. Replace large libraries with lighter alternatives
        4. Enable tree-shaking in webpack config
        5. Check for duplicate dependencies
      `.trim(),
    });
  } else if (jsSizeMB > 0.5) {
    issues.push({
      severity: 'warning',
      metric: 'JS Bundle Size',
      value: metrics.jsTransferSize,
      threshold: 500 * 1024,
      message: `JavaScript bundle is ${jsSizeMB.toFixed(2)}MB`,
      cause: 'Bundle size could be reduced',
      solution: 'Consider code splitting and removing unused dependencies',
    });
  }

  // Check for many long tasks
  if (metrics.longTasks.length > 5) {
    issues.push({
      severity: 'warning',
      metric: 'Long Tasks Count',
      value: metrics.longTasks.length,
      threshold: 5,
      message: `${metrics.longTasks.length} long tasks detected (tasks > 50ms)`,
      cause: 'Multiple JavaScript operations blocking the main thread',
      solution: 'Profile with Chrome DevTools Performance tab to identify specific bottlenecks',
    });
  }

  // Check total resource count
  if (metrics.resourceCount > 100) {
    issues.push({
      severity: 'warning',
      metric: 'Resource Count',
      value: metrics.resourceCount,
      threshold: 100,
      message: `${metrics.resourceCount} network requests made`,
      cause: 'Too many HTTP requests impacting load time',
      solution: `
        1. Bundle small files together
        2. Use CSS sprites for icons
        3. Lazy load images and components
        4. Consider HTTP/2 or HTTP/3 for multiplexing
      `.trim(),
    });
  }

  return issues;
}

/**
 * Formats metrics into a readable report
 */
export function formatMetricsReport(metrics: PerformanceMetrics, issues: PerformanceIssue[]): string {
  const lines: string[] = [];

  lines.push(`\n${'═'.repeat(60)}`);
  lines.push(`  PERFORMANCE REPORT: ${metrics.url}`);
  lines.push(`${'═'.repeat(60)}`);
  lines.push(`  Timestamp: ${metrics.timestamp.toISOString()}\n`);

  lines.push(`  📊 CORE WEB VITALS`);
  lines.push(`  ${'─'.repeat(40)}`);
  lines.push(`  TTFB:  ${metrics.ttfb.toFixed(0)}ms ${getStatusIcon(metrics.ttfb, PERFORMANCE_THRESHOLDS.TTFB)}`);
  lines.push(`  FCP:   ${metrics.fcp.toFixed(0)}ms ${getStatusIcon(metrics.fcp, PERFORMANCE_THRESHOLDS.FCP)}`);
  lines.push(`  LCP:   ${metrics.lcp.toFixed(0)}ms ${getStatusIcon(metrics.lcp, PERFORMANCE_THRESHOLDS.LCP)}`);
  lines.push(`  CLS:   ${metrics.cls.toFixed(3)} ${getStatusIcon(metrics.cls, PERFORMANCE_THRESHOLDS.CLS)}`);
  lines.push(`  TBT:   ${metrics.totalBlockingTime.toFixed(0)}ms ${getStatusIcon(metrics.totalBlockingTime, PERFORMANCE_THRESHOLDS.TBT)}`);
  lines.push('');

  lines.push(`  📦 RESOURCE BREAKDOWN`);
  lines.push(`  ${'─'.repeat(40)}`);
  lines.push(`  Total Resources: ${metrics.resourceCount}`);
  lines.push(`  Total Size:      ${formatBytes(metrics.totalTransferSize)}`);
  lines.push(`  JavaScript:      ${formatBytes(metrics.jsTransferSize)}`);
  lines.push(`  CSS:             ${formatBytes(metrics.cssTransferSize)}`);
  lines.push(`  Images:          ${formatBytes(metrics.imageTransferSize)}`);
  if (metrics.jsHeapSize) {
    lines.push(`  JS Heap:         ${formatBytes(metrics.jsHeapSize)}`);
  }
  lines.push('');

  lines.push(`  ⏱️  TIMING`);
  lines.push(`  ${'─'.repeat(40)}`);
  lines.push(`  DOM Content Loaded: ${metrics.domContentLoaded.toFixed(0)}ms`);
  lines.push(`  Load Complete:      ${metrics.loadComplete.toFixed(0)}ms`);
  lines.push(`  Long Tasks:         ${metrics.longTasks.length}`);
  lines.push('');

  if (issues.length > 0) {
    lines.push(`  ⚠️  ISSUES FOUND (${issues.length})`);
    lines.push(`  ${'─'.repeat(40)}`);

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warningIssues = issues.filter(i => i.severity === 'warning');

    if (criticalIssues.length > 0) {
      lines.push(`\n  🔴 CRITICAL (${criticalIssues.length})`);
      criticalIssues.forEach((issue, i) => {
        lines.push(`\n  ${i + 1}. ${issue.message}`);
        lines.push(`     Cause: ${issue.cause}`);
        lines.push(`     Solution:`);
        issue.solution.split('\n').forEach(line => {
          lines.push(`       ${line.trim()}`);
        });
      });
    }

    if (warningIssues.length > 0) {
      lines.push(`\n  🟡 WARNINGS (${warningIssues.length})`);
      warningIssues.forEach((issue, i) => {
        lines.push(`\n  ${i + 1}. ${issue.message}`);
        lines.push(`     Cause: ${issue.cause}`);
        lines.push(`     Solution:`);
        issue.solution.split('\n').forEach(line => {
          lines.push(`       ${line.trim()}`);
        });
      });
    }
  } else {
    lines.push(`  ✅ NO ISSUES FOUND - Performance looks good!`);
  }

  lines.push(`\n${'═'.repeat(60)}\n`);

  return lines.join('\n');
}

function getStatusIcon(value: number, threshold: { good: number; needsImprovement: number }): string {
  if (value <= threshold.good) return '✅';
  if (value <= threshold.needsImprovement) return '🟡';
  return '🔴';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Simulates network conditions for testing
 */
export async function simulateNetworkConditions(
  page: Page,
  preset: 'fast-3g' | 'slow-3g' | 'offline'
): Promise<void> {
  const cdpSession = await page.context().newCDPSession(page);

  const conditions = {
    'fast-3g': {
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 100,
    },
    'slow-3g': {
      offline: false,
      downloadThroughput: 400 * 1024 / 8, // 400 Kbps
      uploadThroughput: 400 * 1024 / 8,
      latency: 400,
    },
    'offline': {
      offline: true,
      downloadThroughput: 0,
      uploadThroughput: 0,
      latency: 0,
    },
  };

  await cdpSession.send('Network.emulateNetworkConditions', conditions[preset]);
}

/**
 * Simulates CPU throttling for testing on lower-end devices
 */
export async function simulateCPUThrottling(page: Page, rate: number = 4): Promise<void> {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send('Emulation.setCPUThrottlingRate', { rate });
}
