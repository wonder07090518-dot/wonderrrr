const service = document.querySelector('#service');
const toast = document.querySelector('#toast');
const ordersModal = document.querySelector('#ordersModal');
const accountModal = document.querySelector('#accountModal');
const authModal = document.querySelector('#authModal');
const privacyModal = document.querySelector('#privacyModal');
const submittedModal = document.querySelector('#submittedModal');
const ordersList = document.querySelector('#ordersList');
const inboxKey = 'wonderad-orders';
const sessionKey = 'wonderad-session';
const servicePrices = {
  '社媒封面': '¥4 / 张', '营销海报': '¥4 / 张', '电商商品图': '¥4 / 张', '电商详情页': '¥12 / 页', 'PPT 美化': '¥7.5 / 页', 'AI 快速配图': '¥0.3 / 张', '品牌 Logo': '¥11.5 / 个', 'Banner 设计': '¥3 / 张', '创意字贴': '¥3 / 张', '壁纸设计': '¥4 / 张', '菜单与价目表': '¥8 / 张', '活动物料套装': '¥29 / 套起', '品牌视觉套装': '¥49 / 套起', '社媒月更包': '¥59 / 10 张起', '印刷物料设计': '¥15 / 张起', '其他需求': 'AI 评估报价',
  'Social cover': '¥4 / image', 'Marketing poster': '¥4 / image', 'E-commerce visual': '¥4 / image', 'Slide design': '¥7.5 / slide', 'AI quick image': '¥0.3 / image', 'Brand logo': '¥11.5 / mark', 'Banner design': '¥3 / image', 'Creative type sticker': '¥3 / image', 'Wallpaper design': '¥4 / image', 'Custom request': 'AI-estimated quote'
};
const serviceOptions = {
  '社媒封面': { sizes: ['小红书 3:4（1242×1660）', '抖音封面 9:16（1080×1920）', '公众号首图 2.35:1（900×383）', '视频号封面 16:9（1920×1080）', '方形社媒 1:1（1080×1080）', '其他尺寸'], styles: ['极简', '清新生活', '潮流时尚', '品牌商业', '可爱插画', '其他风格'] },
  '营销海报': { sizes: ['竖版海报 3:4（1080×1440）', '横版海报 16:9（1920×1080）', 'A4 印刷（210×297mm）', 'A3 印刷（297×420mm）', '易拉宝（80×200cm）', '其他尺寸'], styles: ['极简', '科技未来', '商务高级', '节日氛围', '国风', '其他风格'] },
  '电商商品图': { sizes: ['主图 1:1（800×800）', '商品卡 3:4（1080×1440）', '详情页 750×1000', '横版展示 16:9（1920×1080）', '平台横幅 1200×628', '其他尺寸'], styles: ['电商质感', '干净白底', '场景氛围', '轻奢高级', '促销醒目', '其他风格'] },
  '电商详情页': { sizes: ['手机详情页 750×1000', '淘宝 / 天猫详情页', '京东详情页', '拼多多详情页', '独立站长图', '其他尺寸'], styles: ['卖点清晰', '电商质感', '轻奢高级', '促销醒目', '极简', '其他风格'] },
  'PPT 美化': { sizes: ['宽屏 16:9（1920×1080）', '标准 4:3（1024×768）', '竖版提案 9:16（1080×1920）', 'A4 文档（210×297mm）', '仅优化 1 页', '其他尺寸'], styles: ['商务高级', '极简', '科技未来', '学术清晰', '品牌提案', '其他风格'] },
  'AI 快速配图': { sizes: ['方形 1:1（1024×1024）', '竖版 3:4（1024×1365）', '竖版 9:16（1080×1920）', '横版 16:9（1920×1080）', '横幅 3:1（1500×500）', '其他尺寸'], styles: ['写实摄影', '极简', '插画', '电影感', '科技未来', '其他风格'] },
  '品牌 Logo': { sizes: ['PNG 透明底（2000px）', 'SVG 矢量源文件', '横版组合', '竖版组合', '社媒头像 1:1', '其他尺寸'], styles: ['极简', '现代几何', '轻奢高级', '可爱亲和', '国风', '其他风格'] },
  'Banner 设计': { sizes: ['网页横幅（1920×600）', '活动横幅（1920×1080）', '广告投放（1200×628）', '方形 Banner（1080×1080）', '移动端横幅（750×400）', '其他尺寸'], styles: ['品牌商业', '极简', '科技未来', '促销醒目', '轻奢高级', '其他风格'] },
  '创意字贴': { sizes: ['方形 1:1（1080×1080）', '竖版 3:4（1080×1440）', '竖版 9:16（1080×1920）', '横版 16:9（1920×1080）', '透明底 PNG', '其他尺寸'], styles: ['潮流字体', '可爱手写', '赛博科技', '国风书法', '极简排版', '其他风格'] },
  '壁纸设计': { sizes: ['手机壁纸 9:16（1170×2532）', '平板壁纸 4:3（2048×1536）', '电脑壁纸 16:9（1920×1080）', '4K 桌面（3840×2160）', '锁屏 + 桌面套装', '其他尺寸'], styles: ['治愈氛围', '极简', '插画', '自然风景', '赛博科技', '其他风格'] },
  '菜单与价目表': { sizes: ['A4 菜单（210×297mm）', '桌牌（A5）', '竖版价目表 3:4', '手机长图 9:16', '横版展示 16:9', '其他尺寸'], styles: ['干净清晰', '餐饮氛围', '轻奢高级', '可爱亲和', '品牌商业', '其他风格'] },
  '活动物料套装': { sizes: ['主海报 + 3 张社媒图', '主海报 + 横幅', '小红书活动套装', '门店活动套装', '电商促销套装', '其他尺寸'], styles: ['节日氛围', '促销醒目', '极简', '品牌商业', '潮流时尚', '其他风格'] },
  '品牌视觉套装': { sizes: ['Logo + 头像 + 配色', 'Logo + 社媒模板', '基础品牌规范 PDF', '店铺开业视觉', '品牌提案 16:9', '其他尺寸'], styles: ['极简', '现代几何', '轻奢高级', '潮流时尚', '可爱亲和', '其他风格'] },
  '社媒月更包': { sizes: ['小红书 3:4', '视频号封面 16:9', '朋友圈 1:1', '公众号首图 2.35:1', '多平台混合', '其他尺寸'], styles: ['品牌商业', '清新生活', '潮流时尚', '极简', '促销醒目', '其他风格'] },
  '印刷物料设计': { sizes: ['A4 传单（210×297mm）', '三折页', '名片（90×54mm）', '易拉宝（80×200cm）', '桌牌（A5）', '其他尺寸'], styles: ['印刷清晰', '品牌商业', '极简', '轻奢高级', '促销醒目', '其他风格'] },
  '其他需求': { sizes: ['请在需求中说明尺寸', '按平台规范制作', '印刷文件', '网页文件', '社媒文件', '其他尺寸'], styles: ['请描述想要的风格', '极简', '商务高级', '潮流时尚', '国风', '其他风格'] }
};
const creativeOptionTranslations = {
  '小红书 3:4（1242×1660）':'Xiaohongshu 3:4 (1242×1660)','抖音封面 9:16（1080×1920）':'Douyin cover 9:16 (1080×1920)','公众号首图 2.35:1（900×383）':'WeChat header 2.35:1 (900×383)','视频号封面 16:9（1920×1080）':'Channels cover 16:9 (1920×1080)','方形社媒 1:1（1080×1080）':'Square social 1:1 (1080×1080)','其他尺寸':'Other size',
  '极简':'Minimal','清新生活':'Fresh lifestyle','潮流时尚':'Fashion-forward','品牌商业':'Brand commercial','可爱插画':'Cute illustration','其他风格':'Other style',
  '竖版海报 3:4（1080×1440）':'Portrait poster 3:4 (1080×1440)','横版海报 16:9（1920×1080）':'Landscape poster 16:9 (1920×1080)','A4 印刷（210×297mm）':'A4 print (210×297mm)','A3 印刷（297×420mm）':'A3 print (297×420mm)','易拉宝（80×200cm）':'Roll-up banner (80×200cm)','科技未来':'Future tech','商务高级':'Premium business','节日氛围':'Festive','国风':'Chinese-inspired',
  '主图 1:1（800×800）':'Hero image 1:1 (800×800)','商品卡 3:4（1080×1440）':'Product card 3:4 (1080×1440)','详情页 750×1000':'Detail page 750×1000','横版展示 16:9（1920×1080）':'Landscape display 16:9 (1920×1080)','平台横幅 1200×628':'Platform banner 1200×628','电商质感':'E-commerce polish','干净白底':'Clean white background','场景氛围':'Lifestyle scene','轻奢高级':'Quiet luxury','促销醒目':'Bold promotion',
  '手机详情页 750×1000':'Mobile detail page 750×1000','淘宝 / 天猫详情页':'Taobao / Tmall detail page','京东详情页':'JD detail page','拼多多详情页':'Pinduoduo detail page','独立站长图':'Independent shop long image','卖点清晰':'Clear selling points',
  '宽屏 16:9（1920×1080）':'Widescreen 16:9 (1920×1080)','标准 4:3（1024×768）':'Standard 4:3 (1024×768)','竖版提案 9:16（1080×1920）':'Portrait proposal 9:16 (1080×1920)','A4 文档（210×297mm）':'A4 document (210×297mm)','仅优化 1 页':'Refine one slide','学术清晰':'Academic clarity','品牌提案':'Brand proposal',
  '方形 1:1（1024×1024）':'Square 1:1 (1024×1024)','竖版 3:4（1024×1365）':'Portrait 3:4 (1024×1365)','竖版 9:16（1080×1920）':'Portrait 9:16 (1080×1920)','横版 16:9（1920×1080）':'Landscape 16:9 (1920×1080)','横幅 3:1（1500×500）':'Banner 3:1 (1500×500)','写实摄影':'Photoreal','插画':'Illustration','电影感':'Cinematic',
  'PNG 透明底（2000px）':'Transparent PNG (2000px)','SVG 矢量源文件':'SVG vector source','横版组合':'Horizontal lockup','竖版组合':'Vertical lockup','社媒头像 1:1':'Social avatar 1:1','现代几何':'Modern geometric','可爱亲和':'Cute and friendly',
  '网页横幅（1920×600）':'Web banner (1920×600)','活动横幅（1920×1080）':'Campaign banner (1920×1080)','广告投放（1200×628）':'Ad placement (1200×628)','方形 Banner（1080×1080）':'Square banner (1080×1080)','移动端横幅（750×400）':'Mobile banner (750×400)',
  '方形 1:1（1080×1080）':'Square 1:1 (1080×1080)','竖版 3:4（1080×1440）':'Portrait 3:4 (1080×1440)','透明底 PNG':'Transparent PNG','潮流字体':'Trend type','可爱手写':'Cute handwriting','赛博科技':'Cyber tech','国风书法':'Chinese calligraphy','极简排版':'Minimal typography',
  '手机壁纸 9:16（1170×2532）':'Phone wallpaper 9:16 (1170×2532)','平板壁纸 4:3（2048×1536）':'Tablet wallpaper 4:3 (2048×1536)','电脑壁纸 16:9（1920×1080）':'Desktop wallpaper 16:9 (1920×1080)','4K 桌面（3840×2160）':'4K desktop (3840×2160)','锁屏 + 桌面套装':'Lock screen + desktop set','治愈氛围':'Calming mood','自然风景':'Natural landscape',
  'A4 菜单（210×297mm）':'A4 menu (210×297mm)','桌牌（A5）':'Table sign (A5)','竖版价目表 3:4':'Portrait price list 3:4','手机长图 9:16':'Mobile long image 9:16','横版展示 16:9':'Landscape display 16:9','干净清晰':'Clean and clear','餐饮氛围':'Food and beverage mood',
  '主海报 + 3 张社媒图':'Hero poster + 3 social images','主海报 + 横幅':'Hero poster + banner','小红书活动套装':'Xiaohongshu campaign kit','门店活动套装':'Retail campaign kit','电商促销套装':'E-commerce promo kit',
  'Logo + 头像 + 配色':'Logo + avatar + palette','Logo + 社媒模板':'Logo + social templates','基础品牌规范 PDF':'Basic brand guide PDF','店铺开业视觉':'Store launch visuals','品牌提案 16:9':'Brand proposal 16:9',
  '小红书 3:4':'Xiaohongshu 3:4','视频号封面 16:9':'Channels cover 16:9','朋友圈 1:1':'WeChat Moments 1:1','公众号首图 2.35:1':'WeChat header 2.35:1','多平台混合':'Mixed platforms',
  'A4 传单（210×297mm）':'A4 flyer (210×297mm)','三折页':'Tri-fold brochure','名片（90×54mm）':'Business card (90×54mm)','印刷清晰':'Print clarity','请在需求中说明尺寸':'Describe the size in your brief','按平台规范制作':'Follow platform specs','印刷文件':'Print file','网页文件':'Web file','社媒文件':'Social file','请描述想要的风格':'Describe your preferred style'
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
  '电商详情页':'E-commerce detail page','菜单与价目表':'Menu & price list','活动物料套装':'Campaign kit','品牌视觉套装':'Brand visual kit','社媒月更包':'Monthly social pack','印刷物料设计':'Print design','卖点长图、模块排版、上新详情页':'Product storytelling, modules and launch detail pages','把商品信息讲得更清楚。':'Make product information clearer.','餐饮菜单、服务价目、项目清单':'Restaurant menus, service prices and product lists','让顾客一眼看懂怎么买。':'Help customers understand what to buy at a glance.','主海报、社媒图、横幅一次配齐':'A hero poster, social images and banner — all together','适合开业、节日和促销。':'For launches, holidays and promotions.','Logo、配色、头像、社媒模板':'Logo, colours, avatar and social templates','让一个新品牌看起来更完整。':'Give a new brand a complete look.','每月固定内容图，适合店铺与博主':'Monthly visuals for shops and creators','持续更新，省下反复沟通。':'Stay consistent and save repeated briefing.','传单、折页、展架、名片与桌牌':'Flyers, brochures, stands, cards and table signs','按印刷规范交付可用文件。':'Print-ready files made to the right specs.','10 / 详情页':'10 / Detail','11 / 菜单':'11 / Menu','12 / 活动':'12 / Campaign','13 / 品牌':'13 / Brand','14 / 月更':'14 / Monthly','15 / 印刷':'15 / Print','16 / 其他':'16 / Other','/ 套起':'/ kit from','/ 10 张起':'/ 10 images from','/ 张起':'/ image from'
});
Object.assign(zhToEn, {
  '文章插图、商品氛围、场景配图': 'Article illustrations, product mood visuals and scene imagery',
  '版式优化': 'Layout refinement', '信息梳理、视觉层级、清晰排版。': 'Information structure, visual hierarchy and clear layouts.',
  '创意延展': 'Creative extensions', '把一张主视觉延展成多种宣传物料。': 'Extend one key visual into multiple promotional assets.'
});
Object.assign(zhToEn, {
  '服务与报价':'Services & pricing','立即下单':'Order now','查看服务与报价':'See services & pricing','先看案例':'See work first',
  '面向商家与小品牌的长期内容外包和单次视觉设计。':'Ongoing content support and one-off visual design for shops and small brands.',
  '报价清楚、沟通简单、完成后通过邮箱交付。':'Clear prices, simple communication and final delivery by email.',
  '长期合作 · 单次设计 · 中英双语 · 邮件交付':'Ongoing support · One-off design · Bilingual · Email delivery',
  '长期内容合作':'Ongoing content','固定价格可见':'Visible fixed pricing','多平台尺寸适配':'Multi-platform formats','成品邮箱交付':'Final files by email','支持中英双语':'Chinese & English',
  '先看作品，':'See the work.','再谈合作。':'Then let’s collaborate.','案例示例 · 你的项目也可以从一句想法开始。':'Concept examples · your project can begin with one idea, too.',
  '需要稳定更新？':'Need steady content?','选择长期合作。':'Choose ongoing support.',
  '适合持续发内容、稳定上新或准备活动的商家。':'For businesses publishing regularly, launching products or preparing campaigns.',
  '固定沟通、固定排期、按计划交付。':'A clear contact, a fixed schedule and planned delivery.',
  '今天需要什么，':'Start with what','就从这里开始。':'you need today.',
  '先展示最常用的 6 项服务。':'The six most-used services appear first.','其他项目可以随时展开查看。':'Expand the rest whenever you need them.',
  '推荐':'Featured','社媒':'Social','电商':'Commerce','品牌':'Brand','更多':'More','价格在下单前清楚显示':'Prices are shown clearly before ordering',
  '查看全部 16 项服务':'View all 16 services','收起服务':'Show fewer services','了解我们的 AI 设计方式':'How we use AI in design',
  '下一张好图，':'Your next visual','账户':'Account','支持':'Support','网站':'Website','微信联系':'WeChat contact',
  '让品牌内容，':'Keep your content','持续被看见。':'worth seeing.','从一句想法，到一套被记住的画面。':'From one idea to a visual people remember.',
  '案例示例':'Concept example','选择月更包':'Choose monthly pack','选择上新套装':'Choose launch kit','选择活动套装':'Choose campaign kit',
  '需要 Logo、品牌规范、更多数量或不同类型内容？选择「其他需求」，先确认清楚再报价。':'Need a logo, brand guide, larger quantity or another format? Choose “Custom request” and we will confirm the scope before quoting.',
  '有想法？':'Have an idea?','直接加我微信。':'Add me on WeChat.','加我微信':'Add me on WeChat',
  '扫码添加 Wonder Ad Lab，沟通需求、定制项目或合作都可以。':'Scan to add Wonder Ad Lab for briefs, custom projects or collaborations.','微信号':'WeChat ID','扫码添加我为朋友':'Scan to add me on WeChat',
  '小红书、视频号、朋友圈、公众号图文持续更新。适合门店、博主和小品牌。':'Ongoing visuals for Xiaohongshu, Channels, Moments and WeChat articles — ideal for shops, creators and small brands.',
  '每月内容视觉排期':'Monthly visual schedule','统一品牌风格':'Consistent brand style','适配多平台尺寸':'Formats for multiple platforms',
  '电商上新套装':'E-commerce launch kit','从主图、详情页到促销 Banner，一次把新品发布需要的视觉准备好。':'Prepare the hero image, detail page and promotional banners for one complete product launch.','主图与场景图':'Hero and lifestyle images','详情页视觉模块':'Detail-page visual modules','活动与店铺 Banner':'Campaign and shop banners',
  '开业与节日活动':'Launch and seasonal campaign','开业、上新、促销、节日营销，一次配齐线上传播和线下印刷物料。':'A complete set of digital and print visuals for openings, launches, promotions and seasonal campaigns.','主海报与社媒图':'Hero poster and social visuals','优惠活动宣传物料':'Promotion materials','横幅、桌牌与印刷文件':'Banners, table signs and print files',
  'AI 生图与配图':'AI images and illustrations','适合文章插图、活动氛围图、壁纸和日常内容配图。':'For article illustrations, campaign mood images, wallpapers and everyday content.','AI 海报与广告图':'AI posters and ads','适合新品发布、门店活动、节日营销、朋友圈与社交媒体传播。':'For product launches, retail campaigns, seasonal marketing, Moments and social media.','小红书封面与电商主图':'Social covers and e-commerce hero images','为内容点击率和商品展示而设计，尺寸与风格可按平台选择。':'Designed for content clicks and product presentation, with platform-ready formats.','PPT 美化与品牌视觉':'Slide refinement and brand visuals','把提案、汇报和品牌信息做得更清楚、更有记忆点。':'Make proposals, reports and brand messages clearer and more memorable.',
  '关于 AI 创意服务':'About our AI creative services','Wonder Ad Lab 可以做哪些 AI 设计？':'What can Wonder Ad Lab design?','可制作 AI 生图、海报、广告图、小红书封面、电商主图与详情页、菜单价目表、活动物料、品牌视觉、印刷物料、Banner、创意字贴、壁纸与 PPT 美化。':'We create AI images, posters, ads, social covers, e-commerce hero images and detail pages, menus, campaign materials, brand visuals, print files, banners, creative type, wallpapers and refined slides.','AI 海报和广告图怎么收费？':'How are AI posters and ads priced?','常规社媒封面、营销海报和电商商品图为 ¥4 / 张；PPT 美化为 ¥7.5 / 页。套装与印刷项目显示起步价，其他项目会按需求确认报价。':'Standard social covers, marketing posters and product visuals are ¥4 per image; slide refinement is ¥7.5 per slide. Kits and print work show a starting price, while custom work is quoted after the brief is confirmed.','下单后如何获得成品？':'How will I receive the final files?','提交需求后会收到订单与付款指引。完成制作后，成品会通过邮箱交付给客户。':'After submitting your brief, you will receive order and payment instructions. Final files are delivered by email when complete.',
  '你正在找的 AI 设计，':'Looking for a specific','这里可能刚好能做。':'AI design service?','按具体需求找服务，比只搜“AI 生图”更容易找到合适的作品与报价。':'Browse by a specific need to find the right format and price more easily.','展开查看 120+ 项 AI 创意服务与搜索场景':'View 120+ AI creative services and use cases','海报与广告图':'Posters and ads','社媒与内容封面':'Social and content covers','电商与产品视觉':'E-commerce and product visuals','PPT 与品牌设计':'Slides and brand design','壁纸与定制场景':'Wallpapers and custom work',
  '收到你的作品。':'Receive your work.','微信号（可选）':'WeChat ID (optional)','让每一句想法，都值得被看见':'Every idea deserves to be seen',
  '网站小记录':'Site snapshot','演示数据 · 已预留真实统计接口':'Demo data · ready for a real analytics integration','网站访问人数':'Website visitors','初始演示值':'Initial demo value','最近访问地区':'Recent visitor region','浙江':'Zhejiang','地区示例，不代表真实 IP':'Region example, not a real IP address','在线访客数':'Visitors online','演示数据':'Demo data','网站运行天数':'Days online','天':'days','按 2026-07-12 上线日期计算':'Calculated from the 2026-07-12 launch date'
  ,'制作流程':'Workflow','案例':'Work','服务报价':'Services & pricing','联系':'Contact','查看制作流程':'See the workflow','直接看报价':'See pricing','当前可接单':'Available for work','画面正在拆解与组合':'Breaking the brief into frames','固定价格可见':'Visible fixed pricing','中英双语':'Chinese & English','晨光咖啡':'Morning Coffee',
  '观看制作流程':'Watch the workflow','浏览作品':'Explore work','海报、社媒、电商与品牌视觉，从一句需求开始，变成真正能够发布的内容':'Posters, social content, e-commerce and brand visuals — one brief becomes content ready to publish','品牌片头':'Brand film','轻盈护肤':'Light Skincare','海岸假日':'Coastal Holiday','让创意先被看见':'Make creativity visible first','画面会说话，':'Images can speak.','作品就是答案。':'The work is the answer.','三组品牌视觉实验。每一组都从一句需求开始，再拆成适合发布的画面。':'Three brand-visual studies. Each begins with one brief and becomes a set of publish-ready frames.','新品主视觉 · 社媒延展 · 生活方式氛围':'Launch visual · social extensions · lifestyle mood','产品发布 · 留白构图 · 柔和品牌语言':'Product launch · spacious layout · soft brand language','旅行企划 · 夏日色彩 · 多平台宣传画面':'Travel campaign · summer colour · multi-platform visuals',
  '一句需求，':'One brief.','拆成每一帧':'Every frame.','能用的内容。':'Ready to publish.','从想法、画面拆解到最终交付，把海报、社媒、电商和品牌视觉放进一套清楚的制作流程。':'From the first idea to final delivery, posters, social content, e-commerce and brand visuals move through one clear production workflow.',
  '不是按一下生成。':'More than one click.','是把需求拆清楚。':'A brief, made clear.','参考视频制作和剪辑软件的逻辑：每一步都能看懂、每个画面都有用途，最后再整理成适合发布的成品。':'Built like a video-production workflow: every step is visible, every frame has a purpose, and each final file is ready to publish.',
  '需求拆解':'Brief breakdown','分镜与构图':'Storyboard & layout','设计与调整':'Design & refine','尺寸与交付':'Export & delivery','目标':'Goal','平台':'Platform','风格':'Style','状态':'Status','新品咖啡上线':'New coffee launch','小红书 / 朋友圈':'Xiaohongshu / Moments','暖色 · 极简 · 生活感':'Warm · minimal · lifestyle','需求已整理':'Brief organized','核心标题':'Hero headline','卖点与行动按钮':'Selling points & CTA',
  '先把模糊的想法，整理成能执行的方向。':'Turn a rough idea into a direction we can execute.','确认用途、尺寸、文案重点和参考风格，避免做完才发现方向不对。':'Confirm the use, format, key copy and visual reference before production begins.'
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
  if (heroTitle) heroTitle.innerHTML = language === 'en' ? 'Keep your content<br><em>worth seeing.</em>' : '让品牌内容，<br><em>持续被看见。</em>';
  const flowHeroTitle = document.querySelector('.flow-hero h1');
  if (flowHeroTitle) flowHeroTitle.innerHTML = language === 'en' ? 'Turn ideas into visuals<br><em>Make brands memorable</em>' : '把想法做成画面<br><em>让品牌被记住</em>';
  const processTitle = document.querySelector('.process-head h2');
  if (processTitle) processTitle.innerHTML = language === 'en' ? 'More than one click.<br><em>A brief, made clear.</em>' : '不是按一下生成。<br><em>是把需求拆清楚。</em>';
  const partnerTitle = document.querySelector('.business-partner .section-head h2');
  const partnerIntro = document.querySelector('.business-partner .section-head > p:last-child');
  const singleTitle = document.querySelector('.services .section-head h2');
  const singleIntro = document.querySelector('.services .section-head > p:last-child');
  if (partnerTitle) partnerTitle.innerHTML = language === 'en' ? 'Need steady content?<br>Choose ongoing support.' : '需要稳定更新？<br>选择长期合作。';
  if (partnerIntro) partnerIntro.innerHTML = language === 'en' ? 'For businesses publishing regularly, launching products or preparing campaigns.<br>A clear contact, a fixed schedule and planned delivery.' : '适合持续发内容、稳定上新或准备活动的商家。<br>固定沟通、固定排期、按计划交付。';
  if (singleTitle) singleTitle.innerHTML = language === 'en' ? 'Start with what<br>you need today.' : '今天需要什么，<br>就从这里开始。';
  if (singleIntro) singleIntro.innerHTML = language === 'en' ? 'The six most-used services appear first.<br>Expand the rest whenever you need them.' : '先展示最常用的 6 项服务。<br>其他项目可以随时展开查看。';
  document.querySelectorAll('h1, h2').forEach(heading => {
    const headingWalker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    let headingNode;
    while (headingNode = headingWalker.nextNode()) headingNode.nodeValue = headingNode.nodeValue.replaceAll('。', '');
  });
  const heroArt = document.querySelector('.hero-art');
  if (heroArt) heroArt.setAttribute('aria-label', language === 'en' ? 'Wonder Ad Lab creative examples' : 'Wonder Ad Lab 创意案例');
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  document.querySelector('#languageToggle').textContent = language === 'en' ? '中文' : 'EN';
  const menuToggle = document.querySelector('#menuToggle');
  if (menuToggle) menuToggle.setAttribute('aria-label', language === 'en' ? 'Open menu' : '打开菜单');
  document.title = language === 'en' ? 'Wonder Ad Lab · AI Creative Studio' : '奇迹创意工作室 · Wonder Ad Lab';
  renderCreativeOptions();
  updateSelectedPrice();
  updateServiceView();
  updateProcessStep(activeProcessStep);
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
let currentUser = null;
function getCurrentUser() { return currentUser; }
async function accountApi(path = '/api/auth', options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || '账户服务暂时不可用'), { setup: body.setup });
  return body;
}
async function refreshSession() {
  try {
    const data = await accountApi();
    currentUser = data.user || null;
    if (currentUser) localStorage.setItem(sessionKey, JSON.stringify(currentUser));
    else localStorage.removeItem(sessionKey);
  } catch {
    currentUser = null;
    localStorage.removeItem(sessionKey);
  }
  updateAccountUI();
  return currentUser;
}
function updateAccountUI() {
  const user = getCurrentUser();
  const accountButton = document.querySelector('#openAuth');
  accountButton.textContent = user ? user.name : (language === 'en' ? 'Sign in' : '登录 / 注册');
  document.querySelector('#accountTitle').textContent = user ? (language === 'en' ? `${user.name}’s account` : `${user.name} 的账户`) : (language === 'en' ? 'Account' : '用户中心');
  const orderEmail = document.querySelector('#customerEmail');
  if (user) { orderEmail.value = user.email; orderEmail.readOnly = true; }
  else orderEmail.readOnly = false;
}
function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}
function formatDate() {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-CA' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
}
function updateSelectedPrice() {
  let price = servicePrices[service.value] || '¥4 / 张';
  if (language === 'en') price = price.replace('/ 10 张起', '/ 10 images from').replace('/ 张起', '/ image from').replace('/ 套起', '/ kit from').replace('/ 张', '/ image').replace('/ 页', '/ slide').replace('/ 个', '/ mark').replace('AI 评估报价', 'AI-estimated quote');
  const label = language === 'en' ? 'Project price:' : '本次项目价格：';
  const target = document.querySelector('#selectedPrice');
  if (target) target.textContent = `${label} ${price}`;
}
function renderCreativeOptions() {
  const config = serviceOptions[service.value] || serviceOptions['其他需求'];
  const render = (targetId, name, items) => {
    const target = document.querySelector(targetId);
    target.innerHTML = items.map((item, index) => `<label><input type="radio" name="${name}" value="${item}" ${index === 0 ? 'checked' : ''}><span>${language === 'en' ? (creativeOptionTranslations[item] || item) : item}</span></label>`).join('');
  };
  render('#sizeOptions', 'size', config.sizes);
  render('#styleOptions', 'style', config.styles);
}
const serviceCategories = {
  social: ['社媒封面', '营销海报', '创意字贴', '壁纸设计', '社媒月更包'],
  commerce: ['电商商品图', '电商详情页', 'Banner 设计', '菜单与价目表', '活动物料套装', '印刷物料设计'],
  brand: ['PPT 美化', '品牌 Logo', '品牌视觉套装'],
  other: ['AI 快速配图', '其他需求']
};
const primaryServices = ['社媒封面', '营销海报', '电商商品图', 'PPT 美化', 'AI 快速配图', '品牌 Logo'];
let activeServiceFilter = 'all';
let showAllServices = false;
let activeProcessStep = 'brief';
let processManualUntil = 0;
const processStepData = {
  brief: {
    image: 'portfolio-coffee.jpg', tag: 'BRIEF / FRAME 01', number: 'STEP 01',
    project: { zh: '01 / 需求拆解', en: '01 / BRIEF BREAKDOWN' },
    goal: { zh: '新品咖啡上线', en: 'New coffee launch' }, platform: { zh: '小红书 / 朋友圈', en: 'Xiaohongshu / Moments' }, style: { zh: '暖色 · 极简 · 生活感', en: 'Warm · minimal · lifestyle' }, status: { zh: '需求已整理', en: 'Brief organized' },
    title: { zh: '先把模糊的想法，整理成能执行的方向。', en: 'Turn a rough idea into a direction we can execute.' }, text: { zh: '确认用途、尺寸、文案重点和参考风格，避免做完才发现方向不对。', en: 'Confirm the use, format, key copy and visual reference before production begins.' }
  },
  board: {
    image: 'portfolio-skincare.jpg', tag: 'STORYBOARD / FRAME 02', number: 'STEP 02',
    project: { zh: '02 / 分镜与构图', en: '02 / STORYBOARD' },
    goal: { zh: '建立画面顺序', en: 'Build the frame order' }, platform: { zh: '主视觉 / 社媒延展', en: 'Hero visual / social' }, style: { zh: '留白 · 产品聚焦', en: 'Whitespace · product focus' }, status: { zh: '构图已确认', en: 'Layout approved' },
    title: { zh: '先看画面顺序，再决定每一张该说什么。', en: 'Plan the visual sequence before designing each frame.' }, text: { zh: '用分镜拆出主画面、卖点画面和行动画面，让整套内容看起来像同一个品牌。', en: 'Separate the hero, selling-point and action frames so the whole set feels like one brand.' }
  },
  refine: {
    image: 'portfolio-travel.jpg', tag: 'REFINE / FRAME 03', number: 'STEP 03',
    project: { zh: '03 / 设计与调整', en: '03 / BUILD & REFINE' },
    goal: { zh: '完成视觉系统', en: 'Complete the visual system' }, platform: { zh: '多平台同步', en: 'Multi-platform' }, style: { zh: '清晰 · 有记忆点', en: 'Clear · memorable' }, status: { zh: '细节调整中', en: 'Refining details' },
    title: { zh: '调整文字、颜色和重点，直到信息一眼能看懂。', en: 'Refine type, colour and hierarchy until the message reads instantly.' }, text: { zh: '保留好看的同时检查文字层级、商品比例和品牌一致性，不靠特效掩盖信息。', en: 'Balance visual polish with clear hierarchy, product scale and brand consistency.' }
  },
  deliver: {
    image: 'portfolio-coffee.jpg', tag: 'EXPORT / FINAL', number: 'STEP 04',
    project: { zh: '04 / 尺寸与交付', en: '04 / EXPORT & DELIVERY' },
    goal: { zh: '输出发布文件', en: 'Export publish-ready files' }, platform: { zh: '社媒 / 网页 / 印刷', en: 'Social / web / print' }, style: { zh: '高清 · 格式正确', en: 'High-res · correct format' }, status: { zh: '等待邮件交付', en: 'Ready for email delivery' },
    title: { zh: '同一套视觉，整理成每个平台真正能用的尺寸。', en: 'Turn one visual system into the formats each platform actually needs.' }, text: { zh: '检查清晰度、裁切安全区和文件格式，完成后通过邮箱交付，不把预览图当成最终成品。', en: 'Check resolution, safe crops and file formats, then deliver the real final files by email.' }
  }
};
function updateProcessStep(step) {
  const data = processStepData[step] || processStepData.brief;
  const changed = activeProcessStep !== step;
  activeProcessStep = step;
  document.querySelectorAll('[data-process-step]').forEach(button => {
    const active = button.dataset.processStep === step;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const setText = (selector, value) => { const target = document.querySelector(selector); if (target) target.textContent = value; };
  const localized = value => value[language === 'en' ? 'en' : 'zh'];
  const preview = document.querySelector('#processPreviewImage');
  if (preview) { preview.src = data.image; preview.alt = language === 'en' ? 'Creative workflow preview' : '制作流程画面预览'; }
  setText('#processPreviewTag', data.tag); setText('#processProjectLabel', localized(data.project)); setText('#processGoal', localized(data.goal)); setText('#processPlatform', localized(data.platform)); setText('#processStyle', localized(data.style)); setText('#processStatus', localized(data.status)); setText('#processCaptionNumber', data.number); setText('#processCaptionTitle', localized(data.title)); setText('#processCaptionText', localized(data.text));
  if (changed && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const consoleElement = document.querySelector('.process-console');
    consoleElement?.classList.remove('step-changing');
    window.requestAnimationFrame(() => consoleElement?.classList.add('step-changing'));
    window.setTimeout(() => consoleElement?.classList.remove('step-changing'), 950);
  }
}
function updateServiceView() {
  const cards = [...document.querySelectorAll('.price-card')];
  document.querySelector('.price-grid')?.classList.toggle('is-expanded', showAllServices || activeServiceFilter !== 'all');
  cards.forEach(card => {
    const product = card.dataset.product;
    const category = Object.keys(serviceCategories).find(key => serviceCategories[key].includes(product)) || 'other';
    card.dataset.serviceCategory = category;
    card.classList.toggle('service-primary', primaryServices.includes(product));
    card.hidden = activeServiceFilter === 'all' ? (!showAllServices && !primaryServices.includes(product)) : category !== activeServiceFilter;
  });
  document.querySelectorAll('[data-service-filter]').forEach(button => button.classList.toggle('active', button.dataset.serviceFilter === activeServiceFilter));
  const toggle = document.querySelector('#toggleAllServices');
  if (toggle) {
    toggle.hidden = activeServiceFilter !== 'all';
    toggle.setAttribute('aria-expanded', String(showAllServices));
    toggle.innerHTML = showAllServices
      ? `${language === 'en' ? 'Show fewer services' : '收起服务'} <span>−</span>`
      : `${language === 'en' ? 'View all 16 services' : '查看全部 16 项服务'} <span>＋</span>`;
  }
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
async function renderAccountStats() {
  const user = getCurrentUser();
  let orders = [];
  if (user) {
    try { orders = (await accountApi('/api/orders')).orders || []; } catch { orders = []; }
  }
  document.querySelector('#accountOrderCount').textContent = orders.length;
  document.querySelector('#accountImageCount').textContent = orders.filter(order => order.result).length;
}
async function renderCustomerOrders() {
  const user = getCurrentUser();
  if (!user) { ordersList.innerHTML = `<p class="empty-inbox">${language === 'en' ? 'Sign in to view your orders.' : '请先登录，才能查看自己的订单。'}</p>`; return; }
  let orders = [];
  try { orders = (await accountApi('/api/orders')).orders || []; }
  catch (error) { ordersList.innerHTML = `<p class="empty-inbox">暂时无法读取订单：${escapeHtml(error.message)}</p>`; return; }
  ordersList.innerHTML = orders.length ? orders.map(order => `
    <article class="inbox-item customer-order"><div class="inbox-item-top"><span class="inbox-tag">${escapeHtml(order.service)}</span><span class="status ${statusClass(order.status)}">${escapeHtml(order.status)}</span></div><p class="inbox-idea">${escapeHtml(order.idea)}</p><p class="customer-email">项目价格：${escapeHtml(order.price || servicePrices[order.service] || '待确认报价')} · ${escapeHtml(order.size)} · ${escapeHtml(order.style)} · ${escapeHtml(order.payment)} · 下单于 ${escapeHtml(order.date)}</p>${order.result ? `<a class="result-link" href="${order.result.data}" download="${escapeHtml(order.result.name)}">下载你的成品</a>` : '<p class="delivery-wait">设计师完成后，成品会显示在这里。</p>'}</article>`).join('') : '<p class="empty-inbox">没有找到该邮箱的订单。</p>';
}
function openModal(modal) { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
function closeModal(modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }

document.querySelectorAll('[data-scroll]').forEach(button => button.addEventListener('click', () => {
  const chosenService = button.dataset.choose;
  if (chosenService && [...service.options].some(option => option.value === chosenService)) { service.value = chosenService; renderCreativeOptions(); updateSelectedPrice(); }
  document.querySelector(button.dataset.scroll).scrollIntoView({ behavior: 'smooth' });
}));
document.querySelectorAll('[data-service-filter]').forEach(button => button.addEventListener('click', () => {
  activeServiceFilter = button.dataset.serviceFilter;
  updateServiceView();
}));
document.querySelectorAll('[data-process-step]').forEach(button => button.addEventListener('click', () => {
  processManualUntil = Date.now() + 4200;
  updateProcessStep(button.dataset.processStep);
}));
document.querySelector('#toggleAllServices')?.addEventListener('click', () => {
  showAllServices = !showAllServices;
  updateServiceView();
});
const menuToggle = document.querySelector('#menuToggle');
const siteNav = document.querySelector('#siteNav');
function closeMobileMenu() {
  menuToggle?.setAttribute('aria-expanded', 'false');
  siteNav?.classList.remove('open');
}
menuToggle?.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!open));
  siteNav?.classList.toggle('open', !open);
});
siteNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileMenu));
document.querySelectorAll('.price-card').forEach(card => card.addEventListener('click', event => {
  if (event.target.closest('button')) { service.value = card.dataset.product; renderCreativeOptions(); updateSelectedPrice(); document.querySelector('#order').scrollIntoView({ behavior: 'smooth' }); showToast(language === 'en' ? `${zhToEn[card.dataset.product] || card.dataset.product} selected. Tell us your idea.` : `已选择「${card.dataset.product}」，说说你的想法吧。`); }
}));
service.addEventListener('change', () => { renderCreativeOptions(); updateSelectedPrice(); });
document.querySelector('#openOrders').addEventListener('click', () => { if (!getCurrentUser()) { openModal(authModal); showToast(language === 'en' ? 'Sign in to view your orders.' : '请先登录后查看自己的订单。'); return; } openModal(ordersModal); renderCustomerOrders(); });
document.querySelector('#openAccount').addEventListener('click', () => { if (!getCurrentUser()) { openModal(authModal); showToast(language === 'en' ? 'Sign in or create an account first.' : '请先登录或注册账户。'); return; } renderAccountStats(); openModal(accountModal); });
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
document.querySelector('#accountOrders').addEventListener('click', () => { closeModal(accountModal); openModal(ordersModal); renderCustomerOrders(); });
document.querySelector('#rechargeButton').addEventListener('click', () => showToast('余额充值会在支付商户接入后开放。'));
document.querySelector('#inviteButton').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText('WONDER-2026'); showToast('邀请代码已复制。'); } catch { showToast('邀请代码：WONDER-2026'); }
});
document.querySelector('#logoutButton').addEventListener('click', async () => { try { await accountApi('/api/auth', { method: 'DELETE' }); } catch { /* Clear the local display state even if the network is unavailable. */ } currentUser = null; localStorage.removeItem(sessionKey); updateAccountUI(); closeModal(accountModal); showToast('你已退出登录。'); });
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
  const password = document.querySelector('#registerPassword').value;
  try {
    const data = await accountApi('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'register', name, email, password }) });
    currentUser = data.user; localStorage.setItem(sessionKey, JSON.stringify(currentUser));
    event.target.reset(); updateAccountUI(); closeModal(authModal); showToast('注册成功，欢迎来到 Wonder Ad Lab。');
  } catch (error) {
    showToast(error.setup ? '账户服务正在配置中，请稍后再试。' : error.message);
    if (/已注册|already registered/i.test(error.message)) showAuthForm('login');
  }
});
document.querySelector('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const email = document.querySelector('#loginEmail').value.trim().toLowerCase();
  const password = document.querySelector('#loginPassword').value;
  try {
    const data = await accountApi('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', email, password }) });
    currentUser = data.user; localStorage.setItem(sessionKey, JSON.stringify(currentUser));
    event.target.reset(); updateAccountUI(); closeModal(authModal); showToast(`欢迎回来，${currentUser.name}。`);
  } catch (error) { showToast(error.setup ? '账户服务正在配置中，请稍后再试。' : '邮箱或密码不正确。'); }
});
document.querySelector('#lookupForm').addEventListener('submit', event => { event.preventDefault(); renderCustomerOrders(); });
document.querySelector('#buildPrompt').addEventListener('click', () => {
  const text = document.querySelector('#orderForm textarea').value.trim();
  const size = document.querySelector('input[name="size"]:checked').value;
  const style = document.querySelector('input[name="style"]:checked').value;
  const output = document.querySelector('#promptOutput');
  if (!text) { output.textContent = language === 'en' ? 'Write one sentence about your idea and I will turn it into a clear creative brief.' : '先写下一句你的想法，我会帮你整理成清晰的创意需求。'; return; }
  output.textContent = language === 'en' ? `Creative summary: make a ${creativeOptionTranslations[size] || size} visual in a ${creativeOptionTranslations[style] || style} style. Core request: ${text}. Keep one clear hero visual and one key message.` : `创意摘要：制作 ${size} 的${style}风格作品。核心需求：${text}。建议突出一个主视觉与一句关键信息。`;
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
  const signedInUser = getCurrentUser() || await refreshSession();
  if (!signedInUser) {
    openModal(authModal);
    showToast(language === 'en' ? 'Create an account or sign in before submitting an order.' : '请先注册或登录账户，登录后才可以提交订单。');
    return;
  }
  const form = event.target;
  const payment = form.querySelector('input[name="payment"]:checked').value;
  const order = { id: `WA${Date.now().toString().slice(-7)}`, service: service.value, price: servicePrices[service.value] || '待确认报价', email: signedInUser.email, wechat: form.querySelector('#customerWechat').value.trim(), idea: form.querySelector('textarea').value.trim(), size: form.querySelector('input[name="size"]:checked').value, style: form.querySelector('input[name="style"]:checked').value, payment, status: '审核中', date: formatDate() };
  const saved = await saveSharedOrder(order);
  if (!saved) { showToast('订单暂时无法同步，请稍后重试或联系客服。'); return; }
  const orders = getOrders(); orders.unshift(order); saveOrders(orders);
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
  '奇迹创意工作室': 'Wonder Creative Studio',
  '正在接单': 'Now taking projects',
  '海报、社媒、电商与品牌视觉，从一句需求到可以直接发布的成品': 'Posters, social, commerce and brand visuals — from one brief to ready-to-publish work',
  '开始一个项目': 'Start a project',
  '查看工作室作品': 'View studio work',
  '把需求写清楚': 'Write a clear brief',
  '项目就从这里开始': 'The project starts here',
  '选择服务': 'Choose a service',
  '填写方向': 'Set the direction',
  '确认交付': 'Confirm delivery',
  '有想法？': 'Have an idea?',
  '直接加我微信。': 'Add me on WeChat.',
  '加我微信': 'Add me on WeChat',
  '扫码添加 Wonder Ad Lab，沟通需求、定制项目或合作都可以。': 'Scan to add Wonder Ad Lab for briefs, custom projects or collaborations.',
  '微信号': 'WeChat ID',
  '扫码添加我为朋友': 'Scan to add me on WeChat',
  '持续内容': 'Always-on content',
  '为品牌准备的视觉系统。': 'A visual system made for brands.',
  '社媒月更、内容封面与活动视觉。': 'Monthly social content, covers and campaign visuals.',
  '电商上新': 'E-commerce launch',
  '从主图到详情页，一次上新。': 'From the hero image to the detail page, one complete launch.',
  '品牌活动': 'Brand campaign',
  '把一次活动，做成被记住的画面。': 'Turn one campaign into a visual people remember.',
  '了解服务': 'Explore services'
});
function initStudioCutMotion() {
  const revealTargets = document.querySelectorAll('.flow-hero:not(.showreel-hero) .hero-copy, .hero-studio, .process-head, .process-console, .process-caption, .works-title, .section-head, .business-grid article, .price-card, .tool-grid article, .member-grid article, .wechat-contact > *, .join-us > *, .update-grid article, .stats-heading, .stats-grid article');
  revealTargets.forEach(target => target.setAttribute('data-reveal', ''));
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -24px' });
    revealTargets.forEach(target => observer.observe(target));
  } else {
    revealTargets.forEach(target => target.classList.add('is-visible'));
  }
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.price-card, .business-grid article').forEach(card => card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    }));
  }
}
function initShowreel() {
  const hero = document.querySelector('.showreel-hero');
  const frames = [...document.querySelectorAll('[data-reel-frame]')];
  const controls = [...document.querySelectorAll('[data-reel-target]')];
  const counter = document.querySelector('#reelCounter');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!hero || frames.length < 2) return;
  let activeIndex = 0;
  let reelTimer;
  let reelVisible = true;
  const showFrame = index => {
    activeIndex = (index + frames.length) % frames.length;
    frames.forEach((frame, frameIndex) => frame.classList.toggle('is-active', frameIndex === activeIndex));
    controls.forEach((control, controlIndex) => {
      const active = controlIndex === activeIndex;
      control.classList.toggle('is-active', active);
      control.setAttribute('aria-pressed', String(active));
    });
    if (counter) counter.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(frames.length).padStart(2, '0')}`;
  };
  const stopReel = () => window.clearInterval(reelTimer);
  const startReel = () => stopReel();
  controls.forEach(control => control.addEventListener('click', () => {
    showFrame(Number(control.dataset.reelTarget));
    startReel();
  }));
  document.addEventListener('visibilitychange', startReel);
  if ('IntersectionObserver' in window) {
    const reelObserver = new IntersectionObserver(entries => {
      reelVisible = entries[0]?.isIntersecting ?? true;
      startReel();
    }, { threshold: .08 });
    reelObserver.observe(hero);
  }
  const caseCards = [...document.querySelectorAll('.work')];
  if (reduceMotion || !('IntersectionObserver' in window)) caseCards.forEach(card => card.classList.add('case-visible'));
  else {
    const caseObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('case-visible');
      caseObserver.unobserve(entry.target);
    }), { threshold: .14, rootMargin: '0px 0px -8%' });
    caseCards.forEach(card => caseObserver.observe(card));
  }
  showFrame(0);
  startReel();
}
function initCinematicMotion() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const progressBar = document.querySelector('#scrollProgress');
  const hero = document.querySelector('.flow-hero');
  const heroCopy = hero?.querySelector('.hero-copy');
  const heroStudio = hero?.querySelector('.hero-studio');
  const heroCanvas = hero?.querySelector('.studio-canvas > img');
  const heroReel = hero?.querySelector('.hero-reel');
  const processSection = document.querySelector('.production-process');
  const processConsole = document.querySelector('.process-console');
  const processOrder = ['brief', 'board', 'refine', 'deliver'];
  const workCards = [...document.querySelectorAll('.work')];
  root.classList.add('motion-ready');

  const measuredClamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  let measuredFramePending = false;
  const updateMeasuredMotion = () => {
    measuredFramePending = false;
    const scrollTop = window.scrollY || root.scrollTop;
    const scrollRange = Math.max(1, root.scrollHeight - window.innerHeight);
    progressBar?.style.setProperty('transform', `scaleX(${measuredClamp(scrollTop / scrollRange)})`);
    header?.classList.toggle('is-compact', scrollTop > 72);
  };
  const requestMeasuredMotion = () => {
    if (measuredFramePending) return;
    measuredFramePending = true;
    window.requestAnimationFrame(updateMeasuredMotion);
  };
  window.addEventListener('scroll', requestMeasuredMotion, { passive: true });
  window.addEventListener('resize', requestMeasuredMotion, { passive: true });
  updateMeasuredMotion();

  const measuredCountTargets = [...document.querySelectorAll('[data-stat="visitors"], [data-stat="online"], #runningDays')];
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const measuredCounterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const target = entry.target;
      const finalValue = Number.parseInt(target.textContent, 10);
      if (Number.isFinite(finalValue)) {
        const start = performance.now();
        const tick = now => {
          const progress = measuredClamp((now - start) / 800);
          target.textContent = String(Math.round(finalValue * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      }
      measuredCounterObserver.unobserve(target);
    }), { threshold: .5 });
    measuredCountTargets.forEach(target => measuredCounterObserver.observe(target));
  }
  return;

  document.querySelectorAll('.hero-actions button, .hero-actions a, .nav-order, .choose, .expand-services, .membership button, .prompt-helper, form .primary').forEach(element => element.classList.add('magnetic'));
  document.querySelectorAll('.price-grid, .business-grid, .tool-grid, .member-grid, .update-grid, .stats-grid').forEach(group => {
    [...group.querySelectorAll('[data-reveal]')].forEach((item, index) => item.style.transitionDelay = `${Math.min(index, 7) * 65}ms`);
  });

  if (reduceMotion) return;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  let framePending = false;
  const updateScrollMotion = () => {
    framePending = false;
    const scrollTop = window.scrollY || root.scrollTop;
    const scrollRange = Math.max(1, root.scrollHeight - window.innerHeight);
    progressBar?.style.setProperty('transform', `scaleX(${clamp(scrollTop / scrollRange)})`);
    const headerSwitchPoint = hero?.classList.contains('showreel-hero') ? Math.max(96, hero.offsetHeight - 120) : 28;
    header?.classList.toggle('is-compact', scrollTop > headerSwitchPoint);

    if (hero && heroReel) {
      const rect = hero.getBoundingClientRect();
      const heroProgress = clamp(-rect.top / Math.max(1, rect.height * .88));
      hero.style.setProperty('--reel-scale', String(1 - heroProgress * .12));
      hero.style.setProperty('--reel-y', `${heroProgress * 78}px`);
      hero.style.setProperty('--reel-copy-y', `${heroProgress * 92}px`);
      hero.style.setProperty('--reel-copy-opacity', String(1 - heroProgress * 1.18));
    } else if (hero && heroStudio && heroCanvas) {
      const rect = hero.getBoundingClientRect();
      const heroProgress = clamp(-rect.top / Math.max(1, rect.height * .82));
      hero.style.setProperty('--hero-grid-y', `${heroProgress * 54}px`);
      heroStudio.style.setProperty('--studio-y', `${heroProgress * 68}px`);
      heroStudio.style.setProperty('--studio-scale', String(1 - heroProgress * .07));
      heroCanvas.style.setProperty('--canvas-y', `${heroProgress * 22}px`);
      heroCanvas.style.setProperty('--canvas-scale', String(1.035 + heroProgress * .05));
      if (heroCopy) {
        heroCopy.style.transform = `translate3d(0,${heroProgress * 32}px,0)`;
        heroCopy.style.opacity = String(1 - heroProgress * .42);
      }
    }

    if (processSection && processConsole) {
      const rect = processSection.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight * .34);
      const progress = clamp((window.innerHeight * .44 - rect.top) / travel);
      processConsole.style.setProperty('--process-progress', `${progress * 100}%`);
      const stepIndex = Math.min(3, Math.floor(clamp(progress, 0, .9999) * 4));
      if (Date.now() > processManualUntil && processOrder[stepIndex] !== activeProcessStep) updateProcessStep(processOrder[stepIndex]);
    }

    if (window.innerWidth > 760) {
      workCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const distance = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        card.style.setProperty('--card-y', `${clamp(distance * -24 + (index - 1) * 4, -22, 22)}px`);
      });
    }
  };
  const requestScrollMotion = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateScrollMotion);
  };
  window.addEventListener('scroll', requestScrollMotion, { passive: true });
  window.addEventListener('resize', requestScrollMotion, { passive: true });
  updateScrollMotion();

  if (finePointer && hero && heroStudio) {
    hero.addEventListener('pointermove', event => {
      const heroRect = hero.getBoundingClientRect();
      hero.style.setProperty('--pointer-x', `${event.clientX - heroRect.left}px`);
      hero.style.setProperty('--pointer-y', `${event.clientY - heroRect.top}px`);
      const studioRect = heroStudio.getBoundingClientRect();
      const x = clamp((event.clientX - studioRect.left) / studioRect.width, 0, 1) - .5;
      const y = clamp((event.clientY - studioRect.top) / studioRect.height, 0, 1) - .5;
      heroStudio.style.setProperty('--tilt-x', `${y * -3.8}deg`);
      heroStudio.style.setProperty('--tilt-y', `${x * 4.6}deg`);
    });
    hero.addEventListener('pointerleave', () => {
      heroStudio.style.setProperty('--tilt-x', '0deg');
      heroStudio.style.setProperty('--tilt-y', '0deg');
    });
  }

  if (finePointer) {
    document.querySelectorAll('.work, .price-card, .tool-grid article, .member-grid article, .stats-grid article').forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.setProperty('--card-rx', `${y * -4.2}deg`);
        card.style.setProperty('--card-ry', `${x * 5.2}deg`);
        card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
        card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--card-rx', '0deg');
        card.style.setProperty('--card-ry', '0deg');
      });
    });
    document.querySelectorAll('.magnetic').forEach(element => {
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty('--magnetic-x', `${((event.clientX - rect.left) / rect.width - .5) * 10}px`);
        element.style.setProperty('--magnetic-y', `${((event.clientY - rect.top) / rect.height - .5) * 8}px`);
      });
      element.addEventListener('pointerleave', () => {
        element.style.setProperty('--magnetic-x', '0px');
        element.style.setProperty('--magnetic-y', '0px');
      });
    });
  }

  const countTargets = [...document.querySelectorAll('[data-stat="visitors"], [data-stat="online"], #runningDays')];
  const animateCount = target => {
    const finalValue = Number.parseInt(target.textContent, 10);
    if (!Number.isFinite(finalValue)) return;
    target.dataset.counting = 'true';
    const start = performance.now();
    const duration = 1150;
    const tick = now => {
      const progress = clamp((now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      target.textContent = String(Math.round(finalValue * eased));
      if (progress < 1) window.requestAnimationFrame(tick);
      else delete target.dataset.counting;
    };
    window.requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      counterObserver.unobserve(entry.target);
    }), { threshold: .55 });
    countTargets.forEach(target => counterObserver.observe(target));
  }
}
function updateRunningDays() {
  const launchDate = new Date(2026, 6, 12);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.max(1, Math.floor((today - launchDate) / 86400000) + 1);
  const target = document.querySelector('#runningDays');
  if (target) target.textContent = String(days);
}
updateServiceView();
initStudioCutMotion();
updateRunningDays();
initShowreel();
initCinematicMotion();
applyLanguage();
refreshSession().then(() => renderAccountStats());
