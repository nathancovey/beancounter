import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
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

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error exchanging code:', error);
    return res.status(500).json({ error: 'Failed to exchange code' });
  }
} 