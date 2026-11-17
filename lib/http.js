// Small helpers so the handlers run the same on Vercel and under scripts/dev.js.
export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  if (!headers['cache-control']) res.setHeader('cache-control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export async function body(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 100_000) throw new Error('Body too large'); }
  return raw ? JSON.parse(raw) : {};
}

export function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// Wraps a handler: method check, JSON errors.
export function handler(method, fn) {
  return async (req, res) => {
    if (req.method !== method) return send(res, 405, {error: 'Method not allowed'});
    try { await fn(req, res); }
    catch (e) {
      if (!e.status) console.error(e);
      const msg = /DATABASE_URL/.test(e.message) ? 'The database is not connected yet. Add DATABASE_URL on the server.' : 'Server error. Try again.';
      if (!res.writableEnded) send(res, e.status || 500, {error: e.status ? e.message : msg});
    }
  };
}

export const fail = (status, message) => Object.assign(new Error(message), {status});
