import {chromium} from 'playwright';

const FILE='file://'+process.cwd()+'/index.html';
const results=[];
function ok(name,cond,extra=''){results.push([cond?'PASS':'FAIL',name,extra]);}

const browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});
const page=await ctx.newPage();
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{ if(m.type()==='error'&&!/ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|fonts\.googleapis/.test(m.text())) errors.push('console: '+m.text()); });
await page.goto(FILE);
await page.waitForTimeout(600);

/* --- shell renders --- */
ok('masthead rendered', await page.locator('.mast .logo b').innerText()==='Vishesh Pahuja');
ok('tabs rendered (10)', await page.locator('.tabs-in .tab').count()===10, String(await page.locator('.tabs-in .tab').count()));
ok('overview panel visible', await page.locator('#v-overview').isVisible());
ok('hero name', (await page.locator('#v-overview h1').innerText()).includes('Vishesh'));
ok('progress ring present', await page.locator('#v-overview .dial svg.ring').count()===1);
ok('tab badge shows counts', /\d+\/\d+/.test(await page.locator('.tab[data-id="s1"] .cnt').innerText()));

/* --- tab navigation + routing --- */
await page.click('.tab[data-id="s3"]');
await page.waitForTimeout(250);
ok('standard 3 panel shows', await page.locator('#v-s3').isVisible());
ok('standard 3 has focus cards', await page.locator('#v-s3 .fcard').count()===7, String(await page.locator('#v-s3 .fcard').count()));
ok('hash updated', page.url().endsWith('#s3'), page.url().slice(-12));
await page.goBack();
await page.waitForTimeout(250);
ok('back button returns to overview', await page.locator('#v-overview').isVisible());

/* --- SEARCH: renders in its own panel, not a dropdown --- */
await page.fill('.search input','cognitive load');
await page.waitForTimeout(450);
ok('search panel is the visible one', await page.locator('#v-search').isVisible());
ok('no floating dropdown exists', await page.locator('.results').count()===0);
const nres=await page.locator('#v-search .r').count();
ok('search found results', nres>0, nres+' results');
ok('result count in heading', /result/.test(await page.locator('.res-head h1').innerText()), await page.locator('.res-head h1').innerText());
ok('search tab appeared', await page.locator('.tab.searchtab').isVisible());
ok('highlighting works', await page.locator('#v-search mark').count()>0);
ok('filter chips present', await page.locator('.res-filters button').count()>1, String(await page.locator('.res-filters button').count()));

/* multi word, out of order */
await page.fill('.search input','recipe reading');
await page.waitForTimeout(400);
ok('out-of-order multi-word search matches', await page.locator('#v-search .r').count()>0, String(await page.locator('#v-search .r').count()));

/* focus-area code search */
await page.fill('.search input','1.3');
await page.waitForTimeout(400);
const firstTitle=await page.locator('#v-search .r .rt').first().innerText();
ok('code search ranks exact focus area first', firstTitle.startsWith('1.3'), firstTitle);

/* filename / school search (was unindexed before) */
await page.fill('.search input','Mooroolbark');
await page.waitForTimeout(400);
ok('placement school is searchable', await page.locator('#v-search .r').count()>0, String(await page.locator('#v-search .r').count()));

/* keyboard nav + jump */
await page.fill('.search input','EAL/D');
await page.waitForTimeout(400);
await page.locator('.search input').press('ArrowDown');
await page.waitForTimeout(120);
ok('arrow key selects a result', await page.locator('#v-search .r.sel').count()===1);
await page.locator('.search input').press('Enter');
await page.waitForTimeout(500);
const jumped=await page.evaluate(()=>{
  const on=[...document.querySelectorAll('.view.on')].map(v=>v.id);
  const fl=document.querySelector('.flash');
  return {on, flash: fl?fl.id:null};
});
ok('Enter jumps to the standard tab', jumped.on.length===1 && jumped.on[0].startsWith('v-s'), JSON.stringify(jumped.on));
ok('target card is flashed', !!jumped.flash, String(jumped.flash));

