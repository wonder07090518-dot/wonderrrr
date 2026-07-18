const service = document.querySelector('#service');
const toast = document.querySelector('#toast');
const ordersModal = document.querySelector('#ordersModal');
const accountModal = document.querySelector('#accountModal');
const authModal = document.querySelector('#authModal');
const privacyModal = document.querySelector('#privacyModal');
const submittedModal = document.querySelector('#submittedModal');
const ordersList = document.querySelector('#ordersList');
const inboxKey = 'wonderad-orders';
const accountsKey = 'wonderad-accounts';
const sessionKey = 'wonderad-session';
const servicePrices = {
  '社媒封面': '¥4 / 张', '营销海报': '¥4 / 张', '电商商品图': '¥4 / 张', 'PPT 美化': '¥7.5 / 页', 'AI 快速配图': '¥0.3 / 张', '品牌 Logo': '¥11.5 / 个', 'Banner 设计': '¥3 / 张', '创意字贴': '¥3 / 张', '壁纸设计': '¥4 / 张', '其他需求': 'AI 评估报价',
  'Social cover': '¥4 / image', 'Marketing poster': '¥4 / image', 'E-commerce visual': '¥4 / image', 'Slide design': '¥7.5 / slide', 'AI quick image': '¥0.3 / image', 'Brand logo': '¥11.5 / mark', 'Banner design': '¥3 / image', 'Creative type sticker': '¥3 / image', 'Wallpaper design': '¥4 / image', 'Custom request': 'AI-estimated quote'
};
const serviceOptions = {
  '社媒封面': { sizes: ['小红书 3:4（1242×1660）', '抖音封面 9:16（1080×1920）', '公众号首图 2.35:1（900×383）', '视频号封面 16:9（1920×1080）', '方形社媒 1:1（1080×1080）', '其他尺寸'], styles: ['极简', '清新生活', '潮流时尚', '品牌商业', '可爱插画', '其他风格'] },
  '营销海报': { sizes: ['竖版海报 3:4（1080×1440）', '横版海报 16:9（1920×1080）', 'A4 印刷（210×297mm）', 'A3 印刷（297×420mm）', '易拉宝（80×200cm）', '其他尺寸'], styles: ['极简', '科技未来', '商务高级', '节日氛围', '国风', '其他风格'] },
  '电商商品图': { sizes: ['主图 1:1（800×800）', '商品卡 3:4（1080×1440）', '详情页 750×1000', '横版展示 16:9（1920×1080）', '平台横幅 1200×628', '其他尺寸'], styles: ['电商质感', '干净白底', '场景氛围', '轻奢高级', '促销醒目', '其他风格'] },
  'PPT 美化': { sizes: ['宽屏 16:9（1920×1080）', '标准 4:3（1024×768）', '竖版提案 9:16（1080×1920）', 'A4 文档（210×297mm）', '仅优化 1 页', '其他尺寸'], styles: ['商务高级', '极简', '科技未来', '学术清晰', '品牌提案', '其他风格'] },
  'AI 快速配图': { sizes: ['方形 1:1（1024×1024）', '竖版 3:4（1024×1365）', '竖版 9:16（1080×1920）', '横版 16:9（1920×1080）', '横幅 3:1（1500×500）', '其他尺寸'], styles: ['写实摄影', '极简', '插画', '电影感', '科技未来', '其他风格'] },
  '品牌 Logo': { sizes: ['PNG 透明底（2000px）', 'SVG 矢量源文件', '横版组合', '竖版组合', '社媒头像 1:1', '其他尺寸'], styles: ['极简', '现代几何', '轻奢高级', '可爱亲和', '国风', '其他风格'] },
  'Banner 设计': { sizes: ['网页横幅（1920×600）', '活动横幅（1920×1080）', '广告投放（1200×628）', '方形 Banner（1080×1080）', '移动端横幅（750×400）', '其他尺寸'], styles: ['品牌商业', '极简', '科技未来', '促销醒目', '轻奢高级', '其他风格'] },
  '创意字贴': { sizes: ['方形 1:1（1080×1080）', '竖版 3:4（1080×1440）', '竖版 9:16（1080×1920）', '横版 16:9（1920×1080）', '透明底 PNG', '其他尺寸'], styles: ['潮流字体', '可爱手写', '赛博科技', '国风书法', '极简排版', '其他风格'] },
  '壁纸设计': { sizes: ['手机壁纸 9:16（1170×2532）', '平板壁纸 4:3（2048×1536）', '电脑壁纸 16:9（1920×1080）', '4K 桌面（3840×2160）', '锁屏 + 桌面套装', '其他尺寸'], styles: ['治愈氛围', '极简', '插画', '自然风景', '赛博科技', '其他风格'] },
  '其他需求': { sizes: ['请在需求中说明尺寸', '按平台规范制作', '印刷文件', '网页文件', '社媒文件', '其他尺寸'], styles: ['请描述想要的风格', '极简', '商务高级', '潮流时尚', '国风', '其他风格'] }
};
const zhToEn = {
  '作品':'Work','价格':'Pricing','会员':'Membership','流程':'How it works','用户中心':'Account','登录 / 注册':'Sign in','我的订单':'My orders','创意收件箱':'Creative inbox','开始创作':'Start creating','把你的':'Turn your','一句话，':'one idea','变成一张好广告。':'into a great ad.','海报、广告图、PPT、日常配图。':'Posters, ads, slides and images.','输入你的想法，剩下的交给 AI 和一点审美。':'Share your idea — AI and good taste do the rest.','现在开始':'Get started','看看成品':'See our work','简单描述即可下单 · 最快 15 分钟出图':'A simple brief is enough · ready as fast as 15 minutes','AI CREATIVE STUDIO / 2026':'AI CREATIVE STUDIO / 2026','小小的预算，':'Small budget,','认真的视觉。':'serious visuals.','不需要复杂报价。选好你要的，':'No complicated quotes. Pick what you need,','告诉我一句想法。':'then tell us your idea.','最受欢迎':'Most popular','社媒封面':'Social cover','营销海报':'Marketing poster','电商商品图':'E-commerce visual','PPT 美化':'Slide design','AI 快速配图':'AI quick image','品牌 Logo':'Brand logo','Banner 设计':'Banner design','小红书、视频号、朋友圈':'Xiaohongshu, WeChat Channels and social posts','让内容在第一眼被点开。':'Make content worth the first click.','活动宣传、店铺上新、节日海报':'Campaigns, launches and seasonal posters','让信息第一眼就被看见。':'Make the message instantly visible.','商品主图、场景图、详情页配图':'Hero images, lifestyle scenes and product details','把产品放进更好的画面。':'Put your product in a better picture.','汇报、提案、课程作业':'Reports, proposals and class projects','清爽排版，让观点更有分量。':'Clean layouts that give ideas more weight.','文章插图、头像背景、氛围照片':'Article images, profile backgrounds and mood shots','随用随生成，不止是图片。':'Generate on demand — more than just an image.','店铺、个人品牌、活动标识':'Stores, personal brands and event marks','用一个清晰符号被记住。':'Be remembered by a clear symbol.','网站横幅、店铺首页、活动头图':'Website banners, storefronts and event headers','把核心信息放在最醒目的地方。':'Put your key message where it gets seen.','轻量服务':'Quick service','选这个':'Choose this','不只是生成一张图。':'More than generating one image.','AI 改图':'AI image editing','图片优化':'Image enhancement','商品视觉':'Product visuals','人物照片':'Portraits','改文字、改构图、换风格。':'Edit text, composition and style.','去背景、高清修复、扩图。':'Remove backgrounds, upscale and outpaint.','换背景、商品图、电商主图。':'New backgrounds, product images and hero shots.','头像、简历照、证件照。':'Avatars, resumes and ID photos.','为持续创作，准备的更快通道。':'A faster lane for ongoing creativity.','免费':'Free','每天 5 次生成':'5 generations per day','标准清晰度':'Standard definition','当前方案':'Current plan','月会员':'Monthly','高速生成':'Fast generation','高清无水印下载':'HD downloads without watermark','去付款':'Pay now','年会员':'Yearly','更多模型':'More models','优先队列与专属模板':'Priority queue and exclusive templates','企业版':'Business','定制':'Custom','团队协作':'Team collaboration','API 与专属支持':'API and dedicated support','联系我们':'Contact us','把你的想法，':'Bring your ideas','带进更多作品里。':'into more great work.','面向设计师、校园创作者、运营同学与合作伙伴。':'For designers, student creators, operators and partners.','你的邮箱':'Your email','学校 / 公司':'School / company','想加入的方向':'How you want to join','设计与创作':'Design & creation','校园推广':'Campus promotion','内容运营':'Content operations','商务合作':'Business partnership','自我介绍或合作需求':'Introduction or partnership brief','提交加入申请':'Submit application','每个想法，':'Every idea','都有它的样子。':'has its own look.','夏日':'Summer','冰饮':'Iced drinks','新书':'New book','上线':'Launch','一束':'A bouquet','花的事':'of flowers','现烤':'Fresh roasted','栗子':'chestnuts','秋日':'Autumn','风味':'flavour','黑金':'Black & gold','包装':'Packaging','说说你的想法':'Tell us your idea','一句文案、一张参考图，':'One line of copy, one reference image,','或只是一个模糊的感觉。':'or simply a feeling.','选择你的服务':'Choose your service','按单张或页面计费，':'Priced per image or slide,','价格在开始前就说清楚。':'with clear pricing up front.','收到你的作品':'Receive your work','AI 生成加人工精选，':'AI generation with human curation,','把好看的那一版交给你。':'delivering the version that looks best.','你的下一张好图，':'Your next great visual','从一句话开始。':'starts with one idea.','我想做':'I want to create','成品尺寸':'Output size','视觉风格':'Visual style','我的想法是':'My idea','✨ 用 AI 帮我整理需求':'✨ Shape my brief with AI','选择支付方式':'Payment method','微信支付':'WeChat Pay','支付宝':'Alipay','提交订单':'Submit order','隐私说明':'Privacy','在这里查看需求、更新进度并上传成品。上传后，成品会自动作为邮件附件发送给客户。':'Review briefs, update progress and upload final work. It is automatically emailed to the customer as an attachment.','清空本机记录':'Clear local records','输入下单时的邮箱，查看订单状态和交付成品。':'Enter the ordering email to see status and delivered files.','查询':'Search','输入邮箱后查询订单。':'Enter an email to view orders.','我的图片':'My images','下载记录':'Downloads','账户余额':'Balance','查看我的订单':'View my orders','余额充值（即将开放）':'Top up (coming soon)','邀请好友':'Invite friends','退出登录':'Sign out','欢迎来到 Wonder':'Welcome to Wonder','登录':'Sign in','注册':'Register','密码':'Password','登录账户':'Sign in','昵称':'Name','设置密码':'Set password','我已阅读并同意隐私说明':'I have read and agree to the privacy notice','创建账户':'Create account','你的隐私，值得被认真对待。':'Your privacy deserves care.','定制联系我们':'Custom contact','发送咨询':'Send enquiry','订单已提交，':'Order received,','正在审核中。':'under review.','返回首页':'Back to home','极简':'Minimal','科技':'Tech','商务':'Business','可爱':'Cute','国风':'Chinese style','横版广告':'Landscape ad','公众号':'WeChat header','抖音':'Douyin','我们做什么':'WHAT WE MAKE','AI 创意工具':'AI CREATIVE TOOLS','Wonder Ad Lab 会员':'WONDER AD LAB MEMBERSHIP','加入 Wonder Ad Lab':'JOIN WONDER AD LAB','一些灵感':'A FEW MOODS','简单三步':'EASY AS 1 · 2 · 3','准备好了吗':'READY WHEN YOU ARE','Wonder 账户':'WONDER ACCOUNT','隐私':'PRIVACY','企业 / 定制':'ENTERPRISE / CUSTOM','订单已收到':'ORDER RECEIVED','让每一句想法，都值得被看见。':'Every idea deserves to be seen.','AI 简历照片':'AI resume photo','AI 证件照':'AI ID photo','AI 去背景':'AI background removal','照片服务':'Photo service','快速工具':'Quick tool','职场头像、简历照、个人主页':'Professional headshots, resume photos and profile images','自然清晰，适合正式场景。':'Natural and clear for formal use.','换底色、尺寸裁切、清晰修复':'Change backgrounds, crop to size and enhance clarity','一张即可满足日常使用。':'One image for everyday requirements.','商品、人像、素材快速抠图':'Fast cutouts for products, portraits and assets','获得干净的透明底图。':'Get a clean transparent background.','每一次更新，':'Every update','都更接近好创意。':'gets closer to better creativity.','一句话，开始下单。':'Start an order with one idea.','付款、进度与成品。':'Payment, progress and delivery.','账户、隐私与双语。':'Accounts, privacy and bilingual mode.','上线海报、广告图、PPT 与图片服务；需求提交后通过邮箱确认订单。':'Launched posters, ads, slides and images, with email order confirmation.','加入微信、支付宝付款指引；上传成品后自动邮件交付给客户。':'Added WeChat and Alipay guidance, plus automatic email delivery after upload.','加入登录注册、隐私说明、中英文切换，以及更多轻量 AI 创意服务。':'Added sign-in, privacy notice, Chinese-English switching and more lightweight AI services.'
};
Object.assign(zhToEn, {
  '01 / 社媒':'01 / Social','02 / 海报':'02 / Poster','03 / 电商':'03 / Commerce','04 / PPT':'04 / Slides','05 / 图片':'05 / Image','06 / 品牌':'06 / Brand','07 / 横幅':'07 / Banner','08 / 字贴':'08 / Type','09 / 壁纸':'09 / Wallpaper','10 / 其他':'10 / Other','其他':'Other',
  '/ 张':'/ image','/ 页':'/ slide','/ 个':'/ mark','/ 月':'/ month','/ 年':'/ year','管理后台':'Admin dashboard','小红书':'Xiaohongshu','一句文案、一张参考图，或只是一个模糊的感觉。':'One line of copy, one reference image, or simply a rough feeling.','微信或支付宝付款，邮箱同步确认订单与进度。':'Pay by WeChat or Alipay and receive order updates by email.','AI 生成加人工精选，把好看的那一版交给你。':'AI generation with human curation, delivered in its best final form.','选择项目、写下需求，提交后会发送确认邮件与付款指引。':'Choose a service, share your brief, then receive an email confirmation and payment instructions.','提交后显示“正在审核中”，付款二维码将发送至你的邮箱。':'Your order will be under review and a payment QR code will be emailed to you.','提交后显示“正在审核中”，付款二维码与固定项目价格将发送至你的邮箱。':'Your order will be under review. A payment QR code and fixed project price will be emailed to you.','创意服务上线':'Creative services launch','付款与交付':'Payment and delivery','账户与双语':'Account and bilingual mode','广告海报示例':'Advertising poster example','不同场景，':'Different scenes,','不同的好看。':'different ways to stand out.','案例示例 · 你的项目也会从一句想法开始。':'Examples · your project can start with one idea, too.','晨光':'Morning','咖啡':'coffee','轻盈':'Light','护肤':'skincare','海岸':'Coastal','假日':'getaway','创意字贴':'Creative type sticker','壁纸设计':'Wallpaper design','标题字、活动字贴、社媒文字':'Headlines, campaign type and social text','让一句话更有记忆点。':'Make one line more memorable.','手机、电脑、活动背景壁纸':'Phone, desktop and event wallpapers','把喜欢的氛围留在屏幕上。':'Keep the mood you love on screen.','本次项目价格：':'Project price:','项目价格：':'Project price:','AI 在线客服':'AI support','服务在线 · 随时为你解答':'Online · ready to help','你好，我是 Wonder AI。可以问我价格、服务类型、付款方式，或让我帮你选择项目。':'Hi, I’m Wonder AI. Ask about pricing, services, payment or choosing a project.','我想做海报':'I want a poster','PPT 怎么收费？':'How much are slides?','付款后多久交付？':'When will it be delivered?','输入你的问题…':'Type your question…'
});
Object.assign(zhToEn, {
  '其他需求': 'Custom request', '没有合适的分类？直接写下你的想法': 'No matching category? Tell us what you need.', '我们会按需求确认报价与交付方式。': 'We will confirm the quote and delivery method for your request.', '/ 定制': '/ custom', 'AI 评估报价': 'AI-estimated quote'
});
Object.assign(zhToEn, {
  '文章插图、商品氛围、场景配图': 'Article illustrations, product mood visuals and scene imagery',
  '版式优化': 'Layout refinement', '信息梳理、视觉层级、清晰排版。': 'Information structure, visual hierarchy and clear layouts.',
  '创意延展': 'Creative extensions', '把一张主视觉延展成多种宣传物料。': 'Extend one key visual into multiple promotional assets.'
});
const enToZh = Object.fromEntries(Object.entries(zhToEn).map(([zh, en]) => [en, zh]));
let language = localStorage.getItem('wonderad-language') || 'zh';
function applyLanguage() {
  const dictionary = language === 'en' ? zhToEn : enToZh;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = []; let node;
  while (node = walker.nextNode()) nodes.push(node);
  nodes.forEach(item => { const raw = item.nodeValue; const key = raw.trim(); if (dictionary[key]) item.nodeValue = raw.replace(key, dictionary[key]); });
  const placeholders = language === 'en' ? { '怎么称呼你？':'What should we call you?', '至少 8 位':'At least 8 characters', '输入你的邮箱':'Enter your email', '方便时填写，便于联系':'Optional, for easy contact', '例如：给我的咖啡店做一张夏日新品海报，轻松一点…':'Example: a relaxed summer launch poster for my coffee shop…' } : { 'What should we call you?':'怎么称呼你？', 'At least 8 characters':'至少 8 位', 'Enter your email':'输入你的邮箱', 'Optional, for easy contact':'方便时填写，便于联系', 'Example: a relaxed summer launch poster for my coffee shop…':'例如：给我的咖啡店做一张夏日新品海报，轻松一点…' };
  document.querySelectorAll('[placeholder]').forEach(input => { if (placeholders[input.placeholder]) input.placeholder = placeholders[input.placeholder]; });
  const heroTitle = document.querySelector('.hero h1');
  if (heroTitle) heroTitle.innerHTML = language === 'en' ? 'Turn your <em>one idea</em> into a great ad.' : '把你的<br><em>一句话，</em><br>变成一张好广告。';
  const heroArt = document.querySelector('.hero-art');
  if (heroArt) heroArt.setAttribute('aria-label', language === 'en' ? 'Advertising poster example' : '广告海报示例');
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  document.querySelector('#languageToggle').textContent = language === 'en' ? '中文' : 'EN';
  document.title = language === 'en' ? 'Wonder Ad Lab · AI Creative Studio' : '奇迹创意工作室 · Wonder Ad Lab';
  updateSelectedPrice();
}
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
function getOrders() {
  try { return JSON.parse(localStorage.getItem(inboxKey)) || []; } catch { return []; }
}
function saveOrders(orders) {
  localStorage.setItem(inboxKey, JSON.stringify(orders));
}
function getAccounts() { try { return JSON.parse(localStorage.getItem(accountsKey)) || []; } catch { return []; } }
function getCurrentUser() { try { return JSON.parse(localStorage.getItem(sessionKey)); } catch { return null; } }
async function passwordHash(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function updateAccountUI() {
  const user = getCurrentUser();
  const accountButton = document.querySelector('#openAuth');
  accountButton.textContent = user ? user.name : '登录 / 注册';
  document.querySelector('#accountTitle').textContent = user ? `${user.name} 的账户` : '用户中心';
  const orderEmail = document.querySelector('#customerEmail');
  if (user) { orderEmail.value = user.email; orderEmail.readOnly = true; }
  else orderEmail.readOnly = false;
}
function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}
function formatDate() {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
}
function updateSelectedPrice() {
  const price = servicePrices[service.value] || '¥4 / 张';
  const label = language === 'en' ? 'Project price:' : '本次项目价格：';
  const target = document.querySelector('#selectedPrice');
  if (target) target.textContent = `${label} ${price}`;
}
function renderCreativeOptions() {
  const config = serviceOptions[service.value] || serviceOptions['其他需求'];
  const render = (targetId, name, items) => {
    const target = document.querySelector(targetId);
    target.innerHTML = items.map((item, index) => `<label><input type="radio" name="${name}" value="${item}" ${index === 0 ? 'checked' : ''}><span>${item}</span></label>`).join('');
  };
  render('#sizeOptions', 'size', config.sizes);
  render('#styleOptions', 'style', config.styles);
  if (language === 'en') applyLanguage();
}
async function notifyOwner(order) {
  try {
    const response = await fetch('/api/notify-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    return response.ok;
  } catch {
    return false;
  }
}
async function notifyDelivery(order, result) {
  try {
    const response = await fetch('/api/notify-delivery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: order.email, orderId: order.id, service: order.service, price: order.price || servicePrices[order.service], fileName: result.name, fileData: result.data }) });
    return response.ok;
  } catch { return false; }
}
async function saveSharedOrder(order) {
  try {
    const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    return response.ok;
  } catch { return false; }
}
function statusClass(status) {
  return ({ '审核中': 'pending', '待支付': 'pending', '待确认支付': 'pending', '已支付': 'paid', '制作中': 'making', '已交付': 'done' })[status] || 'pending';
}
function startPayment(transaction) {
  localStorage.setItem('wonderad-payment', JSON.stringify(transaction));
  window.location.href = `payment.html?id=${encodeURIComponent(transaction.id)}`;
}
function renderAccountStats() {
  const user = getCurrentUser();
  const orders = user ? getOrders().filter(order => order.email.toLowerCase() === user.email.toLowerCase()) : [];
  document.querySelector('#accountOrderCount').textContent = orders.length;
  document.querySelector('#accountImageCount').textContent = orders.filter(order => order.result).length;
}
function renderCustomerOrders(email) {
  const orders = getOrders().filter(order => order.email.toLowerCase() === email.toLowerCase());
  ordersList.innerHTML = orders.length ? orders.map(order => `
    <article class="inbox-item customer-order"><div class="inbox-item-top"><span class="inbox-tag">${escapeHtml(order.service)}</span><span class="status ${statusClass(order.status)}">${escapeHtml(order.status)}</span></div><p class="inbox-idea">${escapeHtml(order.idea)}</p><p class="customer-email">项目价格：${escapeHtml(order.price || servicePrices[order.service] || '待确认报价')} · ${escapeHtml(order.size)} · ${escapeHtml(order.style)} · ${escapeHtml(order.payment)} · 下单于 ${escapeHtml(order.date)}</p>${order.result ? `<a class="result-link" href="${order.result.data}" download="${escapeHtml(order.result.name)}">下载你的成品</a>` : '<p class="delivery-wait">设计师完成后，成品会显示在这里。</p>'}</article>`).join('') : '<p class="empty-inbox">没有找到该邮箱的订单。</p>';
}
function openModal(modal) { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
function closeModal(modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }

document.querySelectorAll('[data-scroll]').forEach(button => button.addEventListener('click', () => document.querySelector(button.dataset.scroll).scrollIntoView({ behavior: 'smooth' })));
document.querySelectorAll('.price-card').forEach(card => card.addEventListener('click', event => {
  if (event.target.closest('button')) { service.value = card.dataset.product; renderCreativeOptions(); updateSelectedPrice(); document.querySelector('#order').scrollIntoView({ behavior: 'smooth' }); showToast(`已选择「${card.dataset.product}」，说说你的想法吧。`); }
}));
service.addEventListener('change', () => { renderCreativeOptions(); updateSelectedPrice(); });
document.querySelector('#openOrders').addEventListener('click', () => openModal(ordersModal));
document.querySelector('#openAccount').addEventListener('click', () => { if (!getCurrentUser()) { openModal(authModal); showToast('请先登录或注册账户。'); return; } renderAccountStats(); openModal(accountModal); });
document.querySelector('#openAuth').addEventListener('click', () => { if (getCurrentUser()) { renderAccountStats(); openModal(accountModal); } else openModal(authModal); });
document.querySelector('#openPrivacy').addEventListener('click', () => openModal(privacyModal));
document.querySelector('#languageToggle').addEventListener('click', () => { language = language === 'zh' ? 'en' : 'zh'; localStorage.setItem('wonderad-language', language); applyLanguage(); });
document.querySelector('#closeOrders').addEventListener('click', () => closeModal(ordersModal));
document.querySelector('#closeOrdersButton').addEventListener('click', () => closeModal(ordersModal));
document.querySelector('#closeAccount').addEventListener('click', () => closeModal(accountModal));
document.querySelector('#closeAccountButton').addEventListener('click', () => closeModal(accountModal));
document.querySelector('#closeAuth').addEventListener('click', () => closeModal(authModal));
document.querySelector('#closeAuthButton').addEventListener('click', () => closeModal(authModal));
document.querySelector('#closePrivacy').addEventListener('click', () => closeModal(privacyModal));
document.querySelector('#closePrivacyButton').addEventListener('click', () => closeModal(privacyModal));
document.querySelector('#accountOrders').addEventListener('click', () => { closeModal(accountModal); openModal(ordersModal); });
document.querySelector('#rechargeButton').addEventListener('click', () => showToast('余额充值会在支付商户接入后开放。'));
document.querySelector('#inviteButton').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText('WONDER-2026'); showToast('邀请代码已复制。'); } catch { showToast('邀请代码：WONDER-2026'); }
});
document.querySelector('#logoutButton').addEventListener('click', () => { localStorage.removeItem(sessionKey); updateAccountUI(); closeModal(accountModal); showToast('你已退出登录。'); });
function showAuthForm(mode) {
  const registering = mode === 'register';
  document.querySelector('#loginForm').hidden = registering;
  document.querySelector('#registerForm').hidden = !registering;
  document.querySelector('#showLogin').classList.toggle('active', !registering);
  document.querySelector('#showRegister').classList.toggle('active', registering);
}
document.querySelector('#showLogin').addEventListener('click', () => showAuthForm('login'));
document.querySelector('#showRegister').addEventListener('click', () => showAuthForm('register'));
document.querySelector('#registerForm').addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.querySelector('#registerName').value.trim();
  const email = document.querySelector('#registerEmail').value.trim().toLowerCase();
  const accounts = getAccounts();
  if (accounts.some(account => account.email === email)) { showToast('这个邮箱已经注册过，请直接登录。'); showAuthForm('login'); return; }
  const password = await passwordHash(document.querySelector('#registerPassword').value);
  accounts.push({ name, email, password, createdAt: new Date().toISOString() });
  localStorage.setItem(accountsKey, JSON.stringify(accounts));
  localStorage.setItem(sessionKey, JSON.stringify({ name, email }));
  event.target.reset(); updateAccountUI(); closeModal(authModal); showToast('注册成功，欢迎来到 Wonder Ad Lab。');
});
document.querySelector('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const email = document.querySelector('#loginEmail').value.trim().toLowerCase();
  const password = await passwordHash(document.querySelector('#loginPassword').value);
  const account = getAccounts().find(item => item.email === email && item.password === password);
  if (!account) { showToast('邮箱或密码不正确。'); return; }
  localStorage.setItem(sessionKey, JSON.stringify({ name: account.name, email: account.email }));
  event.target.reset(); updateAccountUI(); closeModal(authModal); showToast(`欢迎回来，${account.name}。`);
});
document.querySelector('#lookupForm').addEventListener('submit', event => { event.preventDefault(); renderCustomerOrders(document.querySelector('#lookupEmail').value.trim()); });
document.querySelector('#buildPrompt').addEventListener('click', () => {
  const text = document.querySelector('#orderForm textarea').value.trim();
  const size = document.querySelector('input[name="size"]:checked').value;
  const style = document.querySelector('input[name="style"]:checked').value;
  const output = document.querySelector('#promptOutput');
  if (!text) { output.textContent = '先写下一句你的想法，我会帮你整理成清晰的创意需求。'; return; }
  output.textContent = `创意摘要：制作 ${size} 的${style}风格作品。核心需求：${text}。建议突出一个主视觉与一句关键信息。`;
});
document.querySelectorAll('.membership-pay').forEach(button => button.addEventListener('click', () => startPayment({ id: `MB${Date.now().toString().slice(-7)}`, kind: 'membership', title: button.dataset.plan, amount: button.dataset.amount, payment: '微信支付' })));
const contactModal = document.querySelector('#contactModal');
document.querySelector('#openContact').addEventListener('click', () => openModal(contactModal));
document.querySelector('#closeContact').addEventListener('click', () => closeModal(contactModal));
document.querySelector('#closeContactButton').addEventListener('click', () => closeModal(contactModal));
document.querySelector('#contactForm').addEventListener('submit', async event => {
  event.preventDefault();
  const payload = { email: document.querySelector('#contactEmail').value.trim(), message: document.querySelector('#contactMessage').value.trim() };
  try { await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch { /* 本地预览无邮件服务 */ }
  event.target.reset(); closeModal(contactModal); showToast('定制咨询已提交，Wonder Ad Lab 团队会通过邮箱回复你。');
});
document.querySelector('#joinForm').addEventListener('submit', async event => {
  event.preventDefault();
  const payload = { email: document.querySelector('#joinEmail').value.trim(), organization: document.querySelector('#joinOrg').value.trim(), role: document.querySelector('#joinRole').value, message: document.querySelector('#joinMessage').value.trim() };
  try { await fetch('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch { /* 本地预览无邮件服务 */ }
  event.target.reset(); showToast('加入申请已提交，Wonder Ad Lab 团队会通过邮箱回复你。');
});
document.querySelector('#returnHome').addEventListener('click', () => { closeModal(submittedModal); window.scrollTo({ top: 0, behavior: 'smooth' }); });
document.querySelector('#orderForm').addEventListener('submit', async event => {
  event.preventDefault();
  const currentUser = getCurrentUser();
  if (!currentUser) {
    openModal(authModal);
    showToast('请先注册或登录账户，登录后才可以提交订单。');
    return;
  }
  const form = event.target;
  const orders = getOrders();
  const payment = form.querySelector('input[name="payment"]:checked').value;
  const order = { id: `WA${Date.now().toString().slice(-7)}`, service: service.value, price: servicePrices[service.value] || '待确认报价', email: currentUser.email, wechat: form.querySelector('#customerWechat').value.trim(), idea: form.querySelector('textarea').value.trim(), size: form.querySelector('input[name="size"]:checked').value, style: form.querySelector('input[name="style"]:checked').value, payment, status: '审核中', date: formatDate() };
  orders.unshift(order);
  saveOrders(orders);
  await saveSharedOrder(order);
  const emailSent = await notifyOwner(order);
  renderAccountStats();
  openModal(submittedModal);
  showToast(emailSent ? '订单已提交，请在邮箱查收付款收款码。' : '订单已提交，邮件发送暂未成功，请稍后重试或联系我们。');
  form.reset();
  updateAccountUI();
  renderCreativeOptions();
  updateSelectedPrice();
});

const supportPanel = document.querySelector('#supportPanel');
const supportMessages = document.querySelector('#supportMessages');
function addSupportMessage(text, from = 'ai') {
  const item = document.createElement('p');
  item.className = `support-bubble ${from === 'user' ? 'support-user' : ''}`;
  item.textContent = text;
  supportMessages.appendChild(item);
  supportMessages.scrollTop = supportMessages.scrollHeight;
}
function answerSupport(question) {
  const text = question.toLowerCase();
  const english = language === 'en';
  if (/其他|custom|定制|需求/.test(text)) return english ? 'Choose “Custom request” and describe what you need. We will review it and send a confirmed quote before payment.' : '选择“其他需求”，把你想做的内容写清楚。我们审核后会先发确认报价，再安排制作。';
  if (/ppt|slide|汇报|提案/.test(text)) return english ? 'PPT design is ¥7.5 per slide. Send your topic and page count in the order form.' : 'PPT 美化固定 ¥7.5 / 页。下单时写上主题和页数即可。';
  if (/海报|poster|广告|ad/.test(text)) return english ? 'Marketing posters are ¥4 per image. Pick “Marketing poster” and share your copy, size and style.' : '营销海报固定 ¥4 / 张。选择“营销海报”，写上文案、尺寸和风格即可。';
  if (/字贴|type|文字/.test(text)) return english ? 'Creative type stickers are ¥3 per image. They work well for campaign headlines and social text.' : '创意字贴固定 ¥3 / 张，适合活动标题、社媒文字和醒目短句。';
  if (/壁纸|wallpaper/.test(text)) return english ? 'Wallpaper design is ¥4 per image for phone, desktop or event backgrounds.' : '壁纸设计固定 ¥4 / 张，可做手机、电脑或活动背景。';
  if (/支付|付款|pay|alipay|wechat/.test(text)) return english ? 'After you submit, we email a WeChat Pay or Alipay QR code together with your exact project price.' : '提交订单后，系统会把微信或支付宝收款码和你的固定项目价格一起发到邮箱。';
  if (/多久|交付|deliver|time/.test(text)) return english ? 'Most simple visual projects are reviewed first, then delivered by email after payment and completion.' : '订单会先审核；确认付款并完成制作后，成品会通过邮件交付。';
  if (/价格|多少钱|price|cost/.test(text)) return english ? 'Prices are fixed and displayed before you order. Choose a service and I can tell you the exact amount.' : '每项服务都是固定价格。选择项目后，页面会立即显示本次应付金额。';
  return english ? 'Tell me what you want to make — poster, slide, product visual, type sticker or wallpaper — and I’ll point you to the right service.' : '告诉我你想做海报、PPT、商品图、字贴还是壁纸，我会帮你选合适的项目。';
}
function submitSupportQuestion(question) {
  const value = question.trim();
  if (!value) return;
  addSupportMessage(value, 'user');
  window.setTimeout(() => addSupportMessage(answerSupport(value)), 280);
}
document.querySelector('#openSupport').addEventListener('click', () => { supportPanel.classList.add('open'); supportPanel.setAttribute('aria-hidden', 'false'); });
document.querySelector('#closeSupport').addEventListener('click', () => { supportPanel.classList.remove('open'); supportPanel.setAttribute('aria-hidden', 'true'); });
document.querySelector('#supportForm').addEventListener('submit', event => { event.preventDefault(); const input = document.querySelector('#supportInput'); submitSupportQuestion(input.value); input.value = ''; });
document.querySelectorAll('.support-suggestions button').forEach(button => button.addEventListener('click', () => submitSupportQuestion(button.textContent)));
Object.assign(zhToEn, {
  '有想法？': 'Have an idea?',
  '直接加我微信。': 'Add me on WeChat.',
  '加我微信': 'Add me on WeChat',
  '扫码添加 Wonder Ad Lab，沟通需求、定制项目或合作都可以。': 'Scan to add Wonder Ad Lab for briefs, custom projects or collaborations.',
  '微信号': 'WeChat ID',
  '扫码添加我为朋友': 'Scan to add me on WeChat'
});
renderAccountStats();
updateAccountUI();
renderCreativeOptions();
applyLanguage();
