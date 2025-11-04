// Web-specific entry point (only loads on web, not on iOS/Android)
import './web-polyfills';
// Note: global.css uses NativeWind which requires lightningcss (fails on Netlify)
// For production web builds, CSS is disabled to allow deployment
// TODO: Implement alternative CSS solution for web (Tailwind CSS JIT or precompiled styles)
if (process.env.DISABLE_NATIVEWIND !== 'true') {
  require('./global.css');
}
import 'react-native-get-random-values';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['Expo AV has been deprecated', 'Disconnected from Metro']);

console.log('[index.web] Project ID is: ', process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID);
console.log('[index.web] Platform: WEB');
console.log('[index.web] NativeWind:', process.env.DISABLE_NATIVEWIND !== 'true' ? 'ENABLED' : 'DISABLED');

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

