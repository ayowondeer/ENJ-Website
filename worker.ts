import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

type SecretValue = string | { get(): Promise<string> } | undefined;

interface WorkerEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  GEMINI_API_KEY?: SecretValue;
  GOOGLE_API_KEY?: SecretValue;
  API_KEY?: SecretValue;
  VITE_GEMINI_API_KEY?: SecretValue;
  RESEND_API_KEY?: SecretValue;
  RESEND_FROM?: string;
  APP_URL?: string;
}

const CONTACT_RECIPIENT = 'enjdigitalconcept@gmail.com';

const PORTFOLIO_CATEGORY_LIST = [
  'Branding & 3D Signage',
  'Digital & Large Format Printing',
  'Solar & Renewable Energy',
  'Corporate Apparel & Monogram',
  'Procurement & General Supplies',
] as const;

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  text: string;
  imageCount?: number;
  audioCount?: number;
}

interface UploadedMediaInput {
  mimeType: string;
  data: string;
}

interface AiAssistRequestBody {
  message?: string;
  images?: UploadedMediaInput[];
  audioClips?: UploadedMediaInput[];
  history?: ChatHistoryMessage[];
  existingImageCount?: number;
  currentDraft?: {
    type?: string;
    review?: Record<string, unknown>;
    portfolio?: Record<string, unknown>;
    order?: Record<string, unknown>;
  } | null;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

async function resolveSecretValue(val: SecretValue): Promise<string> {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object' && typeof val.get === 'function') {
    const resolved = await val.get().catch(() => '');
    return typeof resolved === 'string' ? resolved.trim() : '';
  }
  return '';
}

async function resolveGeminiApiKey(env: WorkerEnv): Promise<string> {
  for (const candidate of [env.GEMINI_API_KEY, env.GOOGLE_API_KEY, env.API_KEY, env.VITE_GEMINI_API_KEY]) {
    const resolved = await resolveSecretValue(candidate);
    if (resolved) return resolved;
  }
  return '';
}

