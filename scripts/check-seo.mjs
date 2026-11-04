import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = '.next/server/app';
const sitemap = await readFile(`${root}/sitemap.xml.body`, 'utf8');
const routes = ['index.html', 'blog.html', 'showcase.html', 'docs.html'];
for (const directory of ['blog/p', 'blog/pulse', 'docs']) {
  const entries = await readdir(`${root}/${directory}`, { recursive: true });
  routes.push(...entries.filter((file) => file.endsWith('.html')).map((file) => `${directory}/${file}`));
}
for (const route of routes) {
  const html = await readFile(path.join(root, route), 'utf8');
  for (const [label, pattern] of [
    ['title', /<title>[^<]+\| Fiber Network<\/title>/],
    ['description', /<meta name="description" content="[^"]+"/],
    ['canonical', /<link rel="canonical" href="https:\/\/www\.fiber\.world/],
    ['social image', /property="og:image" content="https:\/\/www\.fiber\.world\/imgs\/fiber-og.png"/],
  ]) assert.match(html, pattern, `${route}: missing ${label}`);
  if (route.startsWith('blog/')) {
    assert.ok(sitemap.includes(`https://www.fiber.world/${route.replace(/\.html$/, '')}`), `${route}: absent from sitemap`);
  }
}
const blog = await readFile(`${root}/blog.html`, 'utf8');
for (const route of routes.filter((route) => route.startsWith('blog/'))) {
  assert.ok(blog.includes(`href="/${route.replace(/\.html$/, '')}"`), `${route}: absent from initial blog HTML`);
}
assert.ok(!sitemap.includes('Invalid Date'));
console.log(`SEO checks passed for ${routes.length} pages, including every local article and Pulse update.`);
