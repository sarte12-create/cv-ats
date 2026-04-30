import React, { useState, useRef, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './index.css';

// Initialize Gemini with Fallback Logic
const apiKeysStr = import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY;
const API_KEYS = apiKeysStr ? apiKeysStr.split(',') : [];

// Helper function to execute Gemini requests with fallback rotation
const executeWithFallback = async (promptMsg) => {
  if (API_KEYS.length === 0) throw new Error("لم يتم العثور على أي مفاتيح Gemini في البيئة.");
  
  let lastError;
  for (let i = 0; i < API_KEYS.length; i++) {
    try {
      const genAI = new GoogleGenerativeAI(API_KEYS[i].trim());
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const result = await model.generateContent(promptMsg);
      return result; // Success! Return immediately.
    } catch (e) {
      console.warn(`المفتاح رقم ${i + 1} فشل (ربما الليمت). ننتقل للمفتاح التالي...`, e.message);
      lastError = e;
    }
  }
  // If it loops through ALL keys and still fails:
  throw new Error("جميع المفاتيح استنفذت الليمت أو غير صالحة. يرجى الانتظار قليلاً أو إضافة مفاتيح جديدة. الخطأ الأخير: " + lastError.message);
};

export default function App() {
  const [appMode, setAppMode] = useState("carousel"); // 'carousel' or 'video'
  const [activeTemplate, setActiveTemplate] = useState([]);
  const [suggestedIdeas, setSuggestedIdeas] = useState([]);
  const [customIdea, setCustomIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [activeTheme, setActiveTheme] = useState("theme-neon");
  const [postCaption, setPostCaption] = useState("");
  const [slideCount, setSlideCount] = useState(5);
  const slideRefs = useRef([]);

  // Video Factory States
  const [videoTopic, setVideoTopic] = useState("");
  const [videoScript, setVideoScript] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [elevenLabsKey, setElevenLabsKey] = useState("sk_23c080cb002d212b2a8ec0db6823dc559c8df61e49dacd53");
  const audioRef = useRef(null);

  // Fetch 3 creative ideas on mount
  useEffect(() => {
    fetchAIideas();
  }, []);

  const fetchAIideas = async () => {
    setLoading(true);
    setLoadingMsg("جاري ابتكار 3 أفكار فيروسية (Viral) لليوم...");
    try {
      const prompt = `أنت خبير محتوى تيك توك في السعودية متخصص بالتوظيف والسير الذاتية (ATS). 
      أعطني 3 أفكار (منشور كاروسيل صور) مختلفة وجذابة جداً (Clickbait).
      
      يجب أن ترد بمصفوفة JSON فقط بالشكل التالي، ولا تكتب أي كلام آخر قبله ولا تضع علامات formatting (بدون \`\`\`json):
      [
        {"title": "عنوان قصير جذاب", "description": "وصف الفكرة"}
      ]`;
      
      const result = await executeWithFallback(prompt);
      const rawText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
      const res = JSON.parse(rawText);
      setSuggestedIdeas(res);
    } catch (e) {
      console.error(e);
      alert("الخطأ من Gemini: " + e.message);
    }
    setLoading(false);
  };

  const generateCarousel = async (topic) => {
    setLoading(true);
    setLoadingMsg("جاري كتابة وتصميم الكاروسيل بالذكاء الاصطناعي...");
    try {
      const prompt = `أنت صانع محتوى لمنصة تيك توك في السعودية.
      موضوع الكاروسيل هو: "${topic}"
      اكتب بالضبط (${slideCount}) شرائح باللغة العربية (لهجة بيضاء احترافية).
      - شريحة 1: خطاف قوي.
      - المقاطع الوسطى: اسرد المحتوى القيم المرتبط بالموضوع بشكل تسلسلي ومترابط (التركيز على موضوع البوست نفسه وحلوله وميزاته، لا تحصره فقط بأخطاء الـ ATS إلا إذا كان الموضوع يتطلب ذلك صراحة).
      - الشريحة الأخيرة: الحل والخاتمة (دعوة للمشاهدين للتواصل معك شخصياً عبر رسائل الخاص أو زيارة الرابط في البايو لطلب خدمة تصميم سيرة ذاتية مميزة وضبط اللينكد إن الخاص بهم).
      مهم: يمكنك وضع الايموجي بشكل طبيعي. استخدم <span class='highlight'>الأرقام والكلمات المهمة</span> في العنوان للإضاءة.
      
      يجب أن ترد بمصفوفة JSON فقط بالشكل التالي تماماً، ولا تكتب أي شيء آخر ولا تضع علامات formatting:
      {
        "caption": "اكتب الكابشن الجذاب الذي سيوضع في تيك توك تحت الفديو واضف الهاشتاجات المناسبة",
        "slides": [
          {"title": "عنوان الشريحة", "subtitle": "فرعي", "text": "نص الشريحة"}
        ]
      }`;
      
      const result = await executeWithFallback(prompt);
      const rawText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
      const res = JSON.parse(rawText);
      setActiveTemplate(res.slides);
      setPostCaption(res.caption || "");
    } catch (e) {
      console.error(e);
      alert("الخطأ من Gemini في تصميم الشريحة: " + e.message);
    }
    setLoading(false);
  };

  const generateVideoScript = async () => {
    if (!videoTopic) return;
    setLoading(true);
    setLoadingMsg("جاري كتابة السكربت السينمائي والخطاف بالذكاء الاصطناعي...");
    try {
      const prompt = `أنت صانع محتوى Reels/TikTok خبير وخطير. الموضوع: "${videoTopic}". 
      اكتب سكربت فيديو قصير جداً (سريع الإيقاع) لمقدم خدمات كتابة السيرة الذاتية (CV/ATS).
      رد بمصفوفة JSON فقط تحوي السطور مقسمة بوضوح بالشكل التالي تماماً:
      {
        "lines": [
          "الجملة الأولى الخطاف المثير (مثلاً: سر محد يعرفه عن التوظيف!)",
          "الجملة الثانية (معلومة صادمة)",
          "الجملة الثالثة (الحل السريع)",
          "الجملة الأخيرة الدعوة لاتخاذ إجراء (كلمني أضبط سيرتك)"
        ]
      }`;
      const result = await executeWithFallback(prompt);
      const rawText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
      const res = JSON.parse(rawText);
      setVideoScript(res.lines);
    } catch (e) {
      console.error(e);
      alert("الخطأ من Gemini في السيناريو: " + e.message);
    }
    setLoading(false);
  };

  const fetchElevenLabsAudio = async (text, apiKey) => {
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey
        },
        body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
    });
    if (!response.ok) throw new Error("فشل توليد الصوت، تأكد من صحة مفتاح ElevenLabs الخاص بك.");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  const playVideo = async () => {
    if (!videoScript || videoScript.length === 0) return;
    if (!elevenLabsKey) { alert("يجب إدخال مفتاح ElevenLabs أولاً!"); return; }

    if (audioRef.current) {
        audioRef.current.pause();
    }
    
    setLoadingMsg("جاري توليد الصوت البشري (ElevenLabs)...");
    setLoading(true);
    
    try {
        const audioUrls = [];
        for (let i = 0; i < videoScript.length; i++) {
             const url = await fetchElevenLabsAudio(videoScript[i], elevenLabsKey);
             audioUrls.push(url);
        }
        setLoading(false);
        setIsPlaying(true);
        setCurrentLine(0);
        
        const playNext = (index) => {
            if (index >= audioUrls.length) {
                setIsPlaying(false);
                return;
            }
            setCurrentLine(index);
            const audio = new Audio(audioUrls[index]);
            audioRef.current = audio;
            audio.onended = () => playNext(index + 1);
            audio.play();
        }
        playNext(0);
        
    } catch(e) {
        setLoading(false);
        setIsPlaying(false);
        alert(e.message);
    }
  };

  const stopVideo = () => {
    if (audioRef.current) {
        audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const updateSlide = (index, field, value) => {
    const newSlides = [...activeTemplate];
    newSlides[index][field] = value;
    setActiveTemplate(newSlides);
  };

  const handleDownloadAll = async () => {
    if (slideRefs.current.length === 0) return;
    
    // Note: Mobile browsers often block multiple programmatic downloads in a single click. 
    // Best effort loop:
    for (let i = 0; i < activeTemplate.length; i++) {
        await handleDownloadSingle(i);
        await new Promise(r => setTimeout(r, 600));
    }
  };

  const handleDownloadSingle = async (index) => {
    const el = slideRefs.current[index];
    if (el) {
      try {
        const dataUrl = await htmlToImage.toPng(el, { 
          quality: 1, 
          pixelRatio: 2,
          cacheBust: true,
          style: { transform: 'scale(1)', transformOrigin: 'top left' } // force clean scale
        });
        
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `slide-${index + 1}.png`;
        a.click();
      } catch (error) {
        console.error("Error generating image", error);
      }
    }
  };

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR: CONTROLS */}
      <div className="sidebar" style={{ width: '450px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ color: 'var(--primary-color)' }}>مصنع محتوى @seartk3 🏭</h2>
        </div>
        
        {/* APP MODE TOGGLE */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(0,0,0,0.3)', padding: '5px', borderRadius: '12px' }}>
          <button 
            onClick={() => setAppMode('carousel')} 
            style={{ flex: 1, padding: '10px', background: appMode === 'carousel' ? 'var(--primary-color)' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >📸 مصنع الكاروسيل</button>
          <button 
            onClick={() => setAppMode('video')} 
            style={{ flex: 1, padding: '10px', background: appMode === 'video' ? '#e92a67' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >🎬 فيديو Reels</button>
        </div>

        {appMode === 'carousel' ? (
          <>
            <p style={{ marginBottom: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              يولد لك Gemini الأفكار والنصوص تلقائياً لخدماتك الاحترافية الحقيقية التي تقدمها بيدك.
            </p>

            {/* THEME PICKER */}
            <div className="glass-panel" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '10px', color: 'white', fontSize: '14px' }}>🎨 اختر الثيم (القالب البصري)</h3>
              <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}>محاكاة منصات واقعية 100% (نفس اللينكد إن بالضبط)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={() => setActiveTheme('theme-linkedin-real')}
                  style={{ padding: '10px', fontSize: '14px', background: activeTheme === 'theme-linkedin-real' ? '#1d2226' : 'rgba(0,0,0,0.4)', border: '1px solid #70b5f9', color: '#70b5f9', fontWeight: 'bold' }}
                >💼 قالب موقع LinkedIn الواقعي (Dark Mode)</button>
              </div>

              <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}>الكلاسيكي المربع (1080x1080)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={() => setActiveTheme('theme-neon')}
                  style={{ padding: '8px', fontSize: '11px', background: activeTheme === 'theme-neon' ? 'linear-gradient(135deg, #38bdf8, #818cf8)' : 'rgba(0,0,0,0.4)', border: '1px solid #38bdf8' }}
                >النيون الأزرق</button>
                <button 
                  onClick={() => setActiveTheme('theme-gold')}
                  style={{ padding: '8px', fontSize: '11px', background: activeTheme === 'theme-gold' ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'rgba(0,0,0,0.4)', border: '1px solid #fbbf24' }}
                >الملكي الذهبي</button>
                <button 
                  onClick={() => setActiveTheme('theme-purple')}
                  style={{ padding: '8px', fontSize: '11px', background: activeTheme === 'theme-purple' ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'rgba(0,0,0,0.4)', border: '1px solid #a855f7' }}
                >أرجواني سري</button>
              </div>

              <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}>التصميم الطولي (1080x1350)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={() => setActiveTheme('theme-emerald-portrait')}
                  style={{ padding: '8px', fontSize: '11px', background: activeTheme === 'theme-emerald-portrait' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(0,0,0,0.4)', border: '1px solid #10b981' }}
                >الزمردي الكلاسيكي</button>
                <button 
                  onClick={() => setActiveTheme('theme-crimson-portrait')}
                  style={{ padding: '8px', fontSize: '11px', background: activeTheme === 'theme-crimson-portrait' ? 'linear-gradient(135deg, #f43f5e, #be123c)' : 'rgba(0,0,0,0.4)', border: '1px solid #f43f5e' }}
                >القرمزي الطولي</button>
              </div>
                
              <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}>قوالب الموك-أب (شكل فوتوشوب حقيقي)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <button 
                  onClick={() => setActiveTheme('theme-visual-browser-light')}
                  style={{ padding: '8px', fontSize: '11px', background: activeTheme === 'theme-visual-browser-light' ? 'linear-gradient(135deg, #e879f9, #c026d3)' : 'rgba(0,0,0,0.4)', border: '1px solid #e879f9' }}
                >💻 متصفح (نهاري)</button>
                <button 
                  onClick={() => setActiveTheme('theme-visual-browser-dark')}
                  style={{ padding: '8px', fontSize: '11px', background: activeTheme === 'theme-visual-browser-dark' ? 'linear-gradient(135deg, #e879f9, #c026d3)' : 'rgba(0,0,0,0.4)', border: '1px solid #e879f9' }}
                >💻 متصفح (ليلي)</button>
                <button 
                  onClick={() => setActiveTheme('theme-social-post-light')}
                  style={{ padding: '8px', fontSize: '11px', background: activeTheme === 'theme-social-post-light' ? 'linear-gradient(135deg, #60a5fa, #2563eb)' : 'rgba(0,0,0,0.4)', border: '1px solid #60a5fa' }}
                >📱 تغريدة خبير (نهاري)</button>
                <button 
                  onClick={() => setActiveTheme('theme-social-post-dark')}
                  style={{ padding: '8px', fontSize: '11px', background: activeTheme === 'theme-social-post-dark' ? 'linear-gradient(135deg, #60a5fa, #2563eb)' : 'rgba(0,0,0,0.4)', border: '1px solid #60a5fa' }}
                >📱 تغريدة خبير (ليلي)</button>
              </div>
            </div>

            {/* AI GENERATION SECTION */}
            <div className="glass-panel" style={{ marginBottom: '20px', border: '1px solid var(--primary-color)' }}>
              <h3 style={{ marginBottom: '15px', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                <span>🧠 عقل الـ AI الذكي</span>
                <button onClick={fetchAIideas} disabled={loading} style={{ width: 'auto', padding: '5px 15px', fontSize: '12px' }}>🔄 تجديد</button>
              </h3>
              
              {loading && <div style={{ color: 'var(--accent-color)', marginBottom: '15px' }}>⏳ {loadingMsg}</div>}

              {!loading && suggestedIdeas.map((idea, idx) => (
                <div key={idx} style={{ marginBottom: '10px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--secondary-color)', marginBottom: '5px' }}>{idea.title}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>{idea.description}</div>
                  <button className="secondary" onClick={() => generateCarousel(idea.title)} style={{ padding: '8px', fontSize: '13px', marginTop: '0', flex: 1 }}>✨ صمم هذا الكاروسيل</button>
                </div>
              ))}

              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '15px 0' }} />
              
              <div className="input-group" style={{ marginBottom: '10px' }}>
                <label>أو اكتب فكرتك الخاصة (Custom Idea)</label>
                <input type="text" placeholder="مثال: كيف تصمم سيرة إذا ما عندك خبرة..." value={customIdea} onChange={(e) => setCustomIdea(e.target.value)} />
              </div>

              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label>عدد شرائح الكاروسيل</label>
                <input type="number" min="3" max="10" value={slideCount} onChange={(e) => setSlideCount(parseInt(e.target.value) || 5)} style={{ width: '100px' }} />
              </div>

              <button onClick={() => generateCarousel(customIdea)} disabled={!customIdea || loading}>🚀 توليد الكاروسيل</button>
            </div>

            {/* EDITOR SECTION */}
            {activeTemplate.map((slide, index) => (
              <div key={index} className="glass-panel" style={{ marginBottom: '15px' }}>
                <div className="slide-label" style={{ color: 'var(--accent-color)' }}>تعديل الشريحة {index + 1}</div>
                <div className="input-group">
                  <label>العنوان الرئيسي</label>
                  <input type="text" value={slide.title || ""} onChange={(e) => updateSlide(index, 'title', e.target.value)} />
                </div>
                <div className="input-group">
                  <label>العنوان الفرعي</label>
                  <input type="text" value={slide.subtitle || ""} onChange={(e) => updateSlide(index, 'subtitle', e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>النص (المحتوى)</label>
                  <textarea value={slide.text || ""} onChange={(e) => updateSlide(index, 'text', e.target.value)} />
                </div>
              </div>
            ))}
            
            {activeTemplate.length > 0 && (
              <>
                <div className="glass-panel" style={{ marginBottom: '15px', border: '1px solid var(--primary-color)' }}>
                  <label style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>✍️ كابشن التيك توك (جاهز للنسخ):</label>
                  <textarea value={postCaption} onChange={(e) => setPostCaption(e.target.value)} style={{ height: '120px', background: 'rgba(0,0,0,0.5)', marginTop: '10px' }} />
                </div>
                <button onClick={handleDownloadAll} style={{ margin: '20px 0', fontSize: '18px', background: 'var(--accent-color)' }}>📸 تحميل وحفظ الكاروسيل</button>
              </>
            )}
          </>
        ) : (
          /* VIDEO MODE SIDEBAR */
          <div className="glass-panel" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '10px', color: 'white' }}>🎥 صانع الفيديوهات القصيرة</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '15px' }}>اكتب فكرة وسيقوم الذكاء الاصطناعي ببناء خطاف وسكربت، ثم سيقرأه النظام بصوت ذكي!</p>
            <input type="text" value={videoTopic} onChange={(e) => setVideoTopic(e.target.value)} placeholder="مثال: كيف تتجاوز نظام الفرز الآلي في يومين..." className="glass-input" />
            <button className="glass-button" onClick={generateVideoScript} disabled={loading} style={{ background: 'linear-gradient(135deg, #e92a67, #be123c)' }}>✨ {loading ? "جاري التأليف..." : "توليد سكربت الفيديو"}</button>
            {videoScript && (
              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <h4 style={{ color: '#e92a67', marginBottom: '10px' }}>السكربت المولد:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {videoScript.map((line, i) => (
                    <input key={i} value={line} onChange={(e) => { const newScript = [...videoScript]; newScript[i] = e.target.value; setVideoScript(newScript); }} className="glass-input" style={{ padding: '8px', fontSize: '13px', borderLeft: `3px solid ${i === 0 ? '#10b981' : '#3b82f6'}` }} />
                  ))}
                </div>
                <div style={{ marginTop: '15px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>🔑 مفتاح ElevenLabs السري (صوت ذكي احترافي)</label>
                  <input type="password" value={elevenLabsKey} onChange={(e) => setElevenLabsKey(e.target.value)} className="glass-input" style={{ padding: '8px', fontSize: '12px' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button onClick={playVideo} disabled={isPlaying || loading} style={{ flex: 1, padding: '12px', background: isPlaying ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
                    {isPlaying ? "🎙️ قيد التشغيل..." : "▶️ تشغيل الصوت البشري"}
                  </button>
                  {isPlaying && <button onClick={stopVideo} style={{ padding: '12px', background: '#dc2626', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>⏹️ إيقاف</button>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PREVIEW AREA */}
      <div className="preview-area">
        {/* OVERLAY LOADER */}
        {loading && (
          <div className="loader-overlay">
            <div className="spinner"></div>
            <p>{loadingMsg}</p>
          </div>
        )}

        {appMode === 'carousel' ? (
          <>
            {activeTemplate.length === 0 && !loading && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '100px' }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎨</div>
                <h2>اللوحة فارغة</h2>
                <p>قم بتوليد الأفكار لتصميم الكاروسيل ({activeTheme})</p>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center' }}>
              {activeTemplate.map((slide, index) => {
                const isPortrait = activeTheme.includes('portrait');
                const isBrowserTheme = activeTheme.startsWith('theme-visual-browser');
                const isSocialTheme = activeTheme.startsWith('theme-social-post');
                
                const stats = {
                  likes: [12.4, 11.2, 9.8, 14.1, 10.5, 8.2, 15.3, 11.9, 9.1, 13.4],
                  retweets: [3.1, 2.8, 1.4, 4.2, 2.1, 1.9, 3.5, 2.6, 1.8, 3.2],
                  comments: [850, 620, 410, 930, 540, 310, 890, 670, 480, 750]
                };

                return (
                  <div className="carousel-slide-wrapper" key={index}>
                    <div className={`slide-scale-wrapper ${isPortrait ? 'portrait-wrapper' : ''}`}>
                      <div 
                        className={`slide-square ${activeTheme}`} 
                        ref={(el) => (slideRefs.current[index] = el)}
                      >
                        {activeTheme === 'theme-linkedin-real' ? (
                          <>
                            <div className="li-header">
                              <div className="li-user-info">
                                <img src="/logo.png" className="li-avatar" alt="Avatar" />
                                <div className="li-name-container">
                                  <div className="li-name-row">
                                    <span className="li-name">سيرتك علينا</span>
                                    <span className="li-connection">• من الدرجة الثالثة+</span>
                                  </div>
                                  <div className="li-job">تمكين الفرق والأفراد لتحقيق التميز من خلال حلو...</div>
                                  <div className="li-time">الآن • 🌍</div>
                                </div>
                              </div>
                              <div className="li-follow">
                                <span className="li-follow-btn">+ متابعة</span>
                                <span className="li-menu-dots">...</span>
                              </div>
                            </div>
                            <div className="li-body">
                              {slide.title && <div style={{marginBottom: '30px'}} dangerouslySetInnerHTML={{ __html: slide.title }} />}
                              {slide.subtitle && <div style={{marginBottom: '30px'}}>{slide.subtitle}</div>}
                              <div dangerouslySetInnerHTML={{ __html: slide.text }} />
                            </div>
                          </>
                        ) : isBrowserTheme ? (
                          <div className="browser-mockup">
                            <div className="browser-header">
                              <div className="macos-dot dot-red"></div>
                              <div className="macos-dot dot-yellow"></div>
                              <div className="macos-dot dot-green"></div>
                              <div className="browser-url">seartk3.com/grow</div>
                            </div>
                            <div className="browser-body">
                              {slide.title && <div className="slide-title" dangerouslySetInnerHTML={{ __html: slide.title }} />}
                              {slide.subtitle && <div className="slide-subtitle">{slide.subtitle}</div>}
                              <div className="slide-text" dangerouslySetInnerHTML={{ __html: slide.text }} />
                            </div>
                          </div>
                        ) : isSocialTheme ? (
                          <div className="social-mockup">
                            <div className="social-header">
                              <div className="social-avatar">
                                <img src="/logo.png" alt="CV" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              </div>
                              <div>
                                <div className="social-author-name">سيرتك علينا <span style={{color: '#3b82f6'}}>✔️</span></div>
                                <div className="social-author-handle">@seartk3</div>
                              </div>
                            </div>
                            <div className="social-body">
                              {slide.title && <div className="slide-title" dangerouslySetInnerHTML={{ __html: slide.title }} />}
                              {slide.subtitle && <div className="slide-subtitle">{slide.subtitle}</div>}
                              <div className="slide-text" dangerouslySetInnerHTML={{ __html: slide.text }} />
                            </div>
                            <div className="social-stats">
                              <span>❤️ {stats.likes[index % 10]}K</span>
                              <span>🔁 {stats.retweets[index % 10]}K</span>
                              <span>💬 {stats.comments[index % 10]}</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="slide-content">
                              {slide.title && <div className="slide-title" dangerouslySetInnerHTML={{ __html: slide.title }} />}
                              {slide.subtitle && <div className="slide-subtitle">{slide.subtitle}</div>}
                              <div className="slide-text" dangerouslySetInnerHTML={{ __html: slide.text }} />
                            </div>
                            
                            <div className="slide-footer">
                              <div className="logo-stamp">
                                سيرتك <span>علينا</span>
                              </div>
                              <div className="slide-counter" dir="ltr">
                                {index + 1} / {activeTemplate.length}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Direct Mobile Download Button */}
                    <button 
                      onClick={() => handleDownloadSingle(index)} 
                      style={{ width: '200px', padding: '12px', fontSize: '15px', background: 'rgba(16, 185, 129, 0.9)', zIndex: 10, marginTop: '20px', borderRadius: '12px', color: 'white', fontWeight: 'bold', border: 'none' }}
                    >
                      ⬇️ حفظ هذه الصورة
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* VIDEO ENGINE PREVIEW */
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '80vh' }}>
            {!videoScript ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎬</div>
                <h2>المشهد فارغ</h2>
                <p>قم بتوليد سيناريو الفيديو من القائمة الجانبية لتبدأ المعاينة الصوتية</p>
              </div>
            ) : (
              <div className="video-canvas-mockup">
                <div className="video-content-wrapper">
                  {videoScript.map((line, i) => (
                    <div 
                      key={i} 
                      className={`video-text-line ${i === currentLine && isPlaying ? 'active-line' : ''} ${i < currentLine && isPlaying ? 'past-line' : ''}`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
                <div className="video-bottom-overlay">
                  <div className="video-user-details">
                    <img src="/logo.png" style={{width: 50, height: 50, borderRadius: '50%'}} alt="Logo" />
                    <span>سيرتك علينا ✔️</span>
                  </div>
                  <div className="video-sound">🎵 الصوت الأصلي - سيرتك علينا</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