async function getGeminiClient(env: WorkerEnv): Promise<GoogleGenAI> {
  const apiKey = await resolveGeminiApiKey(env);
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in Cloudflare Workers > Settings > Variables & Secrets (or Settings > Secrets) and redeploy.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getErrorStatusAndMessage(err: unknown): { status: number; message: string } {
  let rawMessage = err instanceof Error ? err.message : String(err || 'Unknown server error');
  let parsedCode: number | undefined;

  try {
    const maybeJson = JSON.parse(rawMessage);
    if (maybeJson?.error?.message) {
      rawMessage = String(maybeJson.error.message);
    }
    if (typeof maybeJson?.error?.code === 'number') {
      parsedCode = maybeJson.error.code;
    }
  } catch {
    // rawMessage is plain text
  }

  const lower = rawMessage.toLowerCase();

  if (lower.includes('api key') || lower.includes('api_key_invalid') || lower.includes('not configured')) {
    return {
      status: 400,
      message: rawMessage.includes('Cloudflare Worker')
        ? rawMessage
        : 'Gemini API key is missing or invalid. Please check GEMINI_API_KEY in your deployment environment secrets.',
    };
  }
  if (lower.includes('permission_denied') || parsedCode === 403) {
    return {
      status: 403,
      message: 'Permission denied by Gemini API. Please check your GEMINI_API_KEY secret.',
    };
  }
  if (lower.includes('resource_exhausted') || parsedCode === 429 || lower.includes('quota')) {
    const retryMatch = rawMessage.match(/retry in\s+([\d.]+s)/i);
    const retryHint = retryMatch
      ? ` Retry in ~${retryMatch[1]}.`
      : ' Please wait a moment and try again, or check your Gemini quota.';
    return {
      status: 429,
      message: `Gemini API rate limit reached.${retryHint}`,
    };
  }
  if (parsedCode === 503 || lower.includes('high demand') || lower.includes('unavailable')) {
    return {
      status: 503,
      message: 'The AI service is temporarily experiencing high demand. Please try again in a few seconds.',
    };
  }
  if (lower.includes('payload too large') || lower.includes('entity too large')) {
    return {
      status: 413,
      message: 'Uploaded images are too large. Try fewer or smaller images.',
    };
  }
  return {
    status: 502,
    message: rawMessage || 'Could not reach Gemini AI service.',
  };
}

const SYSTEM_INSTRUCTION = `You are ENJ Digital AI, the fast upload assistant for ENJ Digital Concept (Maiduguri, Nigeria).
Convert the conversation, admin text, WhatsApp chats, receipts, or photos into a structured draft for:
1. "review": quote, author, role, highlight (boolean).
   - IMPORTANT: Whenever actionType="review", ALWAYS write a complete, authentic 1-3 sentence client testimonial in "quote" in the client's first-person voice based on everything discussed in the chat conversation, pasted screenshots, or audio! Never leave "quote" blank, even if the admin only summarized the client's feedback or asked you to draft it from the chat.
   - Use any existing currentDraft values unless the admin asks to change them.
2. "portfolio": title, client (default "Client Project"), category (strictly one of ${PORTFOLIO_CATEGORY_LIST.map((c) => `"${c}"`).join(', ')}), year (default "${new Date().getFullYear()}"), description (2 concise sentences), services (2-4 tags), impact (1 sentence), featured (boolean). Never invent image URLs; uploaded photos attach on the frontend. If portfolio has 0 uploaded photos yet, set readyToPublish=false and ask for at least 1 photo.
3. "order": customerName, customerPhone (default "Not provided"), customerEmail, customerAddress, itemsSummary, totalAmount (NGN number, e.g. "85k"->85000, "1.2m"->1200000), status ("pending"|"processing"|"completed"|"cancelled"), paymentStatus ("paid"|"pending"|"failed"), paymentMethod, notes.

Rules:
- Read the full conversation history, currentDraft, attached images, and audio carefully.
- Use actionType="none" for greetings or general chat when no draft was requested yet; reply warmly in 1-2 short sentences.
- Always provide a non-empty natural "reply" (1-2 short sentences).
- Set readyToPublish=true when required core fields are ready.
- Output strictly valid JSON matching the schema.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    actionType: {
      type: Type.STRING,
      description: 'Must be one of: "review", "portfolio", "order", or "none".',
    },
    reply: {
      type: Type.STRING,
      description: 'Concise assistant response shown in the chat bubble (1-3 sentences).',
    },
    readyToPublish: {
      type: Type.BOOLEAN,
      description: 'True when the draft has all required fields and images ready to publish.',
    },
    draftReview: {
      type: Type.OBJECT,
      properties: {
        quote: {
          type: Type.STRING,
          description:
            'Required non-empty 1-3 sentence first-person client testimonial quote drafted from the chat context or screenshots. Never return empty string.',
        },
        author: { type: Type.STRING },
        role: { type: Type.STRING },
        highlight: { type: Type.BOOLEAN },
      },
      required: ['quote', 'author', 'role', 'highlight'],
    },
    draftPortfolio: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        client: { type: Type.STRING },
        category: {
          type: Type.STRING,
          description: `Must be one of: ${PORTFOLIO_CATEGORY_LIST.join(', ')}`,
        },
        year: { type: Type.STRING },
        description: { type: Type.STRING },
        services: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        impact: { type: Type.STRING },
        featured: { type: Type.BOOLEAN },
      },
      required: ['title', 'client', 'category', 'description'],
    },
    draftOrder: {
      type: Type.OBJECT,
      properties: {
        customerName: { type: Type.STRING },
        customerPhone: { type: Type.STRING },
        customerEmail: { type: Type.STRING },
        customerAddress: { type: Type.STRING },
        itemsSummary: { type: Type.STRING },
        totalAmount: { type: Type.NUMBER },
        status: {
          type: Type.STRING,
          description: 'One of: pending, processing, completed, cancelled',
        },
        paymentStatus: {
          type: Type.STRING,
          description: 'One of: paid, pending, failed',
        },
        paymentMethod: { type: Type.STRING },
        notes: { type: Type.STRING },
      },
      required: ['customerName', 'itemsSummary', 'totalAmount', 'status', 'paymentStatus'],
    },
  },
  required: ['actionType', 'reply', 'readyToPublish'],
};

function isFallbackableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('503') ||
    msg.includes('500') ||
    msg.includes('unavailable') ||
    msg.includes('timeout') ||
    msg.includes('404') ||
    msg.includes('not_found')
  );
}

async function callGeminiWithRetry(ai: GoogleGenAI, parts: Array<Record<string, unknown>>) {
  const candidates: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
  ];
  let lastError: unknown;

  for (const { model, thinkingLevel } of candidates) {
    try {
      return await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel,
          },
        },
      });
    } catch (err) {
      lastError = err;
      if (!isFallbackableError(err)) {
        throw err;
      }
    }
  }
  throw lastError;
}

async function handleContact(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: unknown;
      email?: unknown;
      service?: unknown;
      message?: unknown;
      _gotcha?: unknown;
    };

    if (typeof body._gotcha === 'string' && body._gotcha.trim().length > 0) {
      return jsonResponse({ ok: true, recipient: CONTACT_RECIPIENT });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const service =
      typeof body.service === 'string' && body.service.trim()
        ? body.service.trim().slice(0, 120)
        : 'General Enquiry';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!name || !email || !message) {
      return jsonResponse({ ok: false, error: 'Please provide your name, email address, and message.' }, 400);
    }

    if (name.length > 120 || email.length > 160 || message.length > 5000) {
      return jsonResponse({ ok: false, error: 'One or more fields exceed the allowed character limit.' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse({ ok: false, error: 'Please enter a valid email address.' }, 400);
    }

    const escapeHtml = (input: string) =>
      input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const subject = `New Website Enquiry from ${name} — ${service}`;
    const textBody = [
      `New direct message from ENJ Digital Concept website`,
      ``,
      `Name: ${name}`,
      `Email: ${email}`,
      `Service / Enquiry: ${service}`,
      ``,
      `Message:`,
      message,
    ].join('\n');

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8f9fa; color: #1d1d1f;">
        <div style="background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #c95510;">
            ENJ Digital Concept · Website Enquiry
          </p>
          <h2 style="margin: 0 0 18px; font-size: 20px; color: #1d1d1f;">${escapeHtml(service)}</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 18px;">
            <tr>
              <td style="padding: 8px 0; color: #6e6e73; width: 110px;"><strong>Name</strong></td>
              <td style="padding: 8px 0; color: #1d1d1f;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6e6e73;"><strong>Email</strong></td>
              <td style="padding: 8px 0; color: #1d1d1f;"><a href="mailto:${escapeHtml(email)}" style="color: #c95510;">${escapeHtml(email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6e6e73;"><strong>Service</strong></td>
              <td style="padding: 8px 0; color: #1d1d1f;">${escapeHtml(service)}</td>
            </tr>
          </table>
          <div style="background: #f4f5f7; border-radius: 12px; padding: 14px 16px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #1d1d1f;">${escapeHtml(message)}</div>
        </div>
      </div>
    `;

    const resendKey = await resolveSecretValue(env.RESEND_API_KEY);
    if (resendKey) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.RESEND_FROM?.trim() || 'ENJ Digital Concept <onboarding@resend.dev>',
          to: [CONTACT_RECIPIENT],
          reply_to: email,
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });

      if (!resendRes.ok) {
        const errData = (await resendRes.json().catch(() => ({}))) as { message?: string };
        throw new Error(errData.message || `Resend failed with status ${resendRes.status}`);
      }

      return jsonResponse({ ok: true, provider: 'resend', recipient: CONTACT_RECIPIENT });
    }

    const originHeader = request.headers.get('origin') || '';
    const originCandidate =
      env.APP_URL?.trim() ||
      (originHeader.startsWith('http') ? originHeader : 'https://enjdigitalconcept.com');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const relayRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_RECIPIENT)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: originCandidate,
          Referer: `${originCandidate.replace(/\/$/, '')}/`,
          'User-Agent': 'ENJDigitalConcept/1.0',
        },
        body: JSON.stringify({
          name,
          email,
          service,
          message,
          _subject: subject,
          _replyto: email,
          _template: 'table',
          _captcha: 'false',
        }),
        signal: controller.signal,
      });

      const relayJson = (await relayRes.json().catch(() => ({}))) as {
        success?: boolean | string;
        message?: string;
      };

      const confirmed =
        relayRes.ok && (relayJson.success === true || relayJson.success === 'true');

      if (confirmed) {
        return jsonResponse({ ok: true, provider: 'formsubmit', recipient: CONTACT_RECIPIENT });
      }

      const relayMessage = String(relayJson.message || '');
      const needsActivation = /activat/i.test(relayMessage);

      return jsonResponse(
        {
          ok: false,
          needsActivation,
          error: needsActivation
            ? 'FormSubmit sent a one-time activation email to enjdigitalconcept@gmail.com. Open that email once and click "Activate Form" (or add RESEND_API_KEY in Worker secrets) for automatic delivery. You can send immediately via Gmail or Mail App below.'
            : relayMessage || 'Email relay did not confirm delivery. Please use Gmail or Mail App below.',
        },
        needsActivation ? 409 : 502
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: 'Could not reach the automated mail service right now. Please send directly via Gmail, Mail App, or WhatsApp below.',
      },
      502
    );
  }
}

