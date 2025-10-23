const { HttpsProxyAgent } = require('https-proxy-agent');

/**
 * Returns an HTTP(S) proxy agent if a proxy is configured.
 * Prefers HTTPS_PROXY, then NITTER_PROXY envs.
 */
function getProxyAgent() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.NITTER_PROXY;
  if (!proxyUrl) return undefined;
  try {
    return new HttpsProxyAgent(proxyUrl);
  } catch (e) {
    console.warn('[PROXY] ⚠️ Invalid proxy URL, ignoring:', e?.message);
    return undefined;
  }
}

module.exports = { getProxyAgent };

