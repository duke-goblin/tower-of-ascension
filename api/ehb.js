import {handler, send} from '../lib/http.js';
import {getState} from '../lib/db.js';

const WOM = 'https://api.wiseoldman.net/v2';

async function wom(path) {
  const headers = {'user-agent': 'tower-of-ascension (The Duke clan event tracker)'};
  if (process.env.WOM_API_KEY) headers['x-api-key'] = process.env.WOM_API_KEY;
  return fetch(WOM + path, {headers});
}

// EHB gained per player since the Wise Old Man competition started.
// Cached at the edge for 10 minutes so the page never hammers WOM.
export default handler('GET', async (req, res) => {
  const {settings} = await getState();
  const id = settings.womId;
  if (!id) return send(res, 200, {players: []});
  // Ask for EHB whatever metric the competition was created with; fall back to its own metric.
  let r = await wom(`/competitions/${id}?metrics=ehb`), forced = true;
  if (!r.ok) { r = await wom(`/competitions/${id}`); forced = false; }
  if (!r.ok) return send(res, 200, {players: [], error: r.status === 404 ? `Wise Old Man has no competition ${id}.` : `Wise Old Man answered ${r.status}. Try again later.`});
  const c = await r.json();
  const players = (c.participations || []).map(p => {
    const d = (p.deltas || []).find(d => d.metric === 'ehb') || (p.deltas || [])[0];
    const gained = Number(d?.values?.gained ?? p.progress?.gained ?? 0);
    return {name: p.player?.displayName || p.player?.username || '', team: p.teamName || null, gained: Math.max(0, gained), updatedAt: p.player?.updatedAt || null};
  });
  send(res, 200, {title: c.title, metric: forced ? 'ehb' : c.metric, startsAt: c.startsAt, endsAt: c.endsAt, players},
    {'cache-control': 'public, s-maxage=600, stale-while-revalidate=3600'});
});
