// /blog/<slug> : one post.  /blog/rss.xml : the RSS feed.
import { runBlog } from '../_lib/blog.js';

export const onRequestGet = ({ params }) =>
  params.slug === 'rss.xml' ? runBlog({ feed: 'rss' }) : runBlog({ slug: String(params.slug) });
