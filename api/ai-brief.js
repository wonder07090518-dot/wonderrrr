import { createHash } from 'node:crypto';
import { availableServices } from './_catalog.js';
import { kv, storageConfigured } from './_admin.js';

const MODEL = 'openai/gpt-5.6-terra';
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 10 * 60;

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function clientKey(req) {
  const forwarded = clean(req.headers['x-forwarded-for'], 300).split(',')[0].trim();
  const source = forwarded || clean(req.headers['x-real-ip'], 100) || 'unknown';
  return createHash('sha256').update(source).digest('hex').slice(0, 24);
}

async function withinRateLimit(req) {
  if (!storageConfigured()) return false;
  const key = `wonder:ai-brief:${clientKey(req)}`;
  const count = Number(await kv('incr', key));
  if (count === 1) await kv('expire', key, RATE_WINDOW_SECONDS);
  return count <= RATE_LIMIT;
}

function validBrief(data) {
  return data && ['summary', 'objective', 'audience', 'keyMessage', 'visualDirection'].every(key => typeof data[key] === 'string' && data[key].trim())
    && ['mustInclude', 'avoid', 'deliverableChecklist'].every(key => Array.isArray(data[key]) && data[key].every(item => typeof item === 'string'));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const service = clean(req.body?.service, 80);
  const size = clean(req.body?.size, 160);
  const style = clean(req.body?.style, 120);
  const idea = clean(req.body?.idea, 800);
  const language = req.body?.language === 'en' ? 'en' : 'zh';
  if (!availableServices.has(service) || !size || !style || idea.length < 5) return res.status(400).json({ error: 'Please provide a complete creative request' });

  try {
    if (!(await withinRateLimit(req))) return res.status(storageConfigured() ? 429 : 503).json({ error: storageConfigured() ? 'AI brief rate limit reached' : 'AI brief protection is not configured' });
  } catch {
    return res.status(503).json({ error: 'AI brief protection is temporarily unavailable' });
  }

  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!token) return res.status(503).json({ error: 'AI brief service is not configured' });

  const outputLanguage = language === 'en' ? 'English' : 'Simplified Chinese';
  const messages = [
    {
      role: 'system',
      content: `You are Wonder Ad Lab's senior creative director. Turn a customer's rough idea into a genuinely useful production brief in ${outputLanguage}. Analyze the specific request instead of repeating it. Keep all supplied facts accurate. Never invent product claims, discounts, dates, contact details, order volume, audience research or brand information. When important information is missing, mark it as ${language === 'en' ? '[To confirm]' : '【待确认】'} rather than guessing. Give concrete visual guidance that a designer can execute. Keep every field concise.`
    },
    {
      role: 'user',
      content: `Service: ${service}\nOutput size: ${size}\nPreferred style: ${style}\nCustomer idea: ${idea}`
    }
  ];

  const schema = {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One-sentence restatement of the project' },
      objective: { type: 'string', description: 'The communication goal this visual must achieve' },
      audience: { type: 'string', description: 'Likely intended audience, or a clear to-confirm marker when unknown' },
      keyMessage: { type: 'string', description: 'The single most important message or hierarchy' },
      visualDirection: { type: 'string', description: 'Specific composition, colour, typography and mood direction' },
      mustInclude: { type: 'array', items: { type: 'string' }, maxItems: 5, description: 'Required content or assets' },
      avoid: { type: 'array', items: { type: 'string' }, maxItems: 4, description: 'Visual or factual mistakes to avoid' },
      deliverableChecklist: { type: 'array', items: { type: 'string' }, maxItems: 5, description: 'Concrete checks before delivery' }
    },
    required: ['summary', 'objective', 'audience', 'keyMessage', 'visualDirection', 'mustInclude', 'avoid', 'deliverableChecklist'],
    additionalProperties: false
  };

  let gatewayResponse;
  try {
    gatewayResponse = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages,
        reasoning: { effort: 'medium' },
        max_completion_tokens: 1400,
        response_format: { type: 'json_schema', json_schema: { name: 'wonder_creative_brief', description: 'A production-ready creative brief', strict: true, schema } }
      }),
      signal: AbortSignal.timeout(28000)
    });
  } catch {
    return res.status(503).json({ error: 'AI service is temporarily unavailable' });
  }

  if (!gatewayResponse.ok) {
    const status = [402, 429].includes(gatewayResponse.status) ? gatewayResponse.status : 503;
    return res.status(status).json({ error: status === 402 ? 'AI budget is temporarily unavailable' : status === 429 ? 'AI service is busy' : 'AI service is temporarily unavailable' });
  }

  try {
    const completion = await gatewayResponse.json();
    const brief = JSON.parse(completion.choices?.[0]?.message?.content || 'null');
    if (!validBrief(brief)) throw new Error('Invalid brief');
    return res.status(200).json({ brief, model: MODEL, generatedAt: new Date().toISOString() });
  } catch {
    return res.status(502).json({ error: 'AI returned an incomplete brief' });
  }
}
