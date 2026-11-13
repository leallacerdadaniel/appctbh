/**
 * A route parameter as plain text. A link that repeats a parameter (`?q=a&q=b`) hands the screen a list instead
 * of a string, and `.trim()` or a text field then crashes on it (review, 2026-11-10): anything that is not a
 * single string reads as ''.
 */
export const textParam = (value: unknown): string => (typeof value === 'string' ? value : '');
