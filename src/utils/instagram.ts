export function extractInstagramPostId(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return null;
    }

    const markerIndex = segments.findIndex((segment) =>
      ['p', 'reel', 'tv'].includes(segment.toLowerCase())
    );

    if (markerIndex !== -1 && segments[markerIndex + 1]) {
      return sanitizePostId(segments[markerIndex + 1]);
    }

    // Stories URLs: /stories/{username}/{id}
    if (segments[0]?.toLowerCase() === 'stories' && segments[2]) {
      return sanitizePostId(`${segments[1]}-${segments[2]}`);
    }

    // Fallback: use last segment as identifier
    return sanitizePostId(segments[segments.length - 1]);
  } catch (error) {
    console.warn('extractInstagramPostId failed:', error);
    return null;
  }
}

function sanitizePostId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}
