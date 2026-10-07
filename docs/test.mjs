import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {languages,pages} from './content.mjs';
const out=resolve(dirname(fileURLToPath(import.meta.url)),'../site');
const base=(process.env.DOCS_BASE_URL||'https://usnuz.github.io/fragment-donor-sdk/').replace(/\/?$/,'/');
const sitemap=await readFile(join(out,'sitemap.xml'),'utf8');
const rootHtml=await readFile(join(out,'index.html'),'utf8');
assert(rootHtml.includes('<title>Telegram Stars API and Premium SDKs | Fragment Donor</title>'));
assert(rootHtml.includes('name="description"'));
assert(rootHtml.includes('type="application/ld+json"'));
assert(rootHtml.includes('en/guides/telegram-stars-api/'));
assert(rootHtml.includes('en/guides/buy-telegram-stars/'));
const intentSlugs=[
  'guides/buy-telegram-stars',
  'guides/telegram-stars-api',
  'guides/send-telegram-stars-to-username',
  'guides/telegram-premium-gift-api',
  'guides/telegram-stars-api-vs-bot-api',
  'guides/fragment-api-automation',
  'guides/payment-timeout-no-retry',
];
for(const slug of intentSlugs){
  const page=pages.find(item=>item.slug===slug);
  assert(page,`Missing search-intent page ${slug}`);
  for(const lang of languages){
    assert(page.title[lang].length>=25,`Weak search title ${lang}/${slug}`);
    assert(page.description[lang].length>=70,`Weak search description ${lang}/${slug}`);
  }
}
let count=0;
for(const lang of languages) for(const page of pages){
  const path=`${lang}/${page.slug?`${page.slug}/`:''}`;
  const html=await readFile(join(out,path,'index.html'),'utf8');
  assert(html.includes(`<html lang="${lang}">`));
  assert(html.includes(`<link rel="canonical" href="${base}${path}">`));
  assert(html.includes('<h1>')&&html.includes('<main id="content">'));
  assert(!/<meta[^>]*noindex/i.test(html));
  assert(!/<script(?![^>]*type="application\/ld\+json")/i.test(html),'Documentation cannot depend on executable JS');
  for(const alt of [...languages,'x-default']){
    const expected=`${alt==='x-default'?'en':alt}/${page.slug?`${page.slug}/`:''}`;
    const alternateUrl=alt==='x-default'&&!page.slug?base:base+expected;
    assert(html.includes(`hreflang="${alt}" href="${alternateUrl}"`));
  }
  assert(sitemap.includes(`<loc>${base}${path}</loc>`));
  const withoutScripts=html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
  assert(withoutScripts.includes(page.body[lang][0].slice(0,20)),`Visible content missing ${path}`);
  for(const match of html.matchAll(/href="([^"#]+)"/g)){
    if(/^(https?:|mailto:)/.test(match[1]))continue;
    const resolved=resolve(join(out,path),match[1]);
    assert(resolved.startsWith(out));
    const file=match[1].endsWith('/')?join(resolved,'index.html'):resolved;
    assert((await stat(file)).isFile(),`Broken link ${path}: ${match[1]}`);
  }
  count++;
}
assert.equal((sitemap.match(/<loc>/g)||[]).length,count+1);
assert((await readFile(join(out,'robots.txt'),'utf8')).includes(`${base}sitemap.xml`));
assert((await readFile(join(out,'BingSiteAuth.xml'),'utf8')).includes('0FC9BA2127C25CAF29E8D06CE963E168'));
console.log(`PASS: ${count} translated pages: static content, canonical, reciprocal hreflang, sitemap, internal links.`);
