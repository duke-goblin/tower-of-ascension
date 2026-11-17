// Local dev server: serves public/ and routes /api/* to the same handlers Vercel runs.
// Usage: DATABASE_URL=... ADMIN_PASSWORD=... npm run dev
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const types = {'.html': 'text/html; charset=utf-8', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css'};

http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  try {
    if (path.startsWith('/api/')) {
      const name = path.slice(5).replace(/[^a-z]/g, '');
      const mod = await import(join(root, 'api', name + '.js'));
      return mod.default(req, res);
    }
    const file = normalize(join(root, 'public', path === '/' ? 'index.html' : path));
    if (!file.startsWith(join(root, 'public'))) throw new Error('nope');
    res.setHeader('content-type', types[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch (e) { res.statusCode = 404; res.end('Not found'); }
}).listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
