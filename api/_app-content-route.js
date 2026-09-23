import { servicePrices } from './_catalog.js';
import { readApprovedNews } from './_news-submissions-route.js';

const news = [
  {
    id: 'wonder-ilabs-social',
    date: '2026-09-04',
    titleEN: 'Wonder Ad Lab is now on Xiaohongshu',
    titleZH: 'Wonder Ad Lab 正式入驻小红书',
    bodyEN: 'Wonder Ad Lab is now officially on Xiaohongshu, with more social channels to follow. We will share our design process, work highlights and studio updates there.',
    bodyZH: 'Wonder Ad Lab 现已正式入驻小红书，并将陆续开通更多社交媒体账号。我们会分享设计过程、作品细节与工作室动态。',
    symbol: 'megaphone.fill'
  },
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

const industryNews = [
  {
    id: 'mistral-vibe-unified-experience',
    date: '2026-09-22',
    titleEN: 'Mistral unifies Chat and Work in Vibe',
    titleZH: 'Mistral 在 Vibe 中合并 Chat 与 Work',
    bodyEN: 'Mistral is merging Chat and Work into one Vibe experience. After migration, users get a unified conversation list, Fast and Think modes, reusable Skills, a browsable Knowledge Base and temporary chats. The rollout is phased for Free, Pro and Teams accounts; enterprise migration begins October 1.',
    bodyZH: 'Mistral 正把 Chat 与 Work 合并为统一的 Vibe 体验。迁移后，用户可使用统一会话列表、Fast 与 Think 模式、可复用 Skills、可浏览的知识库和临时聊天。Free、Pro 与 Teams 账户正在分阶段迁移，企业迁移将于 10 月 1 日开始。',
    sourceName: 'Mistral',
    sourceURL: 'https://docs.mistral.ai/resources/release-notes',
    categoryEN: 'Product update',
    categoryZH: '产品更新',
    verified: true,
    symbol: 'rectangle.3.group.bubble.left.fill'
  },
  {
    id: 'microsoft-retrochimera-open-source',
    date: '2026-09-21',
    titleEN: 'Microsoft open-sources RetroChimera for retrosynthesis',
    titleZH: 'Microsoft 开源逆合成模型 RetroChimera',
    bodyEN: 'Microsoft Research published RetroChimera, a retrosynthesis model that combines complementary neural models and learned ranking to propose synthesis routes. According to Microsoft, expert chemists preferred its predictions in blind tests; the implementation and weights are available under an MIT license.',
    bodyZH: 'Microsoft Research 发布 RetroChimera，这是一款把互补神经模型与学习排序结合起来、用于提出分子合成路线的逆合成模型。据微软介绍，专家化学家在盲测中更偏好其预测；实现代码和模型权重已按 MIT 许可证开放。',
    sourceName: 'Microsoft Research',
    sourceURL: 'https://www.microsoft.com/en-us/research/blog/improving-synthesis-prediction-of-small-molecules-at-scale-with-retrochimera/',
    categoryEN: 'Research model',
    categoryZH: '研究模型',
    verified: true,
    symbol: 'atom'
  },
  {
    id: 'anthropic-accenture-embedded-evaluation',
    date: '2026-09-18',
    titleEN: 'Anthropic and Accenture launch embedded frontier-model evaluation',
    titleZH: 'Anthropic 与 Accenture 推进前沿模型嵌入式评估',
    bodyEN: 'Anthropic is partnering with Accenture, led by its specialist AI business Faculty, to independently evaluate and red-team frontier models, assess alignment and test safeguards. Embedded evaluators will work inside the lab with access comparable to an employee; Anthropic says operating standards are still being developed.',
    bodyZH: 'Anthropic 与 Accenture 建立合作，由后者旗下专业 AI 业务 Faculty 对前沿模型开展独立评估与红队测试，并评估对齐情况和安全措施。嵌入式评估人员将在实验室内部获得接近员工的访问权限；Anthropic 表示相关运作标准仍在制定中。',
    sourceName: 'Anthropic',
    sourceURL: 'https://www.anthropic.com/news/accenture-embedded-evaluation',
    categoryEN: 'AI safety',
    categoryZH: 'AI 安全',
    verified: true,
    symbol: 'shield.checkered'
  },
  {
    id: 'anthropic-frontier-lab-development-metrics',
    date: '2026-09-17',
    titleEN: 'Anthropic proposes metrics for tracking frontier AI development',
    titleZH: 'Anthropic 提出追踪前沿 AI 研发进度的新指标',
    bodyEN: 'Anthropic published three proposed measurements for frontier labs: how much AI performs AI R&D, how well agent actions are monitored, and how compute is allocated. Its August snapshot says Claude was not fully autonomous in any measured R&D subset, while it “led” 26% of the work; Anthropic says the metrics need shared methods and independent verification before cross-lab comparison.',
    bodyZH: 'Anthropic 公布三类面向前沿实验室的拟议指标：AI 参与 AI 研发的程度、智能体行为的监督能力，以及算力分配方式。其 8 月快照显示，Claude 在任何已测研发子任务中都未达到完全自主，但在 26% 的工作中处于“主导”水平；Anthropic 同时指出，跨实验室比较前仍需统一方法并由独立第三方验证。',
    sourceName: 'Anthropic',
    sourceURL: 'https://www.anthropic.com/institute/measuring-pace-of-ai-development',
    categoryEN: 'AI transparency',
    categoryZH: 'AI 透明度',
    verified: true,
    symbol: 'gauge.with.dots.needle.67percent'
  },
  {
    id: 'anthropic-life-sciences-verification-program',
    date: '2026-09-17',
    titleEN: 'Anthropic opens a verified AI access program for life sciences',
    titleZH: 'Anthropic 推出生命科学验证访问计划',
    bodyEN: 'Anthropic launched the Life Sciences Verification Program in beta for teams and institutions. Verified organizations can use Mythos, Opus and Sonnet models with safeguards adapted for legitimate biology work across Claude, Claude Code and the API; access is reviewed and monitored by declared use case.',
    bodyZH: 'Anthropic 面向团队与机构推出测试版生命科学验证计划。通过审核的组织可在 Claude、Claude Code 与 API 中使用 Mythos、Opus 和 Sonnet 模型，并获得更适合合法生物研究的安全限制；访问权限会按申报用途审核与监测。',
    sourceName: 'Anthropic',
    sourceURL: 'https://www.anthropic.com/news/life-sciences-verification-program',
    categoryEN: 'Research access',
    categoryZH: '研究访问',
    verified: true,
    symbol: 'brain'
  },
  {
    id: 'openai-astra-for-law',
    date: '2026-09-17',
    titleEN: 'OpenAI introduces Astra for Law',
    titleZH: 'OpenAI 发布 Astra for Law',
    bodyEN: 'OpenAI introduced Astra for Law, combining GPT-6 Astra with a legal search index, tailored instructions and governance controls for professional legal work. It is initially available to selected firms through Trusted Access, with API availability planned; OpenAI also announced 26 partner-built legal plugins.',
    bodyZH: 'OpenAI 发布 Astra for Law，将 GPT-6 Astra 与法律检索索引、专业指令和治理控制结合，用于专业法律工作。该服务首批通过 Trusted Access 向部分律所开放，API 将随后推出；OpenAI 同时公布了 26 个合作伙伴开发的法律插件。',
    sourceName: 'OpenAI',
    sourceURL: 'https://openai.com/index/astra-for-law/',
    categoryEN: 'Product launch',
    categoryZH: '产品发布',
    verified: true,
    symbol: 'sparkles'
  },
  {
    id: 'openai-chatgpt-ads-ai-tools',
    date: '2026-09-16',
    titleEN: 'OpenAI adds AI tools and sponsored agents to ChatGPT Ads',
    titleZH: 'OpenAI 为 ChatGPT Ads 加入 AI 广告工具与赞助智能体',
    bodyEN: 'OpenAI is testing Sponsored Agents with selected U.S. advertisers and adding AI tools for creating, updating and analyzing campaigns through prompts. Ads Manager can also suggest copy and imagery, while HubSpot and Shopify integrations bring campaign management into existing business tools; availability varies by market and product.',
    bodyZH: 'OpenAI 正在面向部分美国广告主测试“赞助智能体”，并加入可通过提示词创建、更新和分析广告活动的 AI 工具。Ads Manager 还可建议文案与图像，HubSpot 和 Shopify 集成则把广告管理接入现有商业工具；具体开放范围因市场和产品而异。',
    sourceName: 'OpenAI',
    sourceURL: 'https://openai.com/index/reimagining-advertising-with-ai/',
    categoryEN: 'Advertising tools',
    categoryZH: '广告工具',
    verified: true,
    symbol: 'megaphone.fill'
  },
  {
    id: 'google-gemini-3-8-live',
    date: '2026-09-15',
    titleEN: 'Google launches Gemini 3.8 Live models',
    titleZH: 'Google 发布 Gemini 3.8 Live 模型',
    bodyEN: 'Google introduced Gemini 3.8 Live for scalable, cost-efficient real-time conversation with visual grounding, and Gemini 3.8 Live Extended Thinking for high-complexity tasks and multi-step reasoning. Both are rolling out through the Gemini API and Google AI Studio; availability across Search Live, Gemini and Workspace differs by product, while enterprise access begins in private preview.',
    bodyZH: 'Google 发布 Gemini 3.8 Live，以更具成本效率的方式支持大规模实时对话与视觉理解；同时推出面向高复杂度任务和多步骤推理的 Gemini 3.8 Live Extended Thinking。两款模型正通过 Gemini API 与 Google AI Studio 推出，在 Search Live、Gemini 与 Workspace 中的开放范围因产品而异，企业端则从私密预览开始。',
    sourceName: 'Google',
    sourceURL: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/',
    categoryEN: 'Live multimodal models',
    categoryZH: '实时多模态模型',
    verified: true,
    symbol: 'waveform.badge.mic'
  },
  {
    id: 'openai-gpt-6-astra',
    date: '2026-09-03',
    titleEN: 'How GPT-6 Astra can support promo films',
    titleZH: 'GPT-6 Astra 能怎样协助宣传片',
    bodyEN: 'OpenAI says GPT-6 Astra is stronger at complex professional work, media production, visual judgment and multi-step workflows. Wonder’s practical take: it can help organize a promo-film concept, script, storyboard and production workflow, while finished footage still requires a dedicated video-generation or editing tool.',
    bodyZH: 'OpenAI 表示 GPT-6 Astra 在复杂专业工作、媒体制作、视觉判断与多步骤工作流方面更强。Wonder 应用解读：它可以协助梳理宣传片创意、脚本、分镜与制作流程；成片仍需由专门的视频生成或剪辑工具完成。',
    sourceName: 'OpenAI',
    sourceURL: 'https://openai.com/index/gpt-6-astra/',
    categoryEN: 'Model capabilities',
    categoryZH: '模型能力',
    verified: true,
    symbol: 'sparkles'
  },
  {
    id: 'google-gemini-july-2026-drop',
    date: '2026-07-31',
    titleEN: 'Google updates the Gemini 3 model family',
    titleZH: 'Google 更新 Gemini 3 模型系列',
    bodyEN: 'Google introduced Gemini 3.6 Flash and Gemini 3.5 Flash-Lite in its July Gemini Drop. The update focuses on faster everyday responses and a lighter model for high-volume tasks, with availability varying by product and region.',
    bodyZH: 'Google 在 7 月 Gemini Drop 中推出 Gemini 3.6 Flash 与 Gemini 3.5 Flash-Lite，重点提升日常响应速度，并为高频任务提供更轻量的模型；具体开放范围因产品和地区而异。',
    sourceName: 'Google',
    sourceURL: 'https://blog.google/products-and-platforms/products/gemini/gemini-drop-july-2026/',
    categoryEN: 'Model release',
    categoryZH: '模型发布',
    verified: true,
    symbol: 'bolt.fill'
  },
  {
    id: 'anthropic-claude-opus-5',
    date: '2026-07-24',
    titleEN: 'Anthropic releases Claude Opus 5',
    titleZH: 'Anthropic 发布 Claude Opus 5',
    bodyEN: 'Anthropic released Claude Opus 5 for demanding professional work. The company positions it as its strongest broadly available model for complex reasoning, coding and long-running agentic tasks.',
    bodyZH: 'Anthropic 发布 Claude Opus 5，面向高难度专业工作，并将其定位为处理复杂推理、编程与长时间智能体任务的强力通用模型。',
    sourceName: 'Anthropic',
    sourceURL: 'https://www.anthropic.com/news/claude-opus-5',
    categoryEN: 'Model release',
    categoryZH: '模型发布',
    verified: true,
    symbol: 'brain.head.profile'
  },
  {
    id: 'anthropic-claude-sonnet-5',
    date: '2026-06-30',
    titleEN: 'Anthropic releases Claude Sonnet 5',
    titleZH: 'Anthropic 发布 Claude Sonnet 5',
    bodyEN: 'Claude Sonnet 5 arrived with improvements to agentic coding, planning and tool use. Anthropic made it the default model for Claude Free and Pro users and also offered it through the API.',
    bodyZH: 'Claude Sonnet 5 提升了智能体编程、规划与工具调用能力。Anthropic 将它设为 Claude 免费版与专业版的默认模型，并通过 API 提供。',
    sourceName: 'Anthropic',
    sourceURL: 'https://www.anthropic.com/news/claude-sonnet-5',
    categoryEN: 'Model release',
    categoryZH: '模型发布',
    verified: true,
    symbol: 'hammer.fill'
  },
  {
    id: 'openai-gpt-5-6-sol-preview',
    date: '2026-06-26',
    titleEN: 'OpenAI previews GPT-5.6 Sol',
    titleZH: 'OpenAI 预览 GPT-5.6 Sol',
    bodyEN: 'OpenAI previewed GPT-5.6 Sol as the flagship of a new model family, alongside Terra for balanced workloads and Luna for speed and cost efficiency. The initial release was a limited preview rather than a universal rollout.',
    bodyZH: 'OpenAI 预览 GPT-5.6 Sol，并同时介绍定位均衡的 Terra 与强调速度和成本效率的 Luna。首发属于有限预览，并非全面开放。',
    sourceName: 'OpenAI',
    sourceURL: 'https://openai.com/index/previewing-gpt-5-6-sol/',
    categoryEN: 'Model preview',
    categoryZH: '模型预览',
    verified: true,
    symbol: 'sun.max.fill'
  },
  {
    id: 'apple-intelligence-2026',
    date: '2026-06-08',
    titleEN: 'Apple expands Apple Intelligence',
    titleZH: 'Apple 扩展 Apple Intelligence',
    bodyEN: 'Apple announced a new generation of Apple Intelligence capabilities across its platforms, including a new architecture and expanded Siri and app experiences. Availability depends on device, language and region.',
    bodyZH: 'Apple 公布新一代 Apple Intelligence 能力，涵盖新的系统架构，以及 Siri 与多款 App 体验的扩展；具体可用性取决于设备、语言和地区。',
    sourceName: 'Apple',
    sourceURL: 'https://www.apple.com/newsroom/2026/06/apple-intelligence-brings-powerful-ai-capabilities-into-everyday-experiences/',
    categoryEN: 'Product update',
    categoryZH: '产品更新',
    verified: true,
    symbol: 'apple.logo'
  },
  {
    id: 'openai-gpt-5-5',
    date: '2026-04-23',
    titleEN: 'OpenAI introduces GPT-5.5',
    titleZH: 'OpenAI 发布 GPT-5.5',
    bodyEN: 'OpenAI introduced GPT-5.5 for agentic coding, computer use and professional knowledge work, with API availability following the announcement. It marked a major step between GPT-5 and the later GPT-6 generation.',
    bodyZH: 'OpenAI 发布 GPT-5.5，重点面向智能体编程、电脑操作与专业知识工作，并在发布后提供 API。它是 GPT-5 与后续 GPT-6 世代之间的重要升级。',
    sourceName: 'OpenAI',
    sourceURL: 'https://openai.com/index/introducing-gpt-5-5/',
    categoryEN: 'Model release',
    categoryZH: '模型发布',
    verified: true,
    symbol: 'wand.and.stars'
  },
  {
    id: 'anthropic-claude-opus-4-6',
    date: '2026-02-05',
    titleEN: 'Anthropic releases Claude Opus 4.6',
    titleZH: 'Anthropic 发布 Claude Opus 4.6',
    bodyEN: 'Claude Opus 4.6 improved coding and longer agentic tasks, and introduced a one-million-token context window in beta. It became an important step toward more persistent AI work sessions.',
    bodyZH: 'Claude Opus 4.6 提升编程与长时间智能体任务表现，并以测试形式提供 100 万 token 上下文窗口，推动 AI 处理更持久的工作流程。',
    sourceName: 'Anthropic',
    sourceURL: 'https://www.anthropic.com/news/claude-opus-4-6',
    categoryEN: 'Model release',
    categoryZH: '模型发布',
    verified: true,
    symbol: 'text.page.badge.magnifyingglass'
  },
  {
    id: 'google-gemini-3',
    date: '2025-11-18',
    titleEN: 'Google introduces Gemini 3',
    titleZH: 'Google 发布 Gemini 3',
    bodyEN: 'Google introduced Gemini 3 Pro in preview across the Gemini app, AI Studio, Vertex AI and Search AI Mode, and unveiled Antigravity as a new agentic development experience.',
    bodyZH: 'Google 以预览形式在 Gemini App、AI Studio、Vertex AI 与搜索 AI 模式中推出 Gemini 3 Pro，并公布面向智能体开发的新体验 Antigravity。',
    sourceName: 'Google',
    sourceURL: 'https://blog.google/products-and-platforms/products/gemini/gemini-3/',
    categoryEN: 'Model release',
    categoryZH: '模型发布',
    verified: true,
    symbol: 'diamond.fill'
  },
  {
    id: 'openai-gpt-5',
    date: '2025-08-07',
    titleEN: 'OpenAI introduces GPT-5',
    titleZH: 'OpenAI 发布 GPT-5',
    bodyEN: 'OpenAI introduced GPT-5 as a unified system that routes between fast responses and deeper reasoning. It rolled out across ChatGPT tiers, with GPT-5 Pro offered for especially demanding work.',
    bodyZH: 'OpenAI 发布 GPT-5，将快速回答与深度推理整合进统一系统并自动选择处理方式；它陆续覆盖多个 ChatGPT 方案，同时提供面向高难度任务的 GPT-5 Pro。',
    sourceName: 'OpenAI',
    sourceURL: 'https://openai.com/index/introducing-gpt-5/',
    categoryEN: 'Model release',
    categoryZH: '模型发布',
    verified: true,
    symbol: '5.circle.fill'
  },
  {
    id: 'apple-foundation-models-framework',
    date: '2025-06-09',
    titleEN: 'Apple opens its on-device model to developers',
    titleZH: 'Apple 向开发者开放端侧模型',
    bodyEN: 'Apple announced the Foundation Models framework, giving developers Swift access to the on-device model behind Apple Intelligence. It supports private, offline-capable features without per-request cloud inference fees.',
    bodyZH: 'Apple 公布 Foundation Models 框架，让开发者能通过 Swift 调用 Apple Intelligence 的端侧模型，构建注重隐私、可离线运行且无需按次支付云端推理费用的功能。',
    sourceName: 'Apple',
    sourceURL: 'https://www.apple.com/newsroom/2025/06/apple-intelligence-gets-even-more-powerful-with-new-capabilities-across-apple-devices/',
    categoryEN: 'Developer platform',
    categoryZH: '开发平台',
    verified: true,
    symbol: 'iphone.gen3.radiowaves.left.and.right'
  },
  {
    id: 'anthropic-claude-4',
    date: '2025-05-22',
    titleEN: 'Anthropic introduces Claude 4',
    titleZH: 'Anthropic 发布 Claude 4',
    bodyEN: 'Anthropic introduced Claude Opus 4 and Claude Sonnet 4 with stronger coding, reasoning, agent behavior and tool use. The release established the fourth-generation Claude model family.',
    bodyZH: 'Anthropic 发布 Claude Opus 4 与 Claude Sonnet 4，提升编程、推理、智能体行为与工具调用能力，正式建立第四代 Claude 模型系列。',
    sourceName: 'Anthropic',
    sourceURL: 'https://www.anthropic.com/news/claude-4',
    categoryEN: 'Model release',
    categoryZH: '模型发布',
    verified: true,
    symbol: 'number.square.fill'
  },
  {
    id: 'meta-llama-4',
    date: '2025-04-05',
    titleEN: 'Meta releases Llama 4 Scout and Maverick',
    titleZH: 'Meta 发布 Llama 4 Scout 与 Maverick',
    bodyEN: 'Meta released Llama 4 Scout and Maverick as open-weight, natively multimodal mixture-of-experts models. Scout notably supports a very long context window, while both models can be downloaded for local or hosted development.',
    bodyZH: 'Meta 发布开放权重的原生多模态混合专家模型 Llama 4 Scout 与 Maverick。Scout 支持超长上下文，两款模型均可下载并用于本地或托管开发。',
    sourceName: 'Meta AI',
    sourceURL: 'https://ai.meta.com/blog/llama-4-multimodal-intelligence/',
    categoryEN: 'Open models',
    categoryZH: '开放模型',
    verified: true,
    symbol: 'shippingbox.fill'
  },
  {
    id: 'google-gemini-2-5',
    date: '2025-03-25',
    titleEN: 'Google introduces Gemini 2.5',
    titleZH: 'Google 发布 Gemini 2.5',
    bodyEN: 'Google introduced Gemini 2.5 Pro Experimental as the first model in its new thinking-model generation. The release emphasized reasoning before answering and initially appeared in Google AI Studio and Gemini Advanced.',
    bodyZH: 'Google 发布 Gemini 2.5 Pro Experimental，作为新一代“思考模型”的首个成员，强调在回答前进行推理，并率先进入 Google AI Studio 与 Gemini Advanced。',
    sourceName: 'Google DeepMind',
    sourceURL: 'https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-model-thinking-updates-march-2025/',
    categoryEN: 'Model release',
    categoryZH: '模型发布',
    verified: true,
    symbol: 'lightbulb.max.fill'
  },
  {
    id: 'nvidia-cosmos',
    date: '2025-01-06',
    titleEN: 'NVIDIA launches Cosmos for physical AI',
    titleZH: 'NVIDIA 发布物理 AI 平台 Cosmos',
    bodyEN: 'NVIDIA launched Cosmos, a platform of world foundation models, tokenizers, guardrails and data tools for robotics and autonomous-vehicle development. The first open models were released to developers at launch.',
    bodyZH: 'NVIDIA 发布 Cosmos，提供世界基础模型、分词器、安全护栏与数据工具，服务机器人和自动驾驶开发；首批开放模型在发布时同步提供给开发者。',
    sourceName: 'NVIDIA',
    sourceURL: 'https://nvidianews.nvidia.com/news/nvidia-launches-cosmos-world-foundation-model-platform-to-accelerate-physical-ai-development',
    categoryEN: 'Physical AI',
    categoryZH: '物理 AI',
    verified: true,
    symbol: 'cube.transparent.fill'
  }
];

const editorialArtwork = [
  {
    imageAsset: 'NewsFrontier',
    imageAltEN: 'Abstract luminous neural network representing frontier AI research',
    imageAltZH: '象征前沿 AI 研究的抽象发光神经网络',
    imageCredit: 'Wonder Ad Lab · AI-generated editorial artwork'
  },
  {
    imageAsset: 'NewsCreative',
    imageAltEN: 'Abstract prism of text, image and audio representing multimodal creativity',
    imageAltZH: '象征文字、图像与音频多模态创作的抽象光学棱镜',
    imageCredit: 'Wonder Ad Lab · AI-generated editorial artwork'
  },
  {
    imageAsset: 'NewsSafety',
    imageAltEN: 'Abstract shield and data lattice representing AI safety',
    imageAltZH: '象征 AI 安全的抽象护盾与数据网格',
    imageCredit: 'Wonder Ad Lab · AI-generated editorial artwork'
  }
];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const approvedNews = await readApprovedNews();
  const mergedIndustryNews = [...industryNews, ...approvedNews]
    .filter((item, index, items) => items.findIndex(candidate => candidate.id === item.id) === index)
    .sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id))
    .map((item, index) => index < 6 && !item.imageAsset && !item.imageURL
      ? { ...item, ...editorialArtwork[index % editorialArtwork.length] }
      : item);
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({
    updatedAt: '2026-09-22',
    servicePrices,
    news,
    industryNews: mergedIndustryNews
  });
}
