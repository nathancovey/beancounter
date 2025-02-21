export function getStripeAuthUrl() {
  const clientId = import.meta.env.VITE_STRIPE_CLIENT_ID;
  if (!clientId) throw new Error('Missing Stripe client ID');

  const redirectUri = `https://localhost:5174/stripe/callback`;
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    redirect_uri: redirectUri,
  });

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeStripeCode(code: string) {
  const response = await fetch('/api/stripe/exchange-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${await response.text()}`);
  }

  return response.json();
} 