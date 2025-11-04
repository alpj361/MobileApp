// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

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
const isNetlify = process.env.NETLIFY || process.env.BUILDER;

if (isNetlify) {
  console.log('[Metro] Netlify build detected - NativeWind disabled');
  module.exports = config;
} else {
  console.log('[Metro] Local/native build detected - NativeWind enabled');
  module.exports = withNativeWind(config, { input: './global.css' });
}
