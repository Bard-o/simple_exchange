import type { VercelResponse } from "@vercel/node";

/** Standard CORS headers for API responses. */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

/** Apply CORS headers to a response. */
export function withCors(res: VercelResponse): VercelResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
  return res;
}

/** Handle CORS preflight requests. */
export function handleOptions(res: VercelResponse): VercelResponse {
  return withCors(res).status(204).end();
}
