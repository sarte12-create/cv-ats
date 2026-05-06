import fs from 'fs';
import https from 'https';
import path from 'path';

const videos = [
    { name: 'broll1.mp4', url: 'https://cdn.coverr.co/videos/coverr-someone-typing-on-a-macbook-5034/1080p.mp4' },
    { name: 'broll2.mp4', url: 'https://cdn.coverr.co/videos/coverr-typing-on-a-laptop-while-sitting-in-a-park-5120/1080p.mp4' },
    { name: 'broll3.mp4', url: 'https://cdn.coverr.co/videos/coverr-pouring-coffee-5183/1080p.mp4' }
];

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return download(response.headers.location, dest).then(resolve).catch(reject);
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
};

const dir = path.join(process.cwd(), 'public', 'broll');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

async function run() {
    for (const v of videos) {
        console.log(`Downloading ${v.name}...`);
        await download(v.url, path.join(dir, v.name));
        console.log(`Saved ${v.name}`);
    }
}
run();
