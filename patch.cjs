const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Update Video Idea fetcher (it's already there)
// 2. Update prompt
const oldPrompt = `      const prompt = \`أنت صانع محتوى "ترند القراءة الصامتة" (Silent Fast-Reading Phonk) في تيك توك بالسعودية. الموضوع: "\${videoTopic}". 
      الهدف: الترويج لخدمة كتابة سيرة ذاتية (CV) تتوافق مع نظام (ATS) بشكل احترافي.
      شروط كتابة السكربت:
      1. الخطاف (Hook): يجب أن يكون صادماً، مستفزاً، أو يكشف سراً (مثال: "معلومة بتصدمك عن الـ HR"، "ليش تنرفض وأنت الأفضل؟").
      2. السرعة والتقطيع: لا تكتب جملاً طويلة أبداً! قسّم النص إلى عبارات قصيرة جداً (كلمتين إلى 4 كلمات كحد أقصى لكل سطر) مع إيموجي معبر لكل سطر.
      3. الأسلوب: لهجة بيضاء سعودية، إيقاع سريع، يعطي معلومة صادمة ثم يقدم الحل.
      4. الخاتمة (CTA): طلب التواصل لتجهيز سيرة ذاتية لا ترفض (عبر رابط البايو أو الخاص).
      
      رد بمصفوفة JSON فقط بالشكل التالي:
      {
        "lines": [
          "سر خطير! 🤫",
          "عن التوظيف 🏢",
          "90% ينرفضون ❌",
          "بسبب الروبوت 🤖",
          "سيرتك غير مقروءة 📄",
          "الحل عندي ✔️",
          "تواصل معي الآن 📲"
        ]
      }\`;`;

const newPrompt = `      const prompt = \`أنت صانع محتوى "ترند القراءة الصامتة" (Silent Fast-Reading Phonk) في تيك توك بالسعودية. الموضوع: "\${videoTopic}". 
      الهدف: الترويج لخدمة كتابة سيرة ذاتية (CV) تتوافق مع نظام (ATS) بشكل احترافي.
      شروط كتابة السكربت:
      1. الخطاف (Hook): يجب أن يكون صادماً، مستفزاً، أو يكشف سراً (مثال: "معلومة بتصدمك عن الـ HR"، "ليش تنرفض وأنت الأفضل؟").
      2. السرعة والتقطيع: لا تكتب جملاً طويلة أبداً! قسّم النص إلى عبارات قصيرة جداً (كلمتين إلى 4 كلمات كحد أقصى لكل سطر).
      3. الإيموجي بذكاء: لا تضع إيموجي في كل سطر! ضع إيموجي واحد فقط في السطور المهمة التي تحتوي على كلمات قوية (مثل: خطر، فلوس، رفض، نجاح). السطور العادية اجعلها سادة وبدون إيموجي لتكون جدية.
      4. الخاتمة (CTA): طلب التواصل لتجهيز سيرة ذاتية لا ترفض (عبر رابط البايو أو الخاص).
      
      رد بمصفوفة JSON فقط بالشكل التالي:
      {
        "lines": [
          "سر خطير! 🤫",
          "عن التوظيف",
          "90% ينرفضون ❌",
          "بسبب الروبوت",
          "سيرتك غير مقروءة",
          "الحل عندي ✔️",
          "تواصل معي الآن 📲"
        ]
      }\`;`;

content = content.replace(oldPrompt, newPrompt);

// 3. Update Video UI Sidebar
const oldSidebar = `          /* VIDEO MODE SIDEBAR */
          <div className="glass-panel" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '10px', color: 'white' }}>🎥 صانع الفيديوهات القصيرة</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '15px' }}>اكتب فكرة وسيقوم الذكاء الاصطناعي ببناء خطاف وسكربت، ثم سيقرأه النظام بصوت ذكي!</p>
            <input type="text" value={videoTopic} onChange={(e) => setVideoTopic(e.target.value)} placeholder="مثال: كيف تتجاوز نظام الفرز الآلي في يومين..." className="glass-input" />
            <button className="glass-button" onClick={generateVideoScript} disabled={loading} style={{ background: 'linear-gradient(135deg, #e92a67, #be123c)' }}>✨ {loading ? "جاري التأليف..." : "توليد سكربت الفيديو"}</button>
            {videoScript && (`;

const newSidebar = `          /* VIDEO MODE SIDEBAR */
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
            <button className="glass-button" onClick={generateVideoScript} disabled={loading} style={{ background: 'linear-gradient(135deg, #e92a67, #be123c)' }}>✨ {loading ? "جاري التأليف..." : "توليد السكربت"}</button>
            
            {videoScript && (`;

content = content.replace(oldSidebar, newSidebar);

// 4. Implement recordVideo function
const oldStartRecording = `  const startRecordingMode = async () => {
    if (!videoScript || videoScript.length === 0) {
        alert("⚠️ عذراً! يجب توليد السكربت أولاً.");
        return;
    }
    const container = document.getElementById('video-export-container');
    if (!container) return;
    
    try {
        if (container.requestFullscreen) {
            await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) { // Safari
            await container.webkitRequestFullscreen();
        }
    } catch (e) {
        console.warn("Fullscreen API not supported:", e);
        alert("متصفحك لا يدعم وضع الشاشة الكاملة التلقائي، قم بتسجيل الشاشة الآن مباشرة.");
    }

    // Wait a brief moment for fullscreen transition, then auto-play
    setTimeout(() => {
        playVideo();
    }, 1000);
  };`;

const newStartRecording = `  const startRecordingMode = async () => {
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
            a.download = \`seartk_reel_\${Date.now()}.webm\`;
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
  };`;

content = content.replace(oldStartRecording, newStartRecording);

// 5. Update Preview UI (Themes + Buttons)
const oldPreviewUI = `              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <button onClick={() => setBgColor('#0f172a')} style={{ padding: '8px 15px', background: '#0f172a', borderRadius: '8px', color: 'white', border: bgColor === '#0f172a' ? '2px solid white' : 'none' }}>مظلم 🌙</button>
                    <button onClick={() => setBgColor('#00ff00')} style={{ padding: '8px 15px', background: '#00ff00', borderRadius: '8px', color: 'black', fontWeight: 'bold', border: bgColor === '#00ff00' ? '2px solid white' : 'none' }}>كروما (شاشة خضراء) 🟩</button>
                </div>
                
                <div id="video-export-container" className="video-canvas-mockup" style={{ background: bgColor || '#0f172a', border: bgColor === '#00ff00' ? 'none' : '' }}>
                  <div className="video-content-wrapper" style={{ justifyContent: 'center' }}>
                    {currentLine > 0 && (
                      <div className="video-text-line past-line">
                        {videoScript[currentLine - 1]}
                      </div>
                    )}
                    
                    <div className="video-text-line active-line">
                      {videoScript[currentLine]}
                    </div>
                    
                    {currentLine < videoScript.length - 1 && (
                      <div className="video-text-line future-line">
                        {videoScript[currentLine + 1]}
                      </div>
                    )}
                  </div>
                  
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
              </div>`;

const newPreviewUI = `              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', marginBottom: '15px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>اختر قالب الفيديو:</div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button onClick={() => setBgColor('#0f172a')} style={{ flex: 1, padding: '8px', background: '#0f172a', borderRadius: '8px', color: 'white', border: bgColor === '#0f172a' ? '2px solid white' : '1px solid #333' }}>الظلام (Dark) 🌙</button>
                      <button onClick={() => setBgColor('#991b1b')} style={{ flex: 1, padding: '8px', background: '#991b1b', borderRadius: '8px', color: 'white', border: bgColor === '#991b1b' ? '2px solid white' : '1px solid #333' }}>الهجومي (Red) 🛑</button>
                      <button onClick={() => setBgColor('#00ff00')} style={{ flex: 1, padding: '8px', background: '#00ff00', borderRadius: '8px', color: 'black', fontWeight: 'bold', border: bgColor === '#00ff00' ? '2px solid white' : '1px solid #333' }}>كروما (للمونتاج) 🟩</button>
                  </div>
                </div>
                
                <div id="video-export-container" className="video-canvas-mockup" style={{ background: bgColor || '#0f172a', border: bgColor === '#00ff00' ? 'none' : '' }}>
                  <div className="video-content-wrapper" style={{ justifyContent: 'center' }}>
                    {currentLine > 0 && (
                      <div className="video-text-line past-line">
                        {videoScript[currentLine - 1]}
                      </div>
                    )}
                    
                    <div className="video-text-line active-line">
                      {videoScript[currentLine]}
                    </div>
                    
                    {currentLine < videoScript.length - 1 && (
                      <div className="video-text-line future-line">
                        {videoScript[currentLine + 1]}
                      </div>
                    )}
                  </div>
                  
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
              </div>`;

content = content.replace(oldPreviewUI, newPreviewUI);

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx successfully patched via script.');
