// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.useWatchman = false;

// Polyfill for import.meta in web (doesn't affect native iOS/Android)
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Disable NativeWind only on Netlify (lightningcss native module fails there)
// Keep it enabled for local development and native builds
const shouldDisableNativeWind = process.env.DISABLE_NATIVEWIND === 'true';

if (shouldDisableNativeWind) {
  console.log('[Metro] NativeWind disabled (Netlify build)');
  module.exports = config;
} else {
  console.log('[Metro] NativeWind enabled (local/native build)');
  // Only require NativeWind when we actually need it
  const { withNativeWind } = require('nativewind/metro');
  module.exports = withNativeWind(config, { input: './global.css' });
}
