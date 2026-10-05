import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { kv, storageConfigured } from './_admin.js';
import { answerSupportQuestion } from './_support-route.js';

const SITE_ORIGIN = 'https://www.wonderadlab.com';
const TICKET_INDEX = 'wonder:support-tickets';

function clean(value, length = 600) {
  return String(value || '').trim().slice(0, length).replace(/[\0\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function queryValue(req, name) {
  if (req.query?.[name] !== undefined) return clean(req.query[name], 1000);
  return clean(new URL(req.url || '/', SITE_ORIGIN).searchParams.get(name), 1000);
}

function safeEqual(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue || ''));
  const right = Buffer.from(String(rightValue || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function officialWechatSignature(token, timestamp, nonce) {
  return createHash('sha1').update([token, timestamp, nonce].map(String).sort().join('')).digest('hex');
}

export function verifyOfficialWechatSignature({ token, timestamp, nonce, signature }) {
  if (!token || !timestamp || !nonce || !signature) return false;
  return safeEqual(officialWechatSignature(token, timestamp, nonce), signature);
}

function xmlValue(xml, name) {
  const match = String(xml || '').match(new RegExp(`<${name}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${name}>`, 'i'));
  return clean(match?.[1] ?? match?.[2], 5000);
}

function cdata(value) {
  return clean(value, 1900).replace(/\]\]>/g, ']]]]><![CDATA[>');
}

export function buildOfficialTextReply({ toUser, fromUser, content, createdAt = Math.floor(Date.now() / 1000) }) {
  return `<xml><ToUserName><![CDATA[${cdata(toUser)}]]></ToUserName><FromUserName><![CDATA[${cdata(fromUser)}]]></FromUserName><CreateTime>${Number(createdAt)}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[${cdata(content)}]]></Content></xml>`;
}

function sendText(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.status(status);
  res.setHeader('Content-Type', contentType);
  return typeof res.send === 'function' ? res.send(body) : res.end(body);
}

function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  return '';
}

function actionLink(result) {
  if (!result?.action?.href) return '';
  const href = result.action.href.startsWith('#') ? `${SITE_ORIGIN}/${result.action.href}` : result.action.href;
  return `\n\n${result.action.label || '打开官网'}：${href}`;
}

async function createTicket({ question, category, openId, accountId, messageType }) {
  const id = `WS${Date.now().toString().slice(-10)}${randomBytes(2).toString('hex')}`;
  const item = {
    id,
    channel: 'wechat-official',
    email: '',
    question: clean(question, 600),
    language: 'zh',
    category: clean(category, 60),
    messageType: clean(messageType, 40),
    wechatOpenId: clean(openId, 180),
    wechatOfficialAccountId: clean(accountId, 180),
    status: 'open',
    createdAt: new Date().toISOString(),
    ownerEmailSent: false,
    customerEmailSent: false
  };
  await kv('set', `wonder:support-ticket:${id}`, JSON.stringify(item));
  await kv('zadd', TICKET_INDEX, Date.now(), id);
  return item;
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

async function handleMessage(xml) {
  const toUser = xmlValue(xml, 'FromUserName');
  const fromUser = xmlValue(xml, 'ToUserName');
  const messageType = xmlValue(xml, 'MsgType').toLowerCase();
  const messageId = xmlValue(xml, 'MsgId') || `${toUser}:${xmlValue(xml, 'CreateTime')}:${messageType}`;
  const replyKey = `wonder:wechat-official:reply:${createHash('sha256').update(messageId).digest('hex').slice(0, 32)}`;
  const cachedReply = await kv('get', replyKey);
  if (cachedReply) return cachedReply;

  let content;
  if (messageType === 'event' && xmlValue(xml, 'Event').toLowerCase() === 'subscribe') {
    content = '你好，欢迎来到 Wonder Ad Lab 👋\n\n回复关键词即可快速了解：价格 · 海报 · PPT · 电商 · 视频 · 下单 · 人工\n\n官网：https://www.wonderadlab.com/?from=wechat-official';
  } else if (messageType === 'text') {
    const question = xmlValue(xml, 'Content');
    const result = answerSupportQuestion(question, 'zh');
    if (result.handled) {
      content = `${result.answer}${actionLink(result)}`;
    } else {
      const ticket = await createTicket({ question, category: result.category, openId: toUser, accountId: fromUser, messageType });
      content = `这个问题需要人工核对，已进入统一任务队列，编号 ${ticket.id}。自动客服不会擅自确认特殊报价、付款到账或真实订单进度。`;
    }
  } else {
    const ticket = await createTicket({
      question: `公众号收到${messageType || '非文字'}消息，需要人工查看。`,
      category: 'non-text',
      openId: toUser,
      accountId: fromUser,
      messageType: messageType || 'unknown'
    });
    content = `图片、语音或文件已进入统一任务队列，编号 ${ticket.id}。如方便，也可以补充一段文字说明。`;
  }

  const reply = buildOfficialTextReply({ toUser, fromUser, content });
  await kv('set', replyKey, reply, 'ex', 604800);
  return reply;
}

export default async function wechatOfficialHandler(req, res) {
  const action = queryValue(req, 'action');
  if (req.method === 'POST' && action === 'preview') return preview(req, res);

  const token = process.env.WECHAT_OFFICIAL_TOKEN;
  if (!token) return res.status(503).json({ error: 'WeChat Official Account callback is not configured', setup: true });
  const timestamp = queryValue(req, 'timestamp');
  const nonce = queryValue(req, 'nonce');
  const signature = queryValue(req, 'signature');
  if (!verifyOfficialWechatSignature({ token, timestamp, nonce, signature })) return sendText(res, 401, 'invalid signature');

  if (req.method === 'GET') return sendText(res, 200, queryValue(req, 'echostr'));
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!storageConfigured()) return res.status(503).json({ error: 'WeChat task storage is not configured', setup: true });

  const xml = rawBody(req);
  if (!xml || !xmlValue(xml, 'FromUserName') || !xmlValue(xml, 'ToUserName')) return sendText(res, 400, 'invalid payload');
  try {
    return sendText(res, 200, await handleMessage(xml), 'application/xml; charset=utf-8');
  } catch {
    return sendText(res, 200, 'success');
  }
}
