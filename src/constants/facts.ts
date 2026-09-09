/** Long facts collapse in cards and the detail view so they don't hog space */
export const COLLAPSE_THRESHOLD = 240;
export const COLLAPSE_LINES = 4;

/** Detail view collapse thresholds (generous so normal posts are full, but essays collapse) */
export const COLLAPSE_THRESHOLD_DETAIL = 480;
export const COLLAPSE_LINES_DETAIL = 8;

/** Check if content should be collapsible taking into account line breaks and char length */
export function checkIsCollapsible(
  content?: string | null,
  maxLines: number = COLLAPSE_LINES,
  thresholdChars: number = COLLAPSE_THRESHOLD,
): boolean {
  if (!content) return false;
  const lineBreaks = (content.match(/\n/g) || []).length;
  return lineBreaks >= maxLines || content.length > thresholdChars;
}