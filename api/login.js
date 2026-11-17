import {handler, send, body, fail} from '../lib/http.js';
import {checkPassword, sessionCookie} from '../lib/auth.js';
import {init, audit} from '../lib/db.js';

export default handler('POST', async (req, res) => {
  const {name, password} = await body(req);
  const who = String(name || '').trim().slice(0, 40);
  if (!who) throw fail(400, 'Enter your name so changes can be traced to you.');
  if (!process.env.ADMIN_PASSWORD) throw fail(503, 'ADMIN_PASSWORD is not set on the server.');
  await init();
  if (!checkPassword(password || '')) {
    await audit(who, 'login-failed', null);
    await new Promise(r => setTimeout(r, 600)); // slows down guessing
    throw fail(401, 'Wrong password.');
  }
  await audit(who, 'login', null);
  send(res, 200, {ok: true, admin: who}, {'set-cookie': sessionCookie(who)});
});
