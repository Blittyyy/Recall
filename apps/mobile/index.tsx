import ExceptionsManager from 'react-native/Libraries/Core/ExceptionsManager';

if (__DEV__) {
  ExceptionsManager.handleException = (error, isFatal) => {
    // no-op
  };
}

import 'react-native-url-polyfill/auto';
import './src/__create/polyfills';
global.Buffer = require('buffer').Buffer;

import { LogBox } from 'react-native';
import { initTestFlightLogger } from './__create/testflight-logger';

console.log('[Recall startup]', { stage: 'index-module-loaded' });

initTestFlightLogger();
console.log('[Recall startup]', { stage: 'testflight-logger-initialized' });

if (__DEV__ || process.env.EXPO_PUBLIC_CREATE_ENV === 'DEVELOPMENT') {
  LogBox.ignoreAllLogs();
  LogBox.uninstall();
}

console.log('[Recall startup]', { stage: 'requiring-expo-metro-runtime' });
require('@expo/metro-runtime');
console.log('[Recall startup]', { stage: 'expo-metro-runtime-loaded' });

console.log('[Recall startup]', { stage: 'requiring-expo-router-entry' });
require('expo-router/entry-classic');
console.log('[Recall startup]', { stage: 'expo-router-entry-loaded' });
