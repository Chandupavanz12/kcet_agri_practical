import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamically resolves the local backend URL running in the terminal.
 * In Expo development on physical devices over Wi-Fi, hostUri gives the machine's local IP.
 */
function resolveBackendUrl() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || '';
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5001`;
    }
  }

  // Fallback to local Wi-Fi IP for physical device or Android emulator
  if (Platform.OS === 'android') {
    return 'http://172.17.73.186:5001';
  }

  return 'http://localhost:5001';
}

export const API_BASE_URL = resolveBackendUrl();
