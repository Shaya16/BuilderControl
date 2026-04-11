/**
 * Google OAuth & Drive configuration.
 *
 * TODO: Replace these placeholder client IDs with real ones from
 * Google Cloud Console after creating the project and enabling Drive API.
 *
 * Steps:
 * 1. Go to https://console.cloud.google.com
 * 2. Create project "BuilderControl"
 * 3. Enable "Google Drive API"
 * 4. OAuth consent screen → External → scope: drive.file
 * 5. Create credentials → OAuth 2.0 Client IDs:
 *    - Web application → copy client ID here as GOOGLE_WEB_CLIENT_ID
 *    - Android → package: com.shaya16.StructuralPlanner, SHA-1 from keystore
 *      → copy client ID here as GOOGLE_ANDROID_CLIENT_ID
 */

export const GOOGLE_WEB_CLIENT_ID = 'TODO_REPLACE_WITH_WEB_CLIENT_ID';
export const GOOGLE_ANDROID_CLIENT_ID = 'TODO_REPLACE_WITH_ANDROID_CLIENT_ID';
export const GOOGLE_IOS_CLIENT_ID = 'TODO_REPLACE_WITH_IOS_CLIENT_ID';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const BACKUP_FOLDER_NAME = 'BuilderControl Backups';
export const BACKUP_MAX_COUNT = 5;
export const BACKUP_INTERVAL_DAYS = 30;
