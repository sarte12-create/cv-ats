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

    // ==========================================
    // GOOGLE CLOUD TTS ENGINE (Studio/Wavenet)
    // ==========================================
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ar-XA', name: 'ar-XA-Wavenet-B' },
        audioConfig: { audioEncoding: 'MP3' }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: `Google TTS Error: ${errData?.error?.message || errData?.error?.status || response.statusText}` });
    }

    const data = await response.json();
    if (!data.audioContent) {
       return res.status(500).json({ error: 'No audio content returned from Google' });
    }
    
    const arrayBuffer = Buffer.from(data.audioContent, 'base64');
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(arrayBuffer);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