/* clearing search returns to where you were */
await page.fill('.search input','');
await page.waitForTimeout(350);
ok('search tab hidden when cleared', !(await page.locator('.tab.searchtab').isVisible()));

/* no matches state */
await page.fill('.search input','zzzqqq');
await page.waitForTimeout(400);
ok('empty state shown', await page.locator('.res-none').count()===1);

await page.fill('.search input','');
await page.waitForTimeout(300);

/* --- EDITING --- */
await page.click('.tab[data-id="overview"]');
await page.waitForTimeout(250);
await page.click('.mast-actions .btn');
await page.waitForTimeout(400);
ok('edit mode class set', await page.evaluate(()=>document.body.classList.contains('editing')));
const editables=await page.evaluate(()=>document.querySelectorAll('#v-overview [contenteditable]').length);
ok('overview fields editable', editables>=6, editables+' editable fields');

/* edit hero name */
const nameEl=page.locator('#v-overview h1 .ed');
await nameEl.click();
await page.keyboard.press('End');
await page.keyboard.type(' X');
await page.waitForTimeout(200);
ok('name edit stored in DATA', (await page.evaluate(()=>window.DATA.profile.name)).endsWith(' X'), await page.evaluate(()=>window.DATA.profile.name));

/* caret must not jump: type a longer run and confirm order */
await page.click('.tab[data-id="s6"]');
await page.waitForTimeout(300);
const demo=page.locator('#v-s6 .fcard').first().locator('.col').nth(1).locator('.ed');
await demo.click();
await page.keyboard.press('Control+a');
await page.keyboard.type('One two three four five');
await page.waitForTimeout(250);
const demoVal=await page.evaluate(()=>window.DATA.standards['6'].focus[0].demo);
ok('typing keeps character order (no caret jump)', demoVal==='One two three four five', JSON.stringify(demoVal));

/* progress chip updates live */
const chipBefore=await page.locator('#v-s6 .fcard').first().locator('.state').innerText();
await demo.click();
await page.keyboard.press('Control+a');
await page.keyboard.press('Delete');
await page.waitForTimeout(300);
const chipAfter=await page.locator('#v-s6 .fcard').first().locator('.state').innerText();
ok('progress chip updates as you type', chipBefore!==chipAfter, chipBefore+' -> '+chipAfter);

/* editable standard title */
await page.evaluate(()=>{
  const f=document.querySelector('#v-s6 .std-head h1 .ed');
  return !!f;
}).then(v=>ok('standard title is editable', v));

/* philosophy: pillars editable + add point */
await page.click('.tab[data-id="philosophy"]');
await page.waitForTimeout(300);
const ptsBefore=await page.evaluate(()=>window.DATA.philosophy.pillars[0].b.length);
await page.locator('#v-philosophy .pillar').first().locator('button.tinybtn').first().click();
await page.waitForTimeout(300);
const ptsAfter=await page.evaluate(()=>window.DATA.philosophy.pillars[0].b.length);
ok('can add a point to a pillar', ptsAfter===ptsBefore+1, ptsBefore+' -> '+ptsAfter);
ok('philosophy heading editable', await page.locator('#v-philosophy .phil-head h1 .ed[contenteditable]').count()===1);

/* add a titled evidence item */
await page.click('.tab[data-id="s1"]');
await page.waitForTimeout(300);
const evBefore=await page.evaluate(()=>window.DATA.standards['1'].focus[3].evidence.length);
await page.locator('#f1-4 .drop button').nth(1).click();
await page.waitForTimeout(350);
const evAfter=await page.evaluate(()=>window.DATA.standards['1'].focus[3].evidence.length);
ok('can add an evidence item', evAfter===evBefore+1, evBefore+' -> '+evAfter);
ok('new evidence has editable title/date/link', await page.locator('#f1-4 .ev input[type="date"]').count()>0 && await page.locator('#f1-4 .ev input[type="url"]').count()>0);

