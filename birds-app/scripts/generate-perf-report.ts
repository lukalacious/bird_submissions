#!/usr/bin/env tsx
/**
 * Performance Report Generator
 *
 * Generates a comprehensive HTML report from performance test results
 * with detailed analysis, causes, and solutions for each issue.
 *
 * Usage: npx tsx scripts/generate-perf-report.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface PerformanceResult {
  page: string;
  path: string;
  coreWebVitals: {
    ttfb: number;
    fcp: number;
    lcp: number;
    cls: number;
    tbt: number;
  };
  resources: {
    count: number;
    totalSize: number;
    jsSize: number;
    cssSize: number;
    imageSize: number;
  };
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    metric: string;
    value: number;
    threshold: number;
    message: string;
    cause: string;
    solution: string;
  }>;
}

interface ReportData {
  timestamp: string;
  summary: {
    totalPages: number;
    criticalIssues: number;
    warnings: number;
  };
  results: PerformanceResult[];
}

// Common performance issues and detailed solutions
const DETAILED_SOLUTIONS: Record<
  string,
  {
    title: string;
    description: string;
    codeExamples: string[];
    quickWins: string[];
    deepDives: string[];
  }
> = {
  TTFB: {
    title: 'Time to First Byte (TTFB)',
    description:
      'TTFB measures the time from when the browser requests a page to when it receives the first byte of data. High TTFB indicates server-side performance issues.',
    codeExamples: [
      `// 1. Add caching to database queries
// In your server action or API route:
import { unstable_cache } from 'next/cache';

const getCachedData = unstable_cache(
  async (id: string) => {
    return await prisma.user.findUnique({ where: { id } });
  },
  ['user-data'],
  { revalidate: 60 } // Cache for 60 seconds
);`,
      `// 2. Use React Suspense for data fetching
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <DataComponent />
    </Suspense>
  );
}`,
      `// 3. Optimize Prisma queries with select
// Instead of:
const users = await prisma.user.findMany();

// Use selective fields:
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true }
});`,
    ],
    quickWins: [
      'Enable Prisma query logging to identify slow queries',
      'Add database indexes for frequently queried columns',
      'Use Vercel Edge Runtime for faster cold starts',
      'Implement Redis caching for repeated queries',
    ],
    deepDives: [
      'Profile your Prisma queries with @prisma/tracing',
      'Consider using Neon database branching for testing',
      'Review N+1 query patterns in your data fetching',
      'Implement connection pooling for Prisma',
    ],
  },
  FCP: {
    title: 'First Contentful Paint (FCP)',
    description:
      'FCP measures the time until the first text, image, or other content is painted. Slow FCP means users see a blank screen for too long.',
    codeExamples: [
      `// 1. Use next/font for optimized font loading
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Shows fallback font immediately
});`,
      `// 2. Preload critical resources in layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <link
          rel="preload"
          href="/critical-styles.css"
          as="style"
        />
        <link
          rel="preload"
          href="/hero-image.webp"
          as="image"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`,
      `// 3. Use skeleton loaders for perceived performance
export function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}`,
    ],
    quickWins: [
      'Move non-critical CSS below the fold',
      'Inline critical CSS in the HTML head',
      'Use font-display: swap for web fonts',
      'Defer non-essential JavaScript',
    ],
    deepDives: [
      'Analyze render-blocking resources in DevTools',
      'Consider CSS-in-JS extraction for critical path',
      'Review Tailwind CSS purge configuration',
      'Implement streaming SSR with React 18',
    ],
  },
  LCP: {
    title: 'Largest Contentful Paint (LCP)',
    description:
      'LCP measures when the largest content element (usually an image or text block) becomes visible. This is a key user experience metric.',
    codeExamples: [
      `// 1. Optimize hero images with next/image
import Image from 'next/image';

export function HeroSection() {
  return (
    <Image
      src="/hero.webp"
      alt="Hero"
      width={1200}
      height={600}
      priority // Preloads this image
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}`,
      `// 2. Preload LCP image in metadata
export const metadata = {
  other: {
    'link': [
      {
        rel: 'preload',
        href: '/hero.webp',
        as: 'image',
        fetchpriority: 'high',
      },
    ],
  },
};`,
      `// 3. Use generateStaticParams for static generation
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}`,
    ],
    quickWins: [
      'Add priority prop to above-the-fold images',
      'Use WebP/AVIF format for images',
      'Implement responsive images with srcset',
      'Preload the LCP element',
    ],
    deepDives: [
      'Identify LCP element using Performance tab in DevTools',
      'Consider using a CDN for image delivery',
      'Implement progressive image loading',
      'Review server-side rendering performance',
    ],
  },
  CLS: {
    title: 'Cumulative Layout Shift (CLS)',
    description:
      'CLS measures visual stability - how much content shifts around as the page loads. High CLS frustrates users as they try to interact with moving elements.',
    codeExamples: [
      `// 1. Always set dimensions on images
// next/image handles this automatically
<Image
  src="/photo.jpg"
  width={400}
  height={300}
  alt="Photo"
/>

// For regular img tags:
<img
  src="/photo.jpg"
  width="400"
  height="300"
  alt="Photo"
  style={{ aspectRatio: '4/3' }}
/>`,
      `// 2. Reserve space for dynamic content
// Use min-height for async content areas
<div className="min-h-[200px]">
  <Suspense fallback={<Skeleton />}>
    <DynamicContent />
  </Suspense>
</div>`,
      `// 3. Prevent font swapping layout shifts
// In tailwind.config.js or globals.css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2');
  font-display: optional; /* Prevents layout shift */
  size-adjust: 100%;
  ascent-override: 90%;
  descent-override: 20%;
}`,
    ],
    quickWins: [
      'Add explicit width/height to all images',
      'Use aspect-ratio CSS for responsive images',
      'Reserve space for ads/embeds with placeholders',
      'Avoid inserting content above existing content',
    ],
    deepDives: [
      'Use Layout Shift regions in DevTools to identify shifts',
      'Review animation implementations for transform usage',
      'Check for dynamic content injection patterns',
      'Test with throttled network to catch late-loading shifts',
    ],
  },
  TBT: {
    title: 'Total Blocking Time (TBT)',
    description:
      'TBT measures the total time that the main thread was blocked by long tasks (>50ms). High TBT means the page feels unresponsive to user input.',
    codeExamples: [
      `// 1. Use dynamic imports for heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(
  () => import('@/components/HeavyChart'),
  {
    loading: () => <p>Loading chart...</p>,
    ssr: false, // Only load on client
  }
);`,
      `// 2. Defer non-critical computations
