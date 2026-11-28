// Renders the public blog: /blog (all posts), /blog/<slug> (one post) and
// /blog-sitemap.xml. Pages are built on the server so Facebook, WhatsApp,
// LinkedIn, X and Google see the title, text and photo of each post.
const F = require('../blog-format.js');

const SITE = 'https://www.dreambigmedia.co.uk';
const SUPABASE_URL = 'https://dktuxcqjrvpzhtcvhjvl.supabase.co';
const KEY = 'sb_publishable_v06XMnd_nvUi-tzA_eviug_M4KEobnk'; // public key, safe to show
const FIELDS = 'slug,title,excerpt,body,event_date,location,cover_url,images,published_at,updated_at';

async function db(query) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?${query}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`Database error ${r.status}`);
  return r.json();
}

const esc = F.esc;
const enc = encodeURIComponent;

const CSS = `*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;color:#0a0a0a;background:#f4f3ee;line-height:1.65}
a{color:inherit}img{max-width:100%;display:block}.wrap{max-width:880px;margin:0 auto;padding:0 22px}.narrow{max-width:720px}
header{border-bottom:2px solid #0a0a0a;background:#f4f3ee}header .wrap{display:flex;align-items:center;justify-content:space-between;height:68px;max-width:1100px}
.logo{font-family:'Archivo Black',sans-serif;text-decoration:none;font-size:20px;letter-spacing:.02em}
.nav a{text-decoration:none;font-weight:600;font-size:14px;margin-left:18px}.nav a.on{color:#8c1d18}
.kicker{color:#8c1d18;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:13px;margin:48px 0 8px}
h1{font-family:'Archivo Black',sans-serif;font-size:clamp(30px,6vw,52px);line-height:1.05;margin:0 0 16px;text-transform:uppercase}
.intro{font-size:19px;color:#3a3935;max-width:640px;margin:0 0 36px}
.posts{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px;margin:0 0 56px}
.pc{background:#fff;border:1px solid #d8d6cf;border-radius:14px;overflow:hidden;text-decoration:none;display:flex;flex-direction:column;transition:transform .15s}
.pc:hover{transform:translateY(-3px)}.pc .im{aspect-ratio:3/2;background:#e6e4dd;overflow:hidden}.pc .im img{width:100%;height:100%;object-fit:cover}
.pc .tx{padding:18px 20px 22px}.pc .meta{font-size:12px;color:#8c1d18;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.pc h2{font-size:20px;line-height:1.25;margin:6px 0 8px}.pc p{margin:0;color:#4a4943;font-size:15px}
.empty{background:#fff;border:1px dashed #b9b6ad;border-radius:14px;padding:40px;text-align:center;color:#6b6a64;margin-bottom:56px}
.meta-line{color:#6b6a64;font-size:15px;margin:0 0 22px}.cover{margin:0 0 30px;border-radius:14px;overflow:hidden}.cover img{width:100%}
.post{font-size:18px}.post p{margin:0 0 1.1em}.post h2{font-family:'Archivo Black',sans-serif;text-transform:uppercase;font-size:22px;margin:1.6em 0 .5em;line-height:1.2}
.post ul{padding-left:1.2em;margin:0 0 1.1em}.post a{color:#8c1d18}
.bp-photo{margin:26px 0}.bp-photo img{width:100%;height:auto;border-radius:10px;cursor:zoom-in}.bp-photo figcaption{font-size:14px;color:#6b6a64;margin-top:6px}
.bp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:30px 0}.bp-grid .bp-photo{margin:0}
.bp-grid .bp-photo img{aspect-ratio:1;object-fit:cover}
.share{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:26px 0;padding:16px 0;border-top:1px solid #d8d6cf;border-bottom:1px solid #d8d6cf}
.share b{font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin-right:6px}
.share a,.share button{display:inline-flex;align-items:center;gap:6px;border:1.5px solid #0a0a0a;background:#fff;border-radius:999px;padding:7px 13px;font:600 13px Inter,sans-serif;text-decoration:none;cursor:pointer;color:#0a0a0a}
.share a:hover,.share button:hover{background:#0a0a0a;color:#fff}.share svg{width:15px;height:15px}
.share .native{background:#0a0a0a;color:#fff}
.btn{display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:13px;padding:15px 24px;border:2px solid #0a0a0a;margin:10px 10px 0 0}
.cta{background:#0a0a0a;color:#fff;border-radius:14px;padding:34px 28px;margin:40px 0 50px}.cta h2{font-family:'Archivo Black',sans-serif;text-transform:uppercase;margin:0 0 8px}
.cta p{color:#cfcdc6;margin:0 0 10px}.cta .btn{background:#fff;color:#0a0a0a;border-color:#fff}
.more h2{font-family:'Archivo Black',sans-serif;text-transform:uppercase;font-size:20px;margin:0 0 16px}.back{font-weight:600;display:inline-block;margin:0 0 50px}
footer{border-top:1px solid #d8d6cf;padding:24px 0;color:#6b6a64;font-size:14px}
#lb{position:fixed;inset:0;background:rgba(10,10,10,.94);display:none;align-items:center;justify-content:center;z-index:50}
#lb.on{display:flex}#lb img{max-width:94vw;max-height:88vh;border-radius:6px}#lb button{position:absolute;background:none;border:0;color:#fff;font-size:34px;cursor:pointer;padding:14px}
#lb .x{top:6px;right:10px}#lb .p{left:6px}#lb .n{right:6px}#toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#0a0a0a;color:#fff;padding:10px 16px;border-radius:8px;font-size:14px;display:none;z-index:60}
@media(max-width:600px){.post{font-size:17px}.nav a{margin-left:12px}.logo{font-size:15px;white-space:nowrap}.bp-grid{grid-template-columns:1fr 1fr;gap:8px}}`;

