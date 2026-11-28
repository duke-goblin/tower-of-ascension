// Event dates and the final-day fog. public/index.html keeps its own copy of the dates for the countdown.
export const EVENT = {start: Date.UTC(2026, 10, 28, 12), end: Date.UTC(2026, 11, 6, 12)};
const FOG_HOURS = 24;

// mode 'auto': fog for the last 24 hours, lifting when the event ends.
// mode 'on': fog from the moment an admin turned it on (never later than the automatic start), until an admin changes it.
// mode 'off': never.
export function fogOf(settings, now = Date.now()) {
  const f = settings.fog || {}, mode = ['on', 'off'].includes(f.mode) ? f.mode : 'auto', auto = EVENT.end - FOG_HOURS * 36e5;
  if (mode === 'off') return {mode, active: false, at: auto};
  if (mode === 'on') return {mode, active: true, at: Math.min(Number(f.at) || now, auto)};
  return {mode, active: now >= auto && now < EVENT.end, at: auto};
}

// What one viewer may see. Under fog, everyone but admins gets the tower as it stood when the fog came down.
export function view(state, admin) {
  const fog = fogOf(state.settings);
  const strip = ({buffTs, ...t}) => t;
  const out = {...state, fog, teams: state.teams.map(strip)};
  if (admin) return out;
  if (fog.active) {
    out.subs = state.subs.filter(s => s.ts < fog.at);
    // A buff picked after the fog came down would give away a boss kill.
    out.teams = state.teams.map(t => strip({...t, buffs: Object.fromEntries(Object.entries(t.buffs || {}).map(([k, v]) => [k, (t.buffTs?.[k] || 0) >= fog.at ? null : v]))}));
  }
  return out;
}
