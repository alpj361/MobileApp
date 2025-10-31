// Web-specific entry point (only loads on web, not on iOS/Android)
import './web-polyfills';
import './global.css';
import 'react-native-get-random-values';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['Expo AV has been deprecated', 'Disconnected from Metro']);

console.log('[index.web] Project ID is: ', process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID);
console.log('[index.web] Platform: WEB');

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

