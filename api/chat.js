export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { apiKey, model, messages, temperature, max_tokens } = req.body;
        if (!apiKey || !messages) return res.status(400).json({ error: 'Missing apiKey or messages' });
        const apiResponse = await fetch('https://api.z.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({ model: model || 'glm-4-flash', messages, temperature: temperature ?? 0.3, max_tokens: max_tokens || 800 })
        });
        const data = await apiResponse.json();
        if (!apiResponse.ok) {
            const errMsg = data?.error?.message || data?.message || ('API error ' + apiResponse.status);
            return res.status(apiResponse.status >= 500 ? 502 : apiResponse.status).json({ error: errMsg });
        }
        const content = data?.choices?.[0]?.message?.content || '';
        if (!content) return res.status(502).json({ error: 'Empty response' });
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(content);
    } catch (err) {
        return res.status(500).json({ error: 'Proxy error: ' + err.message });
    }
}
