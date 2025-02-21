export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { code } = await req.json();

  if (!code) {
    return new Response(JSON.stringify({ error: 'Code is required' }), { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_secret: process.env.STRIPE_SECRET_KEY!,
      client_id: process.env.STRIPE_CLIENT_ID!,
    });

    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      body: params,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.error);
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error('Error exchanging code:', error);
    return new Response(JSON.stringify({ error: 'Failed to exchange code' }), { status: 500 });
  }
} 