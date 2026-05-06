/**
 * B-Roll Scanner
 * يمسح مجلد public/broll ويولد ملف manifest.json تلقائياً.
 * شغله بعد ما تضيف فيديوهات جديدة:  node scan-broll.cjs
 * أو سيشتغل تلقائياً قبل كل build.
 */
const fs = require('fs');
const path = require('path');

const brollDir = path.join(__dirname, 'public', 'broll');

if (!fs.existsSync(brollDir)) {
  fs.mkdirSync(brollDir, { recursive: true });
  console.log('📁 تم إنشاء مجلد public/broll — ضع فيديوهاتك فيه!');
}

const videoExts = ['.mp4', '.webm', '.mov', '.mkv'];
const files = fs.readdirSync(brollDir)
  .filter(f => videoExts.includes(path.extname(f).toLowerCase()))
  .sort();

const manifest = files.map(f => {
  const name = path.parse(f).name
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  const sizeBytes = fs.statSync(path.join(brollDir, f)).size;
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
  return {
    file: `/broll/${f}`,
    name: name,
    size: `${sizeMB} MB`
  };
});

fs.writeFileSync(
  path.join(brollDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);

console.log(`✅ تم مسح ${manifest.length} فيديو(هات) وحفظ manifest.json`);
manifest.forEach(v => console.log(`   🎬 ${v.name} (${v.size})`));
if (manifest.length === 0) {
  console.log('⚠️  المجلد فارغ! ضع ملفات MP4 في public/broll/ ثم شغل السكريبت مرة ثانية.');
}
