// Cloudflare Pages runs the same blog code as Vercel (api/blog.js).
// This small adapter turns a Cloudflare request into the req/res shape that
// file expects, so the blog looks identical on both hosts.
import handler from '../../api/blog.js';

export async function runBlog(query) {
  let status = 200;
  let body = '';
  const headers = new Headers();
  const res = {
    setHeader(name, value) { headers.set(name, value); return res; },
    status(code) { status = code; return res; },
    send(text) { body = text; return res; },
  };
  await handler({ query }, res);
  return new Response(body, { status, headers });
}
