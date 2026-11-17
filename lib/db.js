import pg from 'pg';

let pool, ready;

export function db() {
  if (!pool) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    pool = new pg.Pool({connectionString: url, max: 2});
  }
  return pool;
}

// Tables are created on first use, so there is no migration step.
export function init() {
  if (!ready) {
    ready = db().query(`
      create table if not exists teams (id text primary key, data jsonb not null);
      create table if not exists subs (id text primary key, data jsonb not null);
      create table if not exists settings (key text primary key, value jsonb not null);
      create table if not exists audit (id bigserial primary key, ts timestamptz not null default now(), admin text not null, action text not null, detail jsonb);
    `).catch(e => { ready = null; throw e; });
  }
  return ready;
}

export async function getState() {
  await init();
  const [t, s, k] = await Promise.all([
    db().query('select id, data from teams'),
    db().query('select id, data from subs'),
    db().query('select key, value from settings'),
  ]);
  const row = r => ({id: r.id, ...r.data});
  return {
    teams: t.rows.map(row).sort((a, b) => (a.created || 0) - (b.created || 0)),
    subs: s.rows.map(row),
    settings: Object.fromEntries(k.rows.map(r => [r.key, r.value])),
  };
}

export const audit = (admin, action, detail) =>
  db().query('insert into audit (admin, action, detail) values ($1, $2, $3)', [admin, action, JSON.stringify(detail ?? null)]);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
