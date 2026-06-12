// Shared CORS utility for all AceTerus Edge Functions
// Only allows requests from aceterus.com subdomains

const ALLOWED_ORIGINS = [
  'https://aceterus.com',
  'https://www.aceterus.com',
  'https://admin.aceterus.com',
  'https://events.aceterus.com',
  'https://classpulse.aceterus.com',
];

// Also allow localhost in development
if (Deno.env.get('ENVIRONMENT') !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:8001', 'http://localhost:3000');
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function handleCorsOptions(req: Request): Response {
  return new Response('ok', { headers: getCorsHeaders(req) });
}
