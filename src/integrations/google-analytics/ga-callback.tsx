import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/supabase';

// Add interface at the top of file
interface GAProperty {
  name: string;
  displayName: string;
  account: string;
}

export function GoogleAnalyticsCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  useEffect(() => {
    async function handleCallback() {
      if (error) {
        navigate('/connections?error=' + error);
        return;
      }

      if (!code) {
        navigate('/connections?error=no_code');
        return;
      }

      try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
            redirect_uri: `${window.location.origin}/auth/ga-callback`,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${errorData}`);
        }

        const tokens = await tokenResponse.json();

        // Get user email from Google userinfo endpoint
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });

        if (!userInfoResponse.ok) {
          throw new Error('Failed to fetch user info');
        }

        const userInfo = await userInfoResponse.json();
        const userId = (await supabase.auth.getUser()).data.user?.id;

        // Store the connection in Supabase
        const { error: dbError } = await supabase
          .from('analytics_connections')
          .upsert({
            user_id: userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(), // 1 year
            account_email: userInfo.email,
            property_ids: [],
          }, {
            onConflict: 'account_email',
          });

        if (dbError) {
          throw new Error(`Failed to store connection: ${dbError.message}`);
        }

        try {
          // Fetch GA4 properties
          const propertiesResponse = await fetch(
            'https://analyticsadmin.googleapis.com/v1beta/properties',
            {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
              },
            }
          );

          if (!propertiesResponse.ok) {
            throw new Error(`Failed to fetch properties: ${await propertiesResponse.text()}`);
          }

          const { properties = [] } = await propertiesResponse.json();
          
          // Update available properties in the connection
          await supabase
            .from('analytics_connections')
            .update({
              available_properties: properties.map((p: GAProperty) => ({
                id: p.name.split('/').pop(),  // Extract ID from name
                name: p.displayName,
              })),
            })
            .eq('account_email', userInfo.email);

        } catch (propertyError) {
          console.error('Failed to fetch properties:', propertyError);
          // Continue anyway since we have the connection stored
        }

        navigate('/connections?connected=true');

      } catch (error) {
        console.error('Error in GA callback:', error);
        navigate('/connections?error=' + encodeURIComponent(error instanceof Error ? error.message : 'callback_error'));
      }
    }

    handleCallback();
  }, [code, error, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4">Processing your connection...</p>
      </div>
    </div>
  );
} 