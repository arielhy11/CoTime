export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const REQUIRED_ENV = {
  apiKey: 'EXPO_PUBLIC_API_KEY',
  authDomain: 'EXPO_PUBLIC_AUTH_DOMAIN',
  projectId: 'EXPO_PUBLIC_PROJECT_ID',
  appId: 'EXPO_PUBLIC_APP_ID',
} as const;

/**
 * Reads the Firebase web config from EXPO_PUBLIC_* env vars.
 * Fails fast with the names of anything missing — copy .env.example to .env.
 * (Expo inlines process.env.EXPO_PUBLIC_* at build time, so each var is read by name.)
 */
export function getFirebaseConfig(): FirebaseWebConfig {
  const config: FirebaseWebConfig = {
    apiKey: process.env.EXPO_PUBLIC_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_APP_ID ?? '',
  };
  const missing = missingFirebaseEnv(config);
  if (missing.length > 0) {
    throw new Error(`Missing Firebase config: ${missing.join(', ')}. Copy .env.example to .env and fill it in.`);
  }
  return config;
}

export function missingFirebaseEnv(config: FirebaseWebConfig): string[] {
  return (Object.keys(REQUIRED_ENV) as (keyof typeof REQUIRED_ENV)[])
    .filter((key) => !config[key].trim())
    .map((key) => REQUIRED_ENV[key]);
}
