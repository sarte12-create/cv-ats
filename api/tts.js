export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, apiKey } = req.body;

  if (!text || !apiKey) {
    return res.status(400).json({ error: 'Missing text or API key' });
  }

  try {
    const key = apiKey.trim();

    // ==========================================
    // 1. OPENAI TTS ENGINE (sk-...)
    // ==========================================
    if (key.startsWith('sk-')) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'echo', // Echo is fantastic for Arabic
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
    }

    // ==========================================
    // 2. GOOGLE CLOUD TTS ENGINE (AIza...)
    // ==========================================
    else if (key.startsWith('AIza')) {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'ar-XA', name: 'ar-XA-Wavenet-B' }, // Wavenet B is a great professional voice
          audioConfig: { audioEncoding: 'MP3' }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: `Google TTS Error: ${errData?.error?.message || response.statusText}` });
      }

      const data = await response.json();
      if (!data.audioContent) {
         return res.status(500).json({ error: 'No audio content returned from Google' });
      }
      
      const buffer = Buffer.from(data.audioContent, 'base64');
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(buffer);
    }

    // ==========================================
    // 3. ELEVENLABS ENGINE (sk_...)
    // ==========================================
    else {
      const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": key
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: `ElevenLabs Error: ${errData?.detail?.message || errData?.detail?.status || response.statusText}` });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(buffer);
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
