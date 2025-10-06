import Config from 'react-native-config';

// Load APP_ENV
const APP_ENV = Config.APP_ENV || 'local';
console.log(`APP_ENV: ${APP_ENV}`);

// Load USE_FIREBASE_EMULATOR, default to false
const USE_FIREBASE_EMULATOR = Config.USE_FIREBASE_EMULATOR === 'false' ? false : true;
export { USE_FIREBASE_EMULATOR };

// Client SDK configuration
const STUDY_ID = Config.STUDY_ID || 'testing';
const FIREBASE_AUTH_EMULATOR_PORT = parseInt(Config.FIREBASE_AUTH_EMULATOR_PORT || '9099');
const FIREBASE_FIRESTORE_EMULATOR_PORT = parseInt(Config.FIREBASE_FIRESTORE_EMULATOR_PORT || '8080');
const FIREBASE_STORAGE_EMULATOR_PORT = parseInt(Config.FIREBASE_STORAGE_EMULATOR_PORT || '9199');
const FIREBASE_API_KEY = Config.FIREBASE_API_KEY || '';
const FIREBASE_AUTH_DOMAIN = Config.FIREBASE_AUTH_DOMAIN || '';
const FIREBASE_DATABASE_URL = Config.FIREBASE_DATABASE_URL || '';
const FIREBASE_PROJECT_ID = Config.FIREBASE_PROJECT_ID || '';
const FIREBASE_STORAGE_BUCKET = Config.FIREBASE_STORAGE_BUCKET || '';
const FIREBASE_MESSAGING_SENDER_ID = Config.FIREBASE_MESSAGING_SENDER_ID || '';
const FIREBASE_APP_ID = Config.FIREBASE_APP_ID || '';
const FIREBASE_MEASUREMENT_ID = Config.FIREBASE_MEASUREMENT_ID || '';
export {
    STUDY_ID,
    FIREBASE_AUTH_EMULATOR_PORT,
    FIREBASE_FIRESTORE_EMULATOR_PORT,
    FIREBASE_STORAGE_EMULATOR_PORT,
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_DATABASE_URL,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID,
}

// Assign BACKEND_URL based on APP_ENV
let BACKEND_URL: string;
let FIREBASE_EMULATOR_HOST: string = 'localhost';
if (APP_ENV === 'local') {
    BACKEND_URL = 'http://localhost';
} else if (APP_ENV === 'device') {
    const LOCAL_IP = Config.LOCAL_IP || '';
    if (LOCAL_IP === '') {
        console.error('LOCAL_IP not found in .env.device');
    }
    BACKEND_URL = `http://${LOCAL_IP}`;
    FIREBASE_EMULATOR_HOST = LOCAL_IP;
} else if (APP_ENV === 'production') {
    BACKEND_URL = Config.BACKEND_URL || '';
} else {
    console.error(`Invalid APP_ENV: ${APP_ENV}`);
    BACKEND_URL = '';
}

const BACKEND_PORT = Config.BACKEND_PORT || '5001';

// DO NOT append port for production
if (APP_ENV === 'local' || APP_ENV === 'device') {
    BACKEND_URL += `:${BACKEND_PORT}`;
}

export { FIREBASE_EMULATOR_HOST, BACKEND_URL };

// Assign SOCKET_URL for websocket on BACKEND_URL (replacing http/https with ws/wss)
const IS_PROD = APP_ENV === "production";
export const SOCKET_URL = (IS_PROD ? 'wss://' : 'ws://') + BACKEND_URL.replace(/.*\/\//, '') + '/chat';

console.log("APP_ENV:", APP_ENV);
console.log("BACKEND_URL:", BACKEND_URL);
console.log("SOCKET_URL:", SOCKET_URL);

// Console logging upload toggle
export const LOG_UPLOAD_ENABLED = Config.LOG_UPLOAD_ENABLED === 'true';

// Load SENTRY_DSN
export const USE_SENTRY = Config.USE_SENTRY === 'true';
export const SENTRY_DSN = Config.SENTRY_DSN_TS || '';
console.log("USE_SENTRY:", USE_SENTRY);

// Load Bloom vs control condition codes
export const TREATMENT_CODE = Config.TREATMENT_CODE || 'bloom';
export const CONTROL_CODE = Config.CONTROL_CODE || 'control';

export const ONBOARDING_STORAGE_KEY = "onboardingProgress";