function head({ title, description, url, image, type, jsonLd }) {
  const img = image || `${SITE}/og-image.jpg`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="Dream Big Media">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(img)}">
<link rel="alternate" type="application/rss+xml" title="Dream Big Media blog" href="${SITE}/blog/rss.xml">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-LH663L66SJ"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-LH663L66SJ');</script>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\' + 'u003c')}</script>` : ''}
<style>${CSS}</style>
</head>
<body>
<header><div class="wrap"><a class="logo" href="/">DREAM BIG MEDIA</a><nav class="nav"><a href="/">Work</a><a class="on" href="/blog">Blog</a><a href="/?enquire=Event">Contact</a></nav></div></header>`;
}

const FOOT = `<footer><div class="wrap">Dream Big Media — Nottingham, UK · <a href="/">dreambigmedia.co.uk</a> · <a href="/blog">Blog</a></div></footer>`;

function card(p) {
  const img = F.safeImg(p.cover_url) || F.safeImg((p.images || [])[0] && p.images[0].url);
  const ci = (p.images || []).find(i => i && i.url === img) || {};
  const fx = Number.isFinite(+ci.fx) ? Math.max(0, Math.min(100, +ci.fx)) : 50;
  const fy = Number.isFinite(+ci.fy) ? Math.max(0, Math.min(100, +ci.fy)) : 50;
  const pos = (fx !== 50 || fy !== 50) ? ` style="object-position:${fx}% ${fy}%"` : '';
  const meta = [F.fmtDate(p.event_date || p.published_at), p.location].filter(Boolean).join(' · ');
  return `<a class="pc" href="/blog/${esc(p.slug)}">${img ? `<div class="im"><img src="${img}" alt="${esc(p.title)}" loading="lazy"${pos}></div>` : ''}<div class="tx"><div class="meta">${esc(meta)}</div><h2>${esc(p.title)}</h2><p>${esc(F.excerptOf(p))}</p></div></a>`;
}

const ICONS = {
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.4V11H7v4h3v9h4v-9h3l1-4h-4V8.6c0-.4.3-.6.6-.6z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.1-4.7-4.1-4.8-4.3-.1-.2-1.2-1.5-1.2-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.1z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4z"/></svg>',
  pinterest: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.5 2.1-.8 3.3-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.5 2.1-4.5 4.4 0 .9.3 1.8.8 2.3l.1.4-.3 1.2c0 .2-.2.3-.4.2-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2.1-1.3 2.8A10 10 0 1 0 12 2z"/></svg>',
  threads: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.7 11.2c-.1 0-.2-.1-.3-.1-.2-3-1.8-4.7-4.6-4.7-1.7 0-3.1.7-3.9 2l1.5 1c.6-.9 1.6-1.1 2.4-1.1 1 0 1.7.3 2.2.8.3.4.5.9.6 1.6-.8-.1-1.7-.2-2.6-.1-2.6.1-4.3 1.7-4.2 3.8.1 1.1.6 2 1.5 2.6.8.5 1.8.8 2.8.7 1.4-.1 2.5-.6 3.2-1.6.6-.8.9-1.7 1-3 .7.4 1.2.9 1.4 1.6.5 1.1.5 2.9-1 4.4-1.3 1.3-2.9 1.9-5.2 1.9-2.6 0-4.6-.9-5.9-2.5-1.2-1.6-1.9-3.8-1.9-6.6s.6-5 1.9-6.6C6.7 3.9 8.7 3 11.3 3c2.6 0 4.6.9 6 2.5.7.8 1.2 1.8 1.5 2.9l1.8-.5c-.4-1.4-1-2.6-1.9-3.6C17 2.1 14.5 1 11.3 1 8.1 1 5.6 2.1 4 4.2 2.6 6.1 1.8 8.7 1.8 12s.8 5.9 2.2 7.8C5.6 21.9 8.1 23 11.3 23c2.9 0 4.9-.8 6.6-2.4 2.2-2.2 2.1-5 1.4-6.6-.5-1.2-1.5-2.2-2.6-2.8zm-4.9 4.6c-1.1.1-2.2-.4-2.3-1.4 0-.7.5-1.6 2.4-1.7h.7c.7 0 1.3.1 1.9.2-.2 2.4-1.4 2.8-2.7 2.9z"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
};

function shareBar(url, title, image) {
  const u = enc(url), t = enc(title);
  const links = [
    ['facebook', 'Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['whatsapp', 'WhatsApp', `https://wa.me/?text=${t}%20${u}`],
    ['x', 'X', `https://twitter.com/intent/tweet?url=${u}&text=${t}`],
    ['linkedin', 'LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ['threads', 'Threads', `https://www.threads.net/intent/post?text=${t}%20${u}`],
    ['pinterest', 'Pinterest', `https://pinterest.com/pin/create/button/?url=${u}&description=${t}${image ? `&media=${enc(image)}` : ''}`],
    ['email', 'Email', `mailto:?subject=${t}&body=${u}`],
  ];
  return `<div class="share"><b>Share</b><button type="button" class="native" data-share hidden>${ICONS.share}Share…</button>` +
    links.map(([k, label, href]) => `<a href="${esc(href)}" data-net="${k}" target="_blank" rel="noopener" aria-label="Share on ${label}">${ICONS[k]}${label}</a>`).join('') +
    `<button type="button" data-copy>${ICONS.link}Copy link</button></div>`;
}

