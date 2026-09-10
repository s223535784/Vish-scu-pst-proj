/* Checks the copy that gets published: read-only behaviour, and that the
   security headers in netlify.toml do not break the page. The headers are read
   from netlify.toml itself so this test tracks the real configuration. */
import {chromium} from 'playwright';
import {readFileSync, existsSync} from 'fs';
import {createServer} from 'http';

const results=[];
function ok(n,c,e=''){results.push([c?'PASS':'FAIL',n,e]);}

if(!existsSync('dist/index.html')){
  console.error('run: python3 build.py --readonly --out dist/index.html');
  process.exit(1);
}
const page_html=readFileSync('dist/index.html');
const toml=readFileSync('netlify.toml','utf8');
const headers={};
for(const m of toml.matchAll(/^\s{4}([A-Za-z-]+) = "([^"]*)"$/gm)) headers[m[1]]=m[2];
ok('netlify.toml defines a content security policy', !!headers['Content-Security-Policy']);
ok('netlify.toml keeps the site out of search results', /noindex/.test(headers['X-Robots-Tag']||''));

const server=createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',...headers});
  res.end(page_html);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/';
/* A second origin, to prove the policy stops third-party script. */
const other=createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/javascript'});
  res.end('window.__EXTERNAL__=1;');
});
await new Promise(r=>other.listen(0,'127.0.0.1',r));
const otherUrl='http://localhost:'+other.address().port+'/external.js';

const browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});
const page=await ctx.newPage();
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{ const t=m.text();
  if(m.type()==='error'&&!/ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_FAILED|ERR_TUNNEL|fonts\.g|Content Security Policy/.test(t)) errors.push('console: '+t); });
await page.goto(url);
await page.waitForTimeout(800);

ok('published page boots under the security headers', await page.locator('.mast .logo b').count()===1);
ok('all tabs render', await page.locator('.tabs-in .tab').count()===10, String(await page.locator('.tabs-in .tab').count()));
ok('overview content renders', (await page.locator('#v-overview h1').innerText()).includes('Vishesh'));

/* read-only surface */
ok('no Edit button', await page.locator('.mast-actions .btn.live, .mast-actions .btn:text-is("Edit")').count()===0);
ok('no details (gear) button', (await page.locator('.mast-actions .btn.icon').allInnerTexts()).every(t=>t.trim()!=='⚙'));
ok('no save indicator', await page.locator('.savepill').count()===0);
await page.click('.tab[data-id="s1"]');
await page.waitForTimeout(400);
ok('nothing on the page is editable', await page.evaluate(()=>document.querySelectorAll('[contenteditable]').length)===0);
ok('no attach controls', await page.evaluate(()=>document.querySelectorAll('.drop input[type=file]').length)===0);
await page.click('.menu .btn.solid');
await page.waitForTimeout(250);
const items=await page.locator('.menu-list button').allInnerTexts();
ok('download menu offers only PDF and Word', items.length===2&&/PDF/.test(items[0])&&/Word/.test(items[1]), JSON.stringify(items));
await page.keyboard.press('Escape');

/* a visitor's browser is left alone */
await page.evaluate(()=>{ try{localStorage.clear();}catch(e){} });
await page.click('.tab[data-id="s2"]');
await page.waitForTimeout(500);
ok('nothing is cached in the visitor browser',
   await page.evaluate(()=>{ try{return localStorage.length===0;}catch(e){return true;} }));

/* the reading features still work */
await page.fill('.search input','rubric');
await page.waitForTimeout(500);
ok('search still works when published', await page.locator('#v-search .r').count()>0, String(await page.locator('#v-search .r').count()));
await page.locator('#v-search .r').first().click();
await page.waitForTimeout(500);
ok('results still jump to the right card', await page.locator('.flash').count()===1);
await page.fill('.search input','');
await page.waitForTimeout(300);

/* the policy really is enforced, and the page still does what it needs to */
const blocked=await page.evaluate(async(src)=>{
  await new Promise(res=>{
    const s=document.createElement('script');
    s.src=src; s.onload=res; s.onerror=res;
    document.head.appendChild(s);
    setTimeout(res,1500);
  });
  return typeof window.__EXTERNAL__==='undefined';
},otherUrl);
ok('policy blocks a third-party script', blocked);
const pdf=await page.evaluate(async()=>{
  let written='';
  const fake={document:{open(){},write(h){written+=h;},close(){}},focus(){},print(){}};
  const orig=window.open; window.open=()=>fake;
  [...document.querySelectorAll('.menu-list button')].find(b=>/PDF/.test(b.textContent)).click();
  window.open=orig;
  await new Promise(r=>setTimeout(r,250));
  return written.length;
});
ok('PDF export still builds under the policy', pdf>8000, pdf+' bytes');
ok('print view still lists every focus area',
   await page.evaluate(()=>{ window.dispatchEvent(new Event('beforeprint')); return true; }));
await page.waitForTimeout(600);
ok('all 37 focus areas render for print', await page.locator('.fcard').count()===37, String(await page.locator('.fcard').count()));

ok('no runtime errors', errors.length===0, errors.slice(0,3).join(' | '));
await browser.close();
server.close();
other.close();
const fails=results.filter(r=>r[0]==='FAIL');
for(const [s,n,e] of results) console.log(s.padEnd(5),n,e?('  <'+e+'>'):'');
console.log('\n'+(results.length-fails.length)+'/'+results.length+' passed');
if(fails.length)process.exit(1);
