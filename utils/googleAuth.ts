import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { GOOGLE_WEB_CLIENT_ID } from '@/constants/google';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const SECURE_KEY_REFRESH_TOKEN = 'google_refresh_token';
const ASYNC_KEY_USER_EMAIL = 'google_user_email';

// ---------------------------------------------------------------------------
// In-memory token cache
// ---------------------------------------------------------------------------

let cachedAccessToken: string | null = null;
let accessTokenExpiresAt = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Store tokens after a successful OAuth sign-in.
 */
export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  email?: string,
): Promise<void> {
  cachedAccessToken = accessToken;
  accessTokenExpiresAt = Date.now() + expiresIn * 1000;

  await SecureStore.setItemAsync(SECURE_KEY_REFRESH_TOKEN, refreshToken);
  if (email) {
    await AsyncStorage.setItem(ASYNC_KEY_USER_EMAIL, email);
  }
}

/**
 * Get a valid access token, auto-refreshing if expired.
 * Throws if not signed in or refresh fails.
 */
export async function getValidAccessToken(): Promise<string> {
  // Check in-memory cache first
  if (cachedAccessToken && Date.now() < accessTokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  // Try to refresh
  const refreshToken = await SecureStore.getItemAsync(
    SECURE_KEY_REFRESH_TOKEN,
  );
  if (!refreshToken) {
    throw new Error('לא מחובר לגוגל דרייב');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: GOOGLE_WEB_CLIENT_ID,
    }).toString(),
  });

  if (!response.ok) {
    // Refresh token was revoked or expired
    await clearTokens();
    throw new Error('נדרשת התחברות מחדש לגוגל דרייב');
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  accessTokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

  return cachedAccessToken!;
}

/**
 * Check if the user has a stored refresh token (i.e., is signed in).
 */
export async function isSignedIn(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(SECURE_KEY_REFRESH_TOKEN);
  return !!token;
}

/**
 * Get the stored user email, or null if not signed in.
 */
export async function getUserEmail(): Promise<string | null> {
  return AsyncStorage.getItem(ASYNC_KEY_USER_EMAIL);
}

/**
 * Clear all stored tokens (sign out).
 */
export async function clearTokens(): Promise<void> {
  cachedAccessToken = null;
  accessTokenExpiresAt = 0;
  await SecureStore.deleteItemAsync(SECURE_KEY_REFRESH_TOKEN);
  await AsyncStorage.removeItem(ASYNC_KEY_USER_EMAIL);
}

/**
 * Exchange an authorization code for access + refresh tokens.
 * Called after the OAuth flow completes.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; email?: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: GOOGLE_WEB_CLIENT_ID,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`שגיאה בהתחברות: ${err}`);
  }

  const data = await response.json();

  // Fetch user email from the id_token or userinfo endpoint
  let email: string | undefined;
  if (data.id_token) {
    try {
      const payload = JSON.parse(atob(data.id_token.split('.')[1]));
      email = payload.email;
    } catch {
      // Ignore decode errors
    }
  }

  // Save tokens
  await saveTokens(
    data.access_token,
    data.refresh_token,
    data.expires_in ?? 3600,
    email,
  );

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    email,
  };
}