const POST_JS = `<div id="lb"><button class="x" aria-label="Close">×</button><button class="p" aria-label="Previous">‹</button><img alt=""><button class="n" aria-label="Next">›</button></div><div id="toast"></div>
<script>(function(){
var url=document.querySelector('link[rel=canonical]').href,title=document.title;
function toast(m){var t=document.getElementById('toast');t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(function(){t.style.display='none'},2500)}
function ev(n){try{gtag('event','share',{method:n,item_id:location.pathname})}catch(e){}}
document.querySelectorAll('[data-share]').forEach(function(b){if(navigator.share){b.hidden=false;b.onclick=function(){navigator.share({title:title,url:url}).then(function(){ev('native')}).catch(function(){})}}});
document.querySelectorAll('[data-copy]').forEach(function(b){b.onclick=function(){(navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){toast('Link copied. Paste it in your Instagram or TikTok bio, story or DM.');ev('copy')}).catch(function(){prompt('Copy this link:',url)})}});
document.querySelectorAll('[data-net]').forEach(function(a){a.addEventListener('click',function(){ev(a.getAttribute('data-net'))})});
var imgs=[].slice.call(document.querySelectorAll('.bp-zoom')),lb=document.getElementById('lb'),li=lb.querySelector('img'),i=0;
function show(k){i=(k+imgs.length)%imgs.length;li.src=imgs[i].href;li.alt=imgs[i].querySelector('img').alt;lb.classList.add('on')}
imgs.forEach(function(a,k){a.onclick=function(e){e.preventDefault();show(k)}});
lb.querySelector('.x').onclick=function(){lb.classList.remove('on')};lb.querySelector('.p').onclick=function(){show(i-1)};lb.querySelector('.n').onclick=function(){show(i+1)};
lb.onclick=function(e){if(e.target===lb)lb.classList.remove('on')};
document.addEventListener('keydown',function(e){if(!lb.classList.contains('on'))return;if(e.key==='Escape')lb.classList.remove('on');if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});
var sx=null;lb.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});lb.addEventListener('touchend',function(e){if(sx==null)return;var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>50)show(d<0?i+1:i-1);sx=null});
})();</script>`;

