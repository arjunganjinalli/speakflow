// Vercel Serverless Function — proxies requests to GLM API (api.z.ai)
// Server-to-server = ZERO CORS issues.
// Place this file at:  api/chat.js  (relative to your project root)

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { apiKey, model, messages, temperature, max_tokens } = req.body;

        // Validate
        if (!apiKey || typeof apiKey !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid apiKey' });
        }
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Missing messages array' });
        }

        // Forward to GLM API (server-to-server, no CORS)
        const apiResponse = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: model || 'glm-4-flash',
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
            console.error('GLM API error:', apiResponse.status, errMsg);
            return res.status(apiResponse.status >= 500 ? 502 : apiResponse.status)
                .json({ error: errMsg });
        }

        const content = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

        if (!content) {
            return res.status(502).json({ error: 'Empty response from GLM API' });
        }

        // Return plain text — the frontend reads it directly
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(content);

    } catch (err) {
        console.error('Proxy error:', err);
        return res.status(500).json({ error: 'Proxy error: ' + err.message });
    }
}
