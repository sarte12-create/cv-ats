const key = "AIzaSyDOECoGIYEjzenOl3bF_b0z6BhluzCNrvw";
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Hello" }] }]
    })
}).then(res => res.json()).then(console.log);
