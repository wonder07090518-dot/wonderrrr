const service = document.querySelector('#service');
const toast = document.querySelector('#toast');
const inboxModal = document.querySelector('#inboxModal');
const ordersModal = document.querySelector('#ordersModal');
const accountModal = document.querySelector('#accountModal');
const authModal = document.querySelector('#authModal');
const privacyModal = document.querySelector('#privacyModal');
const submittedModal = document.querySelector('#submittedModal');
const inboxList = document.querySelector('#inboxList');
const ordersList = document.querySelector('#ordersList');
const inboxCount = document.querySelector('#inboxCount');
const inboxKey = 'wonderad-orders';
const accountsKey = 'wonderad-accounts';
const sessionKey = 'wonderad-session';
const servicePrices = { '社媒封面': '¥3–5 / 张', '营销海报': '¥3–5 / 张', '电商商品图': '¥3–5 / 张', 'PPT 美化': '¥5–10 / 页', 'AI 快速配图': '¥0.3 / 张', '品牌 Logo': '¥8–15 / 个', 'Banner 设计': '¥2–4 / 张', 'AI 简历照片': '¥1 / 张', 'AI 证件照': '¥1 / 张', 'AI 去背景': '¥0.3 / 张' };
const zhToEn = {
  '作品':'Work','价格':'Pricing','会员':'Membership','流程':'How it works','用户中心':'Account','登录 / 注册':'Sign in','我的订单':'My orders','创意收件箱':'Creative inbox','开始创作':'Start creating','把你的':'Turn your','一句话，':'one idea','变成一张好广告。':'into a great ad.','海报、广告图、PPT、日常配图。':'Posters, ads, slides and images.','输入你的想法，剩下的交给 AI 和一点审美。':'Share your idea — AI and good taste do the rest.','现在开始':'Get started','看看成品':'See our work','简单描述即可下单 · 最快 15 分钟出图':'A simple brief is enough · ready as fast as 15 minutes','AI CREATIVE STUDIO / 2026':'AI CREATIVE STUDIO / 2026','小小的预算，':'Small budget,','认真的视觉。':'serious visuals.','不需要复杂报价。选好你要的，':'No complicated quotes. Pick what you need,','告诉我一句想法。':'then tell us your idea.','最受欢迎':'Most popular','社媒封面':'Social cover','营销海报':'Marketing poster','电商商品图':'E-commerce visual','PPT 美化':'Slide design','AI 快速配图':'AI quick image','品牌 Logo':'Brand logo','Banner 设计':'Banner design','小红书、视频号、朋友圈':'Xiaohongshu, WeChat Channels and social posts','让内容在第一眼被点开。':'Make content worth the first click.','活动宣传、店铺上新、节日海报':'Campaigns, launches and seasonal posters','让信息第一眼就被看见。':'Make the message instantly visible.','商品主图、场景图、详情页配图':'Hero images, lifestyle scenes and product details','把产品放进更好的画面。':'Put your product in a better picture.','汇报、提案、课程作业':'Reports, proposals and class projects','清爽排版，让观点更有分量。':'Clean layouts that give ideas more weight.','文章插图、头像背景、氛围照片':'Article images, profile backgrounds and mood shots','随用随生成，不止是图片。':'Generate on demand — more than just an image.','店铺、个人品牌、活动标识':'Stores, personal brands and event marks','用一个清晰符号被记住。':'Be remembered by a clear symbol.','网站横幅、店铺首页、活动头图':'Website banners, storefronts and event headers','把核心信息放在最醒目的地方。':'Put your key message where it gets seen.','轻量服务':'Quick service','选这个':'Choose this','不只是生成一张图。':'More than generating one image.','AI 改图':'AI image editing','图片优化':'Image enhancement','商品视觉':'Product visuals','人物照片':'Portraits','改文字、改构图、换风格。':'Edit text, composition and style.','去背景、高清修复、扩图。':'Remove backgrounds, upscale and outpaint.','换背景、商品图、电商主图。':'New backgrounds, product images and hero shots.','头像、简历照、证件照。':'Avatars, resumes and ID photos.','为持续创作，准备的更快通道。':'A faster lane for ongoing creativity.','免费':'Free','每天 5 次生成':'5 generations per day','标准清晰度':'Standard definition','当前方案':'Current plan','月会员':'Monthly','高速生成':'Fast generation','高清无水印下载':'HD downloads without watermark','去付款':'Pay now','年会员':'Yearly','更多模型':'More models','优先队列与专属模板':'Priority queue and exclusive templates','企业版':'Business','定制':'Custom','团队协作':'Team collaboration','API 与专属支持':'API and dedicated support','联系我们':'Contact us','把你的想法，':'Bring your ideas','带进更多作品里。':'into more great work.','面向设计师、校园创作者、运营同学与合作伙伴。':'For designers, student creators, operators and partners.','你的邮箱':'Your email','学校 / 公司':'School / company','想加入的方向':'How you want to join','设计与创作':'Design & creation','校园推广':'Campus promotion','内容运营':'Content operations','商务合作':'Business partnership','自我介绍或合作需求':'Introduction or partnership brief','提交加入申请':'Submit application','每个想法，':'Every idea','都有它的样子。':'has its own look.','夏日':'Summer','冰饮':'Iced drinks','新书':'New book','上线':'Launch','一束':'A bouquet','花的事':'of flowers','现烤':'Fresh roasted','栗子':'chestnuts','秋日':'Autumn','风味':'flavour','黑金':'Black & gold','包装':'Packaging','说说你的想法':'Tell us your idea','一句文案、一张参考图，':'One line of copy, one reference image,','或只是一个模糊的感觉。':'or simply a feeling.','选择你的服务':'Choose your service','按单张或页面计费，':'Priced per image or slide,','价格在开始前就说清楚。':'with clear pricing up front.','收到你的作品':'Receive your work','AI 生成加人工精选，':'AI generation with human curation,','把好看的那一版交给你。':'delivering the version that looks best.','你的下一张好图，':'Your next great visual','从一句话开始。':'starts with one idea.','我想做':'I want to create','成品尺寸':'Output size','视觉风格':'Visual style','我的想法是':'My idea','✨ 用 AI 帮我整理需求':'✨ Shape my brief with AI','选择支付方式':'Payment method','微信支付':'WeChat Pay','支付宝':'Alipay','提交订单':'Submit order','隐私说明':'Privacy','在这里查看需求、更新进度并上传成品。上传后，成品会自动作为邮件附件发送给客户。':'Review briefs, update progress and upload final work. It is automatically emailed to the customer as an attachment.','清空本机记录':'Clear local records','输入下单时的邮箱，查看订单状态和交付成品。':'Enter the ordering email to see status and delivered files.','查询':'Search','输入邮箱后查询订单。':'Enter an email to view orders.','我的图片':'My images','下载记录':'Downloads','账户余额':'Balance','查看我的订单':'View my orders','余额充值（即将开放）':'Top up (coming soon)','邀请好友':'Invite friends','退出登录':'Sign out','欢迎来到 Wonder':'Welcome to Wonder','登录':'Sign in','注册':'Register','密码':'Password','登录账户':'Sign in','昵称':'Name','设置密码':'Set password','我已阅读并同意隐私说明':'I have read and agree to the privacy notice','创建账户':'Create account','你的隐私，值得被认真对待。':'Your privacy deserves care.','定制联系我们':'Custom contact','发送咨询':'Send enquiry','订单已提交，':'Order received,','正在审核中。':'under review.','返回首页':'Back to home','极简':'Minimal','科技':'Tech','商务':'Business','可爱':'Cute','国风':'Chinese style','横版广告':'Landscape ad','公众号':'WeChat header','抖音':'Douyin','我们做什么':'WHAT WE MAKE','AI 创意工具':'AI CREATIVE TOOLS','Wonder Ad Lab 会员':'WONDER AD LAB MEMBERSHIP','加入 Wonder Ad Lab':'JOIN WONDER AD LAB','一些灵感':'A FEW MOODS','简单三步':'EASY AS 1 · 2 · 3','准备好了吗':'READY WHEN YOU ARE','Wonder 账户':'WONDER ACCOUNT','隐私':'PRIVACY','企业 / 定制':'ENTERPRISE / CUSTOM','订单已收到':'ORDER RECEIVED','让每一句想法，都值得被看见。':'Every idea deserves to be seen.','AI 简历照片':'AI resume photo','AI 证件照':'AI ID photo','AI 去背景':'AI background removal','照片服务':'Photo service','快速工具':'Quick tool','职场头像、简历照、个人主页':'Professional headshots, resume photos and profile images','自然清晰，适合正式场景。':'Natural and clear for formal use.','换底色、尺寸裁切、清晰修复':'Change backgrounds, crop to size and enhance clarity','一张即可满足日常使用。':'One image for everyday requirements.','商品、人像、素材快速抠图':'Fast cutouts for products, portraits and assets','获得干净的透明底图。':'Get a clean transparent background.','每一次更新，':'Every update','都更接近好创意。':'gets closer to better creativity.','一句话，开始下单。':'Start an order with one idea.','付款、进度与成品。':'Payment, progress and delivery.','账户、隐私与双语。':'Accounts, privacy and bilingual mode.','上线海报、广告图、PPT 与图片服务；需求提交后通过邮箱确认订单。':'Launched posters, ads, slides and images, with email order confirmation.','加入微信、支付宝付款指引；上传成品后自动邮件交付给客户。':'Added WeChat and Alipay guidance, plus automatic email delivery after upload.','加入登录注册、隐私说明、中英文切换，以及更多轻量 AI 创意服务。':'Added sign-in, privacy notice, Chinese-English switching and more lightweight AI services.'
};
const enToZh = Object.fromEntries(Object.entries(zhToEn).map(([zh, en]) => [en, zh]));
let language = localStorage.getItem('wonderad-language') || 'zh';
function applyLanguage() {
  const dictionary = language === 'en' ? zhToEn : enToZh;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = []; let node;
  while (node = walker.nextNode()) nodes.push(node);
  nodes.forEach(item => { const raw = item.nodeValue; const key = raw.trim(); if (dictionary[key]) item.nodeValue = raw.replace(key, dictionary[key]); });
  const placeholders = language === 'en' ? { '怎么称呼你？':'What should we call you?', '至少 8 位':'At least 8 characters', '输入你的邮箱':'Enter your email', '例如：给我的咖啡店做一张夏日新品海报，轻松一点…':'Example: a relaxed summer launch poster for my coffee shop…' } : { 'What should we call you?':'怎么称呼你？', 'At least 8 characters':'至少 8 位', 'Enter your email':'输入你的邮箱', 'Example: a relaxed summer launch poster for my coffee shop…':'例如：给我的咖啡店做一张夏日新品海报，轻松一点…' };
  document.querySelectorAll('[placeholder]').forEach(input => { if (placeholders[input.placeholder]) input.placeholder = placeholders[input.placeholder]; });
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  document.querySelector('#languageToggle').textContent = language === 'en' ? '中文' : 'EN';
  document.title = language === 'en' ? 'Wonder Ad Lab · AI Creative Studio' : 'Wonder Ad Lab · AI 创意工坊';
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
  if (user && !orderEmail.value) orderEmail.value = user.email;
}
function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}
function formatDate() {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
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
function statusClass(status) {
  return ({ '待支付': 'pending', '待确认支付': 'pending', '已支付': 'paid', '制作中': 'making', '已交付': 'done' })[status] || 'pending';
}
function adminDeliveryTools(order) {
  if (order.status === '已交付') return '<p class="delivery-wait">成品已上传，并已通过邮件发送给客户。</p>';
  return `<div class="admin-tools"><label>订单状态 <select class="status-select"><option ${order.status === '待支付' ? 'selected' : ''}>待支付</option><option ${order.status === '待确认支付' ? 'selected' : ''}>待确认支付</option><option ${order.status === '已支付' ? 'selected' : ''}>已支付</option><option ${order.status === '制作中' ? 'selected' : ''}>制作中</option></select></label><label class="upload-result">上传并邮件交付 <input class="result-upload" type="file" accept="image/*,.pdf,.ppt,.pptx" /></label></div>`;
}
function startPayment(transaction) {
  localStorage.setItem('wonderad-payment', JSON.stringify(transaction));
  window.location.href = `payment.html?id=${encodeURIComponent(transaction.id)}`;
}
function renderInbox() {
  const orders = getOrders();
  inboxCount.textContent = orders.length;
  document.querySelector('#accountOrderCount').textContent = orders.length;
  document.querySelector('#accountImageCount').textContent = orders.filter(order => order.result).length;
  inboxList.innerHTML = orders.length ? orders.map(order => `
    <article class="inbox-item admin-order" data-id="${order.id}">
      <div class="inbox-item-top"><span class="inbox-tag">${escapeHtml(order.service)}</span><span class="status ${statusClass(order.status)}">${escapeHtml(order.status)}</span></div>
      <p class="customer-email">${escapeHtml(order.email)} · ${escapeHtml(order.payment)} · ${escapeHtml(order.price || servicePrices[order.service] || '待确认报价')} · ${escapeHtml(order.size)} · ${escapeHtml(order.style)}</p>
      <p class="inbox-idea">${escapeHtml(order.idea)}</p>
      ${adminDeliveryTools(order)}
      ${order.result ? `<a class="result-link" href="${order.result.data}" download="${escapeHtml(order.result.name)}">查看已上传成品：${escapeHtml(order.result.name)}</a>` : ''}
      <time class="inbox-date">订单号 ${order.id} · ${escapeHtml(order.date)}</time>
    </article>`).join('') : '<p class="empty-inbox">还没有收到订单。<br />客户提交需求后会显示在这里。</p>';
  applyLanguage();
}
function renderCustomerOrders(email) {
  const orders = getOrders().filter(order => order.email.toLowerCase() === email.toLowerCase());
  ordersList.innerHTML = orders.length ? orders.map(order => `
    <article class="inbox-item customer-order"><div class="inbox-item-top"><span class="inbox-tag">${escapeHtml(order.service)}</span><span class="status ${statusClass(order.status)}">${escapeHtml(order.status)}</span></div><p class="inbox-idea">${escapeHtml(order.idea)}</p><p class="customer-email">参考价格：${escapeHtml(order.price || servicePrices[order.service] || '待确认报价')} · ${escapeHtml(order.size)} · ${escapeHtml(order.style)} · ${escapeHtml(order.payment)} · 下单于 ${escapeHtml(order.date)}</p>${order.result ? `<a class="result-link" href="${order.result.data}" download="${escapeHtml(order.result.name)}">下载你的成品</a>` : '<p class="delivery-wait">设计师完成后，成品会显示在这里。</p>'}</article>`).join('') : '<p class="empty-inbox">没有找到该邮箱的订单。</p>';
}
function openModal(modal) { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
function closeModal(modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }

document.querySelectorAll('[data-scroll]').forEach(button => button.addEventListener('click', () => document.querySelector(button.dataset.scroll).scrollIntoView({ behavior: 'smooth' })));
document.querySelectorAll('.price-card').forEach(card => card.addEventListener('click', event => {
  if (event.target.closest('button')) { service.value = card.dataset.product; document.querySelector('#order').scrollIntoView({ behavior: 'smooth' }); showToast(`已选择「${card.dataset.product}」，说说你的想法吧。`); }
}));
document.querySelector('#openInbox').addEventListener('click', () => { renderInbox(); openModal(inboxModal); });
document.querySelector('#openOrders').addEventListener('click', () => openModal(ordersModal));
document.querySelector('#openAccount').addEventListener('click', () => { if (!getCurrentUser()) { openModal(authModal); showToast('请先登录或注册账户。'); return; } renderInbox(); openModal(accountModal); });
document.querySelector('#openAuth').addEventListener('click', () => { if (getCurrentUser()) { renderInbox(); openModal(accountModal); } else openModal(authModal); });
document.querySelector('#openPrivacy').addEventListener('click', () => openModal(privacyModal));
document.querySelector('#languageToggle').addEventListener('click', () => { language = language === 'zh' ? 'en' : 'zh'; localStorage.setItem('wonderad-language', language); applyLanguage(); });
document.querySelector('#closeInbox').addEventListener('click', () => closeModal(inboxModal));
document.querySelector('#closeInboxButton').addEventListener('click', () => closeModal(inboxModal));
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
document.querySelector('#clearInbox').addEventListener('click', () => { localStorage.removeItem(inboxKey); renderInbox(); showToast('本机订单记录已清空。'); });

inboxList.addEventListener('change', event => {
  const card = event.target.closest('.admin-order');
  if (!card) return;
  const orders = getOrders();
  const order = orders.find(item => item.id === card.dataset.id);
  if (!order) return;
  if (event.target.classList.contains('status-select')) { order.status = event.target.value; saveOrders(orders); renderInbox(); showToast('订单状态已更新。'); }
  if (event.target.classList.contains('result-upload')) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      order.result = { name: file.name, data: reader.result };
      const sent = await notifyDelivery(order, order.result);
      order.status = sent ? '已交付' : '制作中';
      saveOrders(orders);
      renderInbox();
      showToast(sent ? '成品已通过邮件作为附件发送给客户。' : '邮件暂未发送成功，请检查邮件服务后重新上传交付。');
    };
    reader.readAsDataURL(file);
  }
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
  const form = event.target;
  const orders = getOrders();
  const payment = form.querySelector('input[name="payment"]:checked').value;
  const order = { id: `WA${Date.now().toString().slice(-7)}`, service: service.value, price: servicePrices[service.value] || '待确认报价', email: document.querySelector('#customerEmail').value.trim(), idea: form.querySelector('textarea').value.trim(), size: form.querySelector('input[name="size"]:checked').value, style: form.querySelector('input[name="style"]:checked').value, payment, status: '待支付', date: formatDate() };
  orders.unshift(order);
  saveOrders(orders);
  const emailSent = await notifyOwner(order);
  renderInbox();
  openModal(submittedModal);
  showToast(emailSent ? '订单已提交，请在邮箱查收付款收款码。' : '订单已提交，邮件发送暂未成功，请稍后重试或联系我们。');
  form.reset();
});
renderInbox();
updateAccountUI();
applyLanguage();
