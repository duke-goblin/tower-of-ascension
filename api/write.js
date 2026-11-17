import {handler, send, body, fail} from '../lib/http.js';
import {adminOf} from '../lib/auth.js';
import {db, init, getState, audit, uid} from '../lib/db.js';

const str = (v, max = 80) => String(v ?? '').trim().slice(0, max);
// Screenshot links: only http(s), so a stored link can never run script when clicked.
const link = v => { const u = str(v, 500); return /^https?:\/\/\S+$/i.test(u) ? u : ''; };
const getTeam = async id => (await db().query('select data from teams where id = $1', [String(id)])).rows[0]?.data;

const ops = {
  async addTeam(b) {
    const name = str(b.name, 40);
    if (!name) throw fail(400, 'Give the team a name.');
    const data = {name, color: Number(b.color) || 0, members: [], buffs: {}, created: Date.now()};
    const id = uid();
    await db().query('insert into teams (id, data) values ($1, $2)', [id, data]);
    return {id, name};
  },
  async patchTeam(b) {
    const cur = await getTeam(b.id);
    if (!cur) throw fail(404, 'That team no longer exists.');
    const p = b.patch || {}, next = {...cur};
    if ('name' in p) next.name = str(p.name, 40) || cur.name;
    if ('color' in p) next.color = Number(p.color) || 0;
    if ('members' in p) next.members = [...new Set((Array.isArray(p.members) ? p.members : []).map(m => str(m, 12)).filter(Boolean))].slice(0, 100);
    if ('buffs' in p) next.buffs = Object.fromEntries(Object.entries(p.buffs || {}).filter(([k]) => ['5', '10', '15', '20', '25'].includes(k)).map(([k, v]) => [k, v == null ? null : Number(v)]));
    await db().query('update teams set data = $2 where id = $1', [String(b.id), next]);
    return {id: b.id, team: cur.name, patch: p};
  },
  async delTeam(b) {
    const cur = await getTeam(b.id);
    if (!cur) return {id: b.id};
    const gone = await db().query(`delete from subs where data->>'team' = $1 returning data`, [String(b.id)]);
    await db().query('delete from teams where id = $1', [String(b.id)]);
    return {id: b.id, team: cur, removedEntries: gone.rows.map(r => r.data)};
  },
  async addSub(b, admin) {
    const s = b.sub || {}, team = await getTeam(s.team);
    if (!team) throw fail(404, 'That team no longer exists.');
    const value = Number(s.value), floor = Number(s.floor);
    if (!Number.isFinite(value) || Math.abs(value) > 100000) throw fail(400, 'Enter a sensible number for the value.');
    if (!Number.isInteger(floor) || floor < 0 || floor > 30) throw fail(400, 'Bad floor.');
    const data = {team: String(s.team), kind: s.kind === 'adj' ? 'adj' : 'tile', floor, tier: str(s.tier, 10), tile: Number(s.tile) || 0,
      tileName: str(s.tileName, 160), player: str(s.player, 12), note: str(s.note, 200), proof: link(s.proof), value, ts: Date.now(), by: admin};
    const id = uid();
    await db().query('insert into subs (id, data) values ($1, $2)', [id, data]);
    return {id, ...data, teamName: team.name};
  },
  async delSub(b) {
    const gone = await db().query('delete from subs where id = $1 returning data', [String(b.id)]);
    return {id: b.id, entry: gone.rows[0]?.data ?? null};
  },
  async setProof(b) {
    const cur = (await db().query('select data from subs where id = $1', [String(b.id)])).rows[0]?.data;
    if (!cur) throw fail(404, 'That entry no longer exists.');
    const proof = link(b.proof);
    if (b.proof && !proof) throw fail(400, 'Paste a full link that starts with https://');
    await db().query('update subs set data = $2 where id = $1', [String(b.id), {...cur, proof}]);
    return {id: b.id, teamName: (await getTeam(cur.team))?.name, tileName: cur.tileName, proof};
  },
  async setSettings(b) {
    const womId = str(b.womId, 12).replace(/\D/g, '');
    await db().query(`insert into settings (key, value) values ('womId', $1) on conflict (key) do update set value = excluded.value`, [JSON.stringify(womId)]);
    return {womId};
  },
};

export default handler('POST', async (req, res) => {
  const admin = adminOf(req);
  if (!admin) throw fail(401, 'Sign in as an admin.');
  const b = await body(req), op = ops[b.op];
  if (!op) throw fail(400, 'Unknown action.');
  await init();
  const detail = await op(b, admin);
  await audit(admin, b.op, detail);
  send(res, 200, {...await getState(), admin, configured: true});
});
