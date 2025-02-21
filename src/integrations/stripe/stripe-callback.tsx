import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/supabase';
import { exchangeStripeCode } from './stripe-auth';
import { useAuth } from '@/integrations/supabase/auth-context';

export function StripeCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  useEffect(() => {
    async function handleCallback() {
      if (!user) {
        navigate('/login');
        return;
      }

      if (error) {
        console.error('Stripe connection error:', error);
        navigate('/connections?error=stripe_connection_failed');
        return;
      }

      if (!code) {
        navigate('/connections?error=no_code');
        return;
      }

      try {
        const data = await exchangeStripeCode(code);

        const { error: dbError } = await supabase
          .from('stripe_connections')
          .upsert({
            user_id: user.id,
            account_id: data.stripe_user_id,
            account_name: data.stripe_user_email,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            property_ids: [],
            livemode: data.livemode,
          });

        if (dbError) throw dbError;

        navigate('/connections?connected=true');
      } catch (error) {
        console.error('Error handling Stripe callback:', error);
        navigate('/connections?error=stripe_connection_failed');
      }
    }

    handleCallback();
  }, [code, error, navigate, user]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4">Connecting your Stripe account...</p>
      </div>
    </div>
  );
} 