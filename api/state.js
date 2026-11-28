import {handler, send} from '../lib/http.js';
import {adminOf} from '../lib/auth.js';
import {getState} from '../lib/db.js';
import {view} from '../lib/event.js';

// Public: everything the page needs to draw. No secrets live in here.
export default handler('GET', async (req, res) => {
  send(res, 200, {...view(await getState(), adminOf(req)), admin: adminOf(req), configured: !!process.env.ADMIN_PASSWORD});
});
