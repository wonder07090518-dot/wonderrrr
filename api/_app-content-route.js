import { servicePrices } from './_catalog.js';

const news = [
  {
    id: 'mobile-preview',
    date: '2026-09-03',
    titleEN: 'Wonder is coming to Apple devices',
    titleZH: 'Wonder 正在走进 Apple 设备',
    bodyEN: 'A new native experience for browsing services, placing orders and following every update.',
    bodyZH: '全新的原生体验，可浏览服务、提交订单并查看每一次更新。',
    symbol: 'apple.logo'
  },
  {
    id: 'value-card',
    date: '2026-09-03',
    titleEN: 'Value card bonuses are live',
    titleZH: '储值卡赠送额度已上线',
    bodyEN: 'Top up once, receive bonus credit and pay for future orders from your balance.',
    bodyZH: '充值后可获得赠送额度，并在后续订单中直接使用余额支付。',
    symbol: 'wallet.bifold'
  },
  {
    id: 'reference-upload',
    date: '2026-09-01',
    titleEN: 'Reference uploads expanded to 1 GB',
    titleZH: '参考文件支持提升至 1GB',
    bodyEN: 'Send richer briefs with images, video, documents or ZIP files through the website.',
    bodyZH: '网站现支持图片、视频、文档与 ZIP，方便提交更完整的参考资料。',
    symbol: 'arrow.up.doc'
  }
];

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).json({
    updatedAt: '2026-09-03',
    servicePrices,
    news
  });
}
