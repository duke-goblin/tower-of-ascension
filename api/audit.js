import {handler, send, fail} from '../lib/http.js';
import {adminOf} from '../lib/auth.js';
import {db, init} from '../lib/db.js';

export default handler('GET', async (req, res) => {
  if (!adminOf(req)) throw fail(401, 'Sign in as an admin.');
  await init();
  const {rows} = await db().query('select id, ts, admin, action, detail from audit order by id desc limit 300');
  send(res, 200, {rows});
});
