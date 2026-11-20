// /blog and /blog/ : the list of posts.
import { runBlog } from '../_lib/blog.js';

export const onRequestGet = () => runBlog({});
