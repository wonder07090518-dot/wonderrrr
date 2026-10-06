import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const port = Number(process.env.PORT || 3000);
const secret = String(process.env.WECOM_PROXY_SECRET || '').trim();
const upstream = 'https://qyapi.weixin.qq.com';
const allowedRoutes = new Set([
  'GET /cgi-bin/gettoken',
  'POST /cgi-bin/kf/sync_msg',
  'POST /cgi-bin/kf/send_msg'
]);

if (secret.length < 32) throw new Error('WECOM_PROXY_SECRET must contain at least 32 characters');

function authorized(header = '') {
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(String(header));
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

function reply(response, status, body, contentType = 'application/json; charset=utf-8') {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(body);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 65536) throw new Error('request too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

createServer(async (request, response) => {
  try {
    const incoming = new URL(request.url || '/', 'http://localhost');
    if (request.method === 'GET' && incoming.pathname === '/health') {
      return reply(response, 200, JSON.stringify({ ok: true, service: 'wonder-wecom-egress' }));
    }
    const route = `${request.method} ${incoming.pathname}`;
    if (!allowedRoutes.has(route)) return reply(response, 404, JSON.stringify({ error: 'not found' }));
    if (!authorized(request.headers.authorization)) return reply(response, 401, JSON.stringify({ error: 'unauthorized' }));

    const target = new URL(incoming.pathname + incoming.search, upstream);
    const body = request.method === 'POST' ? await readBody(request) : undefined;
    const upstreamResponse = await fetch(target, {
      method: request.method,
      headers: {
        Accept: 'application/json',
        ...(request.method === 'POST' ? { 'Content-Type': 'application/json' } : {})
      },
      body
    });
    const payload = Buffer.from(await upstreamResponse.arrayBuffer());
    return reply(
      response,
      upstreamResponse.status,
      payload,
      upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8'
    );
  } catch {
    return reply(response, 502, JSON.stringify({ error: 'upstream unavailable' }));
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Wonder WeCom egress proxy listening on 127.0.0.1:${port}`);
});
