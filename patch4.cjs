const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Add premium-reel mode button
const modeTabsStart = `<button \n            onClick={() => setAppMode('carousel')}`;
const modeTabsReplace = `<button 
            onClick={() => setAppMode('carousel')} 
            style={{ flex: 1, padding: '10px', background: appMode === 'carousel' ? 'var(--primary-color)' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >📸 مصنع الكاروسيل</button>
          <button 
            onClick={() => setAppMode('premium-reel')} 
            style={{ flex: 1, padding: '10px', background: appMode === 'premium-reel' ? '#f59e0b' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
          >💼 الفيديوهات الاحترافية</button>
          <button 
            onClick={() => setAppMode('video')}`;
content = content.replace(`<button \n            onClick={() => setAppMode('carousel')} \n            style={{ flex: 1, padding: '10px', background: appMode === 'carousel' ? 'var(--primary-color)' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}\n          >📸 مصنع الكاروسيل</button>\n          <button \n            onClick={() => setAppMode('video')}`, modeTabsReplace);

// 2. Add State for premium-reel
const stateSection = `const [bgColor, setBgColor] = useState('#0f172a');`;
const premiumState = `const [bgColor, setBgColor] = useState('#0f172a');
  const [premiumTopic, setPremiumTopic] = useState("");
  const [premiumTweet, setPremiumTweet] = useState(null);
  const [activeBroll, setActiveBroll] = useState('/broll/broll1.mp4');
  const premiumVideoRef = useRef(null);`;
content = content.replace(stateSection, premiumState);

// 3. Add Premium Script Generator
const generatorSection = `const generateVideoScript = async () => {`;
const premiumGenerator = `const generatePremiumTweet = async () => {
    if (!premiumTopic) return;
    setLoading(true);
    setLoadingMsg("جاري كتابة تغريدة مهنية فخمة بالذكاء الاصطناعي...");
    try {
      const prompt = \`أنت مستشار توظيف (ATS) وروتيني سعودي محترف. 
      الموضوع: "\${premiumTopic}".
      اكتب "تغريدة" (Tweet) احترافية وعميقة جداً تقدم نصيحة قوية للعاطلين أو الباحثين عن عمل.
      يجب أن تكون التغريدة واقعية، لا تستخدم إيموجي طفولية.
      رد بنص التغريدة فقط، بدون أي مقدمات أو تنسيق JSON. أقصى حد 250 حرف.\`;
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
        
        await new Promise((resolve) => {
            video.oncanplay = resolve;
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
            a.download = \`Premium_Reel_\${Date.now()}.\${options.mimeType.includes('mp4') ? 'mp4' : 'webm'}\`;
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
        alert("فشل الرندر: " + e.message);
        setLoading(false);
    }
  };

  const generateVideoScript = async () => {`;
content = content.replace(generatorSection, premiumGenerator);


// 4. Add Premium Tab UI in Sidebar
const sidebarAppModeCheck = `{appMode === 'carousel' ? (`;
const sidebarPremiumUI = `{appMode === 'premium-reel' ? (
          <div className="glass-panel" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '10px', color: '#f59e0b', display: 'flex', justifyContent: 'space-between' }}>
                <span>💼 مصنع الريلز الاحترافي (B-Roll)</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '15px' }}>
              هذا القسم يولد فيديوهات هادئة واحترافية لحسابك (تغريدة + فيديو مكتبي). المقطع يُحفظ مدمجاً جاهزاً للرفع!
            </p>
            
            <label style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '8px' }}>اختر خلفية الفيديو (B-Roll):</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => setActiveBroll('/broll/broll1.mp4')} style={{ flex: 1, padding: '8px', background: activeBroll === '/broll/broll1.mp4' ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px' }}>💻 ماك بوك</button>
                <button onClick={() => setActiveBroll('/broll/broll2.mp4')} style={{ flex: 1, padding: '8px', background: activeBroll === '/broll/broll2.mp4' ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px' }}>🌳 عمل بالخارج</button>
                <button onClick={() => setActiveBroll('/broll/broll3.mp4')} style={{ flex: 1, padding: '8px', background: activeBroll === '/broll/broll3.mp4' ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px' }}>☕ قهوة ومكتب</button>
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
        ) : appMode === 'carousel' ? (`;
content = content.replace(sidebarAppModeCheck, sidebarPremiumUI);

// 5. Add Premium Preview UI
const previewCheck = `) : (
          /* VIDEO ENGINE PREVIEW */`;
const premiumPreview = `) : appMode === 'premium-reel' ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '80vh' }}>
            <div style={{ position: 'relative', width: '400px', height: '711px', background: '#000', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                {/* Background Video Preview */}
                <video src={activeBroll} autoPlay loop muted playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                
                {/* Overlay Tweet Mockup */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    {premiumTweet ? (
                        <div id="premium-tweet-mockup" style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', width: '100%', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src="/logo.png" style={{ width: '48px', height: '48px', borderRadius: '50%' }} alt="Avatar" />
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>سيرتك علينا ✔️</span>
                                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>@seartk3</span>
                                </div>
                            </div>
                            <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', lineHeight: '1.5', textAlign: 'right', whiteSpace: 'pre-wrap' }}>
                                {premiumTweet}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '5px' }}>
                                {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute:'2-digit' })} · {new Date().toLocaleDateString('ar-SA')} · <b>Professional ATS</b>
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>قم بتوليد تغريدة مهنية لرؤية المعاينة</div>
                    )}
                </div>
            </div>
          </div>
        ) : (
          /* VIDEO ENGINE PREVIEW */`;
content = content.replace(previewCheck, premiumPreview);

// Convert back to CRLF
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx modified with Premium Reel Canvas Exporter!');
