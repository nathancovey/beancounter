import { google } from 'googleapis';

export async function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: import.meta.env.VITE_GOOGLE_CLIENT_EMAIL,
      private_key: import.meta.env.VITE_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    },
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  return auth;
} 