async function handleTranscribe(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as { mimeType?: string; data?: string };
    const data = typeof body.data === 'string' ? body.data.trim() : '';
    const rawMime = typeof body.mimeType === 'string' ? body.mimeType : 'audio/webm';
    const mimeType = rawMime.split(';')[0].trim() || 'audio/webm';

    if (!data) {
      return jsonResponse({ error: 'No audio data received for transcription.' }, 400);
    }

    const ai = await getGeminiClient(env);
    const transcribeModels = ['gemini-3.5-transcribe', 'gemini-3.1-flash-lite'] as const;
    let lastError: unknown;
    let responseText = '';

    for (const model of transcribeModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data,
                },
              },
              {
                text: 'Transcribe this audio accurately into clean, properly punctuated text. Output only the spoken words without timestamps, speaker labels, or extra commentary.',
              },
            ],
          },
        });
        const candidate = (response.text || '').trim();
        if (candidate) {
          responseText = candidate;
          lastError = undefined;
          break;
        }
      } catch (err) {
        lastError = err;
        if (!isFallbackableError(err)) {
          throw err;
        }
      }
    }

    if (lastError && !responseText) {
      throw lastError;
    }

    return jsonResponse({ text: responseText });
  } catch (err) {
    const { status, message } = getErrorStatusAndMessage(err);
    return jsonResponse({ error: message }, status);
  }
}

