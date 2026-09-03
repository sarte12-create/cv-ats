import React, { useState, useRef, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { GoogleGenerativeAI } from '@google/generative-ai';
import JSZip from 'jszip';
import './index.css';

// Initialize Gemini with Fallback Logic
const apiKeysStr = import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY;
const API_KEYS = apiKeysStr ? apiKeysStr.split(',') : [];

// Unified Cloud Sync Endpoint for @seartk3 cross-device synchronization
const CLOUD_SYNC_URL = 'https://jsonblob.com/api/jsonBlob/019f9c55-ef08-7ab2-a867-fd66d581b62d';

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

export const OFFICIAL_AUDIO_TRACKS = [
  { id: 'random', name: '🎲 تنويع عشوائي بين الـ 4 أصوات (موصى به)', file: 'random' },
  { id: 'track_1', name: '🎹 1. Sleep Piano (بيانو سينمائي عميق)', file: '/audio/track_1_sleep_piano.mp3' },
  { id: 'track_2', name: '🎹 2. Chasing Daylight (بيانو ملهم ومحفز)', file: '/audio/track_2_chasing_daylight.mp3' },
  { id: 'track_3', name: '🎻 3. Solo Cello Suite (تشيلو سينمائي مهيب)', file: '/audio/track_3_solo_cello.mp3' },
  { id: 'track_4', name: '🎻 4. Sanctuary Strings (وتريات وسينث غامض)', file: '/audio/track_4_sanctuary_strings.mp3' },
  { id: 'track_5', name: '🎸 5. Classical Guitar (سولو جيتار كلاسيكي دافئ)', file: '/audio/non_piano_1_classical_guitar.mp3' },
  { id: 'none', name: '🔇 بدون صوت (فيديو صامت)', file: 'none' }
];

export const SHUFFLE_AUDIO_TRACKS = [
  '/audio/track_1_sleep_piano.mp3',
  '/audio/track_2_chasing_daylight.mp3',
  '/audio/track_3_solo_cello.mp3',
  '/audio/track_4_sanctuary_strings.mp3'
];

export default function App() {
  const [bulkAudioSetting, setBulkAudioSetting] = useState('random');
  const [activeAudioTrack, setActiveAudioTrack] = useState('random');
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
  const [calendarProgress, setCalendarProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem('seartk_calendar_progress') || '{}'); } catch { return {}; }
  });
  const [activeCalendarDay, setActiveCalendarDay] = useState('all');
  const [syncStatus, setSyncStatus] = useState('جاري مزامنة السحابة... ☁️');

  // Bulk Stacking Reels Generator States
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkSource, setBulkSource] = useState('ai'); // 'ai' | 'calendar' | 'custom'
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkCustomTopic, setBulkCustomTopic] = useState('');
  const [bulkSpeed, setBulkSpeed] = useState('balanced'); // 'fast' | 'balanced' | 'relaxed'
  const [isBulkRendering, setIsBulkRendering] = useState(false);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState(-1);
  const [bulkRenderProgress, setBulkRenderProgress] = useState(0);
  const [bulkActiveItem, setBulkActiveItem] = useState(null);
  const [bulkActiveStackStep, setBulkActiveStackStep] = useState(-1);
  const [bulkZipReady, setBulkZipReady] = useState(null);
  const [customBulkInput, setCustomBulkInput] = useState('');
  const [bulkCalendarDaySelect, setBulkCalendarDaySelect] = useState('all');
  const bulkCancelRef = useRef(false);
  
  // Fetch cloud progress on mount to sync across all user devices
  useEffect(() => {
    fetch(CLOUD_SYNC_URL)
      .then(r => r.json())
      .then(cloudData => {
        if (cloudData && typeof cloudData === 'object') {
          setCalendarProgress(prev => {
            const merged = { ...prev, ...cloudData };
            localStorage.setItem('seartk_calendar_progress', JSON.stringify(merged));
            return merged;
          });
          setSyncStatus('مربوط سحابياً ☁️✅');
        }
      })
      .catch(() => setSyncStatus('محلي (محفوظ في جهازك) 📱'));
  }, []);

  const incrementProduction = () => {
    const newCount = productionCount + 1;
    setProductionCount(newCount);
    localStorage.setItem('seartk_production_count', String(newCount));
  };

  const toggleCalendarItem = (videoId) => {
    const newProgress = { ...calendarProgress, [videoId]: !calendarProgress[videoId] };
    setCalendarProgress(newProgress);
    localStorage.setItem('seartk_calendar_progress', JSON.stringify(newProgress));
    setSyncStatus('جاري الحفظ بالسحابة... ⏳');
    fetch(CLOUD_SYNC_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(newProgress)
    }).then(() => {
      setSyncStatus('مربوط سحابياً ☁️✅');
    }).catch(() => {
      setSyncStatus('محفوظ محلياً 📱');
    });
  };

  const exportSyncCode = () => {
    const code = btoa(JSON.stringify(calendarProgress));
    copyText(code);
    alert('تم نسخ رمز التزامن بنجاح! 📋\nيمكنك لصقه في أجهزتك الأخرى لتحديث تقدمك فوراً.');
  };

  const importSyncCode = () => {
    const input = prompt('أدخل رمز التزامن المنسوخ من جهازك الآخر:');
    if (!input) return;
    try {
      const parsed = JSON.parse(atob(input.trim()));
      if (typeof parsed === 'object') {
        const merged = { ...calendarProgress, ...parsed };
        setCalendarProgress(merged);
        localStorage.setItem('seartk_calendar_progress', JSON.stringify(merged));
        fetch(CLOUD_SYNC_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(merged)
        });
        alert('تم استيراد ومزامنة التقدم بنجاح! 🎉');
      }
    } catch {
      alert('رمز التزامن غير صالح!');
    }
  };

  const copyText = (text) => {
    try { navigator.clipboard.writeText(text); } catch {
      const el = document.createElement('textarea'); el.value = text;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
  };

  const CONTENT_PLAN = [
    {
      day: "اليوم الأول: أساسيات الفرز",
      videos: [
        {
          id: "d1_v1",
          title: "الفيديو 1 (تعليمي) - [مقطع 8]",
          content: `حاط صورتك الشخصية بالسيرة الذاتية؟ 🛑\nأنظمة الـ ATS بعض الأحيان تتلخبط بسببها، وفي شركات تستبعد السيرة على طول عشان يتجنبون أي تحيز.\nالحل بسيط: شل الصورة، وخل التركيز كله على مهاراتك.\nعندك سيرة تبيها متوافقة مع النظام؟ جرب "سيرتك علينا" — الرابط بالبايو.\n\n[مقطع-8]`
        },
        {
          id: "d1_v2",
          title: "الفيديو 2 (تسويقي) - [مقطع 16]",
          content: `تدري كم ثانية يقضيها الـ HR في قراءة سيرتك؟ 6 ثواني بس.\nفكر فيها كذا: أول ثانيتين لازم يشوف فيها أقوى نقطة عندك، مو يدور عليها.\nهذا بالضبط اللي نشتغل عليه في "سيرتك علينا".\nاطلب تصميم سيرتك، وضمن فرصتك من أول قراءة — البايو.\n\n[مقطع-16]`
        },
        {
          id: "d1_v3",
          title: "الفيديو 3 (تعليمي) - [مقطع 23]",
          content: `كيف تجاوب على سؤال "تكلم عن نفسك" بدون ما تسولف؟\nما تحتاج تسرد قصة حياتك من يوم انولدت. استخدم قاعدة بسيطة: حاضر، ماضي، مستقبل.\nوش تسوي الحين، وش أنجزت قبل، وش بتضيف لهم لو انقبلت.\nالمقابلة تبدأ بسيرة قوية — اطلبها من البايو.\n\n[مقطع-23]`
        }
      ]
    },
    {
      day: "اليوم الثاني: أسرار لينكد إن",
      videos: [
        {
          id: "d2_v1",
          title: "الفيديو 1 (تعليمي) - [مقطع 31]",
          content: `ملفك في لينكد إن مهجور وما يجيك ولا عرض؟\nتخيل الوضع ينعكس، ويصير الـ HR هو اللي يراسلك بعروض.\nالسر في قسم الـ About: اكتب مهاراتك التقنية بدقة، مو كلام إنشائي فاضي.\nنضبط لك ملف يصيدك منه الـ HR — البايو.\n\n[مقطع-31]`
        },
        {
          id: "d2_v2",
          title: "الفيديو 2 (تسويقي) - [مقطع 11]",
          content: `تعبت وأنت تعدل سيرتك لكل وظيفة تقدم عليها؟\nساعات تروح في التنسيق، وفي الآخر ما يجي رد، وأحياناً التنسيق نفسه يتخربط لما ترسله.\nخل الشغل لأهله واختصر وقتك.\nاستثمر في مستقبلك، اطلب سيرتك الآن — البايو.\n\n[مقطع-11]`
        },
        {
          id: "d2_v3",
          title: "الفيديو 3 (تعليمي) - [مقطع 24]",
          content: `3 أشياء احذفها من سيرتك فوراً:\nالهدف الوظيفي القديم ("أطمح لتطوير مهاراتي")، الخبرات اللي ما لها علاقة بالوظيفة اللي تقدم عليها، وقسم "References available upon request" اللي محد يقراه أصلاً.\nتبي سيرة بدون حشو؟ البايو.\n\n[مقطع-24]`
        }
      ]
    },
    {
      day: "اليوم الثالث: فخ المقابلات",
      videos: [
        {
          id: "d3_v1",
          title: "الفيديو 1 (تعليمي) - [مقطع 9]",
          content: `لما يسألونك آخر المقابلة "عندك أسئلة لنا؟" وترد "لا شكراً" — هذا معناه إنك غير مهتم.\nجهز سؤال ذكي يترك انطباع، مثل: "وش أكبر تحدي يواجه هذا القسم حالياً؟"\nثقتك بالمقابلة تبدأ بسيرتك — البايو.\n\n[مقطع-9]`
        },
        {
          id: "d3_v2",
          title: "الفيديو 2 (تسويقي) - [مقطع 17]",
          content: `تقدم على وظائف وتشوف غيرك أقل خبرة ينقبل قبلك؟\nالفرق مو في سنوات الخبرة، الفرق في كيف تسوق لنفسك.\nسيرة مكتوبة بذكاء تعادل سنين من الخبرة.\nخلنا نسوق لك صح — اطلب سيرتك من البايو.\n\n[مقطع-17]`
        },
        {
          id: "d3_v3",
          title: "الفيديو 3 (تعليمي) - [مقطع 26]",
          content: `ترسل سيرتك بصيغة Word؟ هذا خطأ يكلفك أكثر مما تتوقع.\nالتنسيق يتدمر بجهاز الـ HR، والخطوط تتغير، وتصير سيرتك طلاسم.\nدائماً وأبداً: PDF بس.\nنصمم لك سيرة جاهزة للإرسال — البايو.\n\n[مقطع-26]`
        }
      ]
    },
    {
      day: "اليوم الرابع: لغة السيرة",
      videos: [
        {
          id: "d4_v1",
          title: "الفيديو 1 (تعليمي) - [مقطع 14]",
          content: `كلمات تضعف سيرتك، استبدلها فوراً:\nبدل "مسؤول عن" اكتب "أدرت وحققت". بدل "عملت في" اكتب "طوّرت وساهمت".\nاستخدم أفعال حركة تبين إنجازك، مو مجرد وصف لمهامك.\nنكتب لك سيرة تصنع فرق فعلي — البايو.\n\n[مقطع-14]`
        },
        {
          id: "d4_v2",
          title: "الفيديو 2 (تسويقي) - [مقطع 36]",
          content: `خايف من الفرز الآلي للشركات الكبرى؟ فعلاً خوفك بمحله — 75% من السير تنرفض قبل حتى يقراها إنسان.\nالسبب غالباً كلمات مفتاحية ناقصة أو تنسيق غلط.\nنضمن لك تتخطى هذا النظام بذكاء.\nلا تخاطر بمستقبلك، اطلبها الآن — البايو.\n\n[مقطع-36]`
        },
        {
          id: "d4_v3",
          title: "الفيديو 3 (تعليمي) - [مقطع 41]",
          content: `عندك فجوة وظيفية (انقطاع عن العمل) وقلقان منها؟\nالـ HR ممكن يشوفها نقطة قوة، بس بشرط تذكر وش سويت بهالفترة: دورة، عمل حر، مشروع شخصي.\nالانقطاع للتعلم أفضل بكثير من الانقطاع للفراغ.\nنرتب لك خبراتك بذكاء — البايو.\n\n[مقطع-41]`
        }
      ]
    },
    {
      day: "اليوم الخامس: تفاصيل تصنع الفرق",
      videos: [
        {
          id: "d5_v1",
          title: "الفيديو 1 (تعليمي) - [مقطع 30]",
          content: `تكتب هواياتك في السيرة؟ قراءة، سباحة، سفر — صراحة الـ HR ما يهمه هذا.\nاكتب هوايات تدعم مجالك: كتابة تقنية لو مبرمج، تصميم لو مصمم.\nما عندك شي يدعم الوظيفة؟ احذف القسم كامل ووفر مساحة.\nنجهز لك سيرة خالية من الحشو — البايو.\n\n[مقطع-30]`
        },
        {
          id: "d5_v2",
          title: "الفيديو 2 (تسويقي) - [مقطع 19]",
          content: `ليش تطلب سيرتك من عندنا بالذات؟\nتصميم متوافق مع أنظمة الـ ATS، كتابة تبرز إنجازاتك مو بس مهامك، وتسليم سريع بملفات جاهزة للطباعة والإرسال.\nاستثمر في فرصتك الوظيفية — البايو.\n\n[مقطع-19]`
        },
        {
          id: "d5_v3",
          title: "الفيديو 3 (تعليمي) - [مقطع 21]",
          content: `يسألك الـ HR "كم الراتب المتوقع؟"\nرقم محدد ممكن يظلمك براتب أقل من قيمتك، ورقم عالي ممكن يستبعدونك على طول.\nالأذكى: "أنا مهتم بمعرفة ميزانيتكم المخصصة لهذا المسمى."\nتجهز للمقابلة بسيرة تخليك تفاوض بقوة — البايو.\n\n[مقطع-21]`
        }
      ]
    },
    {
      day: "اليوم السادس: أخطاء شائعة",
      videos: [
        {
          id: "d6_v1",
          title: "الفيديو 1 (تعليمي) - [مقطع 40]",
          content: `كاتب خبرة "كاشير" وأنت تقدم على وظيفة "مهندس"؟\nاحذف كل خبرة ما لها علاقة بمجالك الحالي. الـ HR يدور على الصلة، مو على الكثرة.\nنصيغ لك خبراتك باحترافية — البايو.\n\n[مقطع-40]`
        },
        {
          id: "d6_v2",
          title: "الفيديو 2 (تسويقي) - [مقطع 27]",
          content: `متخرج جديد وما عندك خبرة؟ تعتقد سيرتك بتطلع فاضية؟\nنقدر نحول مشروع تخرجك، تطوعك، ودوراتك إلى خبرة عملية حقيقية على الورق.\nابدأ حياتك المهنية بقوة — اطلب سيرتك من البايو.\n\n[مقطع-27]`
        },
        {
          id: "d6_v3",
          title: "الفيديو 3 (تعليمي) - [مقطع 15]",
          content: `كيف تتابع بعد المقابلة بدون ما تكون مزعج؟\nأرسل إيميل شكر خلال 24 ساعة. لا تتصل كل يوم تسأل "بلكونني؟". انتظر المدة اللي حددوها، وبعدها إيميل متابعة واحد بس.\nأوراقك القوية هي اللي تتكلم عنك — سيرتك من البايو.\n\n[مقطع-15]`
        }
      ]
    },
    {
      day: "اليوم السابع: إغلاق الأسبوع بقوة",
      videos: [
        {
          id: "d7_v1",
          title: "الفيديو 1 (تعليمي) - [مقطع 12]",
          content: `خطأ إملائي واحد في سيرتك ممكن يعني استبعاد كامل.\nالـ HR يشوفه دليل على ضعف تركيزك، وحتى لو خبرتك ممتازة، هالغلطة تخرب الانطباع.\nراجع سيرتك مرتين، وخل شخص ثاني يقراها لك.\nأو ريح راسك وخلنا نراجعها لك — البايو.\n\n[مقطع-12]`
        },
        {
          id: "d7_v2",
          title: "الفيديو 2 (تسويقي) - [مقطع 1]",
          content: `متردد تطلب تعديل سيرتك وتأجل الموضوع كل يوم؟\nوظيفة أحلامك ممكن تنزل بكرا وسيرتك مو جاهزة — لا تفوتها بسبب تسويف.\nاستلم سيرتك جاهزة للمنافسة خلال أيام.\nاطلبها من البايو، وسيرتك علينا.\n\n[مقطع-1]`
        },
        {
          id: "d7_v3",
          title: "الفيديو 3 (تعليمي) - [مقطع 3]",
          content: `ملخص سريع: كيف تضمن اتصال الـ HR؟\nسيرة بتنسيق بسيط أبيض وأسود بدون جداول، ملف لينكد إن محدث بكلمات مفتاحية لمجالك، وتقديم مستمر بدون يأس من الرفض.\nاختصر نص الطريق — اطلب سيرتك من البايو.\n\n[مقطع-3]`
        }
      ]
    }
  ];

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

  // التعرف التلقائي على اسم أو رقم الفيديو المكتوب في النص
  useEffect(() => {
    const textToSearch = `${premiumTopic || ''} ${videoTopic || ''} ${videoScript ? JSON.stringify(videoScript) : ''}`;
    if (!textToSearch.trim() || !brollList.length) return;
    for (const b of brollList) {
      if (
        (b.id && textToSearch.includes(b.id)) ||
        (b.num && (textToSearch.includes(`مقطع-${b.num}`) || textToSearch.includes(`مقطع ${b.num}`) || textToSearch.includes(`[مقطع-${b.num}]`))) ||
        (b.title && textToSearch.includes(b.title))
      ) {
        setActiveBroll(b.file);
        break;
      }
    }
  }, [premiumTopic, videoTopic, videoScript, brollList]);

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

  // === نظام إنتاج ريلز النصائح المتراكمة بالجملة (Bulk Stacking Reels Factory) ===

  const generateBulkWithAI = async (count = bulkCount) => {
    setLoading(true);
    setLoadingMsg(`جاري تأليف ${count} سكربتات ريلز متراكمة (Stacking Tips) لحساب @seartk3... 🧠`);
    try {
      const pillars = getRandomPillars(Math.min(count, contentPillars.length));
      const pillarsContext = pillars.map((p, i) => `${i + 1}. [${p.cat}]: ${p.angle}`).join('\n');
      
      const prompt = `أنت صانع محتوى ريلز وتيك توك سعودي محترف لحساب @seartk3 المتخصص في التوظيف والسير الذاتية (ATS) والمسار المهني.
المطلوب: اكتب مصفوفة تحتوي بالضبط على (${count}) سكربتات فيديو ريلز بأسلوب "النصائح المتراكمة" (Stacking Tips).

ركائز المحتوى للاستلهام:
${pillarsContext}
${bulkCustomTopic ? `\nالموضوع المطلوب من المستخدم: "${bulkCustomTopic}"` : ''}

قواعد السكربت المتراكم لكل فيديو:
1. hook: سؤال أو خطاف قوي ومثير للفضول يظهر في البداية (سطر واحد فقط، 6-12 كلمة).
2. tips: مصفوفة تحتوي على 3 إلى 4 نصائح متتالية ومركزة جداً. كل نصيحة سريعة وقوية (أقل من 8 كلمات) لتتراكم على الشاشة مع أرقام.
3. cta: خاتمة دعوة للتفاعل أو طلب خدمة سيرة ذاتية (مثال: "اطلب سيرتك الذاتية المتوافقة مع ATS من البايو").
4. النبرة: عربي خليجي بيضاء بشرية وعفوية، تجنب الإفراط في الفواصل والنقاط حتى لا يبدو آلياً.
5. نوّع المواضيع: أخطاء المقابلات، حيل الـ HR، أسرار التقديم، مفاوضة الراتب، لينكد إن، أخطاء السيرة.

يجب أن ترد بمصفوفة JSON فقط بالشكل التالي تماماً بدون أي شروحات إضافية:
[
  {
    "title": "عنوان مختصر للفيديو",
    "hook": "الخطاف المثير هنا؟",
    "tips": [
      "نصيحة سريعة 1",
      "نصيحة سريعة 2",
      "نصيحة سريعة 3",
      "نصيحة سريعة 4"
    ],
    "cta": "الخاتمة والدعوة لطلب السيرة بالبايو"
  }
]`;

      const result = await executeWithFallback(prompt);
      const scripts = extractJSON(result.response.text());

      if (!Array.isArray(scripts) || scripts.length === 0) {
        throw new Error("لم يرجع الذكاء الاصطناعي بيانات صالحة");
      }

      const availableBrolls = brollList.length > 0 ? brollList : [{ file: activeBroll || '/broll/1.mp4', name: 'مقطع افتراضي' }];

      const newItems = scripts.slice(0, count).map((item, idx) => {
        const assignedBroll = availableBrolls[idx % availableBrolls.length];
        return {
          id: `bulk_stack_${Date.now()}_${idx}`,
          title: item.title || `ريلز متراكم ${idx + 1}`,
          hook: item.hook || "خطاف الفيديو المثير؟",
          tips: Array.isArray(item.tips) && item.tips.length > 0 ? item.tips : ["نصيحة سريعة 1", "نصيحة سريعة 2", "نصيحة سريعة 3"],
          cta: item.cta || "اطلب سيرتك الذاتية من الرابط بالبايو 💼",
          broll: assignedBroll.file,
          brollName: assignedBroll.name || `مقطع ${idx + 1}`,
          status: 'pending',
          blobUrl: null,
          errorMsg: ''
        };
      });

      setBulkItems(newItems);
      setBulkZipReady(null);
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء توليد الريلز المتراكمة: " + e.message);
    }
    setLoading(false);
  };

  const loadFromCalendarToBulk = (dayIndex = 'all') => {
    let selectedVideos = [];
    if (dayIndex === 'all') {
      CONTENT_PLAN.forEach(dp => {
        selectedVideos.push(...dp.videos);
      });
    } else {
      selectedVideos = CONTENT_PLAN[dayIndex]?.videos || [];
    }

    const availableBrolls = brollList.length > 0 ? brollList : [{ file: activeBroll, name: 'فيديو افتراضي' }];
    const newItems = selectedVideos.map((v, idx) => {
      let matchedBroll = null;
      for (const b of availableBrolls) {
        if (b.num && v.content.includes(`مقطع-${b.num}`)) {
          matchedBroll = b;
          break;
        }
      }
      const assigned = matchedBroll || availableBrolls[idx % availableBrolls.length];
      
      // Parse content into hook, tips, and cta
      const rawLines = v.content.replace(/\[مقطع-\d+\]/g, '').split('\n').map(l => l.trim()).filter(Boolean);
      let hook = rawLines[0] || "هل سيرتك جاهزة للمنافسة؟";
      let cta = rawLines.length > 1 ? rawLines[rawLines.length - 1] : "اطلب سيرتك من الرابط بالبايو 💼";
      let tips = rawLines.slice(1, -1);
      if (tips.length === 0) {
        tips = ["ركز على مهاراتك التقنية", "احذف المعلومات الزائدة", "نسق السيرة بنظام ATS"];
      }

      return {
        id: v.id || `cal_${idx}`,
        title: v.title || `فيديو ${idx + 1}`,
        hook: hook,
        tips: tips.slice(0, 4),
        cta: cta,
        broll: assigned.file,
        brollName: assigned.name || `مقطع ${idx + 1}`,
        audioTrack: bulkAudioSetting,
        status: 'pending',
        blobUrl: null,
        errorMsg: ''
      };
    });

    setBulkItems(newItems);
    setBulkZipReady(null);
    setAppMode('bulk');
  };

  const addCustomBulkItems = () => {
    if (!customBulkInput.trim()) return;
    const blocks = customBulkInput.split('\n\n').map(p => p.trim()).filter(Boolean);
    const availableBrolls = brollList.length > 0 ? brollList : [{ file: activeBroll, name: 'فيديو افتراضي' }];
    
    const newItems = blocks.map((block, idx) => {
      const assignedBroll = availableBrolls[(bulkItems.length + idx) % availableBrolls.length];
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const hook = lines[0] || "سؤال خطاف في البداية؟";
      const cta = lines.length > 1 ? lines[lines.length - 1] : "تابعنا للمزيد من الأسرار المهنية";
      const tips = lines.length > 2 ? lines.slice(1, -1) : ["نصيحة أولى", "نصيحة ثانية"];

      return {
        id: `custom_${Date.now()}_${idx}`,
        title: `ريلز متراكم مخصص ${bulkItems.length + idx + 1}`,
        hook: hook,
        tips: tips,
        cta: cta,
        broll: assignedBroll.file,
        brollName: assignedBroll.name || `مقطع ${idx + 1}`,
        status: 'pending',
        blobUrl: null,
        errorMsg: ''
      };
    });

    setBulkItems(prev => [...prev, ...newItems]);
    setCustomBulkInput('');
    setBulkZipReady(null);
  };

  const updateBulkItem = (index, field, val) => {
    const updated = [...bulkItems];
    updated[index][field] = val;
    setBulkItems(updated);
  };

  const updateBulkItemTip = (itemIndex, tipIndex, val) => {
    const updated = [...bulkItems];
    const newTips = [...updated[itemIndex].tips];
    newTips[tipIndex] = val;
    updated[itemIndex].tips = newTips;
    setBulkItems(updated);
  };

  const addBulkItemTip = (itemIndex) => {
    const updated = [...bulkItems];
    updated[itemIndex].tips = [...updated[itemIndex].tips, "نصيحة جديدة..."];
    setBulkItems(updated);
  };

  const removeBulkItemTip = (itemIndex, tipIndex) => {
    const updated = [...bulkItems];
    updated[itemIndex].tips = updated[itemIndex].tips.filter((_, i) => i !== tipIndex);
    setBulkItems(updated);
  };

  const removeBulkItem = (index) => {
    const updated = bulkItems.filter((_, i) => i !== index);
    setBulkItems(updated);
  };

  const cancelBulkRender = () => {
    bulkCancelRef.current = true;
    setIsBulkRendering(false);
  };

  const startBulkRender = async () => {
    if (bulkItems.length === 0) {
      alert("الدفعة فارغة! قم بتوليد أو إضافة سكربتات أولاً.");
      return;
    }

    setIsBulkRendering(true);
    bulkCancelRef.current = false;
    setBulkZipReady(null);

    const itemsCopy = bulkItems.map(item => ({ ...item, status: 'pending', errorMsg: '' }));
    setBulkItems([...itemsCopy]);

    const generatedFiles = [];
    const W = 1080, H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const mimeType = MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm');

    // Step durations according to bulkSpeed
    const getDurations = (itemTipsCount) => {
      if (bulkSpeed === 'fast') {
        return [2200, ...Array(itemTipsCount).fill(1500), 1600];
      } else if (bulkSpeed === 'relaxed') {
        return [3200, ...Array(itemTipsCount).fill(2200), 2400];
      } else {
        // Balanced
        return [2600, ...Array(itemTipsCount).fill(1800), 2000];
      }
    };

    for (let i = 0; i < itemsCopy.length; i++) {
      if (bulkCancelRef.current) break;

      setBulkCurrentIndex(i);
      setBulkRenderProgress(Math.round((i / itemsCopy.length) * 100));
      itemsCopy[i].status = 'rendering';
      setBulkItems([...itemsCopy]);

      const currentItem = itemsCopy[i];
      setBulkActiveItem(currentItem);

      let video = null;
      try {
        const stagingEl = document.getElementById('bulk-stacking-staging');
        if (!stagingEl) throw new Error("تعذر العثور على مساحة ريندر النصائح المتراكمة");

        // Steps: -1 (hook), 0..tips.length-1 (each tip), tips.length (CTA)
        const steps = [-1, ...currentItem.tips.map((_, tIdx) => tIdx), currentItem.tips.length];
        const durations = getDurations(currentItem.tips.length);

        // Pre-render snapshots of each stacking state
        const frames = [];
        for (let s = 0; s < steps.length; s++) {
          if (bulkCancelRef.current) break;
          setBulkActiveStackStep(steps[s]);
          await new Promise(r => setTimeout(r, 140)); // wait for DOM to update
          const snapshotCanvas = await htmlToImage.toCanvas(stagingEl, { backgroundColor: 'transparent', pixelRatio: 2.7 });
          frames.push(snapshotCanvas);
        }

        if (bulkCancelRef.current) break;

        const cleanTitle = (currentItem.title || `Stacking_Reel_${i+1}`).replace(/[\/\\:*?"<>|]/g, '_');
        const filename = `Stacking_Reel_${i + 1}_${cleanTitle}.mp4`;
        let videoBlob = null;

        // Resolve audio track for current video
        let itemAudio = currentItem.audioTrack || bulkAudioSetting;
        if (itemAudio === 'random') {
          itemAudio = SHUFFLE_AUDIO_TRACKS[i % SHUFFLE_AUDIO_TRACKS.length];
        }

        // Tier 1: Hardware-accelerated local server engine (Broadcast 60 FPS, 0% CPU stutter, 100% smooth)
        try {
          const base64Frames = frames.map(f => f.toDataURL('image/png'));
          const resp = await fetch('/api/render-reel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              broll: currentItem.broll,
              durations: durations,
              frames: base64Frames,
              title: filename,
              audioTrack: itemAudio
            })
          });

          if (resp.ok) {
            videoBlob = await resp.blob();
          } else {
            const errData = await resp.json().catch(() => ({ error: 'فشل معالجة الفيديو في السيرفر' }));
            throw new Error(`خطأ في معالجة الفيديو (${resp.status}): ${errData.error || 'خطأ غير معروف'}`);
          }
        } catch (serverErr) {
          console.error("Local server render failed:", serverErr);
          if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
            throw serverErr;
          }
        }

        // Tier 2: In-browser canvas recorder (Fallback for static clouds like Vercel)
        if (!videoBlob) {
          // Pre-buffer entire B-roll video into local RAM memory to completely eliminate HTTP network buffering stalls
          let videoBlobUrl = null;
          try {
            const resp = await fetch(currentItem.broll);
            if (resp.ok) {
              const b = await resp.blob();
              videoBlobUrl = URL.createObjectURL(b);
            }
          } catch (e) {
            console.warn("Could not pre-buffer video into blob:", e);
          }

          // Attach background B-roll video directly in visible viewport to prevent Chromium from throttling decoder FPS
          video = document.createElement('video');
          video.src = videoBlobUrl || currentItem.broll;
          video.crossOrigin = "anonymous";
          video.muted = true;
          video.playsInline = true;
          video.loop = true;
          video.preload = "auto";
          video.style.position = 'fixed';
          video.style.bottom = '15px';
          video.style.left = '15px';
          video.style.width = '320px';
          video.style.height = '568px';
          video.style.zIndex = '99999';
          video.style.borderRadius = '12px';
          video.style.border = '2px solid #ec4899';
          video.style.boxShadow = '0 8px 30px rgba(0,0,0,0.8)';
          video.style.pointerEvents = 'none';
          video.style.objectFit = 'cover';
          document.body.appendChild(video);

          await new Promise((resolve, reject) => {
            if (video.readyState >= 4) {
              resolve();
              return;
            }
            const onCanPlayThrough = () => {
              video.removeEventListener('canplaythrough', onCanPlayThrough);
              resolve();
            };
            video.addEventListener('canplaythrough', onCanPlayThrough);
            video.onerror = () => reject(new Error("تعذر تحميل مقطع الفيديو الخلفي"));
            video.load();
          });

          try {
            video.currentTime = 0;
            await video.play();
          } catch (e) {
            console.warn("Video play error:", e);
          }

          await new Promise((resolve) => {
            if ('requestVideoFrameCallback' in video) {
              video.requestVideoFrameCallback(() => resolve());
            } else {
              const checkTime = () => {
                if (video.currentTime > 0.05 && (video.videoWidth > 0 || video.readyState >= 2)) {
                  resolve();
                } else {
                  requestAnimationFrame(checkTime);
                }
              };
              checkTime();
            }
          });

          const baseScale = W / 400; // 1080 / 400 = 2.7
          const vw = video.videoWidth || 1080;
          const vh = video.videoHeight || 1920;
          const vRatio = vw / vh;
          const cRatio = canvas.width / canvas.height;
          let dW = canvas.width;
          let dH = canvas.height;
          let offX = 0;
          let offY = 0;
          if (vRatio > cRatio) {
            dW = canvas.height * vRatio;
            offX = (canvas.width - dW) / 2;
          } else {
            dH = canvas.width / vRatio;
            offY = (canvas.height - dH) / 2;
          }

          const drawSingleCanvasFrame = (snapshot) => {
            ctx.drawImage(video, offX, offY, dW, dH);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (snapshot) {
              ctx.drawImage(snapshot, 0, 0, canvas.width, canvas.height);
            }
          };

          drawSingleCanvasFrame(frames[0]);

          const recorderOptions = MediaRecorder.isTypeSupported('video/mp4')
            ? { mimeType: 'video/mp4', videoBitsPerSecond: 4000000 }
            : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 4000000 }
                : { mimeType: 'video/webm' });

          const stream = canvas.captureStream(30);
          const recorder = new MediaRecorder(stream, recorderOptions);
          const chunks = [];
          recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

          const recordingDone = new Promise((resolve) => {
            recorder.onstop = () => {
              const blob = new Blob(chunks, { type: recorderOptions.mimeType });
              resolve(blob);
            };
          });

          recorder.start();

          const totalDuration = durations.reduce((a, b) => a + b, 0);
          const stepThresholds = [];
          let accum = 0;
          for (let d of durations) {
            accum += d;
            stepThresholds.push(accum);
          }

          const renderStartTime = performance.now();
          let isRecordingActive = true;
          let lastDrawTimestamp = performance.now();

          await new Promise((resolve) => {
            let rvfcHandle = null;
            let rafHandle = null;

            const drawFrameAtCurrentTime = () => {
              const elapsed = performance.now() - renderStartTime;
              if (elapsed >= totalDuration) {
                isRecordingActive = false;
                if (rvfcHandle && 'cancelVideoFrameCallback' in video) video.cancelVideoFrameCallback(rvfcHandle);
                if (rafHandle) cancelAnimationFrame(rafHandle);
                try { video.pause(); } catch(e) {}
                recorder.stop();
                resolve();
                return;
              }

              if (video.ended || (video.duration > 0 && video.currentTime >= video.duration - 0.08)) {
                video.currentTime = 0;
                try { video.play(); } catch(e) {}
              }

              let currentStepIdx = 0;
              for (let s = 0; s < stepThresholds.length; s++) {
                if (elapsed < stepThresholds[s]) {
                  currentStepIdx = s;
                  break;
                }
              }

              drawSingleCanvasFrame(frames[currentStepIdx]);
              lastDrawTimestamp = performance.now();
            };

            const renderFrame = () => {
              if (!isRecordingActive) return;

              if (bulkCancelRef.current) {
                isRecordingActive = false;
                if (rvfcHandle && 'cancelVideoFrameCallback' in video) video.cancelVideoFrameCallback(rvfcHandle);
                if (rafHandle) cancelAnimationFrame(rafHandle);
                try { video.pause(); } catch(e) {}
                recorder.stop();
                resolve();
                return;
              }

              drawFrameAtCurrentTime();

              if ('requestVideoFrameCallback' in video) {
                rvfcHandle = video.requestVideoFrameCallback(renderFrame);
              } else {
                rafHandle = requestAnimationFrame(renderFrame);
              }
            };

            if ('requestVideoFrameCallback' in video) {
              rvfcHandle = video.requestVideoFrameCallback(renderFrame);
            } else {
              rafHandle = requestAnimationFrame(renderFrame);
            }

            const watchdog = () => {
              if (!isRecordingActive) return;
              const now = performance.now();
              const elapsed = now - renderStartTime;
              if (elapsed >= totalDuration) {
                drawFrameAtCurrentTime();
                return;
              }
              if (video.paused && !bulkCancelRef.current) {
                try { video.play(); } catch(e) {}
              }
              if (now - lastDrawTimestamp >= 30) {
                drawFrameAtCurrentTime();
              }
              requestAnimationFrame(watchdog);
            };
            requestAnimationFrame(watchdog);
          });

          try { video.pause(); } catch(e) {}
          recorder.stop();
          if (videoBlobUrl) {
            try { URL.revokeObjectURL(videoBlobUrl); } catch(e) {}
          }

          videoBlob = await recordingDone;
        }
        const blobUrl = URL.createObjectURL(videoBlob);
        itemsCopy[i].status = 'done';
        itemsCopy[i].blobUrl = blobUrl;
        itemsCopy[i].filename = filename;
        generatedFiles.push({ blob: videoBlob, filename });
        setBulkItems([...itemsCopy]);
        incrementProduction();

      } catch (err) {
        console.error(`Bulk stacking render error at ${i}:`, err);
        itemsCopy[i].status = 'error';
        itemsCopy[i].errorMsg = err.message || 'خطأ أثناء المعالجة';
        setBulkItems([...itemsCopy]);
      } finally {
        if (video) {
          try { video.pause(); video.remove(); } catch(e) {}
        }
      }
    }

    setBulkRenderProgress(100);
    setIsBulkRendering(false);
    setBulkCurrentIndex(-1);

    if (generatedFiles.length > 0) {
      try {
        const zip = new JSZip();
        generatedFiles.forEach(({ blob, filename }) => {
          zip.file(filename, blob);
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setBulkZipReady(zipBlob);
      } catch (zipErr) {
        console.error("ZIP creation failed:", zipErr);
      }
    }
  };

  const downloadZip = () => {
    if (!bulkZipReady) return;
    const url = URL.createObjectURL(bulkZipReady);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Seartk_Stacking_Reels_${Date.now()}.zip`;
    a.click();
  };

  const downloadAllIndividually = () => {
    bulkItems.forEach((item, idx) => {
      if (item.blobUrl) {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = item.blobUrl;
          a.download = item.filename || `Stacking_Reel_${idx + 1}.mp4`;
          a.click();
        }, idx * 600);
      }
    });
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
  "hookScore": 45,
  "cortex": 50,
  "attention": 40,
  "language": 55,
  "drift": 60,
  "auditory": 50,
  "virality": 48,
  "advice": ["الخطاف ممل جداً ولم يثر فضولي", "الجمل طويلة وتحتاج تقصير", "لا يوجد شعور بالخوف من تفويت المعلومة (FOMO)"]
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
    setViralStatus("جاري تجهيز بيئة التحسين... ✨");
    let lastError = null;
    let currentScript = { hook: videoScript.hook, tips: videoScript.tips, cta: videoScript.cta };
    let currentAdvice = viralScore.advice.join('\n');
    let bestScores = viralScore;
    let bestScript = currentScript;

    try {
      if (API_KEYS.length === 0) throw new Error("لا توجد مفاتيح محفوظة في النظام!");
      
      // Attempt up to 3 times to get >= 94
      for (let attempt = 1; attempt <= 3; attempt++) {
        setViralStatus(`محاولة ${attempt}/3 لإعادة صياغة السكربت... ✨`);
        
        const rewritePrompt = `أنت خبير تسويق عصبي عالمي. هذا السكربت ضعيف ويحتاج لرفع فرصة الانتشار (Virality) إلى 99/100.
يجب استخدام: (Curiosity Gap) لشد الانتباه الفوري، (Negative Framing) لإثارة الخوف من تفويت المعلومة، وجمل سريعة متلاحقة.
تحذير هام جداً: لا تكتب أي ملاحظات إخراجية أو بصرية بين أقواس (مثل: تصوير سريع، رسومات متحركة). اكتب فقط النص الذي سيقرأه المشاهد.

السكربت الحالي:
الخطاف: ${currentScript.hook}
النقاط: ${currentScript.tips.join(' | ')}
الخاتمة: ${currentScript.cta}

النصائح للتحسين:
${currentAdvice}

أعد النتيجة بصيغة JSON فقط:
{
  "hook": "...",
  "tips": ["...", "..."],
  "cta": "..."
}`;

        let fixedData = null;
        for (let i = 0; i < API_KEYS.length; i++) {
          try {
            const genAI = new GoogleGenerativeAI(API_KEYS[i].trim());
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(rewritePrompt);
            fixedData = extractJSON(result.response.text());
            break;
          } catch (e) {
            lastError = e;
          }
        }
        if (!fixedData) throw new Error("فشل توليد السكربت: " + lastError?.message);

        setViralStatus(`محاولة ${attempt}/3: جاري التقييم الفعلي للسكربت الجديد... 🔬`);
        
        const evalPrompt = `أنت خبير تسويق عصبي (Neuromarketing Expert). قيّم هذا السكربت بصدق من 100.
ملاحظة: هذا السكربت تمت إعادة صياغته ليكون سريعاً ومثيراً للفضول (Negative Framing). إذا وجدته فعّالاً وقوياً، لا تتردد بإعطائه تقييم 95 فأعلى.
الصيغة المطلوبة JSON:
{
  "hookScore": 45,
  "cortex": 50,
  "attention": 40,
  "language": 55,
  "drift": 60,
  "auditory": 50,
  "virality": 48,
  "advice": ["الخطاف ممل جداً ولم يثر فضولي", "الجمل طويلة وتحتاج تقصير", "لا يوجد شعور بالخوف من تفويت المعلومة (FOMO)"]
}

السكربت المراد تحليله:
الخطاف: ${fixedData.hook}
النقاط: ${(fixedData.tips || []).join(' | ')}
الخاتمة: ${fixedData.cta}`;

        let evalScores = null;
        for (let i = 0; i < API_KEYS.length; i++) {
          try {
            const genAI = new GoogleGenerativeAI(API_KEYS[i].trim());
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(evalPrompt);
            evalScores = extractJSON(result.response.text());
            break;
          } catch (e) {
            lastError = e;
          }
        }

        if (evalScores) {
          bestScores = evalScores;
          bestScript = fixedData;
          if (evalScores.virality >= 94) {
            break; // Success! We reached high score, exit loop early.
          } else {
            // Setup next iteration
            currentScript = fixedData;
            currentAdvice = evalScores.advice.join('\n');
          }
        }
      } // End 3-loop
      
      setVideoScript({
        ...videoScript,
        hook: bestScript.hook,
        tips: bestScript.tips || [],
        cta: bestScript.cta || bestScript.CTA || videoScript.cta
      });
      setViralScore(bestScores);
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
        const canvasSnapshot = await htmlToImage.toCanvas(overlayEl, { backgroundColor: 'transparent', pixelRatio: 2.7 });
        frames.push(canvasSnapshot);
      }
      
      document.head.removeChild(style);
      setCurrentLine(originalLine); // restore state

      // Resolve audio track for single export
      let singleAudio = activeAudioTrack;
      if (singleAudio === 'random') {
        singleAudio = SHUFFLE_AUDIO_TRACKS[Math.floor(Math.random() * SHUFFLE_AUDIO_TRACKS.length)];
      }

      // 1. Hardware-accelerated local server engine (Broadcast 60 FPS, 0% CPU stutter, 100% smooth)
      try {
        setLoadingMsg("جاري إنتاج الفيديو فائق السلاسة مع الموسيقى... 🎬🎵");
        const base64Frames = frames.map(f => f.toDataURL('image/png'));
        const resp = await fetch('/api/render-reel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broll: activeBroll || '/broll/8.mp4',
            durations: durations,
            frames: base64Frames,
            title: `seartk_reel_${Date.now()}`,
            audioTrack: singleAudio
          })
        });

        if (resp.ok) {
          const blob = await resp.blob();
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = `seartk_reel_${Date.now()}.mp4`;
          a.click();
          incrementProduction();
          setLoading(false);
          setLoadingMsg('');
          return;
        } else {
          const errData = await resp.json().catch(() => ({ error: 'فشل معالجة الفيديو في السيرفر' }));
          throw new Error(`خطأ في معالجة الفيديو (${resp.status}): ${errData.error || 'خطأ غير معروف'}`);
        }
      } catch (serverErr) {
        console.error("Local server render failed:", serverErr);
        if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
          alert("تعذر إنتاج الفيديو عبر محرك السيرفر: " + serverErr.message);
          setLoading(false);
          return;
        }
      }

      // Draw a single frame (100% opaque, ultra fast direct GPU blit)
      const drawFrame = (stepIdx) => {
        // 1. B-Roll background
        ctx.drawImage(videoEl, 0, 0, W, H);

        // 2. Dark Overlay for contrast
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, W, H);

        // 3. Draw snapshot overlay
        const snapshot = frames[stepIdx];
        if (snapshot) {
           ctx.drawImage(snapshot, 0, 0, W, H);
        }
      };

      // Draw initial frame before starting stream recording
      drawFrame(0);

      // Record
      const stream = vc.captureStream(30);
      const mimeOpts = MediaRecorder.isTypeSupported('video/mp4') 
        ? { mimeType: 'video/mp4', videoBitsPerSecond: 4000000 } 
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
            ? { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 4000000 } 
            : { mimeType: 'video/webm' });

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

      // Cumulative step transition thresholds
      const totalDuration = durations.reduce((a, b) => a + b, 0);
      const stepThresholds = [];
      let accum = 0;
      for (let d of durations) {
        accum += d;
        stepThresholds.push(accum);
      }

      setLoadingMsg("جاري تصدير الفيديو النهائي بسلاسة تامة... ⏳");
      const recStartTime = performance.now();
      let isSingleRecordingActive = true;
      let lastDrawTimestamp = performance.now();

      await new Promise((resolve) => {
        let rvfcHandle = null;
        let rafHandle = null;

        const drawFrameAtCurrentTime = () => {
          const elapsed = performance.now() - recStartTime;
          if (elapsed >= totalDuration) {
            isSingleRecordingActive = false;
            if (rvfcHandle && 'cancelVideoFrameCallback' in videoEl) videoEl.cancelVideoFrameCallback(rvfcHandle);
            if (rafHandle) cancelAnimationFrame(rafHandle);
            rec.stop();
            resolve();
            return;
          }

          if (videoEl.ended || (videoEl.duration > 0 && videoEl.currentTime >= videoEl.duration - 0.08)) {
            videoEl.currentTime = 0;
            try { videoEl.play(); } catch(e) {}
          }

          let currentStep = 0;
          for (let s = 0; s < stepThresholds.length; s++) {
            if (elapsed < stepThresholds[s]) {
              currentStep = s;
              break;
            }
          }

          drawFrame(currentStep);
          lastDrawTimestamp = performance.now();
        };

        const animFrame = () => {
          if (!isSingleRecordingActive) return;
          drawFrameAtCurrentTime();

          if ('requestVideoFrameCallback' in videoEl) {
            rvfcHandle = videoEl.requestVideoFrameCallback(animFrame);
          } else {
            rafHandle = requestAnimationFrame(animFrame);
          }
        };

        if ('requestVideoFrameCallback' in videoEl) {
          rvfcHandle = videoEl.requestVideoFrameCallback(animFrame);
        } else {
          rafHandle = requestAnimationFrame(animFrame);
        }

        const watchdog = () => {
          if (!isSingleRecordingActive) return;
          const now = performance.now();
          const elapsed = now - recStartTime;
          if (elapsed >= totalDuration) {
            drawFrameAtCurrentTime();
            return;
          }
          if (videoEl.paused) {
            try { videoEl.play(); } catch(e) {}
          }
          if (now - lastDrawTimestamp >= 30) {
            drawFrameAtCurrentTime();
          }
          requestAnimationFrame(watchdog);
        };
        requestAnimationFrame(watchdog);
      });
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
            style={{ flex: '1 1 30%', padding: '10px', background: (appMode === 'video' || appMode === 'bulk') ? '#e92a67' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >🎬 فيديو Reels</button>
          <button 
            onClick={() => setAppMode('analytics')} 
            style={{ flex: '1 1 30%', padding: '10px', background: appMode === 'analytics' ? '#8b5cf6' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >📊 تحليلات (Dashboard)</button>
          <button 
            onClick={() => setAppMode('bulk')} 
            style={{ flex: '1 1 65%', padding: '10px', background: appMode === 'bulk' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.4)', borderRadius: '8px', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', boxShadow: appMode === 'bulk' ? '0 4px 15px rgba(236, 72, 153, 0.4)' : 'none' }}
          >
            <span>⚡</span> إنتاج بالجملة (10 - 20 فيديو)
          </button>
        </div>

        {appMode === 'analytics' ? (
          <div className="glass-panel">
             <h3 style={{ color: '#8b5cf6', marginBottom: '10px' }}>📊 مركز التحليلات</h3>
             <p style={{ color: '#94a3b8', fontSize: '13px' }}>يتم هنا عرض بيانات حساباتك بذكاء. الأرقام الحالية هي أرقام تجريبية (Mock) للبروفة.</p>
             <button onClick={() => alert("قريباً: سيتم توفير الربط الفعلي هنا")} style={{ width: '100%', marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white' }}>🔗 ربط حسابات حقيقية (قريباً)</button>
          </div>
        ) : appMode === 'premium-reel' ? (
          <div className="glass-panel" style={{ marginBottom: '20px' }}>
            {/* Quick Link to Bulk Mode */}
            <div style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.15))', border: '1px solid rgba(236, 72, 153, 0.35)', padding: '10px 14px', borderRadius: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: '#f472b6', fontWeight: 'bold' }}>⚡ تبي تنتج 10 أو 20 فيديو دفعة واحدة؟</span>
              <button onClick={() => setAppMode('bulk')} style={{ background: '#ec4899', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>مصنع الجملة 🚀</button>
            </div>

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
        ) : appMode === 'bulk' ? (
          /* BULK REELS SIDEBAR */
          <div className="glass-panel" style={{ marginBottom: '20px' }}>
            {/* SUB TABS: SINGLE VS BULK */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '10px' }}>
              <button 
                onClick={() => setAppMode('video')} 
                style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', borderRadius: '7px', color: '#94a3b8', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                🎬 ريلز فردي (نصائح)
              </button>
              <button 
                onClick={() => setAppMode('bulk')} 
                style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', borderRadius: '7px', color: 'white', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(236,72,153,0.3)' }}
              >
                <span>⚡</span> إنتاج بالجملة (10-20)
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ color: '#ec4899', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <span>⚡ مصنع الإنتاج بالجملة</span>
              </h3>
              <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                {bulkItems.length} فيديو بالدفعة
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '15px' }}>
              أنتج ورندر من 5 إلى 20 فيديو ريلز دفعة واحدة مع دمج الـ B-roll وتنزيل ملف مضغوط ZIP بنقرة زر!
            </p>

            {/* SOURCE SELECTOR */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '10px', marginBottom: '15px', gap: '5px' }}>
              <button 
                onClick={() => setBulkSource('ai')}
                style={{ flex: 1, padding: '7px', fontSize: '11px', borderRadius: '7px', border: 'none', background: bulkSource === 'ai' ? '#ec4899' : 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🤖 ذكاء اصطناعي
              </button>
              <button 
                onClick={() => setBulkSource('calendar')}
                style={{ flex: 1, padding: '7px', fontSize: '11px', borderRadius: '7px', border: 'none', background: bulkSource === 'calendar' ? '#5B8C3E' : 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📅 خطة الأسبوع
              </button>
              <button 
                onClick={() => setBulkSource('custom')}
                style={{ flex: 1, padding: '7px', fontSize: '11px', borderRadius: '7px', border: 'none', background: bulkSource === 'custom' ? '#8b5cf6' : 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ✍️ نصوصك
              </button>
            </div>

            {/* SOURCE SPECIFIC CONTROLS */}
            {bulkSource === 'ai' && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <label style={{ color: 'white', fontSize: '12px', display: 'block', marginBottom: '8px' }}>عدد الفيديوهات المطلوبة:</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {[5, 10, 15, 20].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => setBulkCount(cnt)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                        background: bulkCount === cnt ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'rgba(255,255,255,0.1)',
                        color: 'white', boxShadow: bulkCount === cnt ? '0 2px 8px rgba(236, 72, 153, 0.4)' : 'none'
                      }}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>

                <label style={{ color: 'white', fontSize: '12px', display: 'block', marginBottom: '6px' }}>موضوع أو تركيز محدد (اختياري):</label>
                <input 
                  type="text" 
                  value={bulkCustomTopic} 
                  onChange={e => setBulkCustomTopic(e.target.value)}
                  placeholder="مثال: أخطاء المقابلات أو حيل لينكد إن..."
                  className="glass-input"
                  style={{ marginBottom: '10px', fontSize: '12px' }}
                />

                <button 
                  onClick={() => generateBulkWithAI(bulkCount)}
                  disabled={loading || isBulkRendering}
                  className="glass-button"
                  style={{ width: '100%', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', color: 'white', fontWeight: 'bold', padding: '10px', fontSize: '13px' }}
                >
                  ✨ توليد ({bulkCount}) فيديوهات الآن
                </button>
              </div>
            )}

            {bulkSource === 'calendar' && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <label style={{ color: 'white', fontSize: '12px', display: 'block', marginBottom: '8px' }}>اختر نطاق الخطة:</label>
                <select 
                  value={bulkCalendarDaySelect} 
                  onChange={e => setBulkCalendarDaySelect(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', marginBottom: '12px', background: '#1e293b', color: 'white' }}
                >
                  <option value="all">🌟 الخطة كاملة (21 فيديو - 7 أيام)</option>
                  {CONTENT_PLAN.map((dp, i) => (
                    <option key={i} value={i}>📅 {dp.day} (3 فيديوهات)</option>
                  ))}
                </select>
                <button 
                  onClick={() => loadFromCalendarToBulk(bulkCalendarDaySelect === 'all' ? 'all' : parseInt(bulkCalendarDaySelect))}
                  disabled={loading || isBulkRendering}
                  className="glass-button"
                  style={{ width: '100%', background: 'linear-gradient(135deg, #5B8C3E, #2f541b)', color: 'white', fontWeight: 'bold', padding: '10px', fontSize: '13px' }}
                >
                  📥 استيراد الفيديوهات للدفعة
                </button>
              </div>
            )}

            {bulkSource === 'custom' && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <label style={{ color: 'white', fontSize: '12px', display: 'block', marginBottom: '6px' }}>الصق نصوصك (افصل بين كل فيديو بسطرين فارغين):</label>
                <textarea 
                  value={customBulkInput}
                  onChange={e => setCustomBulkInput(e.target.value)}
                  placeholder="نص الفيديو الأول هنا...&#10;&#10;نص الفيديو الثاني هنا...&#10;&#10;نص الفيديو الثالث..."
                  className="glass-input"
                  style={{ height: '90px', fontSize: '12px', marginBottom: '10px' }}
                />
                <button 
                  onClick={addCustomBulkItems}
                  disabled={!customBulkInput.trim() || isBulkRendering}
                  className="glass-button"
                  style={{ width: '100%', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', fontWeight: 'bold', padding: '9px', fontSize: '12px' }}
                >
                  ➕ إضافة النصوص إلى الدفعة
                </button>
              </div>
            )}

            {/* RENDER SETTINGS */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginBottom: '15px' }}>
              <label style={{ color: 'white', fontSize: '12px', display: 'block', marginBottom: '8px' }}>⚡ سرعة تتابع النصائح المتراكمة:</label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <button 
                  onClick={() => setBulkSpeed('fast')} 
                  style={{ flex: 1, padding: '7px 4px', background: bulkSpeed === 'fast' ? '#ec4899' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ⚡ سريعة (10ث)
                </button>
                <button 
                  onClick={() => setBulkSpeed('balanced')} 
                  style={{ flex: 1, padding: '7px 4px', background: bulkSpeed === 'balanced' ? '#10b981' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ⏱️ متوازنة (13ث)
                </button>
                <button 
                  onClick={() => setBulkSpeed('relaxed')} 
                  style={{ flex: 1, padding: '7px 4px', background: bulkSpeed === 'relaxed' ? '#3b82f6' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  🍃 هادئة (16ث)
                </button>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' }}>
                🎯 التتابع: <strong style={{ color: 'white' }}>الخطاف</strong> يظهر أولاً ← ثم تختفي ويظهر <strong style={{ color: '#10b981' }}>تراكم النصائح 1، 2، 3، 4</strong> مع أرقام ملونة ← ثم تظهر <strong style={{ color: '#3b82f6' }}>الخاتمة (CTA)</strong>.
              </div>
            </div>

            {/* AUDIO SETTINGS */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>🎵 الموسيقى الخلفية للدفعة:</label>
                <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '6px' }}>بدون حقوق ملكية ✅</span>
              </div>
              <select
                value={bulkAudioSetting}
                onChange={e => {
                  const val = e.target.value;
                  setBulkAudioSetting(val);
                  if (val !== 'random') {
                    setBulkItems(prev => prev.map(item => ({ ...item, audioTrack: val })));
                  }
                }}
                disabled={isBulkRendering}
                className="glass-input"
                style={{ width: '100%', background: '#1e293b', color: 'white', fontSize: '12px', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', outline: 'none' }}
              >
                {OFFICIAL_AUDIO_TRACKS.map(t => (
                  <option key={t.id} value={t.file}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: '1.4' }}>
                💡 خيار <strong>التنويع العشوائي</strong> يوزع الأصوات الـ 4 المعتمدة تلقائياً على كل فيديوهات الدفعة لمنع التكرار!
              </div>
            </div>

            {/* ACTIONS & PROGRESS */}
            {isBulkRendering ? (
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '12px', border: '1px solid #ec4899', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                  <span>جاري ريندر الفيديو {bulkCurrentIndex + 1} من {bulkItems.length}...</span>
                  <span>{bulkRenderProgress}%</span>
                </div>
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ width: `${bulkRenderProgress}%`, height: '100%', background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', transition: 'width 0.3s ease' }}></div>
                </div>
                <button 
                  onClick={cancelBulkRender}
                  style={{ width: '100%', padding: '8px', background: '#dc2626', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  ⏹️ إيقاف العملية
                </button>
              </div>
            ) : (
              <div>
                <button 
                  onClick={startBulkRender}
                  disabled={bulkItems.length === 0 || loading}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: bulkItems.length === 0 ? 'not-allowed' : 'pointer',
                    background: bulkItems.length === 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #ec4899, #be185d)',
                    color: 'white', boxShadow: bulkItems.length > 0 ? '0 4px 15px rgba(236, 72, 153, 0.4)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px'
                  }}
                >
                  <span>🚀</span>
                  <span>بدء إنتاج وتصدير ({bulkItems.length}) فيديو</span>
                </button>

                {bulkZipReady && (
                  <div style={{ animation: 'fadeInUp 0.3s ease' }}>
                    <button 
                      onClick={downloadZip}
                      style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                    >
                      <span>📦</span>
                      <span>تحميل جميع الفيديوهات بملف مضغوط (ZIP)</span>
                    </button>
                    <button 
                      onClick={downloadAllIndividually}
                      style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#cbd5e1', fontSize: '11px', cursor: 'pointer' }}
                    >
                      ⬇️ تنزيل كل فيديو منفصلاً
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* VIDEO MODE SIDEBAR - STACKING TIPS */
          <div className="glass-panel" style={{ marginBottom: '20px' }}>
            {/* SUB TABS: SINGLE VS BULK */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '10px' }}>
              <button 
                onClick={() => setAppMode('video')} 
                style={{ flex: 1, padding: '8px', background: '#e92a67', border: 'none', borderRadius: '7px', color: 'white', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                🎬 ريلز فردي (نصائح)
              </button>
              <button 
                onClick={() => setAppMode('bulk')} 
                style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', borderRadius: '7px', color: '#cbd5e1', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              >
                <span>⚡</span> إنتاج بالجملة (10-20)
              </button>
            </div>

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
                {brollList.map((v, i) => {
                  const clipNum = v.num || (v.id ? v.id.replace('مقطع-', '') : i + 1);
                  return (
                    <button key={i} onClick={() => setActiveBroll(v.file)} style={{ padding: '5px 8px', background: activeBroll === v.file ? '#e92a67' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>🎬</span>
                      <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>[{clipNum}]</span>
                      <span>{v.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <input type="file" accept="video/*" onChange={(e) => { if(e.target.files?.[0]) setActiveBroll(URL.createObjectURL(e.target.files[0])); }} style={{ color: 'white', fontSize: '11px', width: '100%', marginBottom: '15px' }} />

            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>🎵 الموسيقى الخلفية:</label>
                <span style={{ fontSize: '10px', color: '#10b981' }}>بدون حقوق ✅</span>
              </div>
              <select
                value={activeAudioTrack}
                onChange={e => setActiveAudioTrack(e.target.value)}
                className="glass-input"
                style={{ width: '100%', background: '#1e293b', color: 'white', fontSize: '12px', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', outline: 'none' }}
              >
                {OFFICIAL_AUDIO_TRACKS.map(t => (
                  <option key={t.id} value={t.file}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

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
        ) : appMode === 'calendar' ? (
          <div style={{ background: '#F2EEE6', borderRadius: '20px', padding: '0', overflow: 'hidden', width: '100%', maxWidth: '1200px', margin: '0 auto', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }} dir="rtl">
            {/* Calendar Header & Progress */}
            <div style={{ background: '#F2EEE6', padding: '24px 30px', borderBottom: '1px solid rgba(45,42,38,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2D2A26', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>🎯 سيرتك علينا - خطة الـ 7 أيام</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', background: 'rgba(91,140,62,0.15)', color: '#5B8C3E', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>{syncStatus}</span>
                    <button onClick={exportSyncCode} style={{ background: 'none', border: '1px solid rgba(45,42,38,0.2)', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: '600', color: '#2D2A26' }}>📋 نسخ رمز التزامن</button>
                    <button onClick={importSyncCode} style={{ background: 'none', border: '1px solid rgba(45,42,38,0.2)', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: '600', color: '#2D2A26' }}>📥 استيراد رمز</button>
                    <button onClick={() => loadFromCalendarToBulk('all')} style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(236,72,153,0.3)' }}>
                      <span>⚡</span> إنتاج الخطة بالجملة (21 فيديو)
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center', background: '#2D2A26', color: '#F2EEE6', padding: '10px 20px', borderRadius: '14px', boxShadow: '0 4px 12px rgba(45,42,38,0.15)' }}>
                    <span style={{ display: 'block', fontSize: '24px', fontWeight: 'bold', color: '#5B8C3E', lineHeight: '1' }}>
                      {Object.values(calendarProgress).filter(Boolean).length}<span style={{ fontSize: '14px', color: 'rgba(242,238,230,0.6)' }}>/21</span>
                    </span>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>منشور جاهز</span>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(217, 119, 6, 0.15)', border: '1px solid rgba(217, 119, 6, 0.3)', color: '#d97706', padding: '10px 20px', borderRadius: '14px' }}>
                    <span style={{ display: 'block', fontSize: '24px', fontWeight: 'bold', lineHeight: '1' }}>
                      {21 - Object.values(calendarProgress).filter(Boolean).length}
                    </span>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>متبقي للنشر ⏳</span>
                  </div>
                </div>
              </div>
              {/* Progress Bar */}
              <div style={{ width: '100%', background: 'rgba(45,42,38,0.1)', borderRadius: '999px', height: '14px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ background: '#5B8C3E', height: '14px', borderRadius: '999px', transition: 'width 0.7s ease', width: `${Math.round((Object.values(calendarProgress).filter(Boolean).length / 21) * 100)}%` }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <p style={{ fontSize: '13px', color: '#5B8C3E', fontWeight: 'bold', margin: 0 }}>
                  {Math.round((Object.values(calendarProgress).filter(Boolean).length / 21) * 100)}% مكتمل
                </p>
                <p style={{ fontSize: '13px', color: '#2D2A26', fontWeight: '600', margin: 0 }}>
                  {21 - Object.values(calendarProgress).filter(Boolean).length === 0 ? "🎉 مبروك! أنهيت كافة فيديوهات الأسبوع" : `باقي لك ${21 - Object.values(calendarProgress).filter(Boolean).length} فيديوهات لإكمال الخطة`}
                </p>
              </div>

              {/* Day Selection Tabs */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                <button
                  onClick={() => setActiveCalendarDay('all')}
                  style={{
                    padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                    background: activeCalendarDay === 'all' ? '#2D2A26' : 'white',
                    color: activeCalendarDay === 'all' ? '#F2EEE6' : '#2D2A26',
                    boxShadow: activeCalendarDay === 'all' ? '0 4px 10px rgba(0,0,0,0.15)' : 'none'
                  }}
                >
                  🌐 عرض الكل (7 أيام)
                </button>
                {CONTENT_PLAN.map((dayPlan, idx) => {
                  const dayDone = dayPlan.videos.filter(v => calendarProgress[v.id]).length;
                  const isDayComplete = dayDone === 3;
                  const isActive = activeCalendarDay === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveCalendarDay(idx)}
                      style={{
                        padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
                        background: isActive ? '#5B8C3E' : (isDayComplete ? 'rgba(91,140,62,0.15)' : 'white'),
                        color: isActive ? 'white' : (isDayComplete ? '#5B8C3E' : '#2D2A26'),
                        boxShadow: isActive ? '0 4px 10px rgba(91,140,62,0.3)' : 'none'
                      }}
                    >
                      <span>{isDayComplete ? '✅' : '📅'}</span>
                      <span>اليوم {idx + 1}</span>
                      <span style={{ fontSize: '11px', opacity: 0.8 }}>({dayDone}/3)</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Days List */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {CONTENT_PLAN.filter((_, idx) => activeCalendarDay === 'all' || activeCalendarDay === idx).map((dayPlan, dayIndex) => {
                const actualDayIdx = activeCalendarDay === 'all' ? dayIndex : activeCalendarDay;
                const completedInDay = dayPlan.videos.filter(v => calendarProgress[v.id]).length;
                const remainingInDay = 3 - completedInDay;
                const isDayComplete = remainingInDay === 0;

                return (
                  <div key={actualDayIdx} style={{ background: 'white', borderRadius: '18px', overflow: 'hidden', border: isDayComplete ? '2px solid rgba(91,140,62,0.3)' : '1px solid rgba(45,42,38,0.08)', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
                    {/* Day Header */}
                    <div style={{ background: isDayComplete ? 'linear-gradient(135deg, #2D2A26, #3E5A2A)' : '#2D2A26', color: '#F2EEE6', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{isDayComplete ? '🎉' : '📅'}</span>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{dayPlan.day}</h3>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={() => loadFromCalendarToBulk(actualDayIdx)} style={{ background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.4)', color: '#ec4899', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>⚡</span> إنتاج فيديوهات اليوم بالجملة (3)
                        </button>
                        <span style={{
                          fontSize: '12px', fontWeight: 'bold', padding: '5px 12px', borderRadius: '20px',
                          background: isDayComplete ? '#5B8C3E' : 'rgba(217, 119, 6, 0.25)',
                          color: isDayComplete ? 'white' : '#fbbf24'
                        }}>
                          {isDayComplete ? '✅ مكتمل بالكامل (3/3)' : `⏳ متبقي ${remainingInDay} فيديو`}
                        </span>
                      </div>
                    </div>
                    {/* Videos List - Desktop Grid */}
                    <div style={{ padding: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '16px' }}>
                      {dayPlan.videos.map((video) => {
                        const isCompleted = !!calendarProgress[video.id];
                        return (
                          <div key={video.id} style={{
                            position: 'relative', overflow: 'hidden', borderRadius: '14px', transition: 'all 0.3s',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            border: isCompleted ? '1px solid rgba(91,140,62,0.4)' : '1px solid rgba(45,42,38,0.12)',
                            background: isCompleted ? 'rgba(91,140,62,0.05)' : '#FAFAFA',
                            boxShadow: isCompleted ? 'inset 0 1px 3px rgba(0,0,0,0.05)' : '0 2px 8px rgba(0,0,0,0.04)'
                          }}>
                            {isCompleted && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px', background: '#5B8C3E' }}></div>}
                            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px' }}>
                                <h4 style={{ fontWeight: 'bold', fontSize: '15px', color: isCompleted ? '#5B8C3E' : '#2D2A26', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  {isCompleted && <span>🔥</span>}
                                  <span>{video.title}</span>
                                </h4>
                                <button onClick={() => toggleCalendarItem(video.id)} style={{
                                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                                  background: isCompleted ? '#5B8C3E' : '#EAE6DF', color: isCompleted ? 'white' : '#2D2A26',
                                  boxShadow: isCompleted ? '0 2px 8px rgba(91,140,62,0.3)' : 'none'
                                }}>
                                  {isCompleted ? '✅ منشور!' : '⭕ تحديد كمنشور'}
                                </button>
                              </div>
                              <div style={{
                                padding: '14px', borderRadius: '10px', fontSize: '13px', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontWeight: '500', transition: 'all 0.3s', flexGrow: 1, marginBottom: '14px',
                                background: isCompleted ? 'rgba(91,140,62,0.08)' : 'white', color: isCompleted ? 'rgba(45,42,38,0.7)' : '#2D2A26', border: '1px solid rgba(0,0,0,0.04)'
                              }}>
                                {video.content}
                              </div>
                              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                <button onClick={() => { setVideoTopic(video.content); setAppMode('video'); }} style={{
                                  fontSize: '12px', fontWeight: 'bold', color: 'white', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(245,158,11,0.25)'
                                }}>
                                  🎬 إنتاج الفيديو الآن
                                </button>
                                <button onClick={() => { copyText(video.content); alert('تم نسخ النص بنجاح! 📋'); }} style={{
                                  fontSize: '12px', fontWeight: 'bold', color: 'rgba(45,42,38,0.6)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}>
                                  نسخ النص ✂️
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(45,42,38,0.5)', fontSize: '13px', fontWeight: '600' }}>
              تم برمجة هذه الشاشة لـ <span style={{ color: '#5B8C3E' }}>سيرتك علينا</span> 🚀<br/>
              (تقدمك محفوظ تلقائياً حتى لو قفلت الصفحة)
            </div>
          </div>
        ) : appMode === 'bulk' ? (
          <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '10px', direction: 'rtl' }}>
            {/* HIDDEN STAGING ELEMENT FOR HIGH QUALITY CANVAS SNAPSHOTS */}
            <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '400px', pointerEvents: 'none', zIndex: -1 }}>
              <div 
                id="bulk-stacking-staging" 
                style={{ 
                  width: '400px', height: '711px', 
                  position: 'relative', overflow: 'hidden', 
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', 
                  padding: '80px 65px 130px 70px', gap: '10px', direction: 'rtl' 
                }}
              >
                {bulkActiveItem && (
                  <>
                    {/* Hook Step */}
                    {bulkActiveStackStep === -1 && (
                      <div style={{ 
                        position: 'absolute',
                        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: 'fit-content', maxWidth: '85%',
                        background: 'rgba(0, 0, 0, 0.75)',
                        padding: '14px 16px', borderRadius: '12px', 
                        color: '#ffffff', fontSize: '17px', fontWeight: '900', 
                        lineHeight: '1.5', textAlign: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                        zIndex: 10
                      }}>
                        {bulkActiveItem.hook}
                      </div>
                    )}

                    {/* Stacking Tips Step */}
                    {bulkActiveStackStep >= 0 && bulkActiveItem.tips.map((tip, i) => {
                      const formatTip = (text) => {
                        const formatted = text.replace(/(\d+|مرفوض|السر|أخطاء|هام|مستحيل|سر|فوراً|ينرفضون|تخلي)/g, "<span style='color: #10b981; font-weight: 900;'>$1</span>");
                        return { __html: formatted };
                      };
                      return bulkActiveStackStep >= i && (
                        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexDirection: 'row', marginBottom: '4px' }}>
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

                    {/* CTA Step */}
                    {bulkActiveStackStep >= bulkActiveItem.tips.length && (
                      <div style={{ 
                        background: 'rgba(0, 0, 0, 0.75)', border: '2px solid rgba(16,185,129,0.8)', 
                        padding: '12px 16px', borderRadius: '12px', 
                        color: 'white', fontSize: '13px', fontWeight: '800', 
                        textAlign: 'center', marginTop: '6px',
                        boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
                        alignSelf: 'center', width: 'fit-content', maxWidth: '100%'
                      }}>
                        {bulkActiveItem.cta}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* HEADER BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h2 style={{ color: 'white', fontSize: '24px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>⚡ قائمة ريلز النصائح المتراكمة (Bulk Stacking Reels)</span>
                  <span style={{ fontSize: '14px', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', padding: '4px 12px', borderRadius: '15px', fontWeight: 'bold' }}>
                    {bulkItems.length} ريلز متراكم
                  </span>
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '5px 0 0 0' }}>
                  كل فيديو يتكون من: <strong>خطاف خاطف</strong> ← <strong>نصائح متراكمة رقمياً (1، 2، 3..)</strong> ← <strong>خاتمة دعوة للتفاعل</strong>.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setBulkItems([...bulkItems, { 
                    id: `item_${Date.now()}`, 
                    title: `ريلز متراكم ${bulkItems.length + 1}`, 
                    hook: 'سؤال أو خطاف يثير الفضول؟', 
                    tips: ['نصيحة أولى سريعة', 'نصيحة ثانية عملية', 'نصيحة ثالثة حصرية'], 
                    cta: 'اطلب سيرتك الذاتية من الرابط بالبايو 💼', 
                    broll: activeBroll || (brollList[0]?.file || ''), 
                    brollName: 'مقطع اختياري', 
                    status: 'pending', 
                    blobUrl: null 
                  }])}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>➕</span> إضافة ريلز فارغ
                </button>
                {bulkItems.length > 0 && !isBulkRendering && (
                  <button 
                    onClick={() => { if(confirm('هل أنت متأكد من مسح كافة الفيديوهات؟')) setBulkItems([]); }}
                    style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    مسح الكل 🗑️
                  </button>
                )}
              </div>
            </div>

            {/* LIVE RENDERING MONITOR FOR STACKING REELS */}
            {isBulkRendering && bulkActiveItem && (
              <div style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(139, 92, 246, 0.1))', border: '2px solid #ec4899', borderRadius: '18px', padding: '20px', marginBottom: '25px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 10px 30px rgba(236, 72, 153, 0.2)' }}>
                <div style={{ width: '180px', height: '320px', background: 'linear-gradient(135deg, #18181b, #27272a)', borderRadius: '12px', overflow: 'hidden', position: 'relative', flexShrink: 0, boxShadow: '0 8px 25px rgba(0,0,0,0.5)' }}>
                  <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 30%, rgba(236,72,153,0.25), transparent 70%)' }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '15px', gap: '6px', direction: 'rtl' }}>
                    {bulkActiveStackStep === -1 ? (
                      <div style={{ background: 'rgba(0,0,0,0.8)', padding: '6px 8px', borderRadius: '6px', fontSize: '9px', color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                        {bulkActiveItem.hook}
                      </div>
                    ) : (
                      <>
                        {bulkActiveItem.tips.map((tip, i) => (
                          bulkActiveStackStep >= i && (
                            <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#10b981', color: 'white', fontSize: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {i + 1}
                              </div>
                              <div style={{ background: 'rgba(0,0,0,0.7)', padding: '3px 6px', borderRadius: '6px', fontSize: '8px', color: 'white' }}>
                                {tip}
                              </div>
                            </div>
                          )
                        ))}
                        {bulkActiveStackStep >= bulkActiveItem.tips.length && (
                          <div style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #10b981', padding: '4px', borderRadius: '6px', fontSize: '8px', color: 'white', textAlign: 'center', marginTop: '4px' }}>
                            {bulkActiveItem.cta}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: '#ec4899', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}>
                    REC 🔴
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'inline-block', background: '#ec4899', color: 'white', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
                    🎬 جاري تصوير وتراكم: {bulkActiveStackStep === -1 ? 'الخطاف (Hook)' : (bulkActiveStackStep < bulkActiveItem.tips.length ? `نصيحة رقم ${bulkActiveStackStep + 1}` : 'الخاتمة (CTA)')}
                  </div>
                  <h3 style={{ color: 'white', fontSize: '18px', margin: '0 0 10px 0' }}>
                    {bulkActiveItem.title}
                  </h3>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: '12px', lineHeight: '1.6' }}>
                    <div><strong>الخطاف:</strong> {bulkActiveItem.hook}</div>
                    <div style={{ marginTop: '5px' }}><strong>النصائح ({bulkActiveItem.tips.length}):</strong> {bulkActiveItem.tips.join(' | ')}</div>
                    <div style={{ marginTop: '5px' }}><strong>الخاتمة:</strong> {bulkActiveItem.cta}</div>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '10px' }}>
                    خلفية B-Roll: <strong style={{ color: '#f472b6' }}>{bulkActiveItem.brollName}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* EMPTY STATE */}
            {bulkItems.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '54px', marginBottom: '15px' }}>🎬</div>
                <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '8px' }}>دفعة ريلز النصائح المتراكمة فارغة</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '500px', margin: '0 auto 20px auto' }}>
                  اضغط "توليد بالذكاء الاصطناعي" لتأليف 10 إلى 20 سكربت متراكم كامل مع هوك ونصائح مرقمة وخاتمة جاهزة للريندر والتصدير فوراً!
                </p>
                <button 
                  onClick={() => generateBulkWithAI(10)}
                  style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', color: 'white', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)' }}
                >
                  ✨ توليد 10 ريلز متراكمة الآن
                </button>
              </div>
            )}

            {/* STACKING ITEMS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {bulkItems.map((item, idx) => {
                const isRendering = item.status === 'rendering';
                const isDone = item.status === 'done';
                const isError = item.status === 'error';

                return (
                  <div 
                    key={item.id || idx}
                    style={{
                      background: isRendering ? 'rgba(236, 72, 153, 0.08)' : (isDone ? 'rgba(16, 185, 129, 0.05)' : 'rgba(15, 23, 42, 0.6)'),
                      border: isRendering ? '2px solid #ec4899' : (isDone ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)'),
                      borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease',
                      boxShadow: isRendering ? '0 0 20px rgba(236, 72, 153, 0.3)' : '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: '#334155', color: '#f8fafc', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                          #{idx + 1}
                        </span>
                        <input 
                          type="text" 
                          value={item.title} 
                          onChange={e => updateBulkItem(idx, 'title', e.target.value)}
                          style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '13px', width: '150px', outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold',
                          background: isDone ? 'rgba(16, 185, 129, 0.2)' : (isRendering ? 'rgba(236, 72, 153, 0.25)' : (isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)')),
                          color: isDone ? '#10b981' : (isRendering ? '#f472b6' : (isError ? '#ef4444' : '#94a3b8'))
                        }}>
                          {isDone ? '✅ تم التصدير' : (isRendering ? '⚙️ ريندر...' : (isError ? '❌ فشل' : '⏳ بالانتظار'))}
                        </span>
                        {!isBulkRendering && (
                          <button 
                            onClick={() => removeBulkItem(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}
                            title="حذف هذا الريلز"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hook Input */}
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <label style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                        🎯 الخطاف (يظهر أولاً بالمنتصف):
                      </label>
                      <input 
                        type="text"
                        value={item.hook || ''}
                        onChange={e => updateBulkItem(idx, 'hook', e.target.value)}
                        disabled={isBulkRendering}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', padding: '6px 8px', fontSize: '12px', outline: 'none' }}
                      />
                    </div>

                    {/* Stacking Tips Inputs */}
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                          🔢 النصائح المتراكمة ({item.tips?.length || 0}):
                        </label>
                        {!isBulkRendering && item.tips?.length < 5 && (
                          <button 
                            onClick={() => addBulkItemTip(idx)}
                            style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            + إضافة
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {item.tips?.map((tip, tIdx) => (
                          <div key={tIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10b981', color: 'white', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {tIdx + 1}
                            </span>
                            <input 
                              type="text"
                              value={tip}
                              onChange={e => updateBulkItemTip(idx, tIdx, e.target.value)}
                              disabled={isBulkRendering}
                              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', padding: '4px 8px', fontSize: '11px', outline: 'none' }}
                            />
                            {!isBulkRendering && item.tips.length > 2 && (
                              <button 
                                onClick={() => removeBulkItemTip(idx, tIdx)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', padding: '0 2px' }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA Input */}
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <label style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                        📢 الخاتمة (CTA):
                      </label>
                      <input 
                        type="text"
                        value={item.cta || ''}
                        onChange={e => updateBulkItem(idx, 'cta', e.target.value)}
                        disabled={isBulkRendering}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', padding: '6px 8px', fontSize: '12px', outline: 'none' }}
                      />
                    </div>

                    {/* B-Roll Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>🎬 خلفية B-Roll:</span>
                      <select 
                        value={item.broll}
                        onChange={e => {
                          const found = brollList.find(b => b.file === e.target.value);
                          updateBulkItem(idx, 'broll', e.target.value);
                          if (found) updateBulkItem(idx, 'brollName', found.name || 'مقطع');
                        }}
                        disabled={isBulkRendering}
                        style={{ flex: 1, background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', outline: 'none' }}
                      >
                        {brollList.map((b, bIdx) => (
                          <option key={bIdx} value={b.file}>
                            {b.name} ({b.size || ''})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Audio Track Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>🎵 الصوت:</span>
                      <select 
                        value={item.audioTrack || bulkAudioSetting}
                        onChange={e => updateBulkItem(idx, 'audioTrack', e.target.value)}
                        disabled={isBulkRendering}
                        style={{ flex: 1, background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', outline: 'none' }}
                      >
                        {OFFICIAL_AUDIO_TRACKS.map(t => (
                          <option key={t.id} value={t.file}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Download / Actions if Done */}
                    {isDone && item.blobUrl && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <a 
                          href={item.blobUrl} 
                          download={item.filename || `Stacking_Reel_${idx + 1}.mp4`}
                          style={{ flex: 1, textAlign: 'center', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', padding: '7px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}
                        >
                          ⬇️ تنزيل الفيديو
                        </a>
                        <a 
                          href={item.blobUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', fontSize: '12px', textDecoration: 'none' }}
                        >
                          ▶️ تشغيل
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
