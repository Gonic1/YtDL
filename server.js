const express = require('express');
const { execFile, spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

function getFormats(url, maxQuality) {
  return new Promise((resolve, reject) => {
    execFile('yt-dlp', ['-J', url], { maxBuffer: 1024 * 1024 * 100 }, (err, stdout, stderr) => {
      if (err) return reject(err);
      try {
        const info = JSON.parse(stdout);
        let formats = info.formats || [];
        const maxQ = parseInt(maxQuality, 10);
        if (!isNaN(maxQ)) formats = formats.filter(f => !f.height || f.height <= maxQ);
        const mapped = formats.map(f => ({
          id: f.format_id,
          qualityLabel: f.format_note || (f.height ? `${f.height}p` : null),
          container: f.ext,
          fps: f.fps,
          hasAudio: f.acodec && f.acodec !== 'none',
          size: f.filesize || f.filesize_approx,
        }));
        resolve({ title: info.title, thumbnail: info.thumbnail, formats: mapped });
      } catch (e) {
        reject(e);
      }
    });
  });
}

app.get('/api/formats', async (req, res) => {
  const { url, maxQuality } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });
  try {
    const data = await getFormats(url, maxQuality);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch formats' });
  }
});

app.get('/api/download', (req, res) => {
  const { id, url } = req.query;
  if (!id || !url) return res.status(400).json({ error: 'Missing id or url parameter' });

  const format = id.includes('+') ? id : `${id}+bestaudio/best`;
  res.setHeader('Content-Disposition', 'attachment');
  const ytdlp = spawn('yt-dlp', ['-f', format, '-o', '-', url], { stdio: ['ignore', 'pipe', 'inherit'] });

  ytdlp.stdout.pipe(res);
  ytdlp.on('error', err => {
    console.error(err);
    if (!res.headersSent) res.status(500).end('Download failed');
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

