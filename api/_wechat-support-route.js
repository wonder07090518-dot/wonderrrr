import { createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { isAdmin, kv, storageConfigured } from './_admin.js';
import { answerSupportQuestion } from './_support-route.js';

const DEFAULT_API_ORIGIN = 'https://qyapi.weixin.qq.com';
const SITE_ORIGIN = 'https://www.wonderadlab.com';
const ticketIndex = 'wonder:support-tickets';
let cachedAccessToken = '';
let cachedAccessTokenExpiresAt = 0;

function wecomApiOrigin() {
  const configured = String(process.env.WECOM_API_ORIGIN || '').trim();
  if (!configured) return DEFAULT_API_ORIGIN;
  const url = new URL(configured);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('WECOM_API_ORIGIN must be a clean HTTPS origin');
  }
  return url.origin;
}

function wecomApiHeaders(headers = {}) {
  const origin = wecomApiOrigin();
  if (origin === DEFAULT_API_ORIGIN) return headers;
  const proxyToken = String(process.env.WECOM_API_PROXY_TOKEN || '').trim();
  if (!proxyToken) throw new Error('WECOM_API_PROXY_TOKEN is required for the fixed-IP proxy');
  return { ...headers, Authorization: `Bearer ${proxyToken}` };
}

function clean(value, length = 600) {
  return String(value || '').trim().slice(0, length).replace(/[\0\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

export function wecomConfigured() {
  return Boolean(
    process.env.WECOM_CORP_ID
    && process.env.WECOM_KF_SECRET
    && process.env.WECOM_KF_TOKEN
    && process.env.WECOM_KF_ENCODING_AES_KEY
  );
}

function actionLink(result) {
  if (!result?.action?.href) return '';
  const href = result.action.href.startsWith('#') ? `${SITE_ORIGIN}/${result.action.href}` : result.action.href;
  return `\n\n${result.action.label || '打开官网'}：${href}`;
}

function previewReply(question) {
  const result = answerSupportQuestion(question, 'zh');
  if (result.handled) {
    return { handled: true, queued: false, category: result.category, answer: `${result.answer}${actionLink(result)}` };
  }
  return {
    handled: false,
    queued: true,
    category: result.category,
    answer: '这个问题需要人工核对。测试版会把它放进统一任务队列，自动客服不会擅自确认特殊报价、付款到账或真实订单进度。'
  };
}

async function preview(req, res) {
  const question = clean(req.body?.question, 600);
  if (question.length < 2) return res.status(400).json({ error: '请输入要测试的问题' });
  return res.status(200).json({ ok: true, preview: true, saved: false, ...previewReply(question) });
}

function queryValue(req, name) {
  if (req.query?.[name] !== undefined) return clean(req.query[name], 1000);
  return clean(new URL(req.url || '/', 'https://wonderadlab.com').searchParams.get(name), 1000);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function wechatSignature(token, timestamp, nonce, encrypted) {
  return createHash('sha1').update([token, timestamp, nonce, encrypted].map(String).sort().join('')).digest('hex');
}

export function verifyWechatSignature({ token, timestamp, nonce, encrypted, signature }) {
  if (!token || !timestamp || !nonce || !encrypted || !signature) return false;
  return safeEqual(wechatSignature(token, timestamp, nonce, encrypted), signature);
}

function unpadWechat(buffer) {
  if (!buffer.length) throw new Error('Empty encrypted payload');
  const amount = buffer[buffer.length - 1];
  if (amount < 1 || amount > 32 || amount > buffer.length) throw new Error('Invalid encrypted payload padding');
  for (let index = buffer.length - amount; index < buffer.length; index += 1) {
    if (buffer[index] !== amount) throw new Error('Invalid encrypted payload padding');
  }
  return buffer.subarray(0, buffer.length - amount);
}

export function decryptWechatPayload(encrypted, encodingAESKey) {
  const key = Buffer.from(`${encodingAESKey}=`, 'base64');
  if (key.length !== 32) throw new Error('Invalid WeCom EncodingAESKey');
  const decipher = createDecipheriv('aes-256-cbc', key, key.subarray(0, 16));
  decipher.setAutoPadding(false);
  const clear = unpadWechat(Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]));
  if (clear.length < 20) throw new Error('Invalid encrypted payload');
  const messageLength = clear.readUInt32BE(16);
  const messageEnd = 20 + messageLength;
  if (messageEnd > clear.length) throw new Error('Invalid encrypted payload length');
  return {
    message: clear.subarray(20, messageEnd).toString('utf8'),
    receiverId: clear.subarray(messageEnd).toString('utf8')
  };
}

function xmlValue(xml, name) {
  const match = String(xml || '').match(new RegExp(`<${name}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${name}>`, 'i'));
  return clean(match?.[1] ?? match?.[2], 5000);
}

function scalarBodyValue(value) {
  if (Array.isArray(value)) return scalarBodyValue(value[0]);
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';
  return scalarBodyValue(value._ ?? value['#text'] ?? value.$text ?? value.value);
}

function encryptedBody(req) {
  const body = req.body;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
    return xmlValue(Buffer.from(body).toString('utf8'), 'Encrypt');
  }
  if (typeof body === 'string') {
    const fromXml = xmlValue(body, 'Encrypt');
    if (fromXml) return fromXml;
    try {
      const parsed = JSON.parse(body);
      return encryptedBody({ body: parsed });
    } catch {
      return '';
    }
  }
  if (!body || typeof body !== 'object') return '';
  const wrapped = body.xml && typeof body.xml === 'object' ? body.xml : body;
  return clean(scalarBodyValue(wrapped.Encrypt ?? wrapped.encrypt), 5000);
}

function callbackDiagnostics(req, stage, encrypted, error = null) {
  const body = req.body;
  const bodyLength = Buffer.isBuffer(body) || body instanceof Uint8Array
    ? body.length
    : typeof body === 'string'
      ? Buffer.byteLength(body)
      : 0;
  console.warn('WeCom callback rejected', {
    stage,
    contentType: clean(req.headers?.['content-type'], 100),
    bodyType: Buffer.isBuffer(body) ? 'buffer' : ArrayBuffer.isView(body) ? 'typed-array' : typeof body,
    bodyLength,
    encryptedLength: String(encrypted || '').length,
    hasTimestamp: Boolean(queryValue(req, 'timestamp')),
    hasNonce: Boolean(queryValue(req, 'nonce')),
    hasSignature: Boolean(queryValue(req, 'msg_signature')),
    reason: error ? clean(error.message, 120) : undefined
  });
}

function sendTextResponse(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return typeof res.send === 'function' ? res.send(body) : res.end(body);
}

async function getAccessToken(forceRefresh = false) {
  if (!forceRefresh && cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) return cachedAccessToken;
  const url = new URL('/cgi-bin/gettoken', wecomApiOrigin());
  url.searchParams.set('corpid', process.env.WECOM_CORP_ID);
  url.searchParams.set('corpsecret', process.env.WECOM_KF_SECRET);
  const response = await fetch(url, { headers: wecomApiHeaders({ Accept: 'application/json' }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || Number(result.errcode) !== 0 || !result.access_token) throw new Error(`WeCom token request failed (${result.errcode || response.status})`);
  cachedAccessToken = result.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Math.max(60, Number(result.expires_in || 7200) - 300) * 1000;
  return cachedAccessToken;
}

async function wecomRequest(path, body, retry = true) {
  const accessToken = await getAccessToken(!retry);
  const url = new URL(path, wecomApiOrigin());
  url.searchParams.set('access_token', accessToken);
  const response = await fetch(url, {
    method: 'POST',
    headers: wecomApiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (retry && [40014, 42001].includes(Number(result.errcode))) {
    cachedAccessToken = '';
    cachedAccessTokenExpiresAt = 0;
    return wecomRequest(path, body, false);
  }
  if (!response.ok || Number(result.errcode) !== 0) throw new Error(`WeCom request failed (${result.errcode || response.status})`);
  return result;
}

async function sendWechatText({ externalUserId, openKfId, content }) {
  const safeContent = clean(content, 1800);
  if (!externalUserId || !openKfId || !safeContent || Buffer.byteLength(safeContent, 'utf8') > 2048) throw new Error('Invalid WeCom reply');
  return wecomRequest('/cgi-bin/kf/send_msg', {
    touser: externalUserId,
    open_kfid: openKfId,
    msgtype: 'text',
    text: { content: safeContent }
  });
}

async function createWechatTicket({ question, category, externalUserId, openKfId, messageType = 'text' }) {
  const id = `WS${Date.now().toString().slice(-10)}${randomBytes(2).toString('hex')}`;
  const item = {
    id,
    channel: 'wechat',
    email: '',
    question: clean(question, 600),
    language: 'zh',
    category,
    messageType,
    wechatExternalUserId: externalUserId,
    wechatOpenKfId: openKfId,
    status: 'open',
    createdAt: new Date().toISOString(),
    ownerEmailSent: false,
    customerEmailSent: false
  };
  await kv('set', `wonder:support-ticket:${id}`, JSON.stringify(item));
  await kv('zadd', ticketIndex, Date.now(), id);
  return item;
}

async function processCustomerMessage(message) {
  if (Number(message?.origin) !== 3 || !message?.external_userid || !message?.open_kfid || !message?.msgid) return;
  const lockKey = `wonder:wecom:message:${clean(message.msgid, 180)}`;
  const locked = await kv('set', lockKey, 'processing', 'nx', 'ex', 600);
  if (locked !== 'OK') return;
  try {
    if (message.msgtype === 'text' && clean(message.text?.content, 600)) {
      const question = clean(message.text.content, 600);
      const result = answerSupportQuestion(question, 'zh');
      if (result.handled) {
        await sendWechatText({ externalUserId: message.external_userid, openKfId: message.open_kfid, content: result.answer });
      } else {
        const ticket = await createWechatTicket({ question, category: result.category, externalUserId: message.external_userid, openKfId: message.open_kfid });
        await sendWechatText({
          externalUserId: message.external_userid,
          openKfId: message.open_kfid,
          content: `这个问题需要人工核对，已创建工单 ${ticket.id}。自动客服不会擅自确认特殊报价、付款到账或真实订单进度。`
        });
      }
    } else {
      const ticket = await createWechatTicket({
        question: `客户发送了${clean(message.msgtype, 40) || '非文字'}消息，需要人工查看。`,
        category: 'non-text',
        externalUserId: message.external_userid,
        openKfId: message.open_kfid,
        messageType: clean(message.msgtype, 40) || 'unknown'
      });
      await sendWechatText({
        externalUserId: message.external_userid,
        openKfId: message.open_kfid,
        content: `图片、语音或文件已转人工查看，工单号 ${ticket.id}。如方便，也可以补充一段文字说明。`
      });
    }
    await kv('set', lockKey, 'done', 'ex', 604800);
  } catch (error) {
    await kv('del', lockKey).catch(() => undefined);
    throw error;
  }
}

export async function syncWechatMessages({ token, openKfId }) {
  let cursor = clean(await kv('get', `wonder:wecom:cursor:${openKfId}`), 1000);
  let processed = 0;
  for (let page = 0; page < 3; page += 1) {
    const payload = { token, open_kfid: openKfId, limit: 100, voice_format: 0 };
    if (cursor) payload.cursor = cursor;
    const result = await wecomRequest('/cgi-bin/kf/sync_msg', payload);
    for (const message of result.msg_list || []) {
      await processCustomerMessage(message);
      processed += 1;
    }
    cursor = clean(result.next_cursor, 1000);
    if (cursor) await kv('set', `wonder:wecom:cursor:${openKfId}`, cursor);
    if (!result.has_more) break;
  }
  await kv('set', 'wonder:wecom:last-sync', JSON.stringify({ at: new Date().toISOString(), processed }));
  return processed;
}

async function processCallback(xml) {
  const event = xmlValue(xml, 'Event');
  const token = xmlValue(xml, 'Token');
  const openKfId = xmlValue(xml, 'OpenKfId');
  if (event !== 'kf_msg_or_event' || !token || !openKfId) return 0;
  return syncWechatMessages({ token, openKfId });
}

async function replyFromAdmin(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
  const id = clean(req.body?.id, 40);
  const reply = clean(req.body?.reply, 1800);
  if (!/^WS\d{10}[a-f0-9]{4}$/.test(id) || reply.length < 2) return res.status(400).json({ error: 'Invalid WeChat support reply' });
  const raw = await kv('get', `wonder:support-ticket:${id}`);
  if (!raw) return res.status(404).json({ error: 'Support ticket not found' });
  const ticket = JSON.parse(raw);
  if (ticket.channel !== 'wechat' || !ticket.wechatExternalUserId || !ticket.wechatOpenKfId) return res.status(409).json({ error: 'This is not a WeChat support ticket' });
  await sendWechatText({ externalUserId: ticket.wechatExternalUserId, openKfId: ticket.wechatOpenKfId, content: reply });
  const updated = { ...ticket, status: 'resolved', replySentAt: new Date().toISOString(), replyPreview: reply.slice(0, 120), updatedAt: new Date().toISOString() };
  await kv('set', `wonder:support-ticket:${id}`, JSON.stringify(updated));
  return res.status(200).json({ ok: true, ticket: updated });
}

export default async function wechatSupportHandler(req, res) {
  if (req.method === 'POST' && queryValue(req, 'action') === 'preview') return preview(req, res);

  if (req.method === 'GET' && !queryValue(req, 'msg_signature')) {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
    const lastSync = storageConfigured() ? await kv('get', 'wonder:wecom:last-sync').catch(() => null) : null;
    return res.status(200).json({ configured: wecomConfigured() && storageConfigured(), lastSync: lastSync ? JSON.parse(lastSync) : null });
  }

  if (!wecomConfigured() || !storageConfigured()) return res.status(503).json({ error: 'WeChat customer service is not configured', setup: true });

  if (req.method === 'GET') {
    const encrypted = queryValue(req, 'echostr');
    const timestamp = queryValue(req, 'timestamp');
    const nonce = queryValue(req, 'nonce');
    const signature = queryValue(req, 'msg_signature');
    if (!verifyWechatSignature({ token: process.env.WECOM_KF_TOKEN, timestamp, nonce, encrypted, signature })) return sendTextResponse(res, 401, 'invalid signature');
    try {
      const clear = decryptWechatPayload(encrypted, process.env.WECOM_KF_ENCODING_AES_KEY);
      if (clear.receiverId !== process.env.WECOM_CORP_ID) return sendTextResponse(res, 401, 'invalid receiver');
      return sendTextResponse(res, 200, clear.message);
    } catch {
      return sendTextResponse(res, 400, 'invalid payload');
    }
  }

  if (req.method === 'POST' && req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && req.body.action === 'reply') {
    return replyFromAdmin(req, res);
  }

  if (req.method === 'POST') {
    const encrypted = encryptedBody(req);
    const timestamp = queryValue(req, 'timestamp');
    const nonce = queryValue(req, 'nonce');
    const signature = queryValue(req, 'msg_signature');
    if (!verifyWechatSignature({ token: process.env.WECOM_KF_TOKEN, timestamp, nonce, encrypted, signature })) {
      callbackDiagnostics(req, 'signature', encrypted);
      return sendTextResponse(res, 401, 'invalid signature');
    }
    try {
      const clear = decryptWechatPayload(encrypted, process.env.WECOM_KF_ENCODING_AES_KEY);
      if (clear.receiverId !== process.env.WECOM_CORP_ID) {
        callbackDiagnostics(req, 'receiver', encrypted);
        return sendTextResponse(res, 401, 'invalid receiver');
      }
      const task = processCallback(clear.message).catch(async error => {
        await kv('set', 'wonder:wecom:last-sync', JSON.stringify({ at: new Date().toISOString(), error: clean(error.message, 180) })).catch(() => undefined);
      });
      try { waitUntil(task); } catch { void task; }
      return sendTextResponse(res, 200, 'success');
    } catch (error) {
      callbackDiagnostics(req, 'decrypt', encrypted, error);
      return sendTextResponse(res, 400, 'invalid payload');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
