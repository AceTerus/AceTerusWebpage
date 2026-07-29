// Shared CORS utility for all AceTerus Edge Functions
// Only allows requests from aceterus.com subdomains

const ALLOWED_ORIGINS = [
  'https://aceterus.com',
  'https://www.aceterus.com',
  'https://admin.aceterus.com',
  'https://events.aceterus.com',
  'https://classpulse.aceterus.com',
];

// Match any localhost / 127.0.0.1 origin on any port (Vite picks whatever port
// is free — 8001, 8002, …), so local dev is not tied to a hardcoded port.
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    (!isProduction && LOCALHOST_ORIGIN.test(origin));

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
