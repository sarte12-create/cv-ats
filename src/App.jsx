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
      // Reverted to gemini-2.5-flash which has active quota for this tier
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
  const [suggestedVideoIdeas, setSuggestedVideoIdeas] = useState([]);
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
  const [bgColor, setBgColor] = useState('#0f172a');
  const [premiumTopic, setPremiumTopic] = useState("");
  const [premiumTweet, setPremiumTweet] = useState(null);
  const [premiumTemplate, setPremiumTemplate] = useState('tweet');
  const [activeBroll, setActiveBroll] = useState('/broll/broll1.mp4');
  const premiumVideoRef = useRef(null);
  const [showGrowthKit, setShowGrowthKit] = useState(false);
  const audioRef = useRef(null);

  // Fetch ideas on mount
  useEffect(() => {
    fetchAIideas();
    fetchVideoIdeas();
  }, []);

  const fetchVideoIdeas = async () => {
    try {
      const prompt = `أنت خبير محتوى تيك توك في السعودية متخصص بالتوظيف والسير الذاتية (ATS). 
      أعطني 5 أفكار (فيديوهات ريلز) مختلفة وجذابة جداً (Clickbait) مخصصة لترند القراءة السريعة الصامتة (Phonk).
      
      يجب أن ترد بمصفوفة JSON فقط بالشكل التالي:
      [
        {"title": "عنوان قصير جذاب", "description": "وصف الفكرة"}
      ]`;
      const result = await executeWithFallback(prompt);
      const rawText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
      const res = JSON.parse(rawText);
      setSuggestedVideoIdeas(res);
    } catch (e) {
      console.error(e);
    }
  };

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

  const generatePremiumTweet = async () => {
    if (!premiumTopic) return;
    setLoading(true);
    setLoadingMsg("جاري كتابة تغريدة مهنية فخمة بالذكاء الاصطناعي...");
    try {
      const prompt = `أنت مستشار توظيف (ATS) وروتيني سعودي محترف. 
      الموضوع: "${premiumTopic}".
      اكتب "تغريدة" (Tweet) احترافية وعميقة جداً تقدم نصيحة قوية للعاطلين أو الباحثين عن عمل.
      يجب أن تكون التغريدة واقعية، لا تستخدم إيموجي طفولية.
      رد بنص التغريدة فقط، بدون أي مقدمات أو تنسيق JSON. أقصى حد 250 حرف.`;
      const result = await executeWithFallback(prompt);
      setPremiumTweet(result.response.text().trim());
    } catch (e) {
      console.error(e);
      alert("الخطأ من Gemini: " + e.message);
    }
    setLoading(false);
  };

  const exportPremiumVideo = async () => {
    const tweetEl = document.getElementById('premium-tweet-mockup');
    if (!tweetEl) return;
    
    setLoading(true);
    setLoadingMsg("جاري دمج التغريدة مع الفيديو (محرك الرندر يعمل)... يرجى الانتظار ⏳");
    
    try {
        // 1. Snapshot the Tweet using htmlToImage
        const tweetCanvas = await htmlToImage.toCanvas(tweetEl, { backgroundColor: 'transparent', pixelRatio: 2 });
        
        // 2. Setup Recording Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        
        // 3. Load Background Video
        const video = document.createElement('video');
        video.src = activeBroll;
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.playsInline = true;
        
        await new Promise((resolve, reject) => {
            video.oncanplay = resolve;
            video.onerror = () => reject(new Error("صيغة الفيديو غير مدعومة أو تالفة. يرجى رفع مقطع آخر."));
            video.load();
        });
        
        // 4. Start MediaRecorder
        const stream = canvas.captureStream(30);
        const options = MediaRecorder.isTypeSupported('video/mp4') ? { mimeType: 'video/mp4' } : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? { mimeType: 'video/webm;codecs=vp9' } : { mimeType: 'video/webm' });
        const recorder = new MediaRecorder(stream, options);
        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: options.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Premium_Reel_${Date.now()}.${options.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
            a.click();
            setLoading(false);
            setLoadingMsg("");
        };
        
        // 5. Render Loop for 7 seconds (or video duration)
        video.play();
        recorder.start();
        
        const durationMs = 7000;
        const startTime = Date.now();
        
        const drawFrame = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > durationMs) {
                video.pause();
                recorder.stop();
                return;
            }
            
            // Draw Video (cover logic)
            const videoRatio = video.videoWidth / video.videoHeight;
            const canvasRatio = canvas.width / canvas.height;
            let drawWidth = canvas.width;
            let drawHeight = canvas.height;
            let offsetX = 0;
            let offsetY = 0;
            
            if (videoRatio > canvasRatio) {
                drawWidth = canvas.height * videoRatio;
                offsetX = (canvas.width - drawWidth) / 2;
            } else {
                drawHeight = canvas.width / videoRatio;
                offsetY = (canvas.height - drawHeight) / 2;
            }
            
            ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
            
            // Draw Dark Overlay for contrast
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw Tweet in center
            const tWidth = tweetCanvas.width;
            const tHeight = tweetCanvas.height;
            const tx = (canvas.width - tWidth) / 2;
            const ty = (canvas.height - tHeight) / 2;
            ctx.drawImage(tweetCanvas, tx, ty, tWidth, tHeight);
            
            requestAnimationFrame(drawFrame);
        };
        
        drawFrame();
        
    } catch(e) {
        console.error(e);
        alert("فشل الرندر: " + (e?.message || JSON.stringify(e) || "خطأ غير معروف"));
        setLoading(false);
        setLoadingMsg("");
    }
  };

  const generateVideoScript = async () => {
    if (!videoTopic) return;
    setLoading(true);
    setLoadingMsg("جاري كتابة السكربت السينمائي والخطاف بالذكاء الاصطناعي...");
    try {
      const prompt = `أنت صانع محتوى "ترند القراءة الصامتة" (Silent Fast-Reading Phonk) في تيك توك بالسعودية. الموضوع: "${videoTopic}". 
      الهدف: الترويج لخدمة كتابة سيرة ذاتية (CV) تتوافق مع نظام (ATS) بشكل احترافي.
      شروط كتابة السكربت:
      1. الخطاف (Hook): يجب أن يكون صادماً، مستفزاً، أو يكشف سراً (مثال: "معلومة بتصدمك عن الـ HR"، "ليش تنرفض وأنت الأفضل؟").
      2. السرعة والتقطيع: لا تكتب جملاً طويلة أبداً! قسّم النص إلى عبارات قصيرة جداً.
      3. الإيموجي بذكاء: لا تضع إيموجي في كل سطر! ضع إيموجي واحد فقط في السطور المهمة التي تحتوي على كلمات قوية. السطور العادية اجعلها سادة لتكون جدية.
      4. الخاتمة (CTA): طلب التواصل لتجهيز سيرة ذاتية لا ترفض (عبر رابط البايو أو الخاص).
      
      رد بمصفوفة JSON فقط بالشكل التالي:
      {
        "lines": [
          "سر خطير!",
          "عن التوظيف",
          "90% ينرفضون ❌",
          "بسبب الروبوت",
          "سيرتك غير مقروءة",
          "الحل عندي ✔️",
          "تواصل معي الآن"
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

  const fetchAudioWithFallback = async (text) => {
    const cleanText = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
    if (!cleanText) return null; 
    
    let lastError = null;
    if (API_KEYS.length === 0) throw new Error("لا توجد مفاتيح محفوظة في النظام!");
    
    for (let i = 0; i < API_KEYS.length; i++) {
        try {
            const response = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: cleanText, apiKey: API_KEYS[i].trim() })
            });
            
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                const errMsg = err?.error || "فشل توليد الصوت";
                
                const retryMatch = errMsg.match(/retry in ([\d\.]+)s/i);
                if (retryMatch) {
                    const waitSeconds = parseFloat(retryMatch[1]) + 1;
                    setLoadingMsg(`جوجل تطلب الانتظار ${Math.round(waitSeconds)} ثانية (حماية الضغط).. جاري الانتظار ⏳`);
                    await new Promise(r => setTimeout(r, waitSeconds * 1000));
                    setLoadingMsg("جاري استئناف توليد الصوت الذكي...");
                    i--; // Retry the same key
                    continue;
                }
                
                throw new Error(errMsg);
            }
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (e) {
            console.warn(`Gemini TTS Key ${i+1} failed.`, e.message);
            lastError = e;
        }
    }
    throw new Error(`جميع مفاتيح Gemini فشلت: ${lastError?.message}`);
  }

  const playVideo = async () => {
    if (!videoScript || videoScript.length === 0) {
        alert("⚠️ عذراً! يجب عليك توليد سكربت الفيديو أولاً من خلال الضغط على زر 'صناعة سكربت فايرل' باللون الأزرق في الأعلى.");
        return;
    }

    setLoadingMsg("جاري تجهيز العرض السينمائي السريع...");
    setLoading(true);
    
    try {
        // We simulate a quick loading phase for UI consistency
        await new Promise(r => setTimeout(r, 500));
        
        setLoading(false);
        setIsPlaying(true);
        setCurrentLine(0);
        
        const playNext = (index) => {
            if (index >= videoScript.length) {
                setIsPlaying(false);
                return;
            }
            setCurrentLine(index);
            
            // Dynamic reading speed: ~60ms per character, minimum 800ms for fast TikTok pace
            const duration = Math.max(800, videoScript[index].length * 60);
            
            // Store the timeout ID so we can clear it if stopped
            audioRef.current = setTimeout(() => playNext(index + 1), duration);
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
        clearTimeout(audioRef.current);
    }
    setIsPlaying(false);
  };

  const startRecordingMode = async () => {
    if (!videoScript || videoScript.length === 0) {
        alert("⚠️ عذراً! يجب توليد السكربت أولاً.");
        return;
    }
    const container = document.getElementById('video-export-container');
    if (!container) return;

    setLoading(true);
    setLoadingMsg("جاري تصوير وتجميع الفيديو... يرجى الانتظار ⏳");

    try {
        const frames = [];
        const oldIsPlaying = isPlaying;
        setIsPlaying(true); 
        
        for(let i=0; i<videoScript.length; i++) {
            setCurrentLine(i);
            await new Promise(r => setTimeout(r, 100));
            
            const dataCanvas = await htmlToImage.toCanvas(container, {
                pixelRatio: 2,
                backgroundColor: bgColor || '#0f172a'
            });
            const duration = Math.max(800, videoScript[i].length * 60);
            frames.push({ canvas: dataCanvas, duration });
        }
        
        setIsPlaying(oldIsPlaying);
        setCurrentLine(0);

        const videoCanvas = document.createElement('canvas');
        videoCanvas.width = frames[0].canvas.width;
        videoCanvas.height = frames[0].canvas.height;
        const ctx = videoCanvas.getContext('2d');
        
        const stream = videoCanvas.captureStream(30);
        const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? { mimeType: 'video/webm;codecs=vp9' } : { mimeType: 'video/webm' };
        const recorder = new MediaRecorder(stream, options);
        
        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `seartk_reel_${Date.now()}.webm`;
            a.click();
            setLoading(false);
            setLoadingMsg("");
        };
        
        recorder.start();
        
        for(let i=0; i<frames.length; i++) {
            ctx.drawImage(frames[i].canvas, 0, 0);
            await new Promise(r => setTimeout(r, frames[i].duration));
        }
        recorder.stop();
        
    } catch(e) {
        console.error("Video export error:", e);
        alert("متصفحك لا يدعم تصوير الفيديو مباشرة، يرجى استخدام متصفح كروم أو جهاز كمبيوتر.");
        setLoading(false);
        setIsPlaying(false);
    }
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
    <>
      {showGrowthKit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '20px', maxWidth: '500px', width: '90%', border: '1px solid #3b82f6', boxShadow: '0 10px 40px rgba(59,130,246,0.3)', color: 'white' }}>
            <h2 style={{ color: '#3b82f6', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>🎁 حزمة تيك توك السرية (جاهزة)</h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>لأنك لا تريد البحث، جهزت لك أفضل المصادر المجانية لتحميل مقاطع الخلفيات (ASMR، رمل، GTA) بدون حقوق لتستخدمها مع قالب الكروما 🟩:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
              <a href="https://www.tiktok.com/@satisfying.video.bg" target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', textDecoration: 'none', color: 'white', border: '1px solid rgba(255,255,255,0.1)', display: 'block' }}>
                <span style={{ fontSize: '18px', marginRight: '10px' }}>📱</span>
                <b>حساب تيك توك 1:</b> مقاطع رمل وصابون
              </a>
              <a href="https://www.tiktok.com/@gta.parkour.bg" target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', textDecoration: 'none', color: 'white', border: '1px solid rgba(255,255,255,0.1)', display: 'block' }}>
                <span style={{ fontSize: '18px', marginRight: '10px' }}>🚗</span>
                <b>حساب تيك توك 2:</b> مقاطع GTA 5
              </a>
              <a href="https://www.youtube.com/results?search_query=satisfying+vertical+video+background+no+copyright" target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', textDecoration: 'none', color: 'white', border: '1px solid rgba(255,255,255,0.1)', display: 'block' }}>
                <span style={{ fontSize: '18px', marginRight: '10px' }}>📺</span>
                <b>يوتيوب:</b> آلاف المقاطع الطويلة الجاهزة للقص
              </a>
            </div>

            <div style={{ background: 'rgba(16,185,129,0.1)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '20px' }}>
              <b style={{ color: '#10b981' }}>💡 كيف أستخدمها؟</b>
              <ol style={{ margin: 0, paddingLeft: '20px', marginTop: '10px', fontSize: '13px', lineHeight: '1.6' }}>
                <li>حمّل مقطع واحد مدته دقيقة من الروابط أعلاه.</li>
                <li>استخدم أداة سيرتك لإنشاء الفيديو بقالب "كروما 🟩" وحمله.</li>
                <li>افتح تطبيق CapCut بالجوال.</li>
                <li>ضع مقطع الـ GTA/ASMR، ثم أضف فيديو سيرتك فوقه كـ (Overlay).</li>
                <li>استخدم أداة Chroma Key في CapCut لمسح اللون الأخضر. (العملية كلها تأخذ 15 ثانية فقط!)</li>
              </ol>
            </div>

            <button onClick={() => setShowGrowthKit(false)} style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>فهمت، شكراً! 👍</button>
          </div>
        </div>
      )}
    <div className="dashboard-layout">
      {/* SIDEBAR: CONTROLS */}
      <div className="sidebar" style={{ width: '450px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ color: 'var(--primary-color)' }}>مصنع محتوى @seartk3 🏭</h2>
          <button onClick={() => setShowGrowthKit(true)} style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', animation: 'pulse 2s infinite' }}>🎁 حزمة الفايرل</button>
        </div>
        
        {/* APP MODE TOGGLE */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(0,0,0,0.3)', padding: '5px', borderRadius: '12px' }}>
          <button 
            onClick={() => setAppMode('carousel')} 
            style={{ flex: 1, padding: '10px', background: appMode === 'carousel' ? 'var(--primary-color)' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >📸 مصنع الكاروسيل</button>
          <button 
            onClick={() => setAppMode('premium-reel')} 
            style={{ flex: 1, padding: '10px', background: appMode === 'premium-reel' ? '#f59e0b' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >💼 الفيديوهات الاحترافية</button>
          <button 
            onClick={() => setAppMode('video')} 
            style={{ flex: 1, padding: '10px', background: appMode === 'video' ? '#e92a67' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >🎬 فيديو Reels</button>
        </div>

        {appMode === 'premium-reel' ? (
          <div className="glass-panel" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '10px', color: '#f59e0b', display: 'flex', justifyContent: 'space-between' }}>
                <span>💼 مصنع الريلز الاحترافي (B-Roll)</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '15px' }}>
              هذا القسم يولد فيديوهات هادئة واحترافية لحسابك (تغريدة + فيديو مكتبي). المقطع يُحفظ مدمجاً جاهزاً للرفع!
            </p>
            
            <label style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '8px' }}>اختر شكل عرض النص:</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => setPremiumTemplate('tweet')} style={{ flex: 1, padding: '8px', background: premiumTemplate === 'tweet' ? '#3b82f6' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px' }}>🐦 قالب التغريدة</button>
                <button onClick={() => setPremiumTemplate('text')} style={{ flex: 1, padding: '8px', background: premiumTemplate === 'text' ? '#10b981' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px' }}>✍️ نص حر (بدون مربع)</button>
            </div>
            
            <label style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '8px' }}>اختر خلفية الفيديو (B-Roll):</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button onClick={() => setActiveBroll('/broll/broll1.mp4')} style={{ flex: 1, padding: '8px', background: activeBroll === '/broll/broll1.mp4' ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px' }}>💻 ماك بوك</button>
                <button onClick={() => setActiveBroll('/broll/broll2.mp4')} style={{ flex: 1, padding: '8px', background: activeBroll === '/broll/broll2.mp4' ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px' }}>🌳 عمل بالخارج</button>
                <button onClick={() => setActiveBroll('/broll/broll3.mp4')} style={{ flex: 1, padding: '8px', background: activeBroll === '/broll/broll3.mp4' ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px' }}>☕ قهوة ومكتب</button>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', marginBottom: '20px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                <label style={{ display: 'block', color: 'white', fontSize: '12px', marginBottom: '5px' }}>أو ارفع مقطعك الخاص (بدون حقوق):</label>
                <input type="file" accept="video/*" onChange={(e) => {
                    if(e.target.files && e.target.files[0]) {
                        setActiveBroll(URL.createObjectURL(e.target.files[0]));
                    }
                }} style={{ color: 'white', fontSize: '12px', width: '100%' }} />
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>اكتب فكرة التغريدة/النصيحة:</p>
            <input type="text" value={premiumTopic} onChange={(e) => setPremiumTopic(e.target.value)} placeholder="مثال: أهمية الكلمات المفتاحية في السيرة..." className="glass-input" />
            
            <button className="glass-button" onClick={generatePremiumTweet} disabled={loading} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', width: '100%', marginBottom: '15px' }}>
              ✨ {loading ? "جاري التأليف..." : "توليد التغريدة المهنية"}
            </button>
            
            {premiumTweet && (
              <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                <label style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '8px' }}>النص القابل للتعديل:</label>
                <textarea value={premiumTweet} onChange={e => setPremiumTweet(e.target.value)} className="glass-input" style={{ height: '100px', marginBottom: '15px' }} />
                
                <button onClick={exportPremiumVideo} disabled={loading} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                    ⬇️ تصدير الفيديو النهائي (دمج آلي)
                </button>
                <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '10px' }}>سيتم دمج التغريدة مع الفيديو وتحميل المقطع بجودة عالية فوراً.</p>
              </div>
            )}
          </div>
        ) : appMode === 'carousel' ? (
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
            <h3 style={{ marginBottom: '10px', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                <span>🎥 صانع الفيديوهات القصيرة</span>
                <button onClick={fetchVideoIdeas} disabled={loading} style={{ width: 'auto', padding: '5px 15px', fontSize: '12px' }}>🔄 تجديد الأفكار</button>
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}>أفكار جاهزة:</div>
              {suggestedVideoIdeas.map((idea, idx) => (
                <div key={idx} style={{ marginBottom: '10px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => { setVideoTopic(idea.title); generateVideoScript(); }}>
                  <div style={{ fontWeight: 'bold', color: '#e92a67', marginBottom: '5px' }}>{idea.title}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{idea.description}</div>
                </div>
              ))}
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '15px 0' }} />

            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>أو اكتب فكرتك الخاصة:</p>
            <input type="text" value={videoTopic} onChange={(e) => setVideoTopic(e.target.value)} placeholder="مثال: كيف تتجاوز نظام الفرز الآلي..." className="glass-input" />
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button className="glass-button" onClick={generateVideoScript} disabled={loading} style={{ flex: 2, background: 'linear-gradient(135deg, #e92a67, #be123c)' }}>✨ {loading ? "جاري التأليف..." : "توليد السكربت"}</button>
              <button className="glass-button" onClick={() => setShowGrowthKit(true)} style={{ flex: 1, background: '#3b82f6', fontSize: '12px', padding: '5px' }}>🎁 مكتبة الخلفيات</button>
            </div>
            
            {videoScript && (
              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <h4 style={{ color: '#e92a67', marginBottom: '10px' }}>السكربت المولد:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {videoScript.map((line, i) => (
                    <input key={i} value={line} onChange={(e) => { const newScript = [...videoScript]; newScript[i] = e.target.value; setVideoScript(newScript); }} className="glass-input" style={{ padding: '8px', fontSize: '13px', borderLeft: `3px solid ${i === 0 ? '#10b981' : '#3b82f6'}` }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button onClick={playVideo} disabled={isPlaying || loading} style={{ flex: 1, padding: '12px', background: isPlaying ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                    {isPlaying ? "🎬 قيد العرض..." : "▶️ تشغيل (للمعاينة)"}
                  </button>
                  <button onClick={startRecordingMode} disabled={isPlaying || loading} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>
                    📥 وضع تسجيل الشاشة
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
        ) : appMode === 'premium-reel' ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '80vh' }}>
            <div style={{ position: 'relative', width: '400px', height: '711px', background: '#000', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                {/* Background Video Preview */}
                <video src={activeBroll} autoPlay loop muted playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                
                {/* Overlay Tweet Mockup */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    {premiumTweet ? (
                        premiumTemplate === 'tweet' ? (
                            <div id="premium-tweet-mockup" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', width: '100%', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', border: '1px solid rgba(255,255,255,0.15)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💼</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>سيرتك علينا ✔️</span>
                                        <span style={{ color: '#94a3b8', fontSize: '14px' }}>@seartk3</span>
                                    </div>
                                </div>
                                <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', lineHeight: '1.5', textAlign: 'right', whiteSpace: 'pre-wrap', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                    {premiumTweet}
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '5px' }}>
                                    {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute:'2-digit' })} · {new Date().toLocaleDateString('ar-SA')} · <b>Professional ATS</b>
                                </div>
                            </div>
                        ) : (
                            <div id="premium-tweet-mockup" style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <div style={{ color: 'white', fontSize: '32px', fontWeight: '900', lineHeight: '1.4', textAlign: 'center', whiteSpace: 'pre-wrap', textShadow: '0 6px 20px rgba(0,0,0,0.9), 0 2px 5px rgba(0,0,0,0.8)' }}>
                                    {premiumTweet}
                                </div>
                            </div>
                        )
                    ) : (
                        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>قم بتوليد تغريدة مهنية لرؤية المعاينة</div>
                    )}
                </div>
            </div>
          </div>
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', marginBottom: '15px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>اختر قالب الفيديو (تصاميم احترافية للريلز):</div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => setBgColor('theme-glass')} style={{ flex: 1, minWidth: '100px', padding: '8px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: '8px', color: 'white', border: bgColor === 'theme-glass' ? '2px solid white' : '1px solid #333' }}>زجاجي فاخر 🔮</button>
                      <button onClick={() => setBgColor('theme-tweet')} style={{ flex: 1, minWidth: '100px', padding: '8px', background: '#0f172a', borderRadius: '8px', color: 'white', border: bgColor === 'theme-tweet' ? '2px solid white' : '1px solid #333' }}>تغريدة احترافية 🐦</button>
                      <button onClick={() => setBgColor('theme-imessage')} style={{ flex: 1, minWidth: '100px', padding: '8px', background: '#000000', borderRadius: '8px', color: 'white', border: bgColor === 'theme-imessage' ? '2px solid white' : '1px solid #333' }}>رسالة آيفون 💬</button>
                      <button onClick={() => setBgColor('#00ff00')} style={{ flex: 1, minWidth: '100px', padding: '8px', background: '#00ff00', borderRadius: '8px', color: 'black', fontWeight: 'bold', border: bgColor === '#00ff00' ? '2px solid white' : '1px solid #333' }}>كروما (مونتاج) 🟩</button>
                  </div>
                </div>
                
                <div 
                  id="video-export-container" 
                  className="video-canvas-mockup" 
                  style={{ 
                    background: bgColor === 'theme-glass' ? 'linear-gradient(135deg, #0f172a, #312e81, #1e1b4b)' :
                                bgColor === 'theme-tweet' ? '#0f172a' :
                                bgColor === 'theme-imessage' ? '#000000' :
                                bgColor || '#0f172a', 
                    border: bgColor === '#00ff00' ? 'none' : '' 
                  }}
                >
                  
                  {bgColor === 'theme-tweet' ? (
                    <div style={{ background: '#1e293b', width: '85%', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src="/logo.png" style={{ width: '48px', height: '48px', borderRadius: '50%' }} alt="Avatar" />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>سيرتك علينا ✔️</span>
                          <span style={{ color: '#94a3b8', fontSize: '14px' }}>@seartk3</span>
                        </div>
                      </div>
                      <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', lineHeight: '1.4', textAlign: 'right' }}>
                        {videoScript[currentLine]}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '13px', marginTop: '10px' }}>
                        {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute:'2-digit' })} · {new Date().toLocaleDateString('ar-SA')} · <b>1.2M</b> Views
                      </div>
                    </div>
                  ) : bgColor === 'theme-imessage' ? (
                    <div style={{ width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      {currentLine > 0 && (
                        <div style={{ alignSelf: 'flex-start', background: '#333333', color: 'white', padding: '12px 18px', borderRadius: '20px 20px 20px 4px', maxWidth: '75%', fontSize: '18px', marginBottom: '30px', opacity: 0.5 }}>
                           {videoScript[currentLine - 1]}
                        </div>
                      )}
                      <div style={{ alignSelf: 'flex-end', background: '#0b84ff', color: 'white', padding: '14px 20px', borderRadius: '20px 20px 4px 20px', maxWidth: '85%', fontSize: '26px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(11,132,255,0.4)', transition: 'all 0.3s ease' }}>
                        {videoScript[currentLine]}
                      </div>
                    </div>
                  ) : bgColor === 'theme-glass' ? (
                    <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', width: '85%', padding: '40px 20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                      {currentLine > 0 && (
                        <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', textAlign: 'center' }}>
                          {videoScript[currentLine - 1]}
                        </div>
                      )}
                      <div style={{ fontSize: '38px', color: 'white', fontWeight: '900', textAlign: 'center', textShadow: '0 0 20px rgba(255,255,255,0.3)', lineHeight: '1.3' }}>
                        {videoScript[currentLine]}
                      </div>
                    </div>
                  ) : (
                    // Default / Chroma / Old layout
                    <div className="video-content-wrapper" style={{ justifyContent: 'center' }}>
                      {currentLine > 0 && (
                        <div className="video-text-line past-line">
                          {videoScript[currentLine - 1]}
                        </div>
                      )}
                      
                      <div className="video-text-line active-line" style={{ fontSize: '42px' }}>
                        {videoScript[currentLine]}
                      </div>
                      
                      {currentLine < videoScript.length - 1 && (
                        <div className="video-text-line future-line">
                          {videoScript[currentLine + 1]}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!isPlaying && (
                      <div className="video-bottom-overlay">
                        <div className="video-user-details">
                          <img src="/logo.png" style={{width: 50, height: 50, borderRadius: '50%'}} alt="Logo" />
                          <span>سيرتك علينا ✔️</span>
                        </div>
                        <div className="video-sound">🎵 الصوت الأصلي - سيرتك علينا</div>
                      </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', width: '100%', maxWidth: '400px' }}>
                  <button onClick={playVideo} disabled={isPlaying || loading} style={{ flex: 1, padding: '12px', background: isPlaying ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                    {isPlaying ? "🎬 قيد العرض..." : "▶️ معاينة سريعة"}
                  </button>
                  <button onClick={startRecordingMode} disabled={isPlaying || loading} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>
                    ⬇️ حفظ كفيديو (WebM)
                  </button>
                </div>
                {isPlaying && <button onClick={stopVideo} style={{ marginTop: '10px', padding: '8px 20px', background: '#dc2626', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>⏹️ إيقاف</button>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
