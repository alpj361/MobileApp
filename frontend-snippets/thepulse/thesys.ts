// Minimal Thesys tracker adapter with safe fallback
type Payload = Record<string, any>;

export function trackThesys(event: string, payload?: Payload) {
  try {
    if (typeof window !== 'undefined') {
      const anyWin = window as any;
      const client = anyWin?.Thesys?.client || anyWin?.Thesys;
      if (client?.track && typeof client.track === 'function') {
        client.track(event, payload || {});
        return;
      }
    }
  } catch {
    // ignore
  }
  // Fallback to console for local dev
  if (process?.env?.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug(`[Thesys] ${event}`, payload || {});
  }
}