// Instead of running immediately:
const result = expensiveCalculation(data);

// Use requestIdleCallback:
requestIdleCallback(() => {
  const result = expensiveCalculation(data);
  setResult(result);
});`,
      `// 3. Optimize React re-renders
import { memo, useMemo, useCallback } from 'react';

const ExpensiveList = memo(function ExpensiveList({ items }) {
  const sortedItems = useMemo(
    () => items.sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  return sortedItems.map(item => <Item key={item.id} {...item} />);
});`,
    ],
    quickWins: [
      'Code-split large components with dynamic imports',
      'Debounce expensive event handlers',
      'Use Web Workers for heavy computations',
      'Reduce Framer Motion animation complexity',
    ],
    deepDives: [
      'Profile JavaScript execution in DevTools Performance tab',
      'Review third-party script impact',
      'Consider React Server Components for heavy components',
      'Implement virtualization for long lists',
    ],
  },
  'JS Bundle Size': {
    title: 'JavaScript Bundle Size',
    description:
      'Large JavaScript bundles increase download time and parsing time, especially on mobile devices and slow networks.',
    codeExamples: [
      `// 1. Analyze your bundle
// Add to package.json scripts:
"analyze": "ANALYZE=true next build"

// Then in next.config.js:
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // your config
});`,
      `// 2. Tree-shake unused exports
// Instead of:
import { Button, Modal, Dropdown, all100Components } from 'ui-library';

// Import only what you need:
import { Button } from 'ui-library/button';`,
      `// 3. Replace heavy libraries
// Instead of moment.js (300KB):
import { format } from 'date-fns'; // 13KB

