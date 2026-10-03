// The website's small amount of behaviour: language (English / Hebrew), the trailers (a Hebrew one appears
// as soon as its file is published), copying a trailer's link, and the drifting postcards.
const TRAILERS = [
  { id: 'en', file: 'media/trailer-en.mp4', poster: 'media/poster-en.jpg', page: 'trailer-en.html', name: { en: 'The Trailer', he: 'הטריילר באנגלית' }, sub: { en: 'In English · 1:36', he: 'English · 1:36' } },
  { id: 'he', file: 'media/trailer-he.mp4', poster: 'media/poster-he.jpg', page: 'trailer-he.html', name: { en: 'Hebrew Trailer', he: 'הטריילר בעברית' }, sub: { en: 'עברית · 1:36', he: 'בעברית · 1:36' } },
];

const UI = {
  copy: { en: '🔗 Copy link', he: '🔗 העתקת קישור' },
  copied: { en: '✓ Link copied!', he: '✓ הקישור הועתק!' },
  share: { en: '📤 Share', he: '📤 שיתוף' },
  open: { en: '⤢ Open', he: '⤢ פתיחה' },
  soon: { en: 'Coming soon', he: 'בקרוב' },
  soonSub: { en: 'Being made right now', he: 'ממש עכשיו בהכנה' },
  shareText: { en: 'Pip & the Postcards: a cozy 3D adventure around the world. Watch the trailer!', he: 'פיפ והגלויות: הרפתקת תלת־ממד מסביב לעולם. צפו בטריילר!' },
};

export function getLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'he' || q === 'en') return q;
  try { const s = localStorage.getItem('pip-site-lang'); if (s === 'he' || s === 'en') return s; } catch (_) { /* private mode */ }
  return (navigator.language || '').toLowerCase().startsWith('he') ? 'he' : 'en';
}

export function applyLang(lang) {
  const root = document.documentElement;
  root.lang = lang; root.dir = lang === 'he' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-en]').forEach((el) => { el.innerHTML = el.dataset[lang] ?? el.dataset.en; });
  const t = document.querySelector(`meta[name="title-${lang}"]`); if (t) document.title = t.content;
}

/** Copy text to the clipboard (with a fallback for older phones). */
async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* fall back */ }
  const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ }
  ta.remove(); return ok;
}

export const pageUrl = (t) => new URL(t.page, location.href).href;

/** "Copy link" and "Share" buttons for one trailer. */
export function actions(t, lang) {
  const box = document.createElement('div'); box.className = 'actions';
  const c = document.createElement('button'); c.className = 'btn'; c.type = 'button'; c.textContent = UI.copy[lang];
  c.addEventListener('click', async () => {
    const ok = await copy(pageUrl(t));
    c.textContent = ok ? UI.copied[lang] : pageUrl(t); c.classList.toggle('done', ok);
    setTimeout(() => { c.textContent = UI.copy[lang]; c.classList.remove('done'); }, 2200);
  });
  box.appendChild(c);
  if (navigator.share) {
    const s = document.createElement('button'); s.className = 'btn'; s.type = 'button'; s.textContent = UI.share[lang];
    s.addEventListener('click', () => navigator.share({ title: document.title, text: UI.shareText[lang], url: pageUrl(t) }).catch(() => {}));
    box.appendChild(s);
  }
  return box;
}

/** The homepage's trailer cards. */
export async function trailers(lang) {
  const box = document.getElementById('trailers');
  if (!box) return;
  box.innerHTML = '';
  // the Hebrew trailer first for Hebrew readers
  const list = lang === 'he' ? [...TRAILERS].reverse() : TRAILERS;
  for (const t of list) {
    let ready = false;
    try { ready = (await fetch(t.file, { method: 'HEAD' })).ok; } catch (_) { /* offline */ }
    const card = document.createElement('article'); card.className = 'trailer'; card.id = 'trailer-' + t.id;
    const frame = document.createElement('div'); frame.className = 'frame';
    if (ready) {
      const v = document.createElement('video');
      v.src = t.file; v.poster = t.poster; v.controls = true; v.preload = 'metadata'; v.playsInline = true; v.setAttribute('playsinline', '');
      frame.appendChild(v);
    } else {
      frame.innerHTML = `<div class="soon">${UI.soon[lang]}<small>${UI.soonSub[lang]}</small></div>`;
    }
    card.appendChild(frame);
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.innerHTML = `<div class="name">${t.name[lang]}<small>${t.sub[lang]}</small></div>`;
    if (ready) {
      const a = actions(t, lang);
      const o = document.createElement('a'); o.className = 'btn'; o.href = t.page; o.textContent = UI.open[lang];
      a.appendChild(o);
      meta.appendChild(a);
    }
    card.appendChild(meta);
    box.appendChild(card);
  }
  // only one trailer plays at a time
  box.querySelectorAll('video').forEach((v) => v.addEventListener('play', () => box.querySelectorAll('video').forEach((o) => { if (o !== v) o.pause(); })));
}

/** A few postcards drifting up behind the page. */
export function sky() {
  const s = document.createElement('div'); s.className = 'sky';
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('i');
    p.style.left = `${(i * 7.3 + 3) % 100}%`;
    p.style.animationDuration = `${26 + (i * 7) % 18}s`;
    p.style.animationDelay = `${-((i * 11) % 30)}s`;
    p.style.setProperty('--r0', `${(i % 2 ? -1 : 1) * (10 + i * 3)}deg`);
    p.style.setProperty('--r1', `${(i % 2 ? 1 : -1) * (14 + i * 2)}deg`);
    s.appendChild(p);
  }
  document.body.prepend(s);
}

/** The trailer page: start playing at once (with sound if the browser allows it, else muted + a sound button). */
export function watch(id) {
  const t = TRAILERS.find((x) => x.id === id);
  // a shared trailer link opens in the trailer's own language (unless the link says otherwise)
  const q = new URLSearchParams(location.search).get('lang');
  const lang = q === 'he' || q === 'en' ? q : id;
  applyLang(lang);
  sky();
  const v = document.querySelector('.player video'), un = document.querySelector('.unmute');
  v.play().catch(() => { v.muted = true; return v.play().then(() => un.classList.add('show')).catch(() => {}); });
  un.addEventListener('click', () => { v.muted = false; v.currentTime = 0; v.play(); un.classList.remove('show'); });
  v.addEventListener('volumechange', () => { if (!v.muted) un.classList.remove('show'); });
  document.querySelector('.bar .actions').replaceWith(actions(t, lang));
  document.querySelector('.lang')?.addEventListener('click', () => { const l = document.documentElement.lang === 'he' ? 'en' : 'he'; try { localStorage.setItem('pip-site-lang', l); } catch (_) { /* ignore */ } applyLang(l); document.querySelector('.bar .actions').replaceWith(actions(t, l)); });
}

/** The homepage. */
export function home() {
  let lang = getLang();
  applyLang(lang);
  sky();
  trailers(lang);
  document.querySelector('.lang').addEventListener('click', () => {
    lang = lang === 'he' ? 'en' : 'he';
    try { localStorage.setItem('pip-site-lang', lang); } catch (_) { /* ignore */ }
    applyLang(lang); trailers(lang);
  });
}
