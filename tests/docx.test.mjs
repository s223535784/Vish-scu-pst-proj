/* The Word preview is rendered by the page itself, with no library and no
   network. These checks run against real .docx files in tests/fixtures. */
import {chromium} from 'playwright';
import {readFileSync} from 'fs';

const FILE='file://'+process.cwd()+'/index.html';
const results=[];
function ok(n,c,e=''){results.push([c?'PASS':'FAIL',n,e]);}

const browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});
const page=await ctx.newPage();
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{ if(m.type()==='error'&&!/ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_FAILED|fonts\.googleapis/.test(m.text())) errors.push('console: '+m.text()); });

/* Block every outbound request so the preview is proven to work offline. */
await ctx.route(/^https?:\/\//, route => route.abort());
await page.goto(FILE);
await page.waitForTimeout(600);
ok('page boots with the network blocked', await page.locator('.mast .logo b').count()===1);
ok('no library is fetched from a CDN', !(await page.content()).includes('cdnjs'));

for(const [label,file] of [['deflated','observation.docx'],['stored','observation-stored.docx']]){
  await page.click('.tab[data-id="s6"]');
  await page.waitForTimeout(300);
  if(!(await page.evaluate(()=>document.body.classList.contains('editing')))){
    await page.click('.mast-actions .btn'); await page.waitForTimeout(350);
  }
  await page.locator('#f6-3 .drop input[type="file"]').setInputFiles({
    name:file, mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer:readFileSync('tests/fixtures/'+file)});
  await page.waitForTimeout(900);
  await page.locator('#f6-3 .doc').first().click();
  await page.waitForTimeout(1200);
  const r=await page.evaluate(()=>{
    const d=document.querySelector('#viewer .docx-render');
    if(!d)return {missing:document.querySelector('#viewer .viewer-note')?.textContent||'nothing'};
    return {
      h1:[...d.querySelectorAll('h1')].map(e=>e.textContent),
      h2:[...d.querySelectorAll('h2')].map(e=>e.textContent),
      bold:[...d.querySelectorAll('strong')].map(e=>e.textContent),
      italic:[...d.querySelectorAll('em')].map(e=>e.textContent),
      underline:[...d.querySelectorAll('u')].map(e=>e.textContent),
      strike:[...d.querySelectorAll('s')].map(e=>e.textContent),
      sub:[...d.querySelectorAll('sub')].map(e=>e.textContent),
      lists:d.querySelectorAll('ul').length,
      items:[...d.querySelectorAll('li')].map(e=>e.textContent),
      nested:!!d.querySelector('ul ul li'),
      quote:[...d.querySelectorAll('blockquote')].map(e=>e.textContent),
      link:(()=>{const a=d.querySelector('a');return a?{href:a.getAttribute('href'),text:a.textContent}:null;})(),
      rows:d.querySelectorAll('tr').length,
      cells:[...d.querySelectorAll('td')].map(e=>e.textContent),
      img:(()=>{const i=d.querySelector('img');return i?{src:i.src.slice(0,22),alt:i.alt,w:i.naturalWidth}:null;})(),
      br:d.querySelectorAll('br').length,
      tab:d.querySelectorAll('.dx-tab').length,
      amp:d.textContent.includes('safety. Year 7')||d.textContent.includes('& safety'),
      html:d.innerHTML.length
    };
  });
  const t=' ('+label+')';
  ok('renders a heading'+t, r.h1&&r.h1[0]==='Lesson Observation Feedback', JSON.stringify(r.h1||r.missing));
  ok('renders a subheading'+t, r.h2&&r.h2[0]==='Strengths', JSON.stringify(r.h2));
  ok('renders bold, italic, underline, strike, subscript'+t,
     r.bold?.includes('J. Nguyen')&&r.italic?.includes('14 May')&&r.underline?.includes('underlined')&&r.strike?.includes('struck')&&r.sub?.includes('2'),
     JSON.stringify([r.bold,r.italic,r.underline,r.strike,r.sub]));
  ok('renders a bullet list'+t, r.items?.length===3, JSON.stringify(r.items));
  ok('renders a nested bullet'+t, r.nested===true);
  ok('renders a block quote'+t, r.quote?.[0]?.startsWith('Students knew'), JSON.stringify(r.quote));
  ok('renders a hyperlink'+t, r.link?.href==='https://www.vit.vic.edu.au/'&&r.link.text==='the VIT standards', JSON.stringify(r.link));
  ok('renders a table'+t, r.rows===3&&r.cells?.length===6, r.rows+' rows, '+r.cells?.length+' cells');
  ok('renders the embedded image'+t, !!r.img&&r.img.src==='data:image/png;base64,'&&r.img.w===16, JSON.stringify(r.img));
  ok('keeps the image description'+t, r.img?.alt==='Bench layout photograph', r.img?.alt);
  ok('renders line breaks and tabs'+t, r.br>=1&&r.tab>=1, 'br '+r.br+' tab '+r.tab);
  ok('escapes ampersands rather than breaking'+t, r.amp===true);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/* An older binary .doc cannot be opened by any browser: say so plainly. */
await page.locator('#f6-3 .drop input[type="file"]').setInputFiles({
  name:'old-report.doc', mimeType:'application/msword',
  buffer:Buffer.from('\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1 legacy binary word file','binary')});
await page.waitForTimeout(800);
const chips=await page.locator('#f6-3 .doc').count();
await page.locator('#f6-3 .doc').nth(chips-1).click();
await page.waitForTimeout(900);
const note=await page.locator('#viewer .viewer-note').textContent();
ok('older .doc gets a clear explanation', /older Word format/.test(note)&&/Download/.test(note), note?.slice(0,80));
ok('download stays available for it', await page.locator('#viewer .dl').isVisible());
await page.keyboard.press('Escape');

ok('no runtime errors', errors.length===0, errors.slice(0,3).join(' | '));
await browser.close();
const fails=results.filter(r=>r[0]==='FAIL');
for(const [s,n,e] of results) console.log(s.padEnd(5),n,e?('  <'+e+'>'):'');
console.log('\n'+(results.length-fails.length)+'/'+results.length+' passed');
if(fails.length)process.exit(1);