// Instead of lodash full:
import debounce from 'lodash/debounce';`,
    ],
    quickWins: [
      'Run bundle analyzer to identify large dependencies',
      'Replace moment.js with date-fns or dayjs',
      'Use named imports for tree-shaking',
      'Remove unused dependencies from package.json',
    ],
    deepDives: [
      'Review duplicate dependencies with npm ls',
      'Consider module/nomodule builds for modern browsers',
      'Implement route-based code splitting',
      'Audit third-party scripts for necessity',
    ],
  },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return '#dc2626';
    case 'warning':
      return '#f59e0b';
    default:
      return '#22c55e';
  }
}

function generateHTML(data: ReportData): string {
  const criticalIssues = data.results.flatMap(r =>
    r.issues.filter(i => i.severity === 'critical')
  );
  const warningIssues = data.results.flatMap(r =>
    r.issues.filter(i => i.severity === 'warning')
  );

  // Group issues by metric type
  const issuesByMetric = new Map<string, typeof criticalIssues>();
  [...criticalIssues, ...warningIssues].forEach(issue => {
    const existing = issuesByMetric.get(issue.metric) || [];
    existing.push(issue);
    issuesByMetric.set(issue.metric, existing);
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Report - Birds App</title>
  <style>
    :root {
      --bg: #0a0a0a;
      --card: #1a1a1a;
      --border: #2a2a2a;
      --text: #fafafa;
      --text-muted: #a1a1a1;
      --critical: #dc2626;
      --warning: #f59e0b;
      --success: #22c55e;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }

    .container { max-width: 1200px; margin: 0 auto; }

    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    h3 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; }
    h4 { font-size: 1rem; margin: 1rem 0 0.5rem; color: var(--text-muted); }

    .timestamp { color: var(--text-muted); margin-bottom: 2rem; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      text-align: center;
    }

    .summary-card .number { font-size: 2.5rem; font-weight: bold; }
    .summary-card .label { color: var(--text-muted); }
    .summary-card.critical .number { color: var(--critical); }
    .summary-card.warning .number { color: var(--warning); }
    .summary-card.success .number { color: var(--success); }

    .page-results {
      display: grid;
      gap: 1rem;
    }

    .page-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1.5rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .page-name { font-weight: 600; font-size: 1.1rem; }
    .page-path { color: var(--text-muted); font-size: 0.875rem; }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .metric {
      background: var(--bg);
      padding: 0.75rem;
      border-radius: 0.375rem;
      text-align: center;
    }

    .metric .value { font-size: 1.25rem; font-weight: 600; }
    .metric .label { font-size: 0.75rem; color: var(--text-muted); }
    .metric.good .value { color: var(--success); }
    .metric.warning .value { color: var(--warning); }
    .metric.critical .value { color: var(--critical); }

    .issues-list { margin-top: 1rem; }

    .issue {
      background: var(--bg);
      border-left: 3px solid;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
      border-radius: 0 0.375rem 0.375rem 0;
    }

    .issue.critical { border-color: var(--critical); }
    .issue.warning { border-color: var(--warning); }

    .issue-header { font-weight: 500; margin-bottom: 0.25rem; }
    .issue-cause { color: var(--text-muted); font-size: 0.875rem; }

    .solution-section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .solution-section h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .solution-description {
      color: var(--text-muted);
      margin-bottom: 1rem;
    }

    pre {
      background: #0d1117;
      padding: 1rem;
      border-radius: 0.375rem;
      overflow-x: auto;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    code { font-family: 'Fira Code', 'Monaco', monospace; }

    .quick-wins, .deep-dives {
      margin-top: 1rem;
    }

    .quick-wins ul, .deep-dives ul {
      list-style: none;
      padding: 0;
    }

    .quick-wins li, .deep-dives li {
      padding: 0.5rem 0;
      padding-left: 1.5rem;
      position: relative;
    }

    .quick-wins li::before {
      content: '⚡';
      position: absolute;
      left: 0;
    }

    .deep-dives li::before {
      content: '🔍';
      position: absolute;
      left: 0;
    }

    .no-issues {
      background: var(--card);
      border: 1px solid var(--success);
      border-radius: 0.5rem;
      padding: 2rem;
      text-align: center;
      color: var(--success);
    }

    @media (max-width: 768px) {
      body { padding: 1rem; }
      .metrics-grid { grid-template-columns: repeat(3, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🐦 Birds App Performance Report</h1>
    <p class="timestamp">Generated: ${new Date(data.timestamp).toLocaleString()}</p>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="number">${data.summary.totalPages}</div>
        <div class="label">Pages Tested</div>
      </div>
      <div class="summary-card ${data.summary.criticalIssues > 0 ? 'critical' : 'success'}">
        <div class="number">${data.summary.criticalIssues}</div>
        <div class="label">Critical Issues</div>
      </div>
      <div class="summary-card ${data.summary.warnings > 0 ? 'warning' : 'success'}">
        <div class="number">${data.summary.warnings}</div>
        <div class="label">Warnings</div>
      </div>
      <div class="summary-card success">
        <div class="number">${data.results.filter(r => r.issues.length === 0).length}</div>
        <div class="label">Clean Pages</div>
      </div>
    </div>

    <h2>📊 Page Performance Results</h2>
    <div class="page-results">
      ${data.results
        .sort((a, b) => b.coreWebVitals.lcp - a.coreWebVitals.lcp)
        .map(result => {
          const getMetricClass = (value: number, good: number, bad: number) => {
            if (value <= good) return 'good';
            if (value <= bad) return 'warning';
            return 'critical';
          };

          return `
        <div class="page-card">
          <div class="page-header">
            <div>
              <div class="page-name">${result.page}</div>
              <div class="page-path">${result.path}</div>
            </div>
            <div>
              ${
                result.issues.filter(i => i.severity === 'critical').length > 0
                  ? '🔴'
                  : result.issues.length > 0
                  ? '🟡'
                  : '✅'
              }
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric ${getMetricClass(result.coreWebVitals.ttfb, 800, 1800)}">
              <div class="value">${Math.round(result.coreWebVitals.ttfb)}ms</div>
              <div class="label">TTFB</div>
            </div>
            <div class="metric ${getMetricClass(result.coreWebVitals.fcp, 1800, 3000)}">
              <div class="value">${Math.round(result.coreWebVitals.fcp)}ms</div>
              <div class="label">FCP</div>
            </div>
            <div class="metric ${getMetricClass(result.coreWebVitals.lcp, 2500, 4000)}">
              <div class="value">${Math.round(result.coreWebVitals.lcp)}ms</div>
              <div class="label">LCP</div>
            </div>
            <div class="metric ${getMetricClass(result.coreWebVitals.cls, 0.1, 0.25)}">
              <div class="value">${result.coreWebVitals.cls.toFixed(3)}</div>
              <div class="label">CLS</div>
            </div>
            <div class="metric ${getMetricClass(result.coreWebVitals.tbt, 200, 600)}">
              <div class="value">${Math.round(result.coreWebVitals.tbt)}ms</div>
              <div class="label">TBT</div>
            </div>
            <div class="metric">
              <div class="value">${formatBytes(result.resources.jsSize)}</div>
              <div class="label">JS Size</div>
            </div>
          </div>

          ${
            result.issues.length > 0
              ? `
            <div class="issues-list">
              ${result.issues
                .map(
                  issue => `
                <div class="issue ${issue.severity}">
                  <div class="issue-header">${issue.message}</div>
                  <div class="issue-cause">Cause: ${issue.cause}</div>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : ''
          }
        </div>
      `;
        })
        .join('')}
    </div>

    ${
      issuesByMetric.size > 0
        ? `
      <h2>🛠️ Solutions & Recommendations</h2>
      ${Array.from(issuesByMetric.entries())
        .map(([metric, issues]) => {
          const solution = DETAILED_SOLUTIONS[metric];
          if (!solution) return '';

          return `
          <div class="solution-section">
            <h3>
              ${
                issues.some(i => i.severity === 'critical')
                  ? '🔴'
                  : '🟡'
              }
              ${solution.title}
            </h3>
            <p class="solution-description">${solution.description}</p>

            <h4>Code Examples</h4>
            ${solution.codeExamples.map(code => `<pre><code>${escapeHtml(code)}</code></pre>`).join('')}

            <div class="quick-wins">
              <h4>⚡ Quick Wins</h4>
              <ul>
                ${solution.quickWins.map(win => `<li>${win}</li>`).join('')}
              </ul>
            </div>

            <div class="deep-dives">
              <h4>🔍 Deep Dive Investigations</h4>
              <ul>
                ${solution.deepDives.map(dive => `<li>${dive}</li>`).join('')}
              </ul>
            </div>
          </div>
        `;
        })
        .join('')}
    `
        : `
      <div class="no-issues">
        <h3>✅ All Performance Metrics Look Good!</h3>
        <p>No critical issues or warnings found across all tested pages.</p>
      </div>
    `
    }
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function main() {
  const resultsPath = path.join(
    process.cwd(),
    'performance-reports',
    'detailed-results.json'
  );

  if (!fs.existsSync(resultsPath)) {
    console.error('❌ No performance results found!');
    console.error('   Run the performance tests first: npm run test:perf');
    process.exit(1);
  }

  const data: ReportData = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

  const html = generateHTML(data);
  const outputPath = path.join(process.cwd(), 'performance-reports', 'report.html');

  fs.writeFileSync(outputPath, html);

  console.log('\n✅ Performance report generated!');
  console.log(`   Open: ${outputPath}`);
  console.log('\n   Or run: open performance-reports/report.html');
}

main().catch(console.error);
