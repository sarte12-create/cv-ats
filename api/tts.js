export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, apiKey } = req.body;

  if (!text || !apiKey) {
    return res.status(400).json({ error: 'Missing text or API key' });
  }

  try {
    let key = apiKey.trim();
    if (key.startsWith('"') && key.endsWith('"')) {
      key = key.slice(1, -1);
    }

    if (!key.startsWith('sk-')) {
        return res.status(400).json({ error: 'عذراً، يجب استخدام مفتاح OpenAI (يبدأ بـ sk-) لأن جوجل ترفض المفاتيح العادية وتحتاج إلى ملف Service Account معقد.' });
    }

    // ==========================================
    // OPENAI TTS ENGINE (Echo)
    // ==========================================
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: 'echo', 
        input: text
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: `OpenAI Error: ${errData?.error?.message || response.statusText}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(buffer);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