/* delete with undo */
await page.locator('#f1-4 .ev .tools button.rm').first().click();
await page.waitForTimeout(300);
ok('evidence removed', await page.evaluate(()=>window.DATA.standards['1'].focus[3].evidence.length)===evBefore);
ok('undo offered in toast', await page.locator('.toast button').count()===1);
await page.locator('.toast button').click();
await page.waitForTimeout(300);
ok('undo restores the item', await page.evaluate(()=>window.DATA.standards['1'].focus[3].evidence.length)===evBefore+1);

/* --- settings modal --- */
await page.click('.mast-actions .btn.icon');
await page.waitForTimeout(300);
ok('settings modal opens', await page.locator('.modal.on').count()===1);
const emailInput=page.locator('.modal input[type="email"]');
await emailInput.fill('vishesh@example.com');
await page.waitForTimeout(200);
ok('settings writes to DATA', await page.evaluate(()=>window.DATA.profile.email)==='vishesh@example.com');
await page.locator('.modal-bar button').click();
await page.waitForTimeout(300);
ok('modal closes', await page.locator('.modal').count()===0);
await page.click('.tab[data-id="overview"]');
await page.waitForTimeout(300);
ok('contact appears on overview', (await page.locator('#v-overview .contact').innerText()).includes('vishesh@example.com'));

/* --- attachment: fake an image + a pdf through the file input --- */
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8DAwMDAwMDAwMDAAAAcAAGVQeH0AAAAAElFTkSuQmCC','base64');
await page.click('.tab[data-id="s2"]');
await page.waitForTimeout(300);
await page.locator('#f2-1 .drop input[type="file"]').setInputFiles([
  {name:'cupcakes-lesson.png',mimeType:'image/png',buffer:png},
  {name:'unit-plan.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF\n')}
]);
await page.waitForTimeout(1200);
ok('image thumbnail rendered', await page.locator('#f2-1 .shot img').count()>=1, String(await page.locator('#f2-1 .shot img').count()));
ok('pdf chip rendered', await page.locator('#f2-1 .doc').count()>=1);
ok('attachments recorded in DATA', await page.evaluate(()=>window.DATA.standards['2'].focus[0].evidence.filter(e=>e.img||e.file).length)>=2);

/* viewer opens */
await page.locator('#f2-1 .shot').first().click();
await page.waitForTimeout(500);
ok('viewer opens for an image', await page.locator('#viewer.on').count()===1);
ok('viewer has a download link', await page.locator('#viewer .dl').isVisible());
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
ok('Escape closes the viewer', await page.locator('#viewer.on').count()===0);

/* search should now find the attachment file name */
await page.fill('.search input','cupcakes-lesson');
await page.waitForTimeout(450);
ok('attachment file names are searchable', await page.locator('#v-search .r').count()>0, String(await page.locator('#v-search .r').count()));
await page.fill('.search input','');
await page.waitForTimeout(300);

/* --- persistence across reload --- */
const nameNow=await page.evaluate(()=>window.DATA.profile.name);
await page.waitForTimeout(900);
await page.reload();
await page.waitForTimeout(1200);
ok('draft restored after reload', await page.evaluate(()=>window.DATA.profile.name)===nameNow, await page.evaluate(()=>window.DATA.profile.name));
ok('attachment bytes survive reload', await page.evaluate(()=>{
  const e=window.DATA.standards['2'].focus[0].evidence.find(x=>x.name==='cupcakes-lesson.png');
  return !!(e&&e.img&&e.img.indexOf('data:')===0);
}));
ok('email survived reload', await page.evaluate(()=>window.DATA.profile.email)==='vishesh@example.com');

