import {mkdir, writeFile, copyFile, readFile, cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, dirname, join} from 'node:path';
import {languages, ui, pages} from './content.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site');
const base = (process.env.DOCS_BASE_URL || 'https://usnuz.github.io/fragment-donor-sdk/').replace(/\/?$/, '/');
const repo = 'https://github.com/usnuz/fragment-donor-sdk';
// Reuse the tested package examples rather than maintaining divergent snippets.
for(const [id,file] of Object.entries({python:'python/examples/all_endpoints.py',typescript:'typescript/examples/all-endpoints.mjs',php:'php/examples/quickstart.php',dotnet:'dotnet/examples/QuickStart/Program.cs'})) {
  const example=await readFile(join(root,file),'utf8');
  for(const page of pages.filter(p=>p.sdk===id||p.exampleSdk===id))page.code=example;
}
for(const [id,fence] of Object.entries({go:'go',rust:'rust',ruby:'ruby'})){
  const readme=await readFile(join(root,id,'README.md'),'utf8');
  const match=readme.match(new RegExp('```'+fence+'[^\\r\\n]*\\r?\\n([\\s\\S]*?)```'));
  if(!match)throw new Error(`Missing native example: ${id}`);
  pages.find(p=>p.sdk===id).code=match[1].trim();
}
const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pathFor = (lang, slug) => `${lang}/${slug ? slug+'/' : ''}`;
const urlFor = (lang, slug) => base+pathFor(lang,slug);
const relRoot = slug => '../'.repeat(1+(slug ? slug.split('/').length : 0));
const style = `:root{color-scheme:light dark;--bg:#f7f9fc;--fg:#16243b;--muted:#50617a;--card:#fff;--line:#d7e1ef;--accent:#0759b7}*{box-sizing:border-box}body{margin:0;font:17px/1.65 system-ui,sans-serif;background:var(--bg);color:var(--fg)}a{color:var(--accent);text-underline-offset:.18em}header{background:var(--card);border-bottom:1px solid var(--line)}.top{max-width:1160px;margin:auto;padding:20px 24px;display:flex;gap:24px;align-items:center;justify-content:space-between;flex-wrap:wrap}.brand{font-size:20px;font-weight:750;text-decoration:none}nav{display:flex;gap:18px;flex-wrap:wrap}.layout{max-width:1160px;margin:auto;display:grid;grid-template-columns:240px minmax(0,1fr);gap:40px;padding:32px 24px}aside{font-size:14px}aside a{display:block;padding:6px 0}aside h2{font-size:15px;margin:20px 0 6px}main{min-width:0;max-width:840px}h1{font-size:clamp(28px,4vw,40px);line-height:1.2;letter-spacing:-.03em}h2{font-size:23px}p{margin:1em 0}.lead{font-size:19px;color:var(--muted)}.notice{padding:16px 20px;border-left:4px solid #e8a800;background:var(--card);border-radius:6px}.release{font-size:13px;color:var(--muted)}pre{overflow:auto;padding:20px;border:1px solid var(--line);border-radius:9px;background:var(--card);font:14px/1.6 ui-monospace,monospace}code{font-family:ui-monospace,monospace}footer{max-width:1160px;margin:24px auto;padding:24px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}.languages{display:flex;gap:12px}.languages [aria-current=page]{font-weight:750}.chooser{max-width:720px;margin:12vh auto;padding:24px}.chooser a{display:block;padding:12px;border-bottom:1px solid var(--line)}@media(max-width:760px){.layout{display:block;padding:24px 18px}aside{margin-top:30px;border-top:1px solid var(--line)}.top{padding:16px 18px}.layout main{grid-row:1}}@media(prefers-color-scheme:dark){:root{--bg:#101824;--fg:#e5edf8;--muted:#a2b3ca;--card:#162235;--line:#33455e;--accent:#8dc3ff}}`;
await mkdir(out,{recursive:true});
await writeFile(join(out,'style.css'),style+'\n.layout main{grid-column:2;grid-row:1}.layout aside{grid-column:1;grid-row:1}');
await writeFile(join(out,'.nojekyll'),'');
const topicAlternates = slug => languages.map(lang=>`<link rel="alternate" hreflang="${lang}" href="${urlFor(lang,slug)}">`).join('\n')+`\n<link rel="alternate" hreflang="x-default" href="${slug?urlFor('en',slug):base}">`;
const navGroups = ['reference','sdks','guides'];
for (const lang of languages) for (const page of pages) {
  const t=ui[lang];
  if (!page.title[lang] || !page.description[lang] || !page.body[lang]?.length) throw new Error(`Incomplete translation ${lang}/${page.slug}`);
  const prefix=relRoot(page.slug);
  const canonical=urlFor(lang,page.slug);
  const navigation=navGroups.map(group=>`<h2>${escape(t[group])}</h2>${pages.filter(p=>p.group===group).map(p=>`<a href="${prefix}${pathFor(lang,p.slug)}"${p.slug===page.slug?' aria-current="page"':''}>${escape(p.title[lang])}</a>`).join('')}`).join('');
  const code=(title,value)=>`<h2>${escape(title)}</h2><pre><code>${escape(value)}</code></pre>`;
  const structured = JSON.stringify({'@context':'https://schema.org','@type':'TechArticle',headline:page.title[lang],description:page.description[lang],inLanguage:lang,url:canonical,author:{'@type':'Organization',name:'Fragment Donor SDK contributors'},isPartOf:{'@type':'WebSite',name:'Fragment Donor SDK',url:base}}).replace(/</g,'\\u003c');
  const html=`<!doctype html>\n<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(page.title[lang])} | Fragment Donor</title><meta name="description" content="${escape(page.description[lang])}"><link rel="canonical" href="${canonical}">${topicAlternates(page.slug)}<meta property="og:title" content="${escape(page.title[lang])}"><meta property="og:description" content="${escape(page.description[lang])}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="article"><link rel="stylesheet" href="${prefix}style.css"><script type="application/ld+json">${structured}</script></head><body><header><div class="top"><a class="brand" href="${prefix}${lang}/">Fragment Donor SDK</a><nav class="languages" aria-label="Language">${languages.map(l=>`<a href="${prefix}${pathFor(l,page.slug)}" lang="${l}" hreflang="${l}"${lang===l?' aria-current="page"':''}>${escape(ui[l].name)}</a>`).join('')}</nav><a href="${repo}">${escape(t.source)}</a></div></header><div class="layout"><main id="content"><p class="release">${escape(t.release)}</p><h1>${escape(page.title[lang])}</h1><p class="lead">${escape(page.description[lang])}</p>${page.sensitive?`<p class="notice">${escape(t.credential)}</p>`:''}${page.body[lang].map(p=>`<p>${escape(p)}</p>`).join('')}${page.install?code(t.install,page.install):''}${page.code?code(t.example,page.code):''}${page.response?code(t.response,page.response):''}${page.packageReadme?`<p><a href="${page.packageReadme}">${escape(t.source)} · ${escape(page.sdk)}</a></p>`:''}<h2>${escape(t.related)}</h2><p><a href="${prefix}${lang}/guides/rate-limit-flood-wait/">${escape(pages.find(p=>p.slug==='guides/rate-limit-flood-wait').title[lang])}</a> · <a href="${prefix}${lang}/guides/credentials/">${escape(pages.find(p=>p.slug==='guides/credentials').title[lang])}</a> · <a href="${prefix}${lang}/faq/">FAQ</a></p><p><a href="${prefix}openapi.json">OpenAPI 3.0</a> · <a href="${prefix}postman.json">Postman collection</a></p></main><aside aria-label="${escape(t.nav)}"><a href="${prefix}${lang}/">${escape(t.home)}</a>${navigation}</aside></div><footer>${escape(t.disclaimer)}<br><a href="${repo}/blob/main/publishing/publication-status.json">Publication status</a> · <a href="${repo}/blob/main/LICENSE">MIT License</a></footer></body></html>`;
  const directory=join(out,pathFor(lang,page.slug));
  await mkdir(directory,{recursive:true});
  const demoLabel={en:'Safe synthetic demo',ru:'Безопасное синтетическое демо',uz:'Xavfsiz sintetik demo'}[lang];
  await writeFile(join(directory,'index.html'),html.replace('</footer>',`<br><a href="${prefix}postman.environment.json">Postman environment (empty secrets)</a> · <a href="${prefix}demo/">${demoLabel}</a> · <a href="${prefix}demo/media/walkthrough-en.mp4">50s synthetic video (EN)</a></footer>`));
}
const rootAlternates=languages.map(l=>`<link rel="alternate" hreflang="${l}" href="${base}${l}/">`).join('');
await writeFile(join(out,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fragment Donor SDK — choose a language</title><meta name="description" content="Independent Telegram Stars and Premium SDK documentation in English, Russian and Uzbek."><link rel="canonical" href="${base}">${rootAlternates}<link rel="alternate" hreflang="x-default" href="${base}"><link rel="stylesheet" href="style.css"></head><body><main class="chooser"><h1>Fragment Donor SDK</h1><p>Independent Telegram Stars and Premium API clients.</p>${languages.map(l=>`<a href="${l}/" hreflang="${l}" lang="${l}">${escape(ui[l].name)}</a>`).join('')}<p>Not an official Telegram, Fragment, or TON product.</p></main></body></html>`);
const entries=[base,...languages.flatMap(lang=>pages.map(page=>urlFor(lang,page.slug)))];
await writeFile(join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(url=>`<url><loc>${url}</loc></url>`).join('')}</urlset>`);
await writeFile(join(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n`);
await copyFile(join(root,'contract','openapi.json'),join(out,'openapi.json'));
await copyFile(join(root,'contract','postman.json'),join(out,'postman.json'));
await copyFile(join(root,'contract','postman.environment.json'),join(out,'postman.environment.json'));
await import('../demo/build.mjs');
await cp(join(root,'publishing','media'),join(out,'demo','media'),{recursive:true});
console.log(`Built ${entries.length} static multilingual pages; no JavaScript required for content.`);
