import React, { useState, useRef, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './index.css';

// Initialize Gemini with Fallback Logic
const apiKeysStr = import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY;
const API_KEYS = apiKeysStr ? apiKeysStr.split(',') : [];

// Helper function to extract JSON robustly
const extractJSON = (rawText) => {
  const match = rawText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!match) throw new Error("لا يوجد JSON في الإخراج");
  
  try {
    return JSON.parse(match[0]);
  } catch {
    // محاولة إصلاح JSON ناقص بإغلاقه
    const fixed = match[0].endsWith(']') || match[0].endsWith('}') 
      ? match[0] 
      : match[0] + (match[0].startsWith('[') ? ']' : '}');
    return JSON.parse(fixed);
  }
};

// Helper function to execute Gemini requests with fallback rotation
const executeWithFallback = async (promptMsg) => {
  if (API_KEYS.length === 0) throw new Error("لم يتم العثور على أي مفاتيح Gemini في البيئة.");
  
  let lastError;
  for (let i = 0; i < API_KEYS.length; i++) {
    try {
      const genAI = new GoogleGenerativeAI(API_KEYS[i].trim());
      // Configured with systemInstruction for better persona adherence
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "أنت صانع محتوى سعودي محترف لحساب @seartk3 متخصص في التوظيف وتطوير المسار المهني. تجنب الإفراط في استخدام الفواصل (،) والنقاط (.) لكي يبدو النص طبيعياً ومكتوباً بيد بشرية."
      });
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('seartk_auth') === 'true');
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === 'seartk3') {
      setIsAuthenticated(true);
      localStorage.setItem('seartk_auth', 'true');
    } else {
      setAuthError('الرمز السري غير صحيح!');
    }
  };

  const [appMode, setAppMode] = useState("carousel"); // 'carousel' or 'video'
  const [activeTemplate, setActiveTemplate] = useState([]);
  const [suggestedIdeas, setSuggestedIdeas] = useState([]);
  const [suggestedVideoIdeas, setSuggestedVideoIdeas] = useState([]);
  const [premiumIdeas, setPremiumIdeas] = useState([]);
  const [tweetScale, setTweetScale] = useState(1);
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
  // Viral Predictor States
  const [viralScore, setViralScore] = useState(null);
  const [viralStatus, setViralStatus] = useState("");
  const [premiumTweet, setPremiumTweet] = useState(null);
  const [premiumTemplate, setPremiumTemplate] = useState('tweet');
  const [activeBroll, setActiveBroll] = useState('');
  const [brollList, setBrollList] = useState([]);
  const premiumVideoRef = useRef(null);
  const audioRef = useRef(null);
  const [productionCount, setProductionCount] = useState(() => parseInt(localStorage.getItem('seartk_production_count') || '0'));
  
  const incrementProduction = () => {
    const newCount = productionCount + 1;
    setProductionCount(newCount);
    localStorage.setItem('seartk_production_count', String(newCount));
  };

  // Fetch ideas + B-Roll manifest on mount
  useEffect(() => {
    // Load cached ideas from localStorage first
    const cachedCarousel = localStorage.getItem('seartk_carousel_ideas');
    const cachedVideo = localStorage.getItem('seartk_video_ideas');
    if (cachedCarousel) setSuggestedIdeas(JSON.parse(cachedCarousel));
    if (cachedVideo) setSuggestedVideoIdeas(JSON.parse(cachedVideo));
    
    // Only fetch new ideas if cache is empty
    if (!cachedCarousel) fetchAIideas();
    if (!cachedVideo) fetchVideoIdeas();
    
    fetch('/broll/manifest.json')
      .then(r => r.json())
      .then(data => {
        setBrollList(data);
        if (data.length > 0) setActiveBroll(data[0].file);
      })
      .catch(() => setBrollList([]));
  }, []);

  // === نظام تنويع المحتوى (Content Rotation Engine) ===
  const contentPillars = [
    { cat: 'أخطاء المقابلات الشخصية', angle: 'غلطات يسويها المتقدمون وتخلي الـ HR يرفضهم في أول 3 دقائق.' },
    { cat: 'أسرار مدراء التوظيف', angle: 'أشياء حقيقية يفكر فيها الـ HR بس مستحيل يقولها لك بوجهك.' },
    { cat: 'قصص نجاح حقيقية', angle: 'قصة شخص كان عاطل وغيّر تفصيل بسيط في ملفه وتوظف خلال أسبوع واحد.' },
    { cat: 'لينكد إن والبراند الشخصي', angle: 'كيف تبني حساب لينكد إن قوي يخلي مدراء التوظيف يرسلون لك عروض بدل ما تقدم.' },
    { cat: 'مفاوضة الراتب', angle: 'تكنيك ذكي يفاوض به المحترفون على رواتبهم ويحصلون على أعلى عرض مالي ممكن.' },
    { cat: 'الفرق بين المتقدم العادي والمحترف', angle: 'عادات وأساليب سرية يستخدمها المحترفون في البحث عن وظيفة وتختصر عليهم الشهور.' },
    { cat: 'تحولات سوق العمل السعودي', angle: 'تغييرات جديدة في التوظيف بالسعودية والمهارات التي تبحث عنها الشركات فوراً.' },
    { cat: 'نصائح لحديثي التخرج', angle: 'خطوات عملية يبدأ بها الخريج الجديد لتعويض نقص الخبرة والحصول على أول وظيفة.' },
    { cat: 'أخطاء السيرة الذاتية', angle: 'أخطاء قاتلة موجودة في سيرتك الذاتية تخلي الشركات ترميها في سلة المهملات بالثانية الأولى.' },
    { cat: 'البريد الإلكتروني والتقديم', angle: 'كيف تكتب إيميل تقديم لا يُقاوم يخلي الـ HR يفتحه قبل أي إيميل ثاني.' },
    { cat: 'العمل عن بعد', angle: 'كيف تصطاد وظائف عن بعد برواتب عالية وأنت في بيتك وكيف تقدم عليها بشكل صحيح.' },
    { cat: 'علم النفس في التوظيف', angle: 'حيل نفسية خفية يستخدمها أذكياء التوظيف للتأثير المباشر على قرار من يقابلهم.' },
  ];

  const getRandomPillars = (count) => {
    const shuffled = [...contentPillars].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const refreshPremiumIdeas = () => {
    setPremiumIdeas(getRandomPillars(5));
  };

  useEffect(() => {
    refreshPremiumIdeas();
  }, []);

  const fetchVideoIdeas = async () => {
    const pillars = getRandomPillars(3);
    const categoriesList = pillars.map((p, i) => `${i+1}. الفئة: "${p.cat}" — الزاوية: ${p.angle}`).join('\n');
    try {
      const prompt = `أنت صانع محتوى تيك توك سعودي متخصص في مجال التوظيف وتطوير المسار المهني. حسابك يقدم خدمة كتابة السير الذاتية وضبط لينكد إن.

**مهمتك:** اكتب 3 أفكار ريلز مختلفة تماماً عن بعضها. كل فكرة يجب أن تنتمي لفئة مختلفة من الفئات أدناه.

**الفئات المطلوبة (عشوائية لهذا الطلب):**
${categoriesList}

**الشروط:**
- العنوان يجب أن يكون صادماً أو مستفزاً (Clickbait) يجبر الإبهام على التوقف.
- لا تذكر كلمة "ATS" في أكثر من فكرة واحدة فقط.
- نوّع بين: نصائح، أسرار، قصص، تحذيرات، مقارنات (كل فكرة أسلوب مختلف).
- النبرة: عربي خليجي بيضاء — ليس فصحى جافة ولا عامية سوقية.

رد بمصفوفة JSON فقط:
[{"title": "عنوان قصير جذاب", "description": "وصف الفكرة في سطر"}]`;
      const result = await executeWithFallback(prompt);
      const res = extractJSON(result.response.text());
      setSuggestedVideoIdeas(res);
      localStorage.setItem('seartk_video_ideas', JSON.stringify(res));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAIideas = async () => {
    setLoading(true);
    setLoadingMsg("جاري ابتكار 3 أفكار فيروسية (Viral) لليوم...");
    const pillars = getRandomPillars(3);
    const categoriesList = pillars.map((p, i) => `${i+1}. الفئة: "${p.cat}" — الزاوية: ${p.angle}`).join('\n');
    try {
      const prompt = `أنت صانع محتوى تيك توك سعودي متخصص في التوظيف والمسار المهني.

**مهمتك:** اكتب 3 أفكار كاروسيل (منشور صور) مختلفة تماماً. كل فكرة من فئة مختلفة.

**الفئات المطلوبة (عشوائية):**
${categoriesList}

**الشروط:**
- العنوان يكون Clickbait حقيقي يجذب الانتباه.
- لا تذكر "ATS" أو "نظام الفرز" في أكثر من فكرة واحدة.
- نوّع الأساليب: أسرار، قوائم، مقارنات، قصص واقعية.
- النبرة: عربي خليجي بيضاء — ليس فصحى جافة ولا عامية سوقية.

رد بمصفوفة JSON فقط بدون أي formatting:
[{"title": "عنوان قصير جذاب", "description": "وصف الفكرة"}]`;
      
      const result = await executeWithFallback(prompt);
      const res = extractJSON(result.response.text());
      setSuggestedIdeas(res);
      localStorage.setItem('seartk_carousel_ideas', JSON.stringify(res));
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
      اكتب بالضبط (${slideCount}) شرائح باللغة العربية.
      - النبرة: عربي خليجي بيضاء — ليس فصحى جافة ولا عامية سوقية.
      - شريحة 1: خطاف قوي.
      - المقاطع الوسطى: اسرد المحتوى القيم المرتبط بالموضوع بشكل تسلسلي ومترابط (التركيز على موضوع البوست نفسه وحلوله وميزاته، لا تحصره فقط بأخطاء الـ ATS إلا إذا كان الموضوع يتطلب ذلك صراحة).
      - الشريحة الأخيرة: الحل والخاتمة (دعوة للمشاهدين للتواصل معك شخصياً عبر رسائل الخاص أو زيارة الرابط في البايو لطلب خدمة تصميم سيرة ذاتية مميزة وضبط اللينكد إن الخاص بهم).
      
      مهم: يمكنك وضع الايموجي بشكل طبيعي. استخدم علامة <span class='highlight'> للكلمات المهمة.
      ملاحظة هامة جداً: لا تضع نقاط (.) أو فواصل (،) بكثرة في نهاية الجمل حتى لا يبدو النص آلياً، استخدمها في أضيق الحدود فقط.
      مثال صحيح: {"title": "أرسلت <span class='highlight'>300 طلب</span> وما جاك رد؟"}
      مثال خاطئ: {"title": "أرسلت 300 طلب وما جاك رد؟"}
      
      يجب أن ترد بمصفوفة JSON فقط بالشكل التالي تماماً، ولا تكتب أي شيء آخر:
      {
        "caption": "اكتب الكابشن الجذاب الذي سيوضع في تيك توك تحت الفديو واضف الهاشتاجات المناسبة",
        "slides": [
          {"title": "عنوان الشريحة", "subtitle": "فرعي", "text": "نص الشريحة"}
        ]
      }`;
      
      const result = await executeWithFallback(prompt);
      const res = extractJSON(result.response.text());
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
    const randomPillar = getRandomPillars(1)[0];
    try {
      const prompt = `أنت مستشار مهني سعودي محترف. حسابك @seartk3 متخصص في التوظيف والسير الذاتية ولينكد إن.
      الموضوع: "${premiumTopic}".
      الزاوية المقترحة (اختياري): ${randomPillar.angle}
      
      اكتب "تغريدة" (Tweet) احترافية وعميقة.
      الشروط:
      - قدّم نصيحة أو معلومة حقيقية مفيدة.
      - لا تذكر ATS إلا إذا كان الموضوع يتطلب ذلك مباشرة.
      - اجعلها واقعية وقابلة للتطبيق (تغريدة عميقة مع 3 نقاط عملية كحد أقصى).
      - لا تستخدم إيموجي طفولية (إيموجي واحد أو اثنين كحد أقصى).
      - لا تستخدم النقاط (.) والفواصل (،) بشكل آلي في نهاية كل جملة، اكتب بشكل عفوي وطبيعي كالبشر.
      - النبرة: عربي خليجي بيضاء — ليس فصحى جافة ولا عامية سوقية.
      
      رد بنص التغريدة فقط، بدون أي مقدمات أو تنسيق. أقصى حد 400 حرف.`;
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
            incrementProduction();
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
            // Preview is 400px wide, Video is 1080px wide. We calculate the base scale to match proportions.
            const baseScale = canvas.width / 400; 
            const exportScale = baseScale * tweetScale; // Apply user's selected scale
            
            // tweetCanvas is created with pixelRatio: 2, so its pixel size is 2x the logical size.
            // We use logical size and multiply by exportScale.
            const logicalWidth = tweetCanvas.width / 2;
            const logicalHeight = tweetCanvas.height / 2;
            
            const tWidth = logicalWidth * exportScale;
            const tHeight = logicalHeight * exportScale;
            
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
    setLoadingMsg("جاري كتابة السكربت بأسلوب النصائح المتراكمة...");
    try {
      const prompt = `أنت صانع محتوى ريلز سعودي متخصص في التوظيف والمسار المهني. حسابك @seartk3.
الموضوع: "${videoTopic}".

اكتب سكربت ريلز بأسلوب "النصائح المتراكمة" (Stacking Tips):
- hook: سؤال أو عبارة خطاف قوية تظهر في البداية (سطر أو سطرين فقط)
- tips: 4-5 نصائح مرقمة قصيرة. (كل نصيحة = جملة واحدة لا تتجاوز 8 كلمات، تُقرأ خلال 2 ثانية على الشاشة)
- cta: خاتمة (تابعنا / سوي لايك / تواصل معنا)

الشروط:
- لا تذكر ATS أكثر من مرة.
- النصائح قصيرة جداً وعملية.
- لا تستخدم إيموجي طفولية.
- تجنب تماماً وضع النقاط (.) في نهاية النصائح لكي يبدو النص طبيعياً وغير آلي.
- النبرة: عربي خليجي بيضاء — ليس فصحى جافة ولا عامية سوقية.

رد بـ JSON فقط:
{"hook":"الخطاف","tips":["نصيحة 1","نصيحة 2","نصيحة 3","نصيحة 4"],"cta":"الخاتمة"}`;
      const result = await executeWithFallback(prompt);
      const res = extractJSON(result.response.text());
      setVideoScript(res);
    } catch (e) {
      console.error(e);
      alert("الخطأ من Gemini: " + e.message);
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

  const analyzeVirality = async () => {
    if (!videoScript) return;
    setViralStatus("جاري فحص فرصة الانتشار وتحليل السكربت... 🧠");
    setViralScore(null);
    let lastError = null;
    try {
      if (API_KEYS.length === 0) throw new Error("لا توجد مفاتيح محفوظة في النظام!");
      
      const prompt = `أنت خبير تسويق عصبي (Neuromarketing Expert) وتقوم بتحليل سكربت فيديو قصير (تيك توك/ريلز).
حلل قوة الخطاف العاطفي، وتدفق المعلومات، وقوة الجمل.
يجب إرجاع النتيجة بصيغة JSON فقط، بدون أي نصوص أو Markdown.
الصيغة المطلوبة:
{
  "hookScore": 85,
  "cortex": 80,
  "attention": 75,
  "language": 90,
  "drift": 20,
  "auditory": 70,
  "virality": 85,
  "advice": ["نصيحة 1", "نصيحة 2", "نصيحة 3"]
}

السكربت المراد تحليله:
الخطاف: ${videoScript.hook}
النقاط: ${videoScript.tips.join(' | ')}
الخاتمة: ${videoScript.cta}`;

      let aiScores = null;
      for (let i = 0; i < API_KEYS.length; i++) {
        try {
          const genAI = new GoogleGenerativeAI(API_KEYS[i].trim());
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const result = await model.generateContent(prompt);
          aiScores = extractJSON(result.response.text());
          break;
        } catch (e) {
          lastError = e;
          console.warn("Key failed:", e);
        }
      }
      if (!aiScores) throw new Error("جميع المفاتيح فشلت: " + lastError?.message);
      setViralScore(aiScores);
    } catch (e) {
      alert("خطأ في التحليل: " + e.message);
    } finally {
      setViralStatus("");
    }
  };

  const autoFixScript = async () => {
    if (!videoScript || !viralScore) return;
    setViralStatus("جاري إعادة كتابة السكربت لرفع التقييم السري... ✨");
    let lastError = null;
    try {
      if (API_KEYS.length === 0) throw new Error("لا توجد مفاتيح محفوظة في النظام!");
      
      const prompt = `أنت خبير تسويق عصبي. لقد قمت مسبقاً بتقييم هذا السكربت ووجدت به نقاط ضعف بناءً على تقييماتك السابقة.
الهدف الآن: إعادة كتابة السكربت بالكامل ليرفع فرصة الانتشار (Virality) إلى أعلى من 95/100.
اجعل الخطاف (Hook) أقوى بكثير، وأزل أي كلمات مملة، واجعل الجمل قصيرة وسريعة.

السكربت القديم:
الخطاف: ${videoScript.hook}
النقاط: ${videoScript.tips.join(' | ')}
الخاتمة: ${videoScript.cta}

النصائح التي تم استخراجها مسبقاً للتحسين:
${viralScore.advice.join('\\n')}

أعد النتيجة بصيغة JSON فقط:
{
  "hook": "الخطاف الجديد القوي جداً (لا يتجاوز 10 كلمات)",
  "tips": ["النقطة السريعة 1", "النقطة السريعة 2", "النقطة السريعة 3"],
  "cta": "خاتمة جذابة (Call to Action)"
}`;

      let fixedScript = null;
      for (let i = 0; i < API_KEYS.length; i++) {
        try {
          const genAI = new GoogleGenerativeAI(API_KEYS[i].trim());
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const result = await model.generateContent(prompt);
          fixedScript = extractJSON(result.response.text());
          break;
        } catch (e) {
          lastError = e;
          console.warn("Key failed:", e);
        }
      }
      if (!fixedScript) throw new Error("جميع المفاتيح فشلت: " + lastError?.message);
      
      setVideoScript({
        ...videoScript,
        hook: fixedScript.hook,
        tips: fixedScript.tips || [],
        cta: fixedScript.cta || fixedScript.CTA || videoScript.cta
      });
      setViralScore(null);
      alert("✨ تم تحديث السكربت بنجاح لنسخة أكثر قوة!");
    } catch (e) {
      alert("خطأ في إعادة الصياغة: " + e.message);
    } finally {
      setViralStatus("");
    }
  };

  const playVideo = async () => {
    if (!videoScript || !videoScript.hook) {
        alert("⚠️ يجب توليد السكربت أولاً.");
        return;
    }
    setIsPlaying(true);
    setCurrentLine(-1); // -1 = hook
    const totalSteps = videoScript.tips.length + 2; // hook + tips + cta
    for (let i = -1; i < videoScript.tips.length + 1; i++) {
      setCurrentLine(i);
      await new Promise(r => { audioRef.current = setTimeout(r, i === -1 ? 3000 : 2000); });
    }
    setIsPlaying(false);
  };

  const stopVideo = () => {
    if (audioRef.current) clearTimeout(audioRef.current);
    setIsPlaying(false);
    setCurrentLine(-1);
  };

  const exportStackingVideo = async () => {
    if (!videoScript || !videoScript.hook) { alert("ولد السكربت أولاً!"); return; }
    const videoEl = document.querySelector('#reels-stacking-preview video');
    if (!videoEl) { alert("اختر فيديو خلفية أولاً!"); return; }
    setLoading(true);
    setLoadingMsg("جاري دمج الفيديو مع النصائح... ⏳");
    try {
      const W = 1080, H = 1920; // TikTok resolution
      const vc = document.createElement('canvas');
      vc.width = W; vc.height = H;
      const ctx = vc.getContext('2d');

      // Animate: hook 3s, each tip 2s, CTA 2s
      const steps = [-1, ...videoScript.tips.map((_, i) => i), videoScript.tips.length];
      const durations = [3000, ...videoScript.tips.map(() => 2000), 2000];

      // PRE-RENDER SNAPSHOTS for perfect fidelity
      setLoadingMsg("جاري تجهيز إطارات الفيديو (Snapshots)... ⏳");
      const overlayEl = document.getElementById('preview-overlay');
      // Disable animations to avoid capturing mid-animation states
      const style = document.createElement('style');
      style.innerHTML = '#preview-overlay * { animation: none !important; transition: none !important; }';
      document.head.appendChild(style);

      const frames = [];
      const originalLine = currentLine; // save state

      for (let s = 0; s < steps.length; s++) {
        setCurrentLine(steps[s]); // update UI
        await new Promise(r => setTimeout(r, 150)); // wait for React render
        const canvasSnapshot = await htmlToImage.toCanvas(overlayEl, { backgroundColor: 'transparent', pixelRatio: 2 });
        frames.push(canvasSnapshot);
      }
      
      document.head.removeChild(style);
      setCurrentLine(originalLine); // restore state

      const baseScale = W / 400; // 1080 / 400 = 2.7

      // Draw a single frame
      const drawFrame = (stepIdx) => {
        // B-Roll background
        ctx.globalAlpha = 0.7;
        ctx.drawImage(videoEl, 0, 0, W, H);
        ctx.globalAlpha = 1.0;

        // Draw snapshot overlay
        const snapshot = frames[stepIdx];
        if (snapshot) {
           const sW = (snapshot.width / 2) * baseScale;
           const sH = (snapshot.height / 2) * baseScale;
           ctx.drawImage(snapshot, 0, 0, sW, sH);
        }
      };

      // Record
      const stream = vc.captureStream(30);
      const mimeOpts = MediaRecorder.isTypeSupported('video/mp4') ? {mimeType:'video/mp4'} : MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? {mimeType:'video/webm;codecs=vp9'} : {mimeType:'video/webm'};
      const rec = new MediaRecorder(stream, mimeOpts);
      const chunks = [];
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, {type: mimeOpts.mimeType});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `seartk_reel_${Date.now()}.${mimeOpts.mimeType.includes('mp4')?'mp4':'webm'}`;
        a.click(); incrementProduction(); setLoading(false); setLoadingMsg('');
      };
      rec.start();

      setLoadingMsg("جاري تصدير الفيديو النهائي... ⏳");
      for (let s = 0; s < steps.length; s++) {
        const endTime = Date.now() + durations[s];
        while (Date.now() < endTime) {
          drawFrame(s);
          await new Promise(r => requestAnimationFrame(r));
        }
      }
      rec.stop();
    } catch(e) {
      console.error(e); alert('فشل التصدير: ' + (e?.message || '')); setLoading(false);
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
        incrementProduction();
      } catch (error) {
        console.error("Error generating image", error);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div className="glass-panel" style={{ width: '400px', textAlign: 'center', padding: '40px 30px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏭</div>
          <h2 style={{ color: '#10b981', marginBottom: '10px' }}>مصنع محتوى @seartk3</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '30px' }}>يرجى إدخال الرمز السري للوصول إلى لوحة التحكم والتحليلات.</p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              value={passcode} 
              onChange={(e) => { setPasscode(e.target.value); setAuthError(''); }} 
              placeholder="الرمز السري..." 
              className="glass-input" 
              style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '5px', marginBottom: '15px' }} 
              autoFocus
            />
            {authError && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '15px', animation: 'fadeInUp 0.3s ease' }}>{authError}</p>}
            <button type="submit" className="glass-button" style={{ width: '100%', padding: '12px', fontSize: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 'bold' }}>
              فتح المصنع 🔒
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR: CONTROLS */}
      <div className="sidebar" style={{ width: '450px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ color: 'var(--primary-color)', fontSize: '18px' }}>مصنع محتوى @seartk3 🏭</h2>
          <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>📊 {productionCount} قطعة</span>
        </div>
        
        {/* APP MODE TOGGLE */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(0,0,0,0.3)', padding: '5px', borderRadius: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setAppMode('carousel')} 
            style={{ flex: '1 1 30%', padding: '10px', background: appMode === 'carousel' ? 'var(--primary-color)' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >📸 مصنع الكاروسيل</button>
          <button 
            onClick={() => setAppMode('premium-reel')} 
            style={{ flex: '1 1 30%', padding: '10px', background: appMode === 'premium-reel' ? '#f59e0b' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >💼 الفيديوهات الاحترافية</button>
          <button 
            onClick={() => setAppMode('video')} 
            style={{ flex: '1 1 30%', padding: '10px', background: appMode === 'video' ? '#e92a67' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >🎬 فيديو Reels</button>
          <button 
            onClick={() => setAppMode('analytics')} 
            style={{ flex: '1 1 100%', padding: '10px', background: appMode === 'analytics' ? '#8b5cf6' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >📊 تحليلات الحسابات (Dashboard)</button>
        </div>

        {appMode === 'analytics' ? (
          <div className="glass-panel">
             <h3 style={{ color: '#8b5cf6', marginBottom: '10px' }}>📊 مركز التحليلات</h3>
             <p style={{ color: '#94a3b8', fontSize: '13px' }}>يتم هنا عرض بيانات حساباتك بذكاء. الأرقام الحالية هي أرقام تجريبية (Mock) للبروفة.</p>
             <button onClick={() => alert("قريباً: سيتم توفير الربط الفعلي هنا")} style={{ width: '100%', marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white' }}>🔗 ربط حسابات حقيقية (قريباً)</button>
          </div>
        ) : appMode === 'premium-reel' ? (
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
            {brollList.length > 0 ? (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                {brollList.map((v, i) => (
                  <button key={i} onClick={() => setActiveBroll(v.file)} style={{ flex: '1 0 auto', minWidth: '110px', padding: '8px', background: activeBroll === v.file ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px' }}>
                    🎬 {v.name} <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>({v.size})</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '13px' }}>
                📂 المجلد فارغ! ضع ملفات MP4 في <code>public/broll/</code> ثم أعد البناء.
              </div>
            )}
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', marginBottom: '20px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                <label style={{ display: 'block', color: 'white', fontSize: '12px', marginBottom: '5px' }}>أو ارفع مقطعك الخاص (بدون حقوق):</label>
                <input type="file" accept="video/*" onChange={(e) => {
                    if(e.target.files && e.target.files[0]) {
                        setActiveBroll(URL.createObjectURL(e.target.files[0]));
                    }
                }} style={{ color: 'white', fontSize: '12px', width: '100%' }} />
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '15px 0' }} />

            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>أفكار جاهزة (اضغط لاختيار):</span>
                <button onClick={refreshPremiumIdeas} style={{ width: 'auto', padding: '3px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: '#f59e0b', cursor: 'pointer' }}>🔄 تجديد الأفكار</button>
              </div>
              {premiumIdeas.map((p, idx) => (
                <div key={idx} style={{ marginBottom: '8px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }} onClick={() => setPremiumTopic(p.angle)}>
                  <span style={{ color: '#f59e0b' }}>{p.cat}</span>
                </div>
              ))}
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>أو اكتب فكرتك الخاصة:</p>
            <input type="text" value={premiumTopic} onChange={(e) => setPremiumTopic(e.target.value)} placeholder="مثال: أهمية الكلمات المفتاحية في السيرة..." className="glass-input" />
            
            <button className="glass-button" onClick={generatePremiumTweet} disabled={loading} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', width: '100%', marginBottom: '15px' }}>
              ✨ {loading ? "جاري التأليف..." : "توليد التغريدة المهنية"}
            </button>
            
            {premiumTweet && (
              <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                <label style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '8px' }}>النص القابل للتعديل:</label>
                <textarea value={premiumTweet} onChange={e => setPremiumTweet(e.target.value)} className="glass-input" style={{ height: '100px', marginBottom: '15px' }} />
                
                <label style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontSize: '13px', marginBottom: '8px' }}>
                  <span>حجم النص (Scale):</span>
                  <span>{Math.round(tweetScale * 100)}%</span>
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.5" 
                  step="0.05" 
                  value={tweetScale} 
                  onChange={(e) => setTweetScale(parseFloat(e.target.value))} 
                  style={{ width: '100%', marginBottom: '20px' }}
                />

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
          /* VIDEO MODE SIDEBAR - STACKING TIPS */
          <div className="glass-panel" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '10px', color: '#e92a67', display: 'flex', justifyContent: 'space-between' }}>
                <span>🎬 ريلز النصائح المتراكمة</span>
                <button onClick={fetchVideoIdeas} disabled={loading} style={{ width: 'auto', padding: '5px 15px', fontSize: '12px' }}>🔄 تجديد</button>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '15px' }}>
              هوك ← نصائح تتراكم ← CTA. نفس الأسلوب الفايرل!
            </p>

            <label style={{ color: 'white', fontSize: '12px', display: 'block', marginBottom: '6px' }}>خلفية الفيديو:</label>
            {brollList.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {brollList.map((v, i) => (
                  <button key={i} onClick={() => setActiveBroll(v.file)} style={{ padding: '5px 8px', background: activeBroll === v.file ? '#e92a67' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '10px' }}>
                    🎬 {v.name}
                  </button>
                ))}
              </div>
            )}
            <input type="file" accept="video/*" onChange={(e) => { if(e.target.files?.[0]) setActiveBroll(URL.createObjectURL(e.target.files[0])); }} style={{ color: 'white', fontSize: '11px', width: '100%', marginBottom: '15px' }} />

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>أفكار جاهزة:</span>
                <button onClick={fetchVideoIdeas} disabled={loading} style={{ width: 'auto', padding: '3px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: '#e92a67', cursor: 'pointer' }}>🔄 تجديد الأفكار بالذكاء الاصطناعي</button>
              </div>
              {suggestedVideoIdeas.map((idea, idx) => (
                <div key={idx} style={{ marginBottom: '6px', padding: '6px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }} onClick={() => setVideoTopic(idea.title)}>
                  <span style={{ color: '#e92a67', fontWeight: 'bold' }}>{idea.title}</span>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>{idea.description}</div>
                </div>
              ))}
            </div>

            <input type="text" value={videoTopic} onChange={(e) => setVideoTopic(e.target.value)} placeholder="أو اكتب فكرتك الخاصة..." className="glass-input" />
            <button className="glass-button" onClick={generateVideoScript} disabled={loading} style={{ background: 'linear-gradient(135deg, #e92a67, #be123c)', width: '100%', marginTop: '8px' }}>
              ✨ {loading ? "جاري التأليف..." : "توليد السكربت"}
            </button>
            
            {videoScript && videoScript.hook && (
              <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                <h4 style={{ color: '#e92a67', marginBottom: '8px', fontSize: '13px' }}>تعديل السكربت:</h4>
                <label style={{ color: '#10b981', fontSize: '11px' }}>الخطاف:</label>
                <input value={videoScript.hook} onChange={(e) => setVideoScript({...videoScript, hook: e.target.value})} className="glass-input" style={{ marginBottom: '8px', borderRight: '3px solid #10b981' }} />
                <label style={{ color: '#f59e0b', fontSize: '11px' }}>النصائح:</label>
                {videoScript.tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: '5px', marginBottom: '5px', alignItems: 'center' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold', minWidth: '18px', fontSize: '12px' }}>{i+1}</span>
                    <input value={tip} onChange={(e) => { const t = [...videoScript.tips]; t[i] = e.target.value; setVideoScript({...videoScript, tips: t}); }} className="glass-input" style={{ padding: '5px', fontSize: '11px', borderRight: '3px solid #f59e0b' }} />
                    <button onClick={() => { const t = [...videoScript.tips]; t.splice(i, 1); setVideoScript({...videoScript, tips: t}); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '0 5px' }} title="حذف النقطة">🗑️</button>
                  </div>
                ))}
                <button onClick={() => { const t = [...videoScript.tips, "نقطة جديدة..."]; setVideoScript({...videoScript, tips: t}); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '5px', color: 'white', fontSize: '11px', padding: '5px 10px', marginTop: '5px', cursor: 'pointer', width: 'fit-content' }}>➕ إضافة نقطة</button>
                <label style={{ color: '#ef4444', fontSize: '11px', marginTop: '6px', display: 'block' }}>الخاتمة:</label>
                <input value={videoScript.cta} onChange={(e) => setVideoScript({...videoScript, cta: e.target.value})} className="glass-input" style={{ marginBottom: '12px', borderRight: '3px solid #ef4444' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={playVideo} disabled={isPlaying || loading} style={{ flex: 1, padding: '10px', background: isPlaying ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                    {isPlaying ? "🎬 عرض..." : "▶️ معاينة"}
                  </button>
                  <button onClick={exportStackingVideo} disabled={isPlaying || loading} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                    ⬇️ تصدير فيديو
                  </button>
                  {isPlaying && <button onClick={stopVideo} style={{ padding: '10px', background: '#dc2626', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>⏹️</button>}
                </div>

                {/* VIRAL PREDICTOR UI */}
                <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button 
                    onClick={analyzeVirality} 
                    disabled={loading || viralStatus !== ""}
                    style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #B4FF39', borderRadius: '8px', color: '#B4FF39', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                  >
                    <span>🎯</span> {viralStatus || "فحص احتمالية الانتشار (Viral Predictor)"}
                  </button>

                  {viralScore && (
                    <div style={{ marginTop: '12px', animation: 'fadeIn 0.3s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ 
                          width: '60px', height: '60px', borderRadius: '50%', 
                          background: `conic-gradient(${viralScore.virality >= 80 ? '#10b981' : viralScore.virality >= 60 ? '#f59e0b' : '#ef4444'} ${viralScore.virality}%, #333 ${viralScore.virality}%)`,
                          display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
                        }}>
                          <div style={{ width: '50px', height: '50px', background: '#18181b', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
                            {viralScore.virality}%
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ color: 'white', margin: '0 0 5px 0', fontSize: '13px' }}>نقاط الضعف والنصائح:</h4>
                          <ul style={{ margin: 0, padding: '0 15px', color: '#a1a1aa', fontSize: '11px' }}>
                            {viralScore.advice?.map((adv, i) => <li key={i} style={{ marginBottom: '3px' }}>{adv}</li>)}
                          </ul>
                        </div>
                      </div>
                      
                      {viralScore.virality < 95 && (
                        <button 
                          onClick={autoFixScript}
                          disabled={loading || viralStatus !== ""}
                          style={{ width: '100%', marginTop: '12px', padding: '10px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)' }}
                        >
                          <span>✨</span> خله علي (إعادة كتابة ذكية لرفع التقييم)
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* END VIRAL PREDICTOR UI */}

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
                                <div className="li-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', background: 'linear-gradient(135deg, #0077b5, #00a0dc)' }}>💼</div>
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
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💼</div>
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
                      <div style={{ transform: `scale(${tweetScale})`, transition: 'transform 0.2s ease', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        {premiumTemplate === 'tweet' ? (
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
                        )}
                      </div>
                    ) : (
                        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>قم بتوليد تغريدة مهنية لرؤية المعاينة</div>
                    )}
                </div>
            </div>
          </div>
        ) : appMode === 'video' ? (
          /* STACKING TIPS REELS PREVIEW */
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '80vh' }}>
            {!videoScript || !videoScript.hook ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎬</div>
                <h2>المشهد فارغ</h2>
                <p>اختر فكرة وولّد السكربت لتبدأ المعاينة</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div 
                  id="reels-stacking-preview"
                  style={{ 
                    position: 'relative', width: '400px', height: '711px', 
                    background: '#000', borderRadius: '20px', overflow: 'hidden', 
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)' 
                  }}
                >
                  {/* B-Roll Background */}
                  <video src={activeBroll} autoPlay loop muted playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                  
                  {/* Content Overlay - TikTok/IG Safe Zones */}
                  <div id="preview-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 65px 130px 70px', gap: '10px', direction: 'rtl' }}>
                    
                    {/* Hook - ONLY shows at start, then disappears */}
                    {currentLine === -1 && (
                      <div style={{ 
                        position: 'absolute',
                        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: 'fit-content', maxWidth: '85%',
                        background: 'rgba(0, 0, 0, 0.75)',
                        padding: '14px 16px', borderRadius: '12px', 
                        color: '#ffffff', fontSize: '17px', fontWeight: '900', 
                        lineHeight: '1.5', textAlign: 'center',
                        animation: 'fadeInUp 0.4s ease',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                        zIndex: 10
                      }}>
                        {videoScript.hook}
                      </div>
                    )}
                    
                    {/* Numbered Tips - appear AFTER hook disappears, stack up */}
                    {currentLine >= 0 && videoScript.tips.map((tip, i) => {
                      // formatTip to highlight numbers and strong words
                      const formatTip = (text) => {
                          const formatted = text.replace(/(\d+|مرفوض|السر|أخطاء|هام|مستحيل|سر|فوراً|ينرفضون|تخلي)/g, "<span style='color: #10b981; font-weight: 900;'>$1</span>");
                          return { __html: formatted };
                      };
                      
                      return currentLine >= i && (
                        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', animation: 'fadeInUp 0.4s ease', flexDirection: 'row' }}>
                          <div style={{ 
                            minWidth: '32px', height: '32px', borderRadius: '50%', 
                            background: '#10b981', color: 'white', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontSize: '16px', fontWeight: '900', flexShrink: 0,
                            boxShadow: '0 3px 8px rgba(0,0,0,0.5)'
                          }}>
                            {i + 1}
                          </div>
                          <div style={{ 
                            background: 'rgba(0, 0, 0, 0.75)', 
                            padding: '10px 14px', borderRadius: '16px', 
                            color: '#ffffff', fontSize: '13px', fontWeight: '700', 
                            lineHeight: '1.6', textAlign: 'right', flex: '0 1 auto', width: 'fit-content',
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                          }} dangerouslySetInnerHTML={formatTip(tip)} />
                        </div>
                      );
                    })}
                    
                    {/* CTA */}
                    {currentLine >= videoScript.tips.length && (
                      <div style={{ 
                        background: 'rgba(0, 0, 0, 0.75)', border: '2px solid rgba(16,185,129,0.8)', 
                        padding: '12px 16px', borderRadius: '12px', 
                        color: 'white', fontSize: '13px', fontWeight: '800', 
                        textAlign: 'center', marginTop: '6px',
                        animation: 'fadeInUp 0.4s ease',
                        boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
                        alignSelf: 'center', width: 'fit-content', maxWidth: '100%'
                      }}>
                        {videoScript.cta}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : appMode === 'analytics' ? (
          <div style={{ width: '100%', maxWidth: '900px', padding: '20px', direction: 'rtl', color: 'white', animation: 'fadeInUp 0.5s ease' }}>
            <h2 style={{ fontSize: '28px', marginBottom: '20px', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>📊 تحليلات حسابات @seartk3</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              {/* Instagram Card */}
              <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)', padding: '20px', borderRadius: '15px' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>📸 Instagram</h3>
                <div style={{ fontSize: '36px', fontWeight: '900', marginBottom: '5px' }}>12.4K</div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>متابع</div>
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>معدل التفاعل:</span> <strong>4.2%</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>مشاهدات الريلز:</span> <strong>150K/أسبوع</strong></div>
                </div>
              </div>

              {/* TikTok Card */}
              <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #000000, #25F4EE, #FE2C55)', padding: '20px', borderRadius: '15px' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>🎵 TikTok</h3>
                <div style={{ fontSize: '36px', fontWeight: '900', marginBottom: '5px' }}>85.2K</div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>متابع</div>
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>معدل التفاعل:</span> <strong>8.7%</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>المشاهدات:</span> <strong>1.2M/أسبوع</strong></div>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>📈 أداء آخر الفيديوهات</h3>
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', borderRadius: '15px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '15px' }}>عنوان الفيديو</th>
                    <th style={{ padding: '15px' }}>المنصة</th>
                    <th style={{ padding: '15px' }}>المشاهدات</th>
                    <th style={{ padding: '15px' }}>اللايكات</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { title: 'كيف تتجاوز نظام الـ ATS؟', platform: 'TikTok', views: '250K', likes: '12K' },
                    { title: 'أخطاء قاتلة في السيرة الذاتية', platform: 'Instagram', views: '45K', likes: '3.2K' },
                    { title: 'أسرار مقابلة العمل', platform: 'TikTok', views: '80K', likes: '5.1K' },
                    { title: 'رسالة إيميل التقديم المثالية', platform: 'Instagram', views: '22K', likes: '1.8K' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '15px' }}>{row.title}</td>
                      <td style={{ padding: '15px', color: row.platform === 'TikTok' ? '#25F4EE' : '#ffc0cb', fontWeight: 'bold' }}>{row.platform}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>{row.views}</td>
                      <td style={{ padding: '15px' }}>{row.likes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              *هذه بيانات تجريبية (Mock Data). سيتم برمجتها لتسحب أرقامك الحقيقية لاحقاً.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
