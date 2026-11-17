import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../api/_inquiry-route.js';
let counter = 0;
const valid = { email: 'seller@example.com', name: 'Seller', platform: 'Amazon', package: 'Standard', product: 'Ceramic vase', notes: 'Warm setting', photoLink: 'https://example.com/photos', website: '', acknowledged: 'yes' };
async function call(body, opts={}) {
 const res = { headers:{}, setHeader(k,v){this.headers[k]=v;}, status(code){this.code=code;return this;},json(data){this.data=data;return this;} };
 await handler({method:'POST',headers:{'x-forwarded-for':`test-${++counter}`},body,...opts},res); return res;
}
test('inquiry validates all inputs before sending and rejects bots', async () => {
 for (const patch of [{email:'bad'}, {platform:'Invalid'}, {package:'toString'}, {product:''}, {notes:'a'.repeat(3001)}, {photoLink:'javascript:alert(1)'}, {name:'a\r\nb'}, {acknowledged:''}, {website:'bot'}, {email:[]}]) assert.equal((await call({...valid,...patch})).code,400);
 assert.equal((await call('{')).code,400);
 assert.equal((await call(valid,{method:'GET'})).code,405);
});
test('inquiry fails closed without mail configuration', async () => {
 const key=process.env.RESEND_API_KEY,from=process.env.MAIL_FROM;
 try { delete process.env.RESEND_API_KEY;delete process.env.MAIL_FROM;assert.equal((await call(valid)).code,503); }
 finally { if(key!==undefined)process.env.RESEND_API_KEY=key;if(from!==undefined)process.env.MAIL_FROM=from; }
});
test('inquiry sends Chinese studio notice and English confirmation with payment boundaries', async () => {
 const original=globalThis.fetch,key=process.env.RESEND_API_KEY,from=process.env.MAIL_FROM;const sent=[];
 process.env.RESEND_API_KEY='mock-key';process.env.MAIL_FROM='Wonder Lab <studio@example.com>';
 globalThis.fetch=async (url,options)=>{assert.equal(url,'https://api.resend.com/emails');sent.push(JSON.parse(options.body));return {ok:true};};
 try {
  const opts={headers:{'x-forwarded-for':'successful-seller'}};
  const res=await call(valid,opts);assert.equal(res.code,200);assert.match(res.data.id,/^WL-\d{8}-[A-F0-9]{4}$/);assert.equal(sent.length,2);
  assert.deepEqual(sent[0].to,['wonder07090518@gmail.com']);assert.equal(sent[0].reply_to,valid.email);
  for(const value of Object.entries(valid).filter(([key,value])=>value && !['acknowledged','website'].includes(key)).map(([,value])=>value)) assert.ok(sent[0].text.includes(value));
  assert.match(sent[0].text,/这是询价，不是付款/);assert.match(sent[0].text,/确认到账后才开工/);
  assert.deepEqual(sent[1].to,[valid.email]);assert.match(sent[1].text,/Standard — US\$59/);
  for(const mail of sent){assert.match(mail.text,/PayPal invoice/);assert.match(mail.text,/Goods & Services/);assert.ok(mail.text.includes(res.data.id));assert.doesNotMatch(mail.text,/Stripe|支付宝|微信|会员/);}
  assert.match(sent[1].text,/Work starts only after payment is confirmed/);assert.match(sent[1].text,/Friends & Family/);assert.doesNotMatch(sent[1].text,/[\u3400-\u9fff]/);
  assert.equal((await call(valid,opts)).code,429);assert.equal(sent.length,2);
  globalThis.fetch=async()=>({ok:false});assert.equal((await call(valid)).code,502);
  assert.equal((await call(valid,{headers:{'x-forwarded-for':'successful-seller'}})).code,429);
  let calls=0;globalThis.fetch=async()=>({ok:++calls===1});const partial=await call(valid);assert.equal(partial.code,200);assert.equal(partial.data.confirmationSent,false);
 } finally {globalThis.fetch=original;if(key===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=key;if(from===undefined)delete process.env.MAIL_FROM;else process.env.MAIL_FROM=from;}
});
