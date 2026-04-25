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
  const [activeTemplate, setActiveTemplate] = useState([]);
  const [suggestedIdeas, setSuggestedIdeas] = useState([]);
  const [customIdea, setCustomIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [activeTheme, setActiveTheme] = useState("theme-neon");
  const [postCaption, setPostCaption] = useState("");
  const [slideCount, setSlideCount] = useState(5);
  const slideRefs = useRef([]);

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
      <div className="sidebar" style={{ width: '450px' }}>
        <h2 style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>مصنع محتوى @seartk3 🏭</h2>
        <p style={{ marginBottom: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          يولد لك Gemini الأفكار والنصوص تلقائياً لخدماتك الاحترافية الحقيقية التي تقدمها بيدك.
        </p>

        {/* THEME PICKER */}
        <div className="glass-panel" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '10px', color: 'white', fontSize: '14px' }}>🎨 اختر الثيم (القالب البصري)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <button 
              onClick={() => setActiveTheme('theme-neon')}
              style={{ padding: '8px', fontSize: '12px', background: activeTheme === 'theme-neon' ? 'linear-gradient(135deg, #38bdf8, #818cf8)' : 'rgba(0,0,0,0.4)', border: '1px solid #38bdf8' }}
            >مربع - نيون أزرق</button>
            <button 
              onClick={() => setActiveTheme('theme-gold')}
              style={{ padding: '8px', fontSize: '12px', background: activeTheme === 'theme-gold' ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'rgba(0,0,0,0.4)', border: '1px solid #fbbf24' }}
            >مربع - ملكي ذهبي</button>
            <button 
              onClick={() => setActiveTheme('theme-purple')}
              style={{ padding: '8px', fontSize: '12px', background: activeTheme === 'theme-purple' ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'rgba(0,0,0,0.4)', border: '1px solid #a855f7' }}
            >مربع - أرجواني</button>
            
            <button 
              onClick={() => setActiveTheme('theme-emerald-portrait')}
              style={{ padding: '8px', fontSize: '12px', background: activeTheme === 'theme-emerald-portrait' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(0,0,0,0.4)', border: '1px solid #10b981' }}
            >الزمردي الكلاسيكي</button>
            <button 
              onClick={() => setActiveTheme('theme-crimson-portrait')}
              style={{ padding: '8px', fontSize: '12px', background: activeTheme === 'theme-crimson-portrait' ? 'linear-gradient(135deg, #f43f5e, #be123c)' : 'rgba(0,0,0,0.4)', border: '1px solid #f43f5e' }}
            >القرمزي الطولي</button>
            
            <button 
              onClick={() => setActiveTheme('theme-visual-browser')}
              style={{ padding: '8px', fontSize: '12px', background: activeTheme === 'theme-visual-browser' ? 'linear-gradient(135deg, #e879f9, #c026d3)' : 'rgba(0,0,0,0.4)', border: '1px solid #e879f9', gridColumn: 'span 2' }}
            >💻 تصميم بصري (نافذة متصفح)</button>
            <button 
              onClick={() => setActiveTheme('theme-social-post')}
              style={{ padding: '8px', fontSize: '12px', background: activeTheme === 'theme-social-post' ? 'linear-gradient(135deg, #60a5fa, #2563eb)' : 'rgba(0,0,0,0.4)', border: '1px solid #60a5fa', gridColumn: 'span 2' }}
            >📱 تغريدة خبير (بطاقة سوشل)</button>
          </div>
        </div>

        {/* AI GENERATION SECTION */}
        <div className="glass-panel" style={{ marginBottom: '20px', border: '1px solid var(--primary-color)' }}>
          <h3 style={{ marginBottom: '15px', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
            <span>🧠 عقل الـ AI الذكي</span>
            <button 
              onClick={fetchAIideas} 
              disabled={loading}
              style={{ width: 'auto', padding: '5px 15px', fontSize: '12px' }}
            >
              🔄 تجديد
            </button>
          </h3>
          
          {loading && <div style={{ color: 'var(--accent-color)', marginBottom: '15px' }}>⏳ {loadingMsg}</div>}

          {!loading && suggestedIdeas.map((idea, idx) => (
            <div key={idx} style={{ marginBottom: '10px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--secondary-color)', marginBottom: '5px' }}>{idea.title}</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>{idea.description}</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="secondary" 
                  onClick={() => generateCarousel(idea.title)}
                  style={{ padding: '8px', fontSize: '13px', marginTop: '0', flex: 1 }}
                >
                  ✨ صمم هذا الكاروسيل
                </button>
              </div>
            </div>
          ))}

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '15px 0' }} />
          
          <div className="input-group" style={{ marginBottom: '10px' }}>
            <label>أو اكتب فكرتك الخاصة (Custom Idea)</label>
            <input 
              type="text" 
              placeholder="مثال: كيف تصمم سيرة إذا ما عندك خبرة..." 
              value={customIdea}
              onChange={(e) => setCustomIdea(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '15px' }}>
            <label>عدد شرائح الكاروسيل (بما فيها البداية والنهاية)</label>
            <input 
              type="number" 
              min="3" max="10"
              value={slideCount}
              onChange={(e) => setSlideCount(parseInt(e.target.value) || 5)}
              style={{ width: '100px' }}
            />
          </div>

          <button 
            onClick={() => generateCarousel(customIdea)} 
            disabled={!customIdea || loading}
          >
            🚀 توليد الكاروسيل
          </button>
        </div>

        {/* EDITOR SECTION */}
        {activeTemplate.map((slide, index) => (
          <div key={index} className="glass-panel" style={{ marginBottom: '15px' }}>
            <div className="slide-label" style={{ color: 'var(--accent-color)' }}>تعديل الشريحة {index + 1}</div>
            
            <div className="input-group">
              <label>العنوان الرئيسي (اختياري)</label>
              <input 
                type="text" 
                value={slide.title || ""} 
                onChange={(e) => updateSlide(index, 'title', e.target.value)}
              />
            </div>
            
            <div className="input-group">
              <label>العنوان الفرعي</label>
              <input 
                type="text" 
                value={slide.subtitle || ""} 
                onChange={(e) => updateSlide(index, 'subtitle', e.target.value)}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>النص (المحتوى)</label>
              <textarea 
                value={slide.text || ""} 
                onChange={(e) => updateSlide(index, 'text', e.target.value)}
              />
            </div>
          </div>
        ))}
        
        {activeTemplate.length > 0 && (
          <>
            <div className="glass-panel" style={{ marginBottom: '15px', border: '1px solid var(--primary-color)' }}>
              <label style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>✍️ كابشن التيك توك (جاهز للنسخ):</label>
              <textarea 
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                style={{ height: '120px', background: 'rgba(0,0,0,0.5)', marginTop: '10px' }}
              />
            </div>
            <button onClick={handleDownloadAll} style={{ margin: '20px 0', fontSize: '18px', background: 'var(--accent-color)' }}>
              📸 تحميل وحفظ الكاروسيل
            </button>
          </>
        )}
      </div>

      {/* PREVIEW AREA */}
      <div className="preview-area">
        {activeTemplate.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎨</div>
            <h2>اللوحة فارغة</h2>
            <p>اختر فكرة وسيتم تطبيق ثيم ({activeTheme}) عليها.</p>
          </div>
        )}

        {activeTemplate.map((slide, index) => {
          const isPortrait = activeTheme.includes('portrait');
          return (
          <div className="carousel-slide-wrapper" key={index}>
            <div className={`slide-scale-wrapper ${isPortrait ? 'portrait-wrapper' : ''}`}>
              <div 
                className={`slide-square ${activeTheme}`} 
                ref={(el) => (slideRefs.current[index] = el)}
              >
                {activeTheme === 'theme-visual-browser' ? (
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
                ) : activeTheme === 'theme-social-post' ? (
                  <div className="social-mockup">
                    <div className="social-header">
                      <div className="social-avatar">💼</div>
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
                      <span>❤️ 12.4K</span>
                      <span>🔁 3.1K</span>
                      <span>💬 {Math.floor(Math.random() * 500) + 100}</span>
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
    </div>
  );
}
