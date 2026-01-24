/**
 * Format a region key (e.g. sheet name) for display.
 * Use overrides for names that don't follow the default title-case-from-underscores rule.
 */
export function formatRegionLabel(regionKey) {
  const overrides = { netherlands: 'The Netherlands' };
  if (overrides[regionKey]) return overrides[regionKey];
  return regionKey
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
