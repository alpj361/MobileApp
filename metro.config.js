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

// Skip NativeWind for web builds (lightningcss native module fails on Netlify)
// Only load NativeWind for native builds (iOS/Android)
const isWebBuild = process.env.EXPO_PLATFORM === 'web' || 
                   process.argv.some(arg => arg.includes('web')) ||
                   process.env.NODE_ENV === 'production';

if (isWebBuild) {
  console.log('[Metro] Web build detected - NativeWind disabled');
  module.exports = config;
} else {
  console.log('[Metro] Native build detected - NativeWind enabled');
  module.exports = withNativeWind(config, { input: './global.css' });
}
