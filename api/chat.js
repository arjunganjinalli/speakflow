// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // We NO LONGER take apiKey from req.body (Security fix!)
        const { messages, temperature, max_tokens } = req.body;

        // Get the key securely from Vercel Environment Variables
        const apiKey = process.env.GLM_API_KEY; 

        if (!apiKey) {
            return res.status(500).json({ error: 'API Key not configured in Vercel' });
        }

        // Forward to GLM API
        const apiResponse = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: 'glm-5-turbo', // Force the new model here
                messages: messages,
                temperature: temperature ?? 0.3,
                max_tokens: max_tokens || 800
            })
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            const errMsg = data?.error?.message || data?.message || 'API Error';
            return res.status(apiResponse.status).json({ error: errMsg });
        }

        const content = data?.choices?.[0]?.message?.content || '';
        
        // Return as plain text for your SpeakFlow frontend
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(content);

    } catch (err) {
        return res.status(500).json({ error: 'Proxy error: ' + err.message });
    }
}
