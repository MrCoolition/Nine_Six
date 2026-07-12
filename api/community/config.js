import { publicCommunityConfig } from './_config.js';

export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' });
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json(publicCommunityConfig());
}
