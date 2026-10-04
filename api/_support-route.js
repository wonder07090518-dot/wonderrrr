import { createHash, randomBytes } from 'node:crypto';
import { isAdmin, kv, storageConfigured } from './_admin.js';

const OWNER_EMAIL = 'wonder07090518@gmail.com';
const ticketIndex = 'wonder:support-tickets';

function clean(value, length) {
  return String(value || '').trim().slice(0, length).replace(/\0/g, '');
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalize(value) {
  return clean(value, 600)
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

export const supportTopics = [
  {
    id: 'start-project',
    keywords: ['开始项目', '开始一个项目', '立即下单', '我要下单', '想下单', '怎么下单', '下单流程', 'startproject', 'startaproject', 'placeorder', 'ordernow'],
    answerZH: '可以直接开始：选择服务、填写用途和想要的感觉，再上传参考文件。提交后工作室会核对需求与价格；常规项目通常在需求、素材和付款确认后 24 小时内完成首版。',
    answerEN: 'You can start now: choose a service, describe the use and desired feel, then add any reference files. The studio will review the brief and price after submission. Standard first drafts are usually ready within 24 hours after the brief, files and payment are confirmed.',
    actionZH: '开始填写需求',
    actionEN: 'Start your project',
    actionHref: '#order'
  },
  {
    id: 'recommendation',
    keywords: ['帮我选', '选择服务', '不知道选什么', '不确定选什么', '适合什么', '推荐服务', 'recommend', 'whichservice', 'helpmechoose'],
    answerZH: '如果主要用于社交媒体，通常选“社媒封面”或“营销海报”；用于商品销售，选“电商商品图”或“详情页”；需要完整品牌起步，可以选“品牌 Logo”或“品牌视觉套装”。仍不确定时，在下单区选“其他需求”，写一句使用场景即可。',
    answerEN: 'For social media, start with a Social Cover or Marketing Poster. For product sales, choose an E-commerce Visual or Detail Page. For a new brand, consider a Logo Concept or Brand Visual Kit. If you are still unsure, choose Custom Request and describe the use in one sentence.',
    actionZH: '查看服务与价格',
    actionEN: 'See services and prices',
    actionHref: '#services'
  },
  {
    id: 'pricing',
    keywords: ['价格', '价钱', '多少钱', '收费', '报价', 'price', 'pricing', 'cost', 'howmuch'],
    answerZH: '常见项目从 ¥12 起：AI 快速配图 ¥12/张、社媒封面 ¥16/张、营销海报 ¥19/张、电商商品图 ¥22/张、PPT 美化 ¥20/页起。套装和复杂项目显示起步价，开工前会确认最终范围与价格。',
    answerEN: 'Popular services start at ¥12: AI quick images ¥12 each, social covers ¥16 each, marketing posters ¥19 each, e-commerce visuals ¥22 each, and slide design from ¥20 per slide. Kits and complex work show a starting price; the final scope and price are confirmed before work begins.',
    actionZH: '查看全部价格',
    actionEN: 'See all prices',
    actionHref: '#services'
  },
  {
    id: 'turnaround',
    keywords: ['多久', '多长时间', '交付', '完成', '加急', '着急', 'turnaround', 'delivery', 'deliver', 'howlong', 'urgent', 'rush'],
    answerZH: '需求、参考文件和付款确认后，常规项目通常在 24 小时内完成首版。复杂项目会另行确认时间；加急项目需要先确认档期、交付时间和加急费用，请不要在确认前付款。',
    answerEN: 'Standard first drafts are usually ready within 24 hours after the brief, reference files and payment are confirmed. Complex projects receive a separate timeline. Rush work must be confirmed for availability, delivery time and the additional fee before payment.'
  },
  {
    id: 'services',
    keywords: ['能做什么', '有哪些服务', '服务类型', '海报', '封面', '电商', 'ppt', 'logo', 'banner', '菜单', '壁纸', 'service', 'poster', 'cover', 'ecommerce', 'slide', 'menu', 'wallpaper'],
    answerZH: 'Wonder Ad Lab 可制作海报、社媒封面、电商主图与详情页、PPT 美化、AI 配图、Logo 概念、Banner、菜单价目表、活动物料、印刷物料、创意字贴和壁纸。选不准时可以在下单区选择“其他需求”，用一句话说明用途。',
    answerEN: 'Wonder Ad Lab creates posters, social covers, e-commerce hero and detail visuals, refined slides, AI images, logo concepts, banners, menus, campaign and print materials, creative type and wallpapers. If you are unsure, choose “Custom request” in the order form and describe the use in one sentence.'
  },
  {
    id: 'payment',
    keywords: ['付款', '支付', 'stripe', '余额', '微信支付', '支付宝', '银行卡', 'payment', 'pay', 'balance', 'card'],
    answerZH: '官网下单可使用 Stripe 安全付款或账户余额，银行卡资料由 Stripe 官方页面处理，Wonder Ad Lab 不保存卡号。付款状态只以官方回调或后台核验记录为准，客服不会把打开付款页当成付款成功。',
    answerEN: 'Website orders can use Stripe secure checkout or account balance. Card details are handled on Stripe’s official page and are never stored by Wonder Ad Lab. Payment is confirmed only by an official callback or a verified admin record; opening a checkout page is not treated as payment.'
  },
  {
    id: 'files',
    keywords: ['上传', '文件', '文件夹', '参考图', '样板', '素材', '1gb', 'upload', 'file', 'folder', 'reference', 'sample'],
    answerZH: '下单时可以上传图片、视频、文档或 ZIP，也可以选择文件夹。每笔订单最多 100 个文件，合计不超过 1GB；文件会存入私有空间，只供处理该订单的授权管理员查看。',
    answerEN: 'You can upload images, videos, documents or ZIP files, or select a folder when ordering. Each order supports up to 100 files and 1GB total. Files are stored privately and are visible only to authorized administrators handling that order.'
  },
  {
    id: 'revision',
    keywords: ['修改', '改稿', '重做', '不满意', 'revision', 'revise', 'change', 'edit'],
    answerZH: '成品交付后，登录账户并打开“我的订单”即可提交修改申请，也可以直接回复交付邮件。请写清楚要改的位置、原内容和目标效果；如果属于全新设计方向，会先联系你确认范围与报价。',
    answerEN: 'After delivery, sign in and open My Orders to submit a revision request, or reply directly to the delivery email. Describe the location, current content and desired result. A completely new design direction will be scoped and quoted before work begins.'
  },
  {
    id: 'order-status',
    keywords: ['订单状态', '进度', '做到哪', '查订单', '我的订单', 'status', 'progress', 'track', 'myorder'],
    answerZH: '请登录下单时使用的账户，再打开“我的订单”查看真实状态、付款入口、参考文件和修改记录。客服不会猜测订单进度；如果状态长时间没有更新，可以留下邮箱转人工核对。',
    answerEN: 'Sign in with the account used for the order, then open My Orders to see the verified status, payment entry, reference files and revision history. Support does not guess order progress. If the status has not changed for an unusual amount of time, leave your email for a human check.'
  }
];

const humanKeywords = ['人工', '真人', '联系你', '工作人员', '客服人员', 'human', 'person', 'agent', 'someone'];

export function answerSupportQuestion(question, language = 'zh') {
  const normalized = normalize(question);
  const wantsHuman = humanKeywords.some(keyword => normalized.includes(normalize(keyword)));
  if (wantsHuman) return { handled: false, category: 'human', needsHuman: true };
  let best = null;
  let bestScore = 0;
  for (const topic of supportTopics) {
    const score = topic.keywords.reduce((total, keyword) => total + (normalized.includes(normalize(keyword)) ? Math.max(1, normalize(keyword).length) : 0), 0);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }
  if (!best || bestScore < 2) return { handled: false, category: 'other', needsHuman: true };
  return {
    handled: true,
    category: best.id,
    answer: language === 'en' ? best.answerEN : best.answerZH,
    action: best.actionHref ? {
      href: best.actionHref,
      label: language === 'en' ? best.actionEN : best.actionZH
    } : undefined
  };
}

async function withinRateLimit(req) {
  if (!storageConfigured()) return true;
  const address = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const fingerprint = createHash('sha256').update(`${address}|${req.headers?.['user-agent'] || ''}`).digest('hex').slice(0, 24);
  const key = `wonder:support-rate:${fingerprint}`;
  const count = Number(await kv('incr', key));
  if (count === 1) await kv('expire', key, 3600);
  return count <= 12;
}

async function sendEmail({ to, replyTo, subject, text, idempotencyKey }) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], reply_to: replyTo, subject, text })
  });
  return response.ok;
}

