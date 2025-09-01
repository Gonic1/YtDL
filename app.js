// --- Configuration ---
function renderFormats(data, videoUrl){
const list = byId('results');
list.innerHTML = '';


if(!data || !Array.isArray(data.formats) || data.formats.length === 0){
list.innerHTML = '<div class="result-item">No formats found. Try a different quality or check the URL.</div>';
show(list, true); return;
}


data.formats.forEach(f => {
const row = document.createElement('div');
row.className = 'result-item';
const href = f.directUrl ? f.directUrl : `${API_BASE}/download?id=${encodeURIComponent(f.id)}&url=${encodeURIComponent(videoUrl)}`;
row.innerHTML = `
<div>
<div><strong>${f.qualityLabel || '—'}</strong> <span class="muted">· ${f.container?.toUpperCase() || '—'}${f.fps?` · ${f.fps}fps`:''}</span></div>
<div class="badges">
<span class="badge ${f.hasAudio? 'accent':''}">${f.hasAudio? 'Audio included' : 'Video‑only'}</span>
<span class="badge">${fmtBytes(f.size)}</span>
${f.note ? `<span class="badge">${f.note}</span>`: ''}
</div>
</div>
<div class="row">
<button class="btn secondary" data-copy data-val="${href}">Copy link</button>
<a class="btn" rel="noopener" href="${href}">Download</a>
</div>
`;
list.appendChild(row);
});


// Bind copy buttons
list.querySelectorAll('[data-copy]').forEach(btn => {
btn.addEventListener('click', async () => {
try{ await navigator.clipboard.writeText(btn.getAttribute('data-val')); toast('Copied to clipboard') }catch{ toast('Copy failed') }
})
})


show(list, true);
}


// --- Networking ---
async function fetchFormats(videoUrl, maxQ){
if(MOCK_MODE){
await new Promise(r=>setTimeout(r, 500));
return {
title: 'Sample Video Title',
thumbnail: '',
formats: [
{ id: 'bv_2160', qualityLabel: '2160p', container: 'mp4', fps: 30, hasAudio: false, size: 1873210934, note:'Use backend to mux audio' },
{ id: 'av_160', qualityLabel: 'Audio 160kbps', container: 'm4a', hasAudio: true, size: 12483921 },
{ id: 'muxed_1080', qualityLabel: '1080p', container: 'mp4', fps: 30, hasAudio: true, size: 382193421 }
]
};
}
const res = await fetch(`${API_BASE}/formats?url=${encodeURIComponent(videoUrl)}&maxQuality=${maxQ}`);
if(!res.ok) throw new Error('Failed to fetch formats');
return await res.json();
}


// --- Event wiring ---
window.addEventListener('DOMContentLoaded', () => {
byId('analyzeBtn').addEventListener('click', async () => {
const url = byId('url').value.trim();
const q = byId('quality').value;
const status = byId('status');


if(!url){ byId('url').focus(); return; }
const vid = extractVideoId(url);
if(!vid){ status.textContent = 'Please enter a valid YouTube URL.'; return; }


status.textContent = 'Analyzing video and fetching available formats…';
try{
const data = await fetchFormats(url, q);
status.textContent = '';
renderFormats(data, url);
}catch(err){
console.error(err);
status.innerHTML = `<span style="color:var(--danger)">Error: ${err.message || 'Could not get formats'}</span>`;
show(byId('results'), false);
}
});
});