/* --- standalone export contains everything --- */
const exported=await page.evaluate(()=>{
  const fn=document.querySelector('#app-script');
  return document.getElementById('style-main').textContent.length>1000;
});
ok('style block is intact for export', exported);
const html=await page.evaluate(async()=>{
  /* reach the internal builder through the save path by stubbing the picker */
  let captured=null;
  window.showSaveFilePicker=async()=>({name:'t.html',createWritable:async()=>({
    write:async(b)=>{captured=await b.text();},close:async()=>{}})});
  document.querySelector('.savepill').click();
  await new Promise(r=>setTimeout(r,700));
  return captured;
});
ok('Save file produced a document', !!html && html.length>50000, html?html.length+' bytes':'null');
ok('export embeds the edited data', !!html && html.includes('vishesh@example.com'));
ok('export embeds attachment bytes', !!html && html.includes('cupcakes-lesson'));
ok('export keeps the script ids', !!html && html.includes('id="data-script"') && html.includes('id="app-script"'));

/* the exported file must itself boot */
if(html){
  const fs=await import('fs');
  fs.writeFileSync('/tmp/exported.html',html);
  const p2=await ctx.newPage();
  const errs2=[];
  p2.on('pageerror',e=>errs2.push(e.message));
  await p2.goto('file:///tmp/exported.html');
  await p2.waitForTimeout(800);
  ok('exported file boots with no errors', errs2.length===0, errs2.join('; '));
  ok('exported file shows the data', (await p2.locator('#v-overview h1').innerText()).includes('Vishesh'));
  ok('exported file has attachments', await p2.evaluate(()=>window.DATA.standards['2'].focus[0].evidence.some(e=>e.img)));
  await p2.close();
}

/* --- mobile layout --- */
const mob=await ctx.newPage();
await mob.setViewportSize({width:390,height:760});
await mob.goto(FILE);
await mob.waitForTimeout(700);
const sb=await mob.locator('.search input').boundingBox();
ok('search box visible on a phone', !!sb && sb.width>150 && sb.height>20, JSON.stringify(sb));
const overflow=await mob.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
ok('no horizontal overflow on a phone', overflow<=2, 'overflow '+overflow+'px');
await mob.close();

/* --- accessibility wiring --- */
const a11y=await page.evaluate(()=>{
  const t=document.querySelector('.tab[data-id="s1"]');
  const p=document.getElementById('v-s1');
  return {
    tablist: document.querySelector('.tabs-in').getAttribute('role'),
    controls: t.getAttribute('aria-controls'),
    panelRole: p.getAttribute('role'),
    labelled: p.getAttribute('aria-labelledby'),
    skip: !!document.querySelector('a.skip'),
    selected: document.querySelectorAll('.tab[aria-selected="true"]').length
  };
});
ok('tablist role on the tab row', a11y.tablist==='tablist');
ok('tabs point at their panels', a11y.controls==='v-s1'&&a11y.panelRole==='tabpanel'&&a11y.labelled==='tab-s1');
ok('skip link present', a11y.skip);
ok('exactly one tab selected', a11y.selected===1, String(a11y.selected));

/* keyboard: / focuses search, arrow keys move tabs */
await page.click('footer .blurb');
await page.keyboard.press('/');
await page.waitForTimeout(200);
ok('slash focuses the search box', await page.evaluate(()=>document.activeElement.type==='search'));
await page.keyboard.press('Escape');
await page.click('.tab[data-id="s2"]');
await page.locator('.tab[data-id="s2"]').press('ArrowRight');
await page.waitForTimeout(300);
ok('arrow keys move between tabs', await page.locator('#v-s3').isVisible());

ok('no runtime errors during the whole run', errors.length===0, errors.slice(0,4).join(' | '));

await browser.close();
const fails=results.filter(r=>r[0]==='FAIL');
for(const [s,n,e] of results) console.log(s.padEnd(5), n, e?('  <'+e+'>'):'');
console.log('\n'+(results.length-fails.length)+'/'+results.length+' passed');
if(fails.length) process.exit(1);
