import crypto from 'node:crypto';
import {cookies} from './http.js';

const COOKIE = 'toa_admin';
const DAYS = 14;
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
// Signing key derives from the password, so changing the password signs everyone out.
const key = () => sha('toa-session:' + process.env.ADMIN_PASSWORD);
const sign = payload => crypto.createHmac('sha256', key()).update(payload).digest('base64url');

export function checkPassword(pw) {
  if (!process.env.ADMIN_PASSWORD) return false;
  return crypto.timingSafeEqual(sha(pw), sha(process.env.ADMIN_PASSWORD));
}

export function sessionCookie(name) {
  const payload = Buffer.from(JSON.stringify({n: name, e: Date.now() + DAYS * 864e5})).toString('base64url');
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DAYS * 86400}${process.env.VERCEL ? '; Secure' : ''}`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

// Returns the admin's name, or null.
export function adminOf(req) {
  if (!process.env.ADMIN_PASSWORD) return null;
  const [payload, mac] = (cookies(req)[COOKIE] || '').split('.');
  if (!payload || !mac) return null;
  const want = sign(payload);
  if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  try {
    const {n, e} = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return e > Date.now() ? String(n) : null;
  } catch { return null; }
}