async function notifyOwner(item) {
  return sendEmail({
    to: OWNER_EMAIL,
    replyTo: item.email,
    subject: `Wonder Ad Lab 客服待回复 · ${item.id}`,
    text: `客服工单：${item.id}\n客户邮箱：${item.email}\n语言：${item.language === 'en' ? 'English' : '中文'}\n提交时间：${item.createdAt}\n\n客户问题：\n${item.question}\n\n请登录 Wonder Ad Lab 管理后台查看。不要在未确认范围前承诺价格或交付时间。`,
    idempotencyKey: `support-owner-${item.id}`
  });
}

async function acknowledgeCustomer(item) {
  const english = item.language === 'en';
  return sendEmail({
    to: item.email,
    replyTo: OWNER_EMAIL,
    subject: english ? `Wonder Ad Lab received your question · ${item.id}` : `Wonder Ad Lab 已收到你的问题 · ${item.id}`,
    text: english
      ? `Hello,\n\nWe received your question and saved it for a human review.\n\nTicket: ${item.id}\nQuestion: ${item.question}\n\nThis automatic receipt does not confirm a quote, delivery time or payment. The studio will reply from this email address after reviewing the details.\n\nWonder Ad Lab`
      : `你好，\n\n我们已收到你的问题，并已转交人工核对。\n\n工单号：${item.id}\n问题：${item.question}\n\n这是一封自动回执，不代表已经确认报价、交付时间或付款。工作室核对后会通过此邮箱回复。\n\nWonder Ad Lab`,
    idempotencyKey: `support-customer-${item.id}`
  });
}

