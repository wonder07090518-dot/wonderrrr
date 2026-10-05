import { isAdmin, kv, storageConfigured } from './_admin.js';
import { isCommentReviewer } from './_comment-reviewer.js';

function parse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

async function records(index, prefix, limit = 80) {
  const ids = await kv('zrevrange', index, 0, limit - 1);
  const values = await Promise.all((ids || []).map(id => kv('get', `${prefix}${id}`)));
  return values.map(parse).filter(Boolean);
}

function orderTask(order) {
  const paid = order.status === '已支付';
  const manual = ['微信支付', '支付宝'].includes(order.payment);
  return {
    id: String(order.id || '').slice(0, 40),
    kind: 'order',
    title: String(order.service || '创意订单').slice(0, 80),
    status: String(order.status || '审核中').slice(0, 30),
    createdAt: order.createdAt || null,
    priority: order.turnaround === 'rush-request' ? 'human' : paid ? 'ready' : 'waiting',
    next: order.turnaround === 'rush-request'
      ? '人工确认加急范围与价格'
      : paid
        ? '付款已核验，可进入制作安排'
        : manual
          ? '等待人工核对到账'
          : '等待 Stripe 官方付款结果'
  };
}

function supportTask(ticket) {
  return {
    id: String(ticket.id || '').slice(0, 40),
    kind: 'support',
    title: ticket.channel === 'wechat-official' ? '公众号人工问题' : ticket.channel === 'wechat' ? '微信客服人工问题' : '官网人工问题',
    status: ticket.status === 'resolved' ? '已处理' : '待人工核对',
    createdAt: ticket.createdAt || null,
    priority: ticket.status === 'resolved' ? 'done' : 'human',
    next: ticket.status === 'resolved' ? '无需操作' : '人工查看原始后台并回复'
  };
}

export default async function agentOpsHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req) && !isCommentReviewer(req)) return res.status(401).json({ error: 'Restricted operations access required' });
  if (!storageConfigured()) return res.status(503).json({ error: 'Operations storage is not configured', setup: true });
  const [orders, tickets] = await Promise.all([
    records('wonder:orders', 'wonder:order:'),
    records('wonder:support-tickets', 'wonder:support-ticket:')
  ]);
  const tasks = [...orders.map(orderTask), ...tickets.map(supportTask)]
    .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0))
    .slice(0, 80);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({
    privacy: 'sanitized',
    automation: {
      stripe: process.env.STRIPE_ENABLE_LIVE === 'true' && process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_'),
      wecomCustomerService: Boolean(
        process.env.WECOM_CORP_ID
        && process.env.WECOM_KF_SECRET
        && process.env.WECOM_KF_TOKEN
        && process.env.WECOM_KF_ENCODING_AES_KEY
      ),
      knownQuestions: true
    },
    counts: {
      total: tasks.length,
      ready: tasks.filter(item => item.priority === 'ready').length,
      human: tasks.filter(item => item.priority === 'human').length,
      waiting: tasks.filter(item => item.priority === 'waiting').length
    },
    tasks
  });
}
