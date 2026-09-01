import { kv, storageConfigured } from './_admin.js';
import { getCurrentUser } from './_user.js';

const OWNER_EMAIL = 'wonder07090518@gmail.com';
const revisionTypes = new Set(['文字内容', '颜色与风格', '排版与构图', '尺寸与格式', '其他修改']);
const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);
const MAX_REFERENCE_BYTES = 2 * 1024 * 1024;

async function loadOrder(id) {
  const raw = await kv('get', `wonder:order:${id}`);
  return raw ? JSON.parse(raw) : null;
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function validReferenceUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href.slice(0, 500) : '';
  } catch {
    return '';
  }
}

function parseReference(name, data) {
  if (!name || !data) return null;
  const match = String(data).match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match || !allowedMimeTypes.has(match[1])) throw Object.assign(new Error('Unsupported reference file'), { status: 400 });
  const content = match[2];
  if (Buffer.from(content, 'base64').byteLength > MAX_REFERENCE_BYTES) throw Object.assign(new Error('Reference file is too large'), { status: 413 });
  return { name: cleanText(name, 120).replace(/[\\/]/g, '-'), mimeType: match[1], content };
}

async function sendRevisionEmails(order, revision, reference) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return false;
  const referenceLine = revision.referenceUrl ? `\n参考链接：${revision.referenceUrl}` : '';
  const ownerText = `客户提交修改申请\n\n订单号：${order.id}\n项目：${order.service}\n客户邮箱：${order.email}\n修改轮次：第 ${revision.round} 轮\n修改类型：${revision.type}\n提交时间：${revision.createdAt}${referenceLine}\n\n修改内容：\n${revision.details}`;
  const ownerPayload = { from: process.env.MAIL_FROM, to: [OWNER_EMAIL], subject: `Wonder Ad Lab 修改申请 ${order.id} · 第 ${revision.round} 轮`, text: ownerText, reply_to: order.email };
  if (reference) ownerPayload.attachments = [{ filename: reference.name, content: reference.content }];
  const customerPayload = { from: process.env.MAIL_FROM, to: [order.email], subject: `Wonder Ad Lab 已收到修改申请 ${order.id}`, text: `你好，\n\n我们已收到你的第 ${revision.round} 轮修改申请。\n订单号：${order.id}\n项目：${order.service}\n修改类型：${revision.type}\n当前状态：待处理\n\n修改内容：\n${revision.details}\n\n你也可以直接回复这封邮件补充说明。\n\nWonder Ad Lab`, reply_to: OWNER_EMAIL };
  const headers = { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' };
  const [ownerResponse, customerResponse] = await Promise.all([
    fetch('https://api.resend.com/emails', { method: 'POST', headers: { ...headers, 'Idempotency-Key': `revision-owner-${revision.id}` }, body: JSON.stringify(ownerPayload) }),
    fetch('https://api.resend.com/emails', { method: 'POST', headers: { ...headers, 'Idempotency-Key': `revision-customer-${revision.id}` }, body: JSON.stringify(customerPayload) })
  ]);
  return ownerResponse.ok && customerResponse.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!storageConfigured()) return res.status(503).json({ error: 'Order storage is not configured', setup: true });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in before requesting a revision' });
  const orderId = cleanText(req.body?.orderId, 40);
  const type = cleanText(req.body?.type, 40);
  const details = cleanText(req.body?.details, 1200);
  const referenceUrl = validReferenceUrl(cleanText(req.body?.referenceUrl, 500));
  if (!orderId || !revisionTypes.has(type) || details.length < 5) return res.status(400).json({ error: 'Please provide complete revision details' });
  if (req.body?.referenceUrl && !referenceUrl) return res.status(400).json({ error: 'Reference link must use http or https' });
  let reference;
  try { reference = parseReference(req.body?.referenceName, req.body?.referenceData); }
  catch (error) { return res.status(error.status || 400).json({ error: error.message }); }
  const order = await loadOrder(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (String(order.email).toLowerCase() !== user.email) return res.status(403).json({ error: 'This order does not belong to your account' });
  if (order.status !== '已交付') return res.status(409).json({ error: 'A revision can be requested after delivery' });
  const revisions = Array.isArray(order.revisions) ? order.revisions : [];
  if (revisions.some(item => ['待处理', '修改中'].includes(item.status))) return res.status(409).json({ error: 'This order already has an active revision request' });
  const revision = {
    id: `RV${Date.now().toString().slice(-10)}`,
    round: revisions.length + 1,
    type,
    details,
    referenceName: reference?.name || '',
    referenceUrl,
    status: '待处理',
    createdAt: new Date().toISOString()
  };
  const updatedOrder = { ...order, status: '修改申请', revisions: [...revisions.slice(-9), revision], updatedAt: new Date().toISOString() };
  await kv('set', `wonder:order:${order.id}`, JSON.stringify(updatedOrder));
  await kv('zadd', 'wonder:revisions', Date.now(), `${order.id}:${revision.id}`);
  let emailSent = false;
  try { emailSent = await sendRevisionEmails(updatedOrder, revision, reference); } catch { emailSent = false; }
  return res.status(201).json({ ok: true, revision, emailSent });
}
