export function extractXPostId(url: string): string {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split('/').filter(Boolean);
    const statusIndex = parts.findIndex((segment) => segment.toLowerCase() === 'status');
    if (statusIndex !== -1 && parts[statusIndex + 1]) {
      return parts[statusIndex + 1];
    }
    return parts[parts.length - 1] || '';
  } catch (error) {
    console.warn('[X] Failed to extract post id from URL:', url, error);
    return '';
  }
}

