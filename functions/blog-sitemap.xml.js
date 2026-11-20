// /blog-sitemap.xml : the list of blog posts for Google.
import { runBlog } from './_lib/blog.js';

export const onRequestGet = () => runBlog({ feed: 'sitemap' });
