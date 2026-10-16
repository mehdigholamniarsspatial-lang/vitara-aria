import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const required=['dist/index.html','dist/app.js','dist/data.js','dist/engine.js','dist/styles.css','dist/assets/favicon.svg','dist/assets/Vazirmatn-Regular.woff2','dist/assets/Vazirmatn-Bold.woff2','dist/assets/OFL.txt','dist/assets/aria-gholamnia.jpg','vercel.json'];
for(const f of required)if(!fs.existsSync(path.join(root,f)))throw Error('Missing file: '+f);
for(const f of ['app','data','engine'])execFileSync(process.execPath,['--check',`dist/${f}.js`],{stdio:'inherit'});
const html=fs.readFileSync('dist/index.html','utf8'), css=fs.readFileSync('dist/styles.css','utf8');
if(!html.includes('lang="fa" dir="rtl"'))throw Error('Persian RTL document attributes missing');
if(/\son\w+\s*=/.test(html))throw Error('Inline event handlers are not permitted');
for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){const value=match[1];if(!/^(https?:|#|data:)/.test(value)&&!fs.existsSync(path.join(root,'dist',value)))throw Error('Broken local asset '+value);}
for(const match of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))if(!fs.existsSync(path.join(root,'dist',match[1])))throw Error('Broken CSS asset '+match[1]);
const conf=JSON.parse(fs.readFileSync('vercel.json','utf8'));
if(conf.outputDirectory!=='dist'||conf.framework!==null)throw Error('Static Vercel config mismatch');
const bytes=required.filter(f=>f.startsWith('dist/')).reduce((sum,f)=>sum+fs.statSync(f).size,0);
console.log(`Static checks passed. ${required.length} required files; ${(bytes/1024).toFixed(1)} KiB uncompressed application assets. No runtime dependencies.`);
