export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  try {
    // ==========================================
    // 100% FREE GOOGLE TRANSLATE TTS ENGINE
    // ==========================================
    // No API Keys, No Billing, No limits for short phrases!
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Google Free TTS Error: ${response.statusText}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(buffer);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
