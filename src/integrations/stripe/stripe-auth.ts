export function getStripeAuthUrl() {
  const redirectUri = `${window.location.origin}/stripe/callback`;
  const clientId = import.meta.env.VITE_STRIPE_CLIENT_ID;

  console.log('Stripe Auth URL:', redirectUri); // Debug log

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    redirect_uri: redirectUri,
    state: 'connections', // Add state to redirect back to connections
  });

  return `https://connect.stripe.com/oauth/authorize?${params}`;
}

export async function exchangeStripeCode(code: string) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-exchange-code`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ code }),
    }
  );

  console.log('Stripe exchange response:', response);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Stripe exchange error:', errorText);
    throw new Error(`Failed to exchange code: ${errorText}`);
  }

  return response.json();
} 