async function handleAiAssist(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as AiAssistRequestBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const images = Array.isArray(body.images) ? body.images : [];
    const audioClips = Array.isArray(body.audioClips) ? body.audioClips : [];
    const history = Array.isArray(body.history) ? body.history.slice(-16) : [];
    const existingImageCount =
      typeof body.existingImageCount === 'number' ? body.existingImageCount : images.length;
    const currentDraft =
      body.currentDraft && typeof body.currentDraft === 'object' ? body.currentDraft : null;

    if (!message && images.length === 0 && audioClips.length === 0) {
      return jsonResponse(
        { error: 'Please enter a description or upload an image or voice recording.' },
        400
      );
    }

    const ai = await getGeminiClient(env);
    const parts: Array<Record<string, unknown>> = [];

    for (const img of images.slice(0, 6)) {
      if (img && typeof img.data === 'string' && img.data.length > 0) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.data,
          },
        });
      }
    }

    for (const clip of audioClips.slice(0, 2)) {
      if (clip && typeof clip.data === 'string' && clip.data.length > 0) {
        parts.push({
          inlineData: {
            mimeType: clip.mimeType || 'audio/webm',
            data: clip.data,
          },
        });
      }
    }

    const historyText =
      history.length > 0
        ? history
            .map((h) => `${h.role === 'user' ? 'Admin' : 'AI'}: ${h.text}`)
            .join('\n')
        : 'None';

    const contextPrompt = [
      `Photos in session: ${Math.max(existingImageCount, images.length)} (new: ${images.length}, audio: ${audioClips.length})`,
      history.length > 0 ? `Conversation:\n${historyText}` : '',
      currentDraft ? `Current draft:\n${JSON.stringify(currentDraft)}` : '',
      `Latest message: ${message || '(Analyze attached media and extract draft)'}`,
    ]
      .filter(Boolean)
      .join('\n');

    parts.push({ text: contextPrompt });

    const response = await callGeminiWithRetry(ai, parts);
    const rawText = (response.text || '').trim();
    if (!rawText) {
      return jsonResponse(
        { error: 'AI returned an empty response. Please try again with a bit more detail.' },
        502
      );
    }

    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
      parsed.reply =
        parsed.actionType && parsed.actionType !== 'none'
          ? 'Draft ready below.'
          : 'Hi! Send text, photos, or voice to create a portfolio post, review, or order.';
    }
    return jsonResponse(parsed);
  } catch (err) {
    const { status, message } = getErrorStatusAndMessage(err);
    return jsonResponse({ error: message }, status);
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return jsonResponse({ ok: true });
      }
      if (url.pathname === '/api/contact' && request.method === 'POST') {
        return handleContact(request, env);
      }
      if (url.pathname === '/api/admin/transcribe' && request.method === 'POST') {
        return handleTranscribe(request, env);
      }
      if (url.pathname === '/api/admin/ai-assist' && request.method === 'POST') {
        return handleAiAssist(request, env);
      }
      return jsonResponse({ error: `Unsupported route or method: ${request.method} ${url.pathname}` }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
