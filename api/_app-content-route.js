import { servicePrices } from './_catalog.js';

const news = [
  {
    id: 'service-specific-specs',
    date: '2026-09-03',
    titleEN: 'Each service now has the right specifications',
    titleZH: '每项服务已有专属规格',
    bodyEN: 'Logo, social, poster, commerce, print and other services now show their own delivery specifications, with custom size and style fields when needed.',
    bodyZH: 'Logo、社媒、海报、电商、印刷等服务会显示各自的交付规格，也可填写自定义尺寸与自定义风格。',
    symbol: 'slider.horizontal.3'
  },
  {
    id: 'app-visual-refresh',
    date: '2026-09-03',
    titleEN: 'A clearer, Chinese-first app experience',
    titleZH: '中文优先的新版 App 视觉完成',
    bodyEN: 'The home, services, order, updates and account screens now use a tighter mobile layout, clearer actions and original app-only artwork.',
    bodyZH: '首页、服务、下单、动态与账户页面完成移动端优化，入口更清楚，并换上 App 专属原创视觉。',
    symbol: 'sparkles.rectangle.stack'
  },
  {
    id: 'privacy-controls',
    date: '2026-09-03',
    titleEN: 'Privacy controls and account deletion added',
    titleZH: '隐私政策与账户注销功能完善',
    bodyEN: 'A public bilingual privacy policy is available, and signed-in app users can request permanent account and associated-data deletion.',
    bodyZH: '中英文完整隐私政策已经公开，登录 App 后可申请永久注销账户并删除关联数据。',
    symbol: 'hand.raised.fill'
  },
  {
    id: 'shared-order-desk',
    date: '2026-09-03',
    titleEN: 'Orders now share one studio workflow',
    titleZH: '网站与 App 共用订单工作台',
    bodyEN: 'Orders are saved before email notices are sent. Standard work shows tracked progress, while rush requests wait for availability and final-quote confirmation.',
    bodyZH: '订单会先保存再发送邮件通知；常规订单可查看进度，加急需求会先确认档期与最终报价。',
    symbol: 'shippingbox.fill'
  },
  {
    id: 'mobile-preview',
    date: '2026-09-03',
    titleEN: 'Wonder for Apple entered local testing',
    titleZH: 'Wonder Apple 原生 App 进入测试',
    bodyEN: 'The five-tab native app can browse services, place an order, follow studio updates, and view account and order progress.',
    bodyZH: '五个原生页面已经可以浏览服务、提交订单、查看动态，并管理账户与订单进度。',
    symbol: 'apple.logo'
  },
  {
    id: 'value-card',
    date: '2026-09-02',
    titleEN: 'Value card bonuses are live',
    titleZH: '储值卡赠送额度已上线',
    bodyEN: 'Top up once, receive bonus credit and pay for future orders from your balance.',
    bodyZH: '充值后可获得赠送额度，并在后续订单中直接使用余额支付。',
    symbol: 'wallet.bifold'
  },
  {
    id: 'wechat-qr-mobile',
    date: '2026-09-02',
    titleEN: 'WeChat QR works better on mobile',
    titleZH: '微信二维码手机识别优化',
    bodyEN: 'The contact and payment QR now keeps its original proportions, opens in high resolution and includes clearer mobile scanning guidance.',
    bodyZH: '联系与付款二维码保持原始比例，可打开高清图，并加入更清楚的手机识别提示。',
    symbol: 'qrcode.viewfinder'
  },
  {
    id: 'reference-upload',
    date: '2026-09-01',
    titleEN: 'Reference uploads expanded to 1 GB',
    titleZH: '参考文件支持提升至 1GB',
    bodyEN: 'Send richer briefs with images, video, documents or ZIP files through the website.',
    bodyZH: '网站现支持图片、视频、文档与 ZIP，方便提交更完整的参考资料。',
    symbol: 'arrow.up.doc'
  },
  {
    id: 'feedback',
    date: '2026-09-01',
    titleEN: 'Suggestions can go straight to the studio',
    titleZH: '意见建议可直接提交给工作室',
    bodyEN: 'A dedicated feedback form now saves suggestions and sends a studio email without exposing customer details publicly.',
    bodyZH: '新增意见建议入口，提交后会安全保存并通知工作室，不会公开客户信息。',
    symbol: 'bubble.left.and.bubble.right.fill'
  },
  {
    id: 'revision-workflow',
    date: '2026-08-31',
    titleEN: 'Delivered work can request a revision',
    titleZH: '已交付订单支持申请修改',
    bodyEN: 'Customers can describe the change, attach a reference and follow the revision status from the same order.',
    bodyZH: '客户可以在原订单中填写修改内容、附上参考资料，并继续查看修改进度。',
    symbol: 'arrow.triangle.2.circlepath'
  },
  {
    id: 'bilingual-mobile',
    date: '2026-08-31',
    titleEN: 'Bilingual checkout and mobile navigation improved',
    titleZH: '中英文结账与手机导航优化',
    bodyEN: 'Key actions, accessible labels and checkout wording now switch consistently between Chinese and English on smaller screens.',
    bodyZH: '主要操作、辅助说明与结账文案可在中英文之间一致切换，小屏使用更加清楚。',
    symbol: 'translate'
  },
  {
    id: 'search-performance',
    date: '2026-08-31',
    titleEN: 'Service discovery and loading improved',
    titleZH: '服务搜索曝光与加载速度提升',
    bodyEN: 'Focused service guides, stronger indexing signals and optimized visual assets make the website easier to discover and faster to open.',
    bodyZH: '新增重点服务介绍页、搜索收录信号和图片优化，让网站更容易被找到，打开也更快。',
    symbol: 'magnifyingglass'
  },
  {
    id: 'payment-confirmation',
    date: '2026-08-31',
    titleEN: 'Payment guidance and confirmation became safer',
    titleZH: '付款指引与到账确认更加安全',
    bodyEN: 'Customers can open the correct QR and submit a payment notice, while the studio still verifies the official payment record before marking an order paid.',
    bodyZH: '客户可打开正确收款码并提交付款提醒，工作室仍会核对官方到账记录后再确认已支付。',
    symbol: 'checkmark.shield'
  },
  {
    id: 'service-matrix',
    date: '2026-08-25',
    titleEN: 'A larger, transparent service catalog launched',
    titleZH: '更完整、透明的服务目录上线',
    bodyEN: 'The redesigned catalog groups social, commerce, brand and other creative services with clearer deliverables and visible prices.',
    bodyZH: '新版服务目录按社媒、电商、品牌和更多需求分类，交付内容与价格更加一目了然。',
    symbol: 'rectangle.grid.2x2'
  },
  {
    id: 'workflow-story',
    date: '2026-08-25',
    titleEN: 'The creative workflow became an interactive story',
    titleZH: '制作流程升级为滚动互动故事',
    bodyEN: 'The homepage now explains the journey from brief and AI-assisted creation to human review and customer delivery through scroll-driven motion.',
    bodyZH: '首页通过滚动动画展示从提交需求、AI 辅助制作、真人检查到交付客户的完整过程。',
    symbol: 'point.topleft.down.to.point.bottomright.curvepath'
  },
  {
    id: 'customer-accounts',
    date: '2026-07-25',
    titleEN: 'Cross-device customer accounts launched',
    titleZH: '跨设备客户账户正式上线',
    bodyEN: 'Customers can sign in across devices to keep their own orders, status and delivery history protected under one account.',
    bodyZH: '客户可以跨设备登录，同一账户内安全查看自己的订单、状态与交付记录。',
    symbol: 'person.crop.circle.badge.checkmark'
  },
  {
    id: 'catalog-expansion',
    date: '2026-07-25',
    titleEN: 'Creative services expanded beyond single images',
    titleZH: '创意服务从单张图片扩展',
    bodyEN: 'Wonder added social, commerce, branding, slide, banner, menu, print and ongoing content options for different project needs.',
    bodyZH: 'Wonder 增加社媒、电商、品牌、PPT、Banner、菜单、印刷物料与长期内容服务。',
    symbol: 'square.grid.2x2'
  },
  {
    id: 'wechat-contact',
    date: '2026-07-18',
    titleEN: 'Direct WeChat contact was added',
    titleZH: '网站加入微信直接联系入口',
    bodyEN: 'Visitors can open or save the Wonder WeChat card when they need to discuss a brief before placing an order.',
    bodyZH: '访客可以打开或保存 Wonder 微信联系卡，在下单前先沟通需求。',
    symbol: 'message.fill'
  },
  {
    id: 'admin-delivery',
    date: '2026-07-13',
    titleEN: 'The studio order and delivery desk launched',
    titleZH: '工作室订单与交付后台上线',
    bodyEN: 'A protected admin desk added order status, delivery uploads and customer email notifications for day-to-day operations.',
    bodyZH: '受保护的管理后台支持订单状态、成品上传与客户邮件通知，方便日常处理订单。',
    symbol: 'rectangle.stack.badge.person.crop'
  },
  {
    id: 'service-scope',
    date: '2026-07-13',
    titleEN: 'The service scope became more focused',
    titleZH: '服务范围调整得更专注',
    bodyEN: 'Portrait and ID-photo services were removed so the studio could focus on graphic, promotional, commerce and brand design.',
    bodyZH: '证件照与人像服务下线，工作室集中提供平面、宣传、电商与品牌设计。',
    symbol: 'scope'
  },
  {
    id: 'website-launch',
    date: '2026-07-12',
    titleEN: 'Wonder Ad Lab opened online',
    titleZH: 'Wonder Ad Lab 正式上线',
    bodyEN: 'The first website brought service browsing, creative briefs, payment guidance and email-based delivery into one place.',
    bodyZH: '首版网站把服务浏览、创意需求、付款指引与邮件交付集中到同一个入口。',
    symbol: 'globe'
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
