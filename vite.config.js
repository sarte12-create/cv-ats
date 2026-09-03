import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

function videoRenderPlugin() {
  return {
    name: 'video-render-server',
    configureServer(server) {
      server.middlewares.use('/api/render-reel', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          const tempDir = path.resolve(process.cwd(), '.temp_render_' + Date.now());
          try {
            const { broll, durations, frames, title } = JSON.parse(body);
            if (!broll || !durations || !frames || frames.length === 0) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing parameters' }));
              return;
            }

            fs.mkdirSync(tempDir, { recursive: true });

            // 1. Resolve B-roll path
            const cleanBroll = broll.startsWith('/') ? broll.substring(1) : broll;
            const brollPath = path.resolve(process.cwd(), 'public', cleanBroll);
            if (!fs.existsSync(brollPath)) {
              throw new Error(`B-roll file not found: ${brollPath}`);
            }

            // 2. Write overlay frames to temp png files
            const framePaths = [];
            for (let i = 0; i < frames.length; i++) {
              const base64Data = frames[i].replace(/^data:image\/\w+;base64,/, '');
              const filePath = path.join(tempDir, `frame_${i}.png`);
              fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
              framePaths.push(filePath);
            }

            // 3. Compute step time thresholds (in seconds)
            const totalDurationSec = durations.reduce((a, b) => a + b, 0) / 1000;
            const thresholds = [];
            let acc = 0;
            for (let d of durations) {
              acc += d;
              thresholds.push(acc / 1000);
            }

            // 4. Build FFmpeg filter_complex graph
            let filterGraph = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,drawbox=x=0:y=0:w=1080:h=1920:color=black@0.4:t=fill[v_bg];`;
            let lastV = 'v_bg';

            for (let i = 0; i < framePaths.length; i++) {
              const startT = i === 0 ? 0 : thresholds[i - 1].toFixed(3);
              const endT = thresholds[i].toFixed(3);
              const nextV = `v_${i}`;
              const isLast = i === framePaths.length - 1;
              const enableCondition = isLast ? `gte(t,${startT})` : `between(t,${startT},${endT})`;
              filterGraph += `[${lastV}][${i + 1}:v]overlay=0:0:enable='${enableCondition}'${isLast ? '[vout]' : `[${nextV}];`}`;
              lastV = nextV;
            }

            const outPath = path.join(tempDir, 'output.mp4');
            const inputArgs = framePaths.map(p => `-i "${p}"`).join(' ');

            const ffmpegCmd = `ffmpeg -y -stream_loop -1 -i "${brollPath}" ${inputArgs} -t ${totalDurationSec.toFixed(2)} -filter_complex "${filterGraph}" -map "[vout]" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p "${outPath}"`;

            await execPromise(ffmpegCmd);

            if (!fs.existsSync(outPath)) {
              throw new Error('FFmpeg failed to produce output file');
            }

            const stat = fs.statSync(outPath);
            res.writeHead(200, {
              'Content-Type': 'video/mp4',
              'Content-Length': stat.size,
              'Content-Disposition': `attachment; filename="${encodeURIComponent(title || 'reel')}.mp4"`,
              'X-Render-Engine': 'ffmpeg-hardware-accelerated'
            });

            const stream = fs.createReadStream(outPath);
            stream.pipe(res);
            stream.on('end', () => {
              try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
            });
          } catch (err) {
            console.error('Render error:', err);
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), videoRenderPlugin()],
});
