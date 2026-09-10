import {chromium} from 'playwright';
const FILE='file://'+process.cwd()+'/index.html';
const results=[];
function ok(n,c,e=''){results.push([c?'PASS':'FAIL',n,e]);}
const browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});
const page=await ctx.newPage();
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{ if(m.type()==='error'&&!/ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|fonts\.googleapis/.test(m.text())) errors.push('console: '+m.text()); });
await page.goto(FILE);
await page.waitForTimeout(600);

/* print builds every panel, including unopened ones */
const beforeCount=await page.evaluate(()=>[...document.querySelectorAll('.view')].filter(v=>v.innerHTML.length>0).length);
await page.emulateMedia({media:'print'});
await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
await page.waitForTimeout(700);
const afterCount=await page.evaluate(()=>[...document.querySelectorAll('.view')].filter(v=>v.innerHTML.length>0).length);
ok('print builds all panels', afterCount>=10 && afterCount>beforeCount, beforeCount+' -> '+afterCount);
const printedCards=await page.evaluate(()=>document.querySelectorAll('.fcard').length);
ok('all 37 focus areas present for print', printedCards===37, String(printedCards));
const hidden=await page.evaluate(()=>{
  const cs=getComputedStyle(document.querySelector('.tabs'));
  return {tabs:cs.display, search:getComputedStyle(document.querySelector('.search')).display};
});
ok('tabs and search hidden in print', hidden.tabs==='none'&&hidden.search==='none', JSON.stringify(hidden));
await page.emulateMedia({media:'screen'});

/* PDF export writes a real document into a popup */
const pdfDoc=await page.evaluate(async()=>{
  let written='';
  const fake={document:{open(){},write(h){written+=h;},close(){}},focus(){},print(){}};
  const orig=window.open; window.open=()=>fake;
  [...document.querySelectorAll('.menu-list button')].find(b=>/^PDF/.test(b.textContent)).click();
  window.open=orig;
  await new Promise(r=>setTimeout(r,200));
  return written;
});
ok('PDF view generated', pdfDoc.length>8000, pdfDoc.length+' bytes');
ok('PDF has a cover and contents', /class="cover"/.test(pdfDoc)&&/class="toc"/.test(pdfDoc));
ok('PDF waits for images before printing', /window\.onload/.test(pdfDoc));
ok('PDF includes all standards', (pdfDoc.match(/class="sh"/g)||[]).length===7, String((pdfDoc.match(/class="sh"/g)||[]).length));
ok('PDF includes focus areas', (pdfDoc.match(/class="fa"/g)||[]).length===37, String((pdfDoc.match(/class="fa"/g)||[]).length));

/* Word export downloads */
const dl=page.waitForEvent('download',{timeout:8000}).catch(()=>null);
await page.evaluate(()=>[...document.querySelectorAll('.menu-list button')].find(b=>/^Word/.test(b.textContent)).click());
const d1=await dl;
ok('Word document downloads', !!d1 && /\.doc$/.test(d1.suggestedFilename()), d1?d1.suggestedFilename():'none');

/* JSON export */
const dl2=page.waitForEvent('download',{timeout:8000}).catch(()=>null);
await page.evaluate(()=>[...document.querySelectorAll('.menu-list button')].find(b=>/^Portfolio data/.test(b.textContent)).click());
const d2=await dl2;
ok('JSON exports', !!d2 && /\.json$/.test(d2.suggestedFilename()), d2?d2.suggestedFilename():'none');
if(d2){
  const fs=await import('fs');
  const path='/tmp/exp.json'; await d2.saveAs(path);
  const parsed=JSON.parse(fs.readFileSync(path,'utf8'));
  ok('JSON round trip keeps the standards', Object.keys(parsed.standards).length===7);
}