async function emailKnownAnswer({ email, question, result, language }) {
  const digest = createHash('sha256').update(`${email}|${normalize(question)}|${result.category}`).digest('hex').slice(0, 24);
  const english = language === 'en';
  return sendEmail({
    to: email,
    replyTo: OWNER_EMAIL,
    subject: english ? 'Your Wonder Ad Lab support answer' : '你的 Wonder Ad Lab 客服回答',
    text: english
      ? `Hello,\n\nYour question:\n${question}\n\nWonder support answer:\n${result.answer}\n\nIf this does not solve the issue, reply to this email and the studio will review it.\n\nWonder Ad Lab`
      : `你好，\n\n你的问题：\n${question}\n\nWonder 客服回答：\n${result.answer}\n\n如果仍未解决，可以直接回复这封邮件，由工作室人工核对。\n\nWonder Ad Lab`,
    idempotencyKey: `support-answer-${digest}`
  });
}

async function readTickets() {
  const ids = await kv('zrevrange', ticketIndex, 0, 199);
  const values = await Promise.all((ids || []).map(id => kv('get', `wonder:support-ticket:${id}`)));
  return values.map(value => {
    try { return JSON.parse(value); } catch { return null; }
  }).filter(Boolean);
}

export default async function supportHandler(req, res) {
  if (req.method === 'POST') {
    if (clean(req.body?.website, 120)) return res.status(200).json({ ok: true });
    const question = clean(req.body?.question, 600);
    const email = clean(req.body?.email, 180).toLowerCase();
    const language = req.body?.language === 'en' ? 'en' : 'zh';
    const emailAnswer = req.body?.emailAnswer === true;
    if (question.length < 2) return res.status(400).json({ error: 'Please enter a question' });
    if (email && !validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
    if (!(await withinRateLimit(req))) return res.status(429).json({ error: 'Too many questions. Please try again later.' });

    const result = answerSupportQuestion(question, language);
    if (result.handled) {
      let emailSent = false;
      if (emailAnswer && email) emailSent = await emailKnownAnswer({ email, question, result, language }).catch(() => false);
      return res.status(200).json({ ok: true, ...result, emailSent });
    }

    if (!email) {
      return res.status(200).json({
        ok: true,
        handled: false,
        needsEmail: true,
        answer: language === 'en'
          ? 'This needs a human check. Add your email below and send the question again; the studio will receive a support ticket.'
          : '这个问题需要人工核对。请在下方填写邮箱后再发送一次，系统会创建客服工单并通知工作室。'
      });
    }

    if (!storageConfigured()) return res.status(503).json({ error: 'Support ticket storage is not configured', setup: true });

    const id = `WS${Date.now().toString().slice(-10)}${randomBytes(2).toString('hex')}`;
    const item = { id, email, question, language, category: result.category, status: 'open', createdAt: new Date().toISOString(), ownerEmailSent: false, customerEmailSent: false };
    await kv('set', `wonder:support-ticket:${id}`, JSON.stringify(item));
    await kv('zadd', ticketIndex, Date.now(), id);
    const [ownerEmailSent, customerEmailSent] = await Promise.all([
      notifyOwner(item).catch(() => false),
      acknowledgeCustomer(item).catch(() => false)
    ]);
    const updated = { ...item, ownerEmailSent, customerEmailSent };
    await kv('set', `wonder:support-ticket:${id}`, JSON.stringify(updated));
    return res.status(201).json({
      ok: true,
      handled: false,
      escalated: true,
      id,
      ownerEmailSent,
      customerEmailSent,
      answer: language === 'en'
        ? `Your question was saved as ticket ${id}. The automatic receipt may take a moment to arrive.`
        : `你的问题已保存为工单 ${id}，自动回执可能需要一点时间送达。`
    });
  }

  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
  if (!storageConfigured()) return res.status(503).json({ error: 'Support storage is not configured', setup: true });
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method === 'GET') return res.status(200).json({ tickets: await readTickets() });

  if (req.method === 'PUT') {
    const id = clean(req.body?.id, 40);
    const status = clean(req.body?.status, 20);
    if (!/^WS\d{10}[a-f0-9]{4}$/.test(id) || !['open', 'resolved'].includes(status)) return res.status(400).json({ error: 'Invalid support update' });
    const raw = await kv('get', `wonder:support-ticket:${id}`);
    if (!raw) return res.status(404).json({ error: 'Support ticket not found' });
    const updated = { ...JSON.parse(raw), status, updatedAt: new Date().toISOString() };
    await kv('set', `wonder:support-ticket:${id}`, JSON.stringify(updated));
    return res.status(200).json({ ok: true, ticket: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
