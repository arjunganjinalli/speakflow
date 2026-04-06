// ═══════════════════════════════════════════════════════════════
// Vercel Serverless Function — Universal AI API Proxy
// ═══════════════════════════════════════════════════════════════
//
// FORWARDS requests from your frontend to any OpenAI-compatible
// AI provider. Server-to-server = ZERO CORS issues.
//
// Place this file at:  api/chat.js  (relative to your project root)
//
// TO SWITCH PROVIDERS — just change API_URL below:
//
//   GLM (z.ai):    https://api.z.ai/api/paas/v4/chat/completions
//   OpenAI:        https://api.openai.com/v1/chat/completions
//   Groq:          https://api.groq.com/openai/v1/chat/completions
//   DeepSeek:      https://api.deepseek.com/v1/chat/completions
//   Together AI:   https://api.together.xyz/v1/chat/completions
//
// The frontend sends standard OpenAI-compatible format:
//   POST /api/chat
//   Authorization: Bearer <your-api-key>
//   Body: { model, messages, temperature, max_tokens }
//
// ═══════════════════════════════════════════════════════════════

const API_URL = 'https://api.z.ai/api/paas/v4/chat/completions';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { model, messages, temperature, max_tokens } = req.body;
        const authHeader = req.headers['authorization'] || '';
        const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

        // Validate
        if (!apiKey) {
            return res.status(400).json({ error: 'Missing Authorization header. Send: Authorization: Bearer <your-api-key>' });
        }
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Missing messages array in request body' });
        }

        // Forward to AI provider (server-to-server, no CORS)
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: model || 'glm-4-air',
                messages: messages,
                temperature: temperature ?? 0.3,
                max_tokens: max_tokens || 800
            })
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            const errMsg = (data && data.error && data.error.message)
                || (data && data.message)
                || ('API returned status ' + apiResponse.status);
            console.error('API error:', apiResponse.status, errMsg);
            return res.status(apiResponse.status >= 500 ? 502 : apiResponse.status)
                .json({ error: errMsg });
        }

        const content = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

        if (!content) {
            return res.status(502).json({ error: 'Empty response from API' });
        }

        // Return plain text — the frontend reads it directly
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(content);

    } catch (err) {
        console.error('Proxy error:', err);
        return res.status(500).json({ error: 'Proxy error: ' + err.message });
    }
}