/* attach something so the saved copy has bytes to restore */
await page.click('.tab[data-id="s4"]');
await page.waitForTimeout(300);
if(!(await page.evaluate(()=>document.body.classList.contains('editing')))){
  await page.click('.mast-actions .btn'); await page.waitForTimeout(300);
}
await page.locator('#f4-1 .drop input[type="file"]').setInputFiles([{name:'roles.png',mimeType:'image/png',
  buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8DAwMDAwMDAwMDAAAAcAAGVQeH0AAAAAElFTkSuQmCC','base64')}]);
await page.waitForTimeout(1000);
ok('attachment added for the restore test', await page.evaluate(()=>window.DATA.standards['4'].focus[0].evidence.some(e=>e.img)));

/* Save a copy, then restore from it: the recovery path for lost attachments */
const savedHtml=await page.evaluate(async()=>{
  let captured=null;
  window.showSaveFilePicker=async()=>({name:'s.html',createWritable:async()=>({
    write:async(b)=>{captured=await b.text();},close:async()=>{}})});
  window.DATA.profile.school='Restored Secondary College';
  document.querySelector('.savepill').click();
  await new Promise(r=>setTimeout(r,700));
  return captured;
});
ok('save produced a file to restore from', !!savedHtml && savedHtml.includes('Restored Secondary College'));
if(savedHtml){
  const fs=await import('fs');
  fs.writeFileSync('/tmp/saved.html',savedHtml);
  await page.evaluate(()=>{ window.DATA.profile.school='wiped'; window.confirm=()=>true; });
  await page.evaluate(()=>[...document.querySelectorAll('.menu-list button')].find(b=>/^Restore/.test(b.textContent)).click());
  await page.locator('input[type="file"][accept*=".html"]').setInputFiles('/tmp/saved.html');
  await page.waitForTimeout(900);
  ok('restore from a saved portfolio works', await page.evaluate(()=>window.DATA.profile.school)==='Restored Secondary College',
     await page.evaluate(()=>window.DATA.profile.school));
  ok('restore brings attachments back', await page.evaluate(()=>{
    let n=0; for(const s of ['1','2','3','4','5','6','7'])
      for(const f of window.DATA.standards[s].focus) for(const e of f.evidence) if(e.img||e.file) n++;
    return n>0;
  }));
}

/* localStorage quota failure surfaces honestly */
await page.click('.tab[data-id="overview"]');
await page.waitForTimeout(300);
if(!(await page.evaluate(()=>document.body.classList.contains('editing')))){
  await page.click('.mast-actions .btn'); await page.waitForTimeout(400);
}
const quota=await page.evaluate(async()=>{
  const real=localStorage.setItem.bind(localStorage);
  localStorage.setItem=()=>{const e=new Error('full');e.name='QuotaExceededError';throw e;};
  const f=document.querySelector('#v-overview .block .ed[contenteditable]');
  if(!f){localStorage.setItem=real;return {cls:'no-field',text:''};}
  f.focus(); f.textContent=f.textContent+' more'; f.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,1000));
  const pill=document.querySelector('.savepill');
  const out={cls:pill.className,text:pill.textContent};
  localStorage.setItem=real;
  return out;
});
ok('quota failure is reported in the header', /bad/.test(quota.cls)&&/save the file/i.test(quota.text), JSON.stringify(quota));

/* the search filter chips narrow results */
await page.fill('.search input','lesson');
await page.waitForTimeout(450);
const all=await page.locator('#v-search .r').count();
await page.locator('.res-filters button').nth(1).click();
await page.waitForTimeout(350);
const filtered=await page.locator('#v-search .r').count();
ok('filter chips narrow the results', filtered>0 && filtered<all, all+' -> '+filtered);
ok('filter chip marked pressed', await page.locator('.res-filters button[aria-pressed="true"]').count()===1);

/* deep link straight to a focus area tab */
const p3=await ctx.newPage();
await p3.goto(FILE+'#s5');
await p3.waitForTimeout(700);
ok('deep link opens the right tab', await p3.locator('#v-s5').isVisible());
ok('deep link renders its cards', await p3.locator('#v-s5 .fcard').count()===5, String(await p3.locator('#v-s5 .fcard').count()));
await p3.goto(FILE+'#search?q=rubric');
await p3.waitForTimeout(700);
ok('deep link into a search works', (await p3.locator('#v-search .r').count())>0 && (await p3.locator('.search input').inputValue())==='rubric');
await p3.close();

ok('no runtime errors', errors.length===0, errors.slice(0,3).join(' | '));
await browser.close();
const fails=results.filter(r=>r[0]==='FAIL');
for(const [s,n,e] of results) console.log(s.padEnd(5),n,e?('  <'+e+'>'):'');
console.log('\n'+(results.length-fails.length)+'/'+results.length+' passed');
if(fails.length)process.exit(1);
