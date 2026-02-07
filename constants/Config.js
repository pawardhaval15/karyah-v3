import { Platform } from 'react-native';

const API_PRODUCTION = 'https://api.karyah.in/';
const API_DEVELOPMENT = 'http://localhost:5001/';

// Determine the API URL based on build environment
// In a real project, this would use react-native-dotenv or expo-constants
const API_URL = __DEV__ ? API_DEVELOPMENT : API_PRODUCTION;

export const CONFIG = {
    API_URL,
    TIMEOUT: 15000,
    APP_VERSION: '2.0.2',
    PLATFORM: Platform.OS,
    IS_IOS: Platform.OS === 'ios',
    IS_ANDROID: Platform.OS === 'android',
    REFRESH_INTERVALS: {
        DASHBOARD: 15000,
        TASKS: 15000,
        CRITICAL_ISSUES: 10000,
    },
    ANIMATION_DURATIONS: {
        FAST: 250,
        NORMAL: 400,
        SLOW: 600,
    },
};

export default CONFIG;