function listPage(posts) {
  const url = `${SITE}/blog`;
  const desc = 'Stories from events, shoots and projects by Dream Big Media, a photographer and videographer in Nottingham.';
  return head({
    title: 'Blog | Dream Big Media', description: desc, url, type: 'website',
    jsonLd: { '@context': 'https://schema.org', '@type': 'Blog', name: 'Dream Big Media blog', url, description: desc,
      blogPost: posts.slice(0, 20).map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}/blog/${p.slug}`, datePublished: p.published_at })) },
  }) + `
<main class="wrap">
<div class="kicker">Blog</div>
<h1>Behind the shoots</h1>
<p class="intro">Events I've covered, shoots I've loved and what went into them. Photography and video from Nottingham and beyond.</p>
${posts.length ? `<div class="posts">${posts.map(card).join('')}</div>` : '<div class="empty">The first post is on its way.</div>'}
<div class="cta"><h2>Planning an event?</h2><p>Tell me the date and what you have in mind, and I'll come back with availability and a quote.</p><a class="btn" href="/?enquire=Event">Get a quote</a></div>
</main>
${FOOT}
</body></html>`;
}

function postPage(p, others) {
  const url = `${SITE}/blog/${p.slug}`;
  const images = Array.isArray(p.images) ? p.images : [];
  const cover = F.safeImg(p.cover_url);
  const shareImg = cover || F.safeImg(images[0] && images[0].url);
  const desc = F.excerptOf(p) || `${p.title}, by Dream Big Media.`;
  const body = F.renderBody(p.body, images, p.title);
  const meta = [p.event_date ? F.fmtDate(p.event_date) : '', p.location].filter(Boolean).join(' · ');
  return head({
    title: `${p.title} | Dream Big Media`, description: desc, url, image: shareImg, type: 'article',
    jsonLd: { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: desc, url,
      image: [shareImg, ...images.map(i => F.safeImg(i.url))].filter(Boolean).slice(0, 10),
      datePublished: p.published_at, dateModified: p.updated_at,
      author: { '@type': 'Organization', name: 'Dream Big Media', url: SITE },
      publisher: { '@type': 'Organization', name: 'Dream Big Media', logo: { '@type': 'ImageObject', url: `${SITE}/apple-touch-icon.png` } },
      mainEntityOfPage: url },
  }) + `
<main class="wrap narrow">
<div class="kicker">${p.published_at ? esc(F.fmtDate(p.published_at)) : 'Blog'}</div>
<h1>${esc(p.title)}</h1>
${meta ? `<p class="meta-line">${esc(meta)}</p>` : ''}
${cover ? `<div class="cover"><img src="${cover}" alt="${esc(p.title)}"></div>` : ''}
${shareBar(url, p.title, shareImg)}
<article class="post">
${body.html}
${F.restGrid(body.rest.filter(r => r.img.url !== cover), p.title)}
</article>
${shareBar(url, p.title, shareImg)}
<div class="cta"><h2>Want something like this?</h2><p>I photograph and film events, parties, launches and more. Tell me your date and I'll send a quote.</p><a class="btn" href="/?enquire=Event">Get a quote</a></div>
${others.length ? `<section class="more"><h2>More from the blog</h2><div class="posts">${others.map(card).join('')}</div></section>` : ''}
<a class="back" href="/blog">← All posts</a>
</main>
${FOOT}
${POST_JS}
</body></html>`;
}

function notFound() {
  return head({ title: 'Post not found | Dream Big Media', description: 'This post is not available.', url: `${SITE}/blog`, type: 'website' }) +
    `<main class="wrap"><div class="kicker">Blog</div><h1>Post not found</h1><p class="intro">This post may have moved or been taken down.</p><a class="btn" href="/blog">See all posts</a><div style="height:60px"></div></main>${FOOT}</body></html>`;
}

function xmlEsc(s) { return esc(s); }

function sitemap(posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${SITE}/blog</loc>${posts[0] ? `<lastmod>${String(posts[0].updated_at).slice(0, 10)}</lastmod>` : ''}</url>
${posts.map(p => `<url><loc>${SITE}/blog/${xmlEsc(p.slug)}</loc><lastmod>${String(p.updated_at).slice(0, 10)}</lastmod></url>`).join('\n')}
</urlset>`;
}

function rss(posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Dream Big Media blog</title><link>${SITE}/blog</link><description>Events and shoots by Dream Big Media, Nottingham.</description>
${posts.slice(0, 30).map(p => `<item><title>${xmlEsc(p.title)}</title><link>${SITE}/blog/${xmlEsc(p.slug)}</link><guid>${SITE}/blog/${xmlEsc(p.slug)}</guid><pubDate>${new Date(p.published_at).toUTCString()}</pubDate><description>${xmlEsc(F.excerptOf(p))}</description></item>`).join('\n')}
</channel></rss>`;
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const slug = typeof q.slug === 'string' ? q.slug.toLowerCase() : '';
  try {
    if (q.feed === 'sitemap' || q.feed === 'rss') {
      const posts = await db(`select=slug,title,excerpt,body,published_at,updated_at&status=eq.published&order=published_at.desc&limit=1000`);
      res.setHeader('Content-Type', q.feed === 'rss' ? 'application/rss+xml; charset=utf-8' : 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
      return res.status(200).send(q.feed === 'rss' ? rss(posts) : sitemap(posts));
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!slug) {
      const posts = await db(`select=${FIELDS}&status=eq.published&order=published_at.desc&limit=100`);
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
      return res.status(200).send(listPage(posts));
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(404).send(notFound());
    }
    const [post] = await db(`select=${FIELDS}&status=eq.published&slug=eq.${enc(slug)}&limit=1`);
    if (!post) {
      res.setHeader('Cache-Control', 'public, s-maxage=30');
      return res.status(404).send(notFound());
    }
    const others = await db(`select=${FIELDS}&status=eq.published&slug=neq.${enc(slug)}&order=published_at.desc&limit=3`);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
    return res.status(200).send(postPage(post, others));
  } catch (e) {
    console.error(e);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).send('<!DOCTYPE html><title>Blog unavailable</title><p style="font-family:sans-serif;padding:40px">The blog is having a moment. Please try again shortly. <a href="/">Back to Dream Big Media</a></p>');
  }
};
