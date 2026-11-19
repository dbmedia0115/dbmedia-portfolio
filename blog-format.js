// Turns a blog post's text into safe HTML. Used by the live blog (api/blog.js)
// and by the preview in blog-admin.html, so both always look the same.
//
// Writing rules (shown to you in the admin page too):
//   blank line          new paragraph
//   ## Heading          a heading
//   - item              a bullet list
//   **bold**  *italic*  [link text](https://...)
//   [photo 2]           puts photo 2 here (on its own line). Photos you don't
//                       place this way are shown together at the end.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BlogFormat = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var IMG_PREFIX = 'https://dktuxcqjrvpzhtcvhjvl.supabase.co/storage/v1/object/public/blog/';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Only photos uploaded to the blog storage are ever shown.
  function safeImg(url) {
    return typeof url === 'string' && url.indexOf(IMG_PREFIX) === 0 && !/["'<>\s]/.test(url) ? url : '';
  }

  function inline(text) {
    var out = esc(text);
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, label, url) {
      var ext = url.indexOf('dreambigmedia.co.uk') === -1;
      return '<a href="' + url + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>';
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    return out;
  }

  function figure(img, n, title) {
    var url = safeImg(img && img.url);
    if (!url) return '';
    var alt = (img.caption || title || 'Photo ' + n);
    return '<figure class="bp-photo"><a href="' + url + '" class="bp-zoom" data-n="' + n + '">' +
      '<img src="' + url + '" alt="' + esc(alt) + '" loading="lazy"' +
      (img.w && img.h ? ' width="' + (+img.w) + '" height="' + (+img.h) + '"' : '') + '></a>' +
      (img.caption ? '<figcaption>' + esc(img.caption) + '</figcaption>' : '') + '</figure>';
  }

  // Returns { html, rest } where rest = photos not placed in the text.
  function renderBody(body, images, title) {
    images = Array.isArray(images) ? images : [];
    var used = {};
    var blocks = String(body || '').replace(/\r\n?/g, '\n').split(/\n{2,}/);
    var html = [];
    blocks.forEach(function (block) {
      var lines = block.split('\n').filter(function (l) { return l.trim() !== ''; });
      if (!lines.length) return;
      var buf = [];
      function flush() {
        if (!buf.length) return;
        if (buf.every(function (l) { return /^\s*[-*]\s+/.test(l); })) {
          html.push('<ul>' + buf.map(function (l) { return '<li>' + inline(l.replace(/^\s*[-*]\s+/, '')) + '</li>'; }).join('') + '</ul>');
        } else {
          html.push('<p>' + buf.map(inline).join('<br>') + '</p>');
        }
        buf = [];
      }
      lines.forEach(function (line) {
        var t = line.trim();
        var ph = t.match(/^\[photo\s+(\d+)\]$/i);
        var hd = t.match(/^#{2,3}\s+(.+)$/);
        if (ph) {
          flush();
          var n = parseInt(ph[1], 10);
          if (images[n - 1] && !used[n]) { used[n] = true; html.push(figure(images[n - 1], n, title)); }
        } else if (hd) {
          flush();
          html.push('<h2>' + inline(hd[1]) + '</h2>');
        } else {
          buf.push(line);
        }
      });
      flush();
    });
    var rest = [];
    images.forEach(function (img, i) { if (!used[i + 1] && safeImg(img && img.url)) rest.push({ img: img, n: i + 1 }); });
    return { html: html.join('\n'), rest: rest, figure: figure };
  }

  function restGrid(rest, title) {
    if (!rest.length) return '';
    return '<div class="bp-grid">' + rest.map(function (r) { return figure(r.img, r.n, title); }).join('') + '</div>';
  }

  function fmtDate(d) {
    if (!d) return '';
    var dt = new Date(String(d).length === 10 ? d + 'T12:00:00Z' : d);
    if (isNaN(dt)) return '';
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
  }

  function excerptOf(post) {
    if (post.excerpt) return post.excerpt;
    var plain = String(post.body || '').replace(/^\s*[-*]\s+/gm, '').replace(/\[photo\s+\d+\]/gi, '').replace(/[#*\[\]]|\(https?:[^)]+\)/g, '').replace(/\s+/g, ' ').trim();
    return plain.length > 180 ? plain.slice(0, 177).replace(/\s+\S*$/, '') + '…' : plain;
  }

  return { esc: esc, safeImg: safeImg, inline: inline, renderBody: renderBody, restGrid: restGrid, fmtDate: fmtDate, excerptOf: excerptOf, IMG_PREFIX: IMG_PREFIX };
});
