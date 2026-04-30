export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, apiKey } = req.body;

  if (!text || !apiKey) {
    return res.status(400).json({ error: 'Missing text or API key' });
  }

  function createWavHeader(dataSize, sampleRate) {
    const buffer = Buffer.alloc(44);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); 
    buffer.writeUInt16LE(1, 20); 
    buffer.writeUInt16LE(1, 22); 
    buffer.writeUInt32LE(sampleRate, 24); 
    buffer.writeUInt32LE(sampleRate * 2, 28); 
    buffer.writeUInt16LE(2, 32); 
    buffer.writeUInt16LE(16, 34); 
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    return buffer;
  }

  try {
    const key = apiKey.trim();
    
    // ==========================================
    // GEMINI 3.1 FLASH TTS ENGINE (HUMAN VOICES)
    // ==========================================
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: text }]
          }
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Fenrir" // Fantastic deep professional voice
              }
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: `Gemini TTS Error: ${errData?.error?.message || response.statusText}` });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    
    // Find the inlineData part
    let base64Data = null;
    let mimeType = null;
    
    for (const part of parts) {
      if (part.inlineData) {
        base64Data = part.inlineData.data;
        mimeType = part.inlineData.mimeType;
        break;
      }
    }

    if (!base64Data) {
       return res.status(500).json({ error: 'No audio returned from Gemini. Ensure the model supports TTS.' });
    }
    
    const audioBuffer = Buffer.from(base64Data, 'base64');
    let finalBuffer = audioBuffer;

    // Inject WAV header if it's raw PCM
    if (mimeType && mimeType.includes('audio/pcm')) {
        let sampleRate = 24000; // default for gemini
        const match = mimeType.match(/rate=(\d+)/);
        if (match) sampleRate = parseInt(match[1]);
        
        const wavHeader = createWavHeader(audioBuffer.length, sampleRate);
        finalBuffer = Buffer.concat([wavHeader, audioBuffer]);
    }

    res.setHeader('Content-Type', 'audio/wav');
    return res.send(finalBuffer);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
