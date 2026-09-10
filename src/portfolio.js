/* ==========================================================================
   Professional experience portfolio, single file application.
   Everything lives in this file: the data (window.DATA), the styles and this
   script. Open it in any browser, click Edit, then Save file to keep a copy.
   ========================================================================== */
(function(){
'use strict';

/* ---------------------------------------------------------------- utilities */
var D = window.DATA;
var PANELS_ORDER = ['overview','philosophy','s1','s2','s3','s4','s5','s6','s7','summary'];
var SN = ['1','2','3','4','5','6','7'];

function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function txt(s){return document.createTextNode(s==null?'':String(s));}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function humanSize(b){if(!b)return '0 B';if(b<1024)return b+' B';if(b<1048576)return (b/1024).toFixed(0)+' KB';return (b/1048576).toFixed(1)+' MB';}
function dataURIsize(u){if(!u)return 0;var i=u.indexOf(',');return Math.round((u.length-i-1)*0.75);}
function todayISO(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function prettyDate(iso){
  if(!iso)return '';
  var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if(!m)return iso;
  var d=new Date(+m[1],+m[2]-1,+m[3]);
  if(isNaN(d))return iso;
  return d.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
}
function dataURItoBlob(uri){
  var p=uri.split(',');
  var mime=(p[0].match(/data:([^;]+)/)||[])[1]||'application/octet-stream';
  var bin=atob(p[1]);var a=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);
  return new Blob([a],{type:mime});
}
function safeURL(u){
  u=(u||'').trim();
  if(!u)return '';
  if(/^(https?:|mailto:)/i.test(u))return u;
  if(/^[\w.-]+@[\w.-]+\.\w+$/.test(u))return 'mailto:'+u;
  if(/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u))return 'https://'+u;
  return '';
}
function downloadBlob(blob,name){
  var a=document.createElement('a');var url=URL.createObjectURL(blob);
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},6000);
}

/* Toast, with an optional action button (used for Undo). */
var toastTimer;
function toast(msg,action){
  var t=document.querySelector('.toast');
  if(!t){t=el('div','toast');document.body.appendChild(t);}
  t.innerHTML='';
  t.appendChild(el('span',null,esc(msg)));
  if(action){
    var b=el('button',null,esc(action.label));
    b.onclick=function(){t.classList.remove('on');action.fn();};
    t.appendChild(b);
  }
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.classList.remove('on');},action?7000:2600);
}

/* --------------------------------------------------------- data normalising */
/* Older copies of this file are missing newer fields. Fill them in rather
   than letting undefined leak into the views. */
function normalise(){
  D.meta = D.meta || {};
  if(!D.meta.version) D.meta.version = 2;
  D.profile = D.profile || {};
  ['name','initials','role','tagline','school','program','email','linkedin','phone','intro','about','quote']
    .forEach(function(k){ if(typeof D.profile[k]!=='string') D.profile[k]=D.profile[k]==null?'':String(D.profile[k]); });
  if(!D.profile.initials && D.profile.name){
    D.profile.initials = D.profile.name.split(/\s+/).map(function(w){return w[0]||'';}).join('').slice(0,3).toUpperCase();
  }
  D.philosophy = D.philosophy || {heading:'',lead:'',pillars:[]};
  D.philosophy.pillars = D.philosophy.pillars || [];
  D.philosophy.pillars.forEach(function(p,i){
    p.n=i+1; p.t=p.t||''; p.b=Array.isArray(p.b)?p.b:[]; p.apst=Array.isArray(p.apst)?p.apst:[];
  });
  D.domains = D.domains || [];
  D.reports = D.reports || {};
  ['interim','final'].forEach(function(k){ if(D.reports[k]===undefined) D.reports[k]=null; });
  D.library = Array.isArray(D.library)?D.library:[];
  D.standards = D.standards || {};
  SN.forEach(function(s){
    var st = D.standards[s] = D.standards[s] || {title:'',focus:[]};
    st.title = st.title||'';
    st.focus = Array.isArray(st.focus)?st.focus:[];
    st.focus.forEach(function(fo){
      fo.code=fo.code||''; fo.title=fo.title||''; fo.desc=fo.desc||'';
      fo.demo=fo.demo||''; fo.dev=fo.dev||'';
      fo.evidence=Array.isArray(fo.evidence)?fo.evidence:[];
      fo.evidence.forEach(prepAttachment);
    });
  });
  D.library.forEach(prepAttachment);
  ['interim','final'].forEach(function(k){ if(D.reports[k]) prepAttachment(D.reports[k]); });
}
var aidSeq=0;
function newAid(){ aidSeq++; return 'a'+Date.now().toString(36)+aidSeq.toString(36); }
function prepAttachment(it){
  if(!it||typeof it!=='object')return;
  it.title=it.title||'';
  if(typeof it.href!=='string')it.href='';
  if(typeof it.date!=='string')it.date='';
  if(typeof it.note!=='string')it.note='';
  if(it.img||it.file){
    if(!it.aid)it.aid=newAid();
    if(!it.size)it.size=dataURIsize(it.img||it.file);
    ATT.put(it.aid,it.img||it.file);
  }
}
function hasBytes(it){ return !!(it && (it.img||it.file)); }
/* An attachment we know about but whose bytes did not survive (draft restored
   in a browser where large binaries could not be cached). */
function isMissing(it){ return !!(it && it.aid && !it.img && !it.file); }

/* ------------------------------------------------- attachment byte storage */
/* Bytes live in memory for the session, and are copied into IndexedDB when the
   browser allows it (some browsers block IndexedDB on file:// pages). The
   authoritative copy is always the saved .html file. */
var ATT = (function(){
  var mem={}, db=null, opened=null;
  function open(){
    if(opened)return opened;
    opened=new Promise(function(res){
      var idb=null;
      try{ idb=window.indexedDB; }catch(e){ idb=null; }
      if(!idb)return res(null);
      var req;
      try{ req=idb.open('portfolio_attachments',1); }catch(e){ return res(null); }
      req.onupgradeneeded=function(){ try{req.result.createObjectStore('files');}catch(e){} };
      req.onsuccess=function(){ db=req.result; res(db); };
      req.onerror=function(){ res(null); };
      req.onblocked=function(){ res(null); };
      setTimeout(function(){ res(db); },2500);
    });
    return opened;
  }
  function tx(mode){
    return open().then(function(d){
      if(!d)return null;
      try{ return d.transaction('files',mode).objectStore('files'); }catch(e){ return null; }
    });
  }
  return {
    available:function(){ return open().then(function(d){return !!d;}); },
    put:function(aid,dataUrl){
      mem[aid]=dataUrl;
      return tx('readwrite').then(function(store){
        if(!store)return false;
        return new Promise(function(res){
          try{ var r=store.put(dataUrl,aid); r.onsuccess=function(){res(true);}; r.onerror=function(){res(false);}; }
          catch(e){ res(false); }
        });
      }).catch(function(){return false;});
    },
    get:function(aid){
      if(mem[aid])return Promise.resolve(mem[aid]);
      return tx('readonly').then(function(store){
        if(!store)return null;
        return new Promise(function(res){
          try{ var r=store.get(aid); r.onsuccess=function(){ if(r.result)mem[aid]=r.result; res(r.result||null); }; r.onerror=function(){res(null);}; }
          catch(e){ res(null); }
        });
      }).catch(function(){return null;});
    },
    del:function(aid){
      delete mem[aid];
      return tx('readwrite').then(function(store){ if(store){ try{store.delete(aid);}catch(e){} } }).catch(function(){});
    },
    keep:function(aid,dataUrl){ mem[aid]=dataUrl; }
  };
})();

/* -------------------------------------------------------------- save layer */
var LSKEY='pep_portfolio_v2';
var LSKEY_OLD='pep_portfolio_'+(D.profile&&D.profile.name?D.profile.name.replace(/\W+/g,'_'):'x');
var dirty=false, lastSavedAt=null, draftState='idle', draftError='', fileHandle=null, draftTimer=null, idbOK=null;

/* A copy of the data with attachment bytes stripped out, small enough that
   localStorage will reliably accept it. */
function strippedCopy(){
  var out=JSON.parse(JSON.stringify(D,function(k,v){
    if((k==='img'||k==='file')&&typeof v==='string'&&v.indexOf('data:')===0)return '';
    return v;
  }));
  return out;
}
function scheduleDraft(){
  clearTimeout(draftTimer);
  draftTimer=setTimeout(saveDraft,600);
}
function saveDraft(){
  try{
    var payload={savedAt:new Date().toISOString(),data:strippedCopy()};
    localStorage.setItem(LSKEY,JSON.stringify(payload));
    draftState='ok';draftError='';
  }catch(e){
    draftState='fail';
    draftError=(e&&e.name==='QuotaExceededError')?'This browser will not cache any more. Use Save file.':'This browser is not letting the page cache a draft. Use Save file.';
  }
  syncSavePill();
}
function loadDraft(fileUpdated){
  var raw=null;
  try{ raw=localStorage.getItem(LSKEY)||localStorage.getItem(LSKEY_OLD); }catch(e){ return false; }
  if(!raw)return false;
  var obj;
  try{ obj=JSON.parse(raw); }catch(e){ return false; }
  var stored=obj&&obj.data?obj.data:obj;
  if(!stored||!stored.standards)return false;
  /* If the file you just opened is newer than the cached draft, the file wins. */
  if(fileUpdated&&obj&&obj.savedAt&&new Date(obj.savedAt).getTime()<fileUpdated-1000)return false;
  Object.keys(stored).forEach(function(k){ D[k]=stored[k]; });
  lastSavedAt=obj&&obj.savedAt?new Date(obj.savedAt):null;
  draftState='ok';
  return true;
}
/* Put the bytes back against the attachment records restored from a draft. */
function rehydrate(){
  var jobs=[];
  eachAttachment(function(it){
    if(it.aid&&!it.img&&!it.file){
      jobs.push(ATT.get(it.aid).then(function(url){
        if(!url)return;
        if((it.mime||'').indexOf('image/')===0)it.img=url; else it.file=url;
      }));
    }
  });
  return Promise.all(jobs);
}
function eachAttachment(fn){
  SN.forEach(function(s){
    (D.standards[s].focus||[]).forEach(function(fo){ (fo.evidence||[]).forEach(fn); });
  });
  (D.library||[]).forEach(fn);
  ['interim','final'].forEach(function(k){ if(D.reports[k])fn(D.reports[k]); });
}
function touched(recount){
  dirty=true;
  D.meta.updated=new Date().toISOString();
  scheduleDraft();
  syncSavePill();
  if(recount){ syncTabs(); syncStateChips(); markDirty('overview','summary'); }
}
function syncSavePill(){
  var p=document.querySelector('.savepill');
  if(!p)return;
  p.className='savepill'+(draftState==='fail'?' bad':(dirty?' dirty':' ok'));
  var label;
  if(draftState==='fail')label='Draft not cached, save the file';
  else if(dirty)label='Unsaved changes';
  else if(lastSavedAt)label='Saved '+lastSavedAt.toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'});
  else label='Up to date';
  p.innerHTML='<i></i>'+esc(label);
  p.title=draftState==='fail'?draftError:'Click to save a copy of this file (Ctrl+S)';
}

/* ------------------------------------------------------------ progress maths */
/* Three states: 0 nothing yet, 1 partly there, 2 evidence plus an explanation. */
function stateOf(fo){
  var ev=(fo.evidence||[]).length>0;
  var demo=(fo.demo||'').trim().length>0;
  if(ev&&demo)return 2;
  if(ev||demo)return 1;
  return 0;
}
function counts(sn){
  var fs=D.standards[sn].focus||[],full=0,part=0;
  fs.forEach(function(fo){var s=stateOf(fo);if(s===2)full++;else if(s===1)part++;});
  return {full:full,part:part,total:fs.length};
}
function totals(){
  var t={full:0,part:0,total:0};
  SN.forEach(function(s){var c=counts(s);t.full+=c.full;t.part+=c.part;t.total+=c.total;});
  return t;
}
function domainOf(sn){
  for(var i=0;i<D.domains.length;i++){
    if(D.domains[i].standards.indexOf(+sn)>=0||D.domains[i].standards.indexOf(String(sn))>=0)return D.domains[i];
  }
  return {name:'',color:'#5d6d74',standards:[]};
}
function totalBytes(){
  var n=0;
  eachAttachment(function(it){ n+=it.size||dataURIsize(it.img||it.file); });
  return n;
}

/* ------------------------------------------------------- editable text field */
var PLAINTEXT=(function(){
  var d=document.createElement('div');
  try{ d.contentEditable='plaintext-only'; return d.contentEditable==='plaintext-only'?'plaintext-only':'true'; }
  catch(e){ return 'true'; }
})();
function stripPaste(e){
  if(PLAINTEXT==='plaintext-only')return;
  e.preventDefault();
  var t=(e.clipboardData||window.clipboardData).getData('text/plain')||'';
  document.execCommand('insertText',false,t);
}
/* get/set are closures over the data. Nothing re-renders while you type, so
   the caret never jumps. */
function field(get,set,opts){
  opts=opts||{};
  var d=el(opts.tag||'div','ed'+(opts.one?' one':'')+(opts.cls?' '+opts.cls:''));
  d.dataset.ph=editing?(opts.ph||'Add text'):(opts.roPh||'');
  var v=get()||'';
  d.textContent=v;
  if(!v)d.classList.add('empty');
  if(editing){
    d.setAttribute('contenteditable',PLAINTEXT);
    d.setAttribute('role','textbox');
    if(!opts.one)d.setAttribute('aria-multiline','true');
    d.setAttribute('aria-label',opts.ph||'Editable text');
    d.addEventListener('paste',stripPaste);
    d.addEventListener('input',function(){
      var t=opts.one?d.textContent.replace(/[\r\n]+/g,' '):(d.innerText||d.textContent);
      t=t.replace(/\u00a0/g,' ');
      set(t.replace(/\s+$/,''));
      d.classList.toggle('empty',!t.trim());
      touched(opts.recount);
    });
    if(opts.one)d.addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault();d.blur();} });
    d.addEventListener('blur',function(){ set((get()||'').trim()); });
  }
  return d;
}
function iconBtn(glyph,label,fn,cls){
  var b=el('button',cls||null,glyph);
  b.type='button';b.setAttribute('aria-label',label);b.title=label;
  b.onclick=function(e){e.stopPropagation();fn();};
  return b;
}
/* Move an item inside an array and re-render. */
function move(arr,i,delta,panel){
  var j=i+delta;
  if(j<0||j>=arr.length)return;
  var x=arr.splice(i,1)[0];arr.splice(j,0,x);
  touched(false);rebuild(panel);
}

/* -------------------------------------------------------------- file intake */
var MAX_BYTES=20*1048576;
function readAsDataURL(file){
  return new Promise(function(res,rej){
    var fr=new FileReader();
    fr.onload=function(){res(fr.result);};
    fr.onerror=function(){rej(new Error('read failed'));};
    fr.onabort=function(){rej(new Error('read aborted'));};
    fr.readAsDataURL(file);
  });
}
/* Photographs off a phone are far larger than a portfolio needs. */
function shrink(dataUrl){
  return new Promise(function(res){
    var im=new Image();
    var done=false;
    var finish=function(v){ if(!done){done=true;res(v);} };
    im.onload=function(){
      try{
        var max=1600,w=im.width,h=im.height;
        if(w>max||h>max){var k=Math.min(max/w,max/h);w=Math.round(w*k);h=Math.round(h*k);}
        var cv=document.createElement('canvas');cv.width=w;cv.height=h;
        cv.getContext('2d').drawImage(im,0,0,w,h);
        finish(cv.toDataURL('image/jpeg',0.85));
      }catch(e){ finish(dataUrl); }
    };
    im.onerror=function(){ finish(dataUrl); };
    setTimeout(function(){ finish(dataUrl); },8000);
    im.src=dataUrl;
  });
}
function kindOf(it){
  var m=(it.mime||'')+' '+(it.name||'');
  if(it.img||/^image\//.test(it.mime||''))return 'img';
  if(/pdf/i.test(m))return 'pdf';
  if(/word|officedocument|\.docx?\b/i.test(m))return 'doc';
  return 'file';
}
function filesToItems(files,push,panel){
  files=Array.prototype.slice.call(files||[]);
  if(!files.length)return Promise.resolve();
  var added=0,skipped=[];
  return files.reduce(function(chain,f){
    return chain.then(function(){
      if(f.size>MAX_BYTES){ skipped.push(f.name+' ('+humanSize(f.size)+')'); return; }
      return readAsDataURL(f).then(function(url){
        var isImg=/^image\//.test(f.type||'');
        return (isImg?shrink(url):Promise.resolve(url)).then(function(stored){
          var aid=newAid();
          var it={title:f.name.replace(/\.[^.]+$/,''),name:f.name,
                  mime:f.type||'application/octet-stream',date:'',note:'',href:'',
                  aid:aid,size:dataURIsize(stored)};
          if(isImg)it.img=stored;else it.file=stored;
          ATT.put(aid,stored);
          push(it);added++;
        });
      }).catch(function(){ skipped.push(f.name); });
    });
  },Promise.resolve()).then(function(){
    if(added){ touched(true); rebuild(panel); }
    if(added&&!skipped.length)toast(added+(added>1?' files attached':' file attached'));
    else if(added&&skipped.length)toast(added+' attached. Too large or unreadable: '+skipped.join(', '));
    else if(skipped.length)toast('Could not attach '+skipped.join(', ')+'. The limit is '+humanSize(MAX_BYTES)+' a file.');
  });
}

/* ------------------------------------------------------------------- viewer */
var viewerSet=[],viewerAt=0,viewerReturn=null,mammothLoading=null;
function ensureMammoth(){
  if(window.mammoth)return Promise.resolve();
  if(mammothLoading)return mammothLoading;
  mammothLoading=new Promise(function(res,rej){
    var s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    s.onload=function(){res();};
    s.onerror=function(){mammothLoading=null;rej(new Error('offline'));};
    document.head.appendChild(s);
    setTimeout(function(){ if(!window.mammoth){mammothLoading=null;rej(new Error('timeout'));} },12000);
  });
  return mammothLoading;
}
function openDoc(att,set){
  viewerSet=(set&&set.length)?set:[att];
  viewerAt=Math.max(0,viewerSet.indexOf(att));
  viewerReturn=document.activeElement;
  showViewer();
}
function showViewer(){
  var att=viewerSet[viewerAt];
  var v=document.getElementById('viewer');
  var body=v.querySelector('.viewer-body');
  v.querySelector('.t').textContent=att.title||att.name||'Document';
  v.querySelector('.ct').textContent=viewerSet.length>1?(viewerAt+1)+' of '+viewerSet.length:'';
  v.querySelector('.nav-prev').style.display=viewerSet.length>1?'':'none';
  v.querySelector('.nav-next').style.display=viewerSet.length>1?'':'none';
  body.innerHTML='';
  var dl=v.querySelector('.dl');
  var url=att.img||att.file||'';
  var name=att.name||att.title||'file';
  var link=safeURL(att.href);
  if(url){
    dl.href=URL.createObjectURL(dataURItoBlob(url));
    dl.download=name;dl.removeAttribute('target');dl.textContent='Download';dl.style.display='';
  }else if(link){
    dl.href=link;dl.target='_blank';dl.rel='noopener';dl.removeAttribute('download');dl.textContent='Open link';dl.style.display='';
  }else dl.style.display='none';

  v.classList.add('on');
  document.body.classList.add('locked');
  v.querySelector('.x').focus();

  var kind=kindOf(att);
  if(att.img){
    var im=el('img');im.src=att.img;im.alt=att.title||'Evidence';
    im.onclick=function(){im.classList.toggle('zoom');};
    im.title='Click to zoom';
    body.appendChild(im);return;
  }
  if(kind==='pdf'&&att.file){
    var f=el('iframe');f.src=URL.createObjectURL(dataURItoBlob(att.file));
    f.title=att.title||'PDF';body.appendChild(f);return;
  }
  if(kind==='doc'&&att.file){
    body.appendChild(el('div','viewer-note','Rendering document…'));
    ensureMammoth().then(function(){
      return dataURItoBlob(att.file).arrayBuffer().then(function(ab){
        return window.mammoth.convertToHtml({arrayBuffer:ab});
      }).then(function(r){
        body.innerHTML='';body.appendChild(el('div','docx-render',r.value||'<p>This document had no readable text.</p>'));
      });
    }).catch(function(){
      body.innerHTML='';
      body.appendChild(el('div','viewer-note','Use Download to open this Word document. The in‑page preview needs an internet connection the first time.'));
    });
    return;
  }
  if(isMissing(att)){
    body.innerHTML='';
    body.appendChild(el('div','viewer-note','The file for “'+esc(att.title||att.name)+'” is not in this browser’s cache. Open your saved portfolio file, or attach it again.'));
    return;
  }
  if(link){
    var fr=el('iframe');fr.src=link;fr.title=att.title||'Link';
    body.appendChild(fr);
    body.appendChild(el('div','viewer-note','If nothing appears, the site blocks being shown inside another page. Use Open link.'));
    return;
  }
  body.appendChild(el('div','viewer-note','Nothing to preview for this item.'));
}
function closeViewer(){
  var v=document.getElementById('viewer');
  if(!v||!v.classList.contains('on'))return;
  v.classList.remove('on');
  document.body.classList.remove('locked');
  if(viewerReturn&&viewerReturn.focus)try{viewerReturn.focus();}catch(e){}
}
function stepViewer(d){
  if(viewerSet.length<2)return;
  viewerAt=(viewerAt+d+viewerSet.length)%viewerSet.length;
  showViewer();
}

/* ------------------------------------------------------------ evidence lists */
function evidenceRow(fo,it,i,panel){
  var li=el('li');
  li.appendChild(el('span','mk'));
  var body=el('div','body');
  var link=safeURL(it.href);
  if(editing){
    body.appendChild(field(function(){return it.title;},function(v){it.title=v;},{one:true,ph:'What is this evidence called?',recount:false}));
  }else if(link){
    var a=el('a');a.href=link;a.target='_blank';a.rel='noopener';a.textContent=it.title||link;body.appendChild(a);
  }else{
    body.appendChild(txt(it.title||'Untitled evidence'));
  }
  var meta=el('div','meta');
  if(it.date||editing){
    if(editing){
      var di=el('input','inp');di.type='date';di.value=it.date||'';di.style.maxWidth='170px';
      di.setAttribute('aria-label','Date for '+(it.title||'this evidence'));
      di.onchange=function(){it.date=di.value;touched(false);};
      meta.appendChild(di);
    }else meta.appendChild(el('span',null,esc(prettyDate(it.date))));
  }
  if(!editing&&link)meta.appendChild(el('span',null,'link'));
  if(it.note&&!editing)meta.appendChild(el('span',null,esc(it.note)));
  if(meta.childNodes.length)body.appendChild(meta);
  if(editing){
    body.appendChild(field(function(){return it.note;},function(v){it.note=v;},{one:true,ph:'Optional note, for example the class or the date it was taught'}));
    var lr=el('div','meta');
    var li2=el('input','inp');li2.type='url';li2.value=it.href||'';li2.placeholder='https://… optional link';
    li2.setAttribute('aria-label','Link for '+(it.title||'this evidence'));
    li2.oninput=function(){it.href=li2.value;touched(false);};
    lr.appendChild(li2);body.appendChild(lr);
  }
  li.appendChild(body);
  var tools=el('div','tools');
  tools.appendChild(iconBtn('↑','Move up',function(){move(fo.evidence,i,-1,panel);}));
  tools.appendChild(iconBtn('↓','Move down',function(){move(fo.evidence,i,1,panel);}));
  tools.appendChild(iconBtn('×','Remove',function(){removeAt(fo.evidence,i,it.title||'evidence',panel);},'rm'));
  li.appendChild(tools);
  return li;
}
function removeAt(arr,i,label,panel){
  var it=arr.splice(i,1)[0];
  touched(true);rebuild(panel);
  toast('Removed '+label,{label:'Undo',fn:function(){
    arr.splice(i,0,it);touched(true);rebuild(panel);toast('Restored '+label);
  }});
}
function docChip(it,onRemove){
  var kind=isMissing(it)?'gone':kindOf(it);
  var b=el('div','doc'+(isMissing(it)?' missing':''));
  b.setAttribute('role','button');
  b.tabIndex=0;
  b.setAttribute('aria-label','Open '+(it.title||it.name||'document'));
  b.onkeydown=function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault();openDoc(it);} };
  var ic=el('span','ic '+kind,kind==='gone'?'!':kind.toUpperCase().slice(0,3));
  var tx=el('span','tx');
  tx.appendChild(el('span','nm',esc(it.title||it.name||'Document')));
  var bits=[];
  if(it.name)bits.push(esc(it.name));
  if(it.size)bits.push(humanSize(it.size));
  if(it.date)bits.push(esc(prettyDate(it.date)));
  if(isMissing(it))bits.push('file not cached, open your saved copy');
  tx.appendChild(el('span','mt',bits.join(' · ')));
  b.appendChild(ic);b.appendChild(tx);
  b.onclick=function(){openDoc(it);};
  if(onRemove){
    var rm=el('button','rm2','×');
    rm.type='button';rm.setAttribute('aria-label','Remove '+(it.title||it.name||'document'));
    rm.onclick=function(e){e.stopPropagation();onRemove();};
    b.appendChild(rm);
  }
  return b;
}
function attachControls(accept,onFiles,label){
  var drop=el('div','drop');
  drop.appendChild(txt(label||'Drag files here, paste a screenshot, or '));
  var inp=el('input');
  inp.type='file';inp.accept=accept;inp.multiple=true;inp.style.display='none';
  inp.onchange=function(){onFiles(inp.files);inp.value='';};
  var bF=el('button',null,'choose files');bF.type='button';bF.onclick=function(){inp.click();};
  drop.appendChild(bF);
  drop.appendChild(inp);
  drop.addEventListener('dragover',function(e){e.preventDefault();drop.classList.add('hot');});
  drop.addEventListener('dragleave',function(){drop.classList.remove('hot');});
  drop.addEventListener('drop',function(e){e.preventDefault();drop.classList.remove('hot');onFiles(e.dataTransfer.files);});
  return drop;
}
function evidenceCol(fo,panel){
  var c=el('div','col');
  c.appendChild(el('h4',null,'Evidence'));
  var links=fo.evidence.filter(function(e){return !hasBytes(e)&&!isMissing(e);});
  var ul=el('ul','ev');
  if(links.length){
    links.forEach(function(it){ ul.appendChild(evidenceRow(fo,it,fo.evidence.indexOf(it),panel)); });
  }else if(!editing){
    var li=el('li');li.appendChild(el('span','emptynote','Nothing listed yet'));ul.appendChild(li);
  }
  c.appendChild(ul);

  var docs=fo.evidence.filter(function(e){return e.file||isMissing(e);});
  if(docs.length){
    var dv=el('div','docs');
    docs.forEach(function(it){
      dv.appendChild(docChip(it,editing?function(){removeAt(fo.evidence,fo.evidence.indexOf(it),it.title||it.name||'document',panel);}:null));
    });
    c.appendChild(dv);
  }
  var imgs=fo.evidence.filter(function(e){return e.img;});
  if(imgs.length){
    var g=el('div','shots');
    imgs.forEach(function(it){
      var s=el('div','shot');
      var im=el('img');im.src=it.img;im.alt=it.title||'Evidence photograph';im.loading='lazy';
      s.appendChild(im);
      s.onclick=function(){openDoc(it,imgs);};
      s.tabIndex=0;s.setAttribute('role','button');
      s.setAttribute('aria-label','Open '+(it.title||'photograph'));
      s.onkeydown=function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault();openDoc(it,imgs);} };
      var x=el('button','x','×');x.type='button';x.setAttribute('aria-label','Remove '+(it.title||'photograph'));
      x.onclick=function(e){e.stopPropagation();removeAt(fo.evidence,fo.evidence.indexOf(it),it.title||'photograph',panel);};
      s.appendChild(x);g.appendChild(s);
    });
    c.appendChild(g);
  }
  var drop=attachControls('image/*,.pdf,.doc,.docx',function(fl){ filesToItems(fl,function(x){fo.evidence.push(x);},panel); });
  var bL=el('button',null,'add a titled item');bL.type='button';
  bL.onclick=function(){
    fo.evidence.push({title:'',href:'',date:'',note:''});
    touched(true);rebuild(panel);
  };
  drop.appendChild(txt(' or '));drop.appendChild(bL);
  c.appendChild(drop);
  c._focus=fo;
  return c;
}

/* ---------------------------------------------------------------- the views */
function stateLabel(s){ return s===2?'Evidenced':(s===1?'In progress':'To gather'); }
function focusCard(fo,sn,color,panel){
  var card=el('article','fcard');
  card.style.setProperty('--sc',color);
  card.id='f'+String(fo.code).replace(/\./g,'-');
  card.dataset.code=fo.code;
  var top=el('div','fcard-top');
  if(editing){
    var cw=el('div','code');
    cw.appendChild(field(function(){return fo.code;},function(v){fo.code=v;},{one:true,ph:'1.1'}));
    top.appendChild(cw);
  }else top.appendChild(el('div','code',esc(fo.code)));
  var tw=el('div','tw');
  var h3=el('h3');h3.appendChild(field(function(){return fo.title;},function(v){fo.title=v;},{one:true,ph:'Focus area title'}));
  tw.appendChild(h3);
  var p=el('p');p.appendChild(field(function(){return fo.desc;},function(v){fo.desc=v;},{ph:'The wording of this focus area'}));
  tw.appendChild(p);
  top.appendChild(tw);
  var s=stateOf(fo);
  top.appendChild(el('span','state'+(s===2?' done':(s===1?' part':'')),stateLabel(s)));
  card.appendChild(top);

  var cols=el('div','cols');
  cols.appendChild(evidenceCol(fo,panel));
  var c2=el('div','col');
  c2.appendChild(el('h4',null,'How this evidence meets the standard'));
  c2.appendChild(field(function(){return fo.demo;},function(v){fo.demo=v;},
    {ph:'Explain how your evidence demonstrates this standard.',roPh:'To be completed',recount:true}));
  var c3=el('div','col');
  c3.appendChild(el('h4',null,'What I am developing next'));
  c3.appendChild(field(function(){return fo.dev;},function(v){fo.dev=v;},
    {ph:'What, how and when you will build this further.',roPh:'To be completed'}));
  cols.appendChild(c2);cols.appendChild(c3);
  card.appendChild(cols);

  var st=D.standards[sn],i=st.focus.indexOf(fo);
  var tools=el('div','cardtools');
  tools.appendChild(iconBtn('↑ Move up','Move this focus area up',function(){move(st.focus,i,-1,panel);}));
  tools.appendChild(iconBtn('↓ Move down','Move this focus area down',function(){move(st.focus,i,1,panel);}));
  tools.appendChild(iconBtn('× Delete focus area','Delete this focus area',function(){
    removeAt(st.focus,i,'focus area '+fo.code,panel);
  },'danger'));
  card.appendChild(tools);
  return card;
}
function viewStandard(sn){
  var st=D.standards[sn],dom=domainOf(sn),panel='s'+sn;
  var v=el('div');
  v.style.setProperty('--sc',dom.color);
  var h=el('div','std-head');
  h.style.setProperty('--sc',dom.color);
  var hw=el('div','wrap');
  hw.appendChild(el('div','eyebrow',esc(dom.name)));
  var h1=el('h1');
  h1.appendChild(txt('Standard '+sn+'. '));
  h1.appendChild(field(function(){return st.title;},function(v2){st.title=v2;},{one:true,ph:'Standard title',cls:'inl'}));
  hw.appendChild(h1);
  var c=counts(sn);
  var m=el('div','meter');
  m.innerHTML='<span class="track"><i style="width:'+pct(c.full,c.total)+'%"></i><i class="part" style="width:'+pct(c.part,c.total)+'%"></i></span>'+
    '<span class="mtext">'+c.full+' of '+c.total+' focus areas evidenced'+(c.part?', '+c.part+' in progress':'')+'</span>';
  hw.appendChild(m);
  h.appendChild(hw);v.appendChild(h);

  var w=el('div','wrap');
  var list=el('div','focus-list');
  st.focus.forEach(function(fo){ list.appendChild(focusCard(fo,sn,dom.color,panel)); });
  w.appendChild(list);
  var add=el('button','tinybtn editonly','+ Add a focus area to Standard '+sn);
  add.type='button';
  add.onclick=function(){
    st.focus.push({code:sn+'.'+(st.focus.length+1),title:'',desc:'',evidence:[],demo:'',dev:''});
    touched(true);rebuild(panel);
  };
  w.appendChild(add);
  v.appendChild(w);
  return v;
}
function pct(n,t){ return t?Math.round(n/t*100):0; }

function ring(full,part,total){
  var r=26,cir=2*Math.PI*r;
  var a=total?full/total:0,b=total?(full+part)/total:0;
  return '<svg class="ring" width="62" height="62" viewBox="0 0 62 62" aria-hidden="true">'+
    '<circle cx="31" cy="31" r="'+r+'" fill="none" stroke="#e7eae5" stroke-width="7"/>'+
    '<circle cx="31" cy="31" r="'+r+'" fill="none" stroke="#f0d9a8" stroke-width="7" stroke-linecap="round" '+
      'stroke-dasharray="'+(cir*b).toFixed(1)+' '+cir.toFixed(1)+'" transform="rotate(-90 31 31)"/>'+
    '<circle cx="31" cy="31" r="'+r+'" fill="none" stroke="#d99518" stroke-width="7" stroke-linecap="round" '+
      'stroke-dasharray="'+(cir*a).toFixed(1)+' '+cir.toFixed(1)+'" transform="rotate(-90 31 31)"/>'+
    '</svg>';
}
function viewOverview(){
  var v=el('div');
  var hero=el('div','hero');
  var w=el('div','wrap hero-in');
  var h1=el('h1');h1.appendChild(field(function(){return D.profile.name;},function(x){D.profile.name=x;},{one:true,ph:'Your name'}));
  w.appendChild(h1);
  var role=el('p','role');
  if(editing){
    role.appendChild(field(function(){return D.profile.role;},function(x){D.profile.role=x;},{one:true,ph:'Your role',cls:'inl'}));
    role.appendChild(txt(', '));
    role.appendChild(field(function(){return D.profile.tagline;},function(x){D.profile.tagline=x;},{one:true,ph:'Your teaching areas',cls:'inl'}));
  }else{
    role.appendChild(txt([D.profile.role,D.profile.tagline].filter(Boolean).join(', ')));
  }
  w.appendChild(role);
  var sub=el('p','sub');
  sub.appendChild(field(function(){return D.profile.intro;},function(x){D.profile.intro=x;},{ph:'A short introduction for the top of the page.'}));
  w.appendChild(sub);

  var t=totals();
  var fb=el('div','factbar');
  var f1=el('div','fact');
  f1.innerHTML='<div class="k">Evidence gathered</div><div class="dial">'+ring(t.full,t.part,t.total)+
    '<div class="num">'+t.full+' <small>of '+t.total+' focus areas</small>'+
    (t.part?'<br><small>'+t.part+' in progress</small>':'')+'</div></div>';
  var f2=el('div','fact');
  f2.innerHTML='<div class="k">Placement</div>';
  var f2v=el('div','v');f2v.appendChild(field(function(){return D.profile.school;},function(x){D.profile.school=x;},{one:true,ph:'School and state'}));
  f2.appendChild(f2v);
  var f3=el('div','fact');
  f3.innerHTML='<div class="k">Teaching areas</div>';
  var f3v=el('div','v');f3v.appendChild(field(function(){return D.profile.tagline;},function(x){D.profile.tagline=x;},{one:true,ph:'Your teaching areas'}));
  f3.appendChild(f3v);
  fb.appendChild(f1);fb.appendChild(f2);fb.appendChild(f3);
  w.appendChild(fb);

  var two=el('div','two');
  var ab=el('div','block');
  ab.appendChild(el('h2',null,'About my practice'));
  ab.appendChild(field(function(){return D.profile.about;},function(x){D.profile.about=x;},{ph:'Write a short introduction to your practice.'}));
  var cts=contactBlock();
  if(cts)ab.appendChild(cts);
  var q=el('div','block pull');
  var qp=el('p','q');
  qp.appendChild(txt('“'));
  qp.appendChild(field(function(){return D.profile.quote;},function(x){D.profile.quote=x;},{ph:'A line that sums up your practice',cls:'inl'}));
  qp.appendChild(txt('”'));
  q.appendChild(qp);
  q.appendChild(el('div','who',esc(D.profile.name)));
  two.appendChild(ab);two.appendChild(q);
  w.appendChild(two);

  var lg=el('div','domain-legend');
  D.domains.forEach(function(d){
    var full=0,total=0;
    d.standards.forEach(function(s){var c=counts(String(s));full+=c.full;total+=c.total;});
    var b=el('button','leg');b.type='button';
    b.innerHTML='<i style="background:'+esc(d.color)+'"></i><b>'+esc(d.name)+'</b><span>'+full+'/'+total+'</span>';
    b.onclick=function(){go('s'+d.standards[0]);};
    lg.appendChild(b);
  });
  w.appendChild(lg);
  hero.appendChild(w);v.appendChild(hero);
  return v;
}
function contactBlock(){
  var p=D.profile;
  var rows=[['Email','email'],['LinkedIn','linkedin'],['Phone','phone']];
  var any=rows.some(function(r){return (p[r[1]]||'').trim();});
  if(!any&&!editing)return null;
  var box=el('div','contact');
  rows.forEach(function(r){
    var val=(p[r[1]]||'').trim();
    if(!val&&!editing)return;
    var line=el('div','cline');
    line.appendChild(el('b',null,r[0]));
    if(editing){
      line.appendChild(field(function(){return p[r[1]];},function(x){p[r[1]]=x;},{one:true,ph:'Add your '+r[0].toLowerCase(),cls:'inl'}));
    }else{
      var href=r[1]==='phone'?('tel:'+val.replace(/\s+/g,'')):safeURL(val);
      if(href){var a=el('a');a.href=href;if(/^https?:/.test(href)){a.target='_blank';a.rel='noopener';}a.textContent=val;line.appendChild(a);}
      else line.appendChild(txt(val));
    }
    box.appendChild(line);
  });
  return box;
}
function viewPhilosophy(){
  var panel='philosophy';
  var v=el('div');
  var h=el('div','phil-head');
  var hw=el('div','wrap');
  var h1=el('h1');h1.appendChild(field(function(){return D.philosophy.heading;},function(x){D.philosophy.heading=x;},{ph:'The heading for your philosophy'}));
  hw.appendChild(h1);
  var lead=el('p');lead.appendChild(field(function(){return D.philosophy.lead;},function(x){D.philosophy.lead=x;},{ph:'A short lead paragraph.'}));
  hw.appendChild(lead);
  h.appendChild(hw);v.appendChild(h);

  var w=el('div','wrap');
  var g=el('div','pillars');
  D.philosophy.pillars.forEach(function(p,pi){
    var c=el('article','pillar');
    c.appendChild(el('div','n',String(pi+1)));
    var h3=el('h3');h3.appendChild(field(function(){return p.t;},function(x){p.t=x;},{one:true,ph:'Pillar title'}));
    c.appendChild(h3);
    var ul=el('ul');
    p.b.forEach(function(_,bi){
      var li=el('li',editing?'row':null);
      li.appendChild(field(function(){return p.b[bi];},function(x){p.b[bi]=x;},{ph:'A point in this pillar'}));
      if(editing){
        li.appendChild(iconBtn('↑','Move up',function(){move(p.b,bi,-1,panel);}));
        li.appendChild(iconBtn('↓','Move down',function(){move(p.b,bi,1,panel);}));
        li.appendChild(iconBtn('×','Remove point',function(){removeAt(p.b,bi,'point',panel);}));
      }
      ul.appendChild(li);
    });
    c.appendChild(ul);
    var addB=el('button','tinybtn editonly','+ point');addB.type='button';
    addB.onclick=function(){p.b.push('');touched(false);rebuild(panel);};
    c.appendChild(addB);
    var ap=el('div','apst');
    p.apst.forEach(function(code,ai){
      var b=el('b');b.appendChild(txt('Standard '+code));
      b.appendChild(iconBtn('×','Remove standard '+code,function(){p.apst.splice(ai,1);touched(false);rebuild(panel);}));
      ap.appendChild(b);
    });
    var addS=el('button','tinybtn editonly inl','+ standard');addS.type='button';addS.style.marginTop='0';
    addS.onclick=function(){
      var code=prompt('Which focus area does this pillar map to? For example 1.2');
      if(code&&code.trim()){p.apst.push(code.trim());touched(false);rebuild(panel);}
    };
    ap.appendChild(addS);
    c.appendChild(ap);
    var tools=el('div','cardtools');
    tools.appendChild(iconBtn('↑ Up','Move pillar up',function(){move(D.philosophy.pillars,pi,-1,panel);}));
    tools.appendChild(iconBtn('↓ Down','Move pillar down',function(){move(D.philosophy.pillars,pi,1,panel);}));
    tools.appendChild(iconBtn('× Delete','Delete pillar',function(){removeAt(D.philosophy.pillars,pi,'pillar',panel);},'danger'));
    tools.style.margin='14px -22px -22px';
    c.appendChild(tools);
    g.appendChild(c);
  });
  w.appendChild(g);
  var addP=el('button','tinybtn editonly','+ Add a pillar');addP.type='button';
  addP.onclick=function(){
    D.philosophy.pillars.push({n:D.philosophy.pillars.length+1,t:'',b:[''],apst:[]});
    touched(false);rebuild(panel);
  };
  w.appendChild(addP);
  var fl=el('div','flow');
  fl.innerHTML='How learning moves in my classroom: information <em>→</em> processing <em>→</em> long‑term memory, with the load managed at every step.';
  w.appendChild(fl);
  v.appendChild(w);
  return v;
}

/* ------------------------------------------------------------------ summary */
function reportSlot(key,label,sub){
  var att=D.reports[key];
  var s=el('div','slot'+(att?'':' empty'));
  var tw=el('div','tw');
  tw.appendChild(el('div','lab',esc(label)));
  if(att){
    var bits=[att.name||att.title];
    if(att.size)bits.push(humanSize(att.size));
    if(isMissing(att))bits.push('file not cached, open your saved copy');
    tw.appendChild(el('div','sub',esc(bits.filter(Boolean).join(' · '))));
    if(editing){
      tw.appendChild(field(function(){return att.note;},function(v){att.note=v;},{one:true,ph:'Mentor name, date, any note'}));
    }else if(att.note)tw.appendChild(el('div','sub',esc(att.note)));
  }else tw.appendChild(el('div','sub',esc(sub)));
  s.appendChild(tw);
  var act=el('div','act');
  var inp=el('input');inp.type='file';inp.accept='.pdf,.doc,.docx,image/*';inp.style.display='none';
  inp.onchange=function(){ if(inp.files[0])setReport(key,inp.files[0],label); inp.value=''; };
  if(att){
    var bv=el('button',null,'View');bv.type='button';bv.onclick=function(){openDoc(att);};act.appendChild(bv);
    var br=el('button',null,'Replace');br.type='button';br.onclick=function(){inp.click();};act.appendChild(br);
    var bx=el('button',null,'Remove');bx.type='button';
    bx.onclick=function(){
      var old=D.reports[key];D.reports[key]=null;touched(false);rebuild('summary');
      toast('Removed the '+label.toLowerCase(),{label:'Undo',fn:function(){D.reports[key]=old;touched(false);rebuild('summary');}});
    };
    act.appendChild(bx);
  }else{
    var ba=el('button',null,'Attach');ba.type='button';ba.onclick=function(){inp.click();};act.appendChild(ba);
  }
  act.appendChild(inp);
  s.appendChild(act);
  return s;
}
function setReport(key,file,label){
  if(file.size>MAX_BYTES){toast('That file is '+humanSize(file.size)+'. The limit is '+humanSize(MAX_BYTES)+'.');return;}
  readAsDataURL(file).then(function(url){
    var isImg=/^image\//.test(file.type||'');
    return (isImg?shrink(url):Promise.resolve(url)).then(function(stored){
      var aid=newAid();
      D.reports[key]={title:label,name:file.name,mime:file.type||'application/octet-stream',
        note:'',href:'',date:'',aid:aid,size:dataURIsize(stored)};
      if(isImg)D.reports[key].img=stored;else D.reports[key].file=stored;
      ATT.put(aid,stored);
      touched(false);rebuild('summary');toast(label+' attached');
    });
  }).catch(function(){toast('That file could not be read.');});
}
function viewSummary(){
  var panel='summary',t=totals();
  var v=el('div');
  var h=el('div','sum-head');
  var hw=el('div','wrap');
  hw.appendChild(el('h1',null,'Portfolio summary'));
  hw.appendChild(el('p',null,'A one‑look view of coverage against the standards, plus mentor reports and supporting documents. '+
    t.full+' of '+t.total+' focus areas are fully evidenced'+(t.part?', and '+t.part+' are part way there':'')+'.'));
  h.appendChild(hw);v.appendChild(h);

  var w=el('div','wrap');
  var grid=el('div','sum-grid');
  var left=el('div','block');
  left.appendChild(el('h2',null,'Coverage by standard'));
  var bars=el('div','sbars');
  SN.forEach(function(sn){
    var c=counts(sn),dom=domainOf(sn);
    var row=el('button','sbar');row.type='button';
    row.innerHTML='<span class="lab">Standard '+sn+'</span>'+
      '<span class="tk"><i style="width:'+pct(c.full,c.total)+'%;background:'+esc(dom.color)+'"></i>'+
      '<i style="width:'+pct(c.part,c.total)+'%;background:'+esc(dom.color)+'55"></i></span>'+
      '<span class="n">'+c.full+'/'+c.total+'</span>';
    row.setAttribute('aria-label','Standard '+sn+', '+c.full+' of '+c.total+' focus areas evidenced');
    row.onclick=function(){go('s'+sn);};
    bars.appendChild(row);
  });
  left.appendChild(bars);
  var lg=el('div','legend-sm');
  lg.innerHTML='<span><i style="background:#1f6f5c"></i>Evidence and explanation</span>'+
    '<span><i style="background:#1f6f5c55"></i>One of the two</span>'+
    '<span><i style="background:#e7eae5"></i>Nothing yet</span>';
  left.appendChild(lg);
  grid.appendChild(left);

  var right=el('div','block');
  right.appendChild(el('h2',null,'Still to gather'));
  var gl=el('ul','gather'),any=false;
  SN.forEach(function(sn){
    (D.standards[sn].focus||[]).forEach(function(fo){
      var s=stateOf(fo);
      if(s===2)return;
      any=true;
      var li=el('li','clk');
      li.innerHTML='<b>'+esc(fo.code)+'</b><span>'+esc(fo.title)+
        (s===1?' <em style="color:var(--muted);font-style:normal">— '+((fo.evidence||[]).length?'needs an explanation':'needs evidence')+'</em>':'')+'</span>';
      li.onclick=function(){ go('s'+sn); setTimeout(function(){flash('f'+String(fo.code).replace(/\./g,'-'));},120); };
      gl.appendChild(li);
    });
  });
  if(!any)gl.appendChild(el('li',null,'Every focus area has evidence and an explanation. Ready for review.'));
  right.appendChild(gl);
  grid.appendChild(right);
  w.appendChild(grid);

  var rep=el('div','block');rep.style.marginTop='22px';
  rep.appendChild(el('h2',null,'Mentor reports'));
  rep.appendChild(reportSlot('interim','Interim report','Attach the mentor’s interim report (PDF or Word).'));
  rep.appendChild(reportSlot('final','Final report','Attach the mentor’s final report (PDF or Word).'));
  w.appendChild(rep);

  var lib=el('div','block');lib.style.marginTop='22px';
  lib.appendChild(el('h2',null,'Supporting documents'));
  if(D.library.length){
    var dv=el('div','docs');
    D.library.forEach(function(it,i){
      dv.appendChild(docChip(it,editing?function(){removeAt(D.library,i,it.title||it.name||'document',panel);}:null));
    });
    lib.appendChild(dv);
  }else{
    lib.appendChild(el('p','note','Attach lesson plans, resources, photographs or any other evidence you want on hand.'));
  }
  lib.appendChild(attachControls('.pdf,.doc,.docx,image/*',function(fl){
    filesToItems(fl,function(x){D.library.push(x);},panel);
  }));
  w.appendChild(lib);

  var stb=el('div','block');stb.style.marginTop='22px';
  stb.appendChild(el('h2',null,'This portfolio file'));
  var bytes=totalBytes(),cap=25*1048576;
  var so=el('div','storage');
  so.innerHTML='<div class="note">Everything you attach is written inside the file when you use <b>Save file</b>, so your portfolio travels as one document. '+
    'Embedded so far: <b>'+humanSize(bytes)+'</b>.'+
    (D.meta.updated?' Last edit '+esc(new Date(D.meta.updated).toLocaleString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}))+'.':'')+
    '</div><div class="track"><i style="width:'+clamp(Math.round(bytes/cap*100),0,100)+'%"></i></div>';
  var row=el('div','row');
  [['Save file (Ctrl+S)',saveFile],['Export data (.json)',exportJSON],['Import data (.json)',pickJSON],
   ['Restore from a saved portfolio (.html)',pickHTML]].forEach(function(o){
    var b=el('button',null,o[0]);b.type='button';b.onclick=o[1];row.appendChild(b);
  });
  so.appendChild(row);
  if(bytes>15*1048576)so.appendChild(el('div','warn','Getting large. For big PDFs, consider adding a link instead of embedding the file so the page stays quick to open.'));
  var missing=0;eachAttachment(function(it){if(isMissing(it))missing++;});
  if(missing){
    so.appendChild(el('div','warn',missing+' attachment'+(missing>1?'s are':' is')+' listed but the file itself is not in this browser. Open your saved portfolio file to bring them back, or attach them again.'));
  }
  stb.appendChild(so);
  w.appendChild(stb);
  v.appendChild(w);
  return v;
}

/* ------------------------------------------------------------------ search */
function norm(s){
  return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
var indexCache=null;
function invalidateIndex(){ indexCache=null; }
function buildIndex(){
  if(indexCache)return indexCache;
  var ix=[];
  function add(e){
    e.fields=e.fields.filter(function(f){return (f.text||'').trim();});
    e.hay=norm(e.title+' '+e.fields.map(function(f){return f.text;}).join(' '));
    ix.push(e);
  }
  var p=D.profile;
  add({tab:'overview',id:'v-overview',where:'Overview',color:'#d99518',title:p.name||'Overview',
    fields:[{label:'Role',text:[p.role,p.tagline].filter(Boolean).join(', ')},
            {label:'Placement',text:p.school},{label:'Program',text:p.program},
            {label:'Introduction',text:p.intro},{label:'About my practice',text:p.about},
            {label:'Quote',text:p.quote},{label:'Contact',text:[p.email,p.linkedin,p.phone].filter(Boolean).join(' ')}]});
  add({tab:'philosophy',id:'v-philosophy',where:'Philosophy',color:'#d99518',title:D.philosophy.heading||'Teaching philosophy',
    fields:[{label:'Lead',text:D.philosophy.lead}]});
  D.philosophy.pillars.forEach(function(pl,i){
    add({tab:'philosophy',id:'v-philosophy',where:'Philosophy',color:'#d99518',
      title:(i+1)+'. '+(pl.t||'Pillar'),
      fields:[{label:'Points',text:pl.b.join(' · ')},{label:'Standards',text:pl.apst.map(function(a){return 'Standard '+a;}).join(', ')}]});
  });
  SN.forEach(function(sn){
    var st=D.standards[sn],dom=domainOf(sn);
    add({tab:'s'+sn,id:'v-s'+sn,where:'Standard '+sn,color:dom.color,
      title:'Standard '+sn+'. '+st.title,fields:[{label:'Domain',text:dom.name}]});
    (st.focus||[]).forEach(function(fo){
      var evTitles=(fo.evidence||[]).map(function(e){return e.title;}).filter(Boolean).join(' · ');
      var evNotes=(fo.evidence||[]).map(function(e){return [e.note,e.name,prettyDate(e.date)].filter(Boolean).join(' ');}).filter(Boolean).join(' · ');
      var evLinks=(fo.evidence||[]).map(function(e){return e.href;}).filter(Boolean).join(' ');
      add({tab:'s'+sn,id:'f'+String(fo.code).replace(/\./g,'-'),where:'Standard '+sn+' · '+dom.name,color:dom.color,
        code:String(fo.code),title:fo.code+' '+fo.title,
        fields:[{label:'Focus area',text:fo.desc},
                {label:'Evidence',text:evTitles},
                {label:'Attachments',text:evNotes},
                {label:'Links',text:evLinks},
                {label:'How this meets the standard',text:fo.demo},
                {label:'Developing next',text:fo.dev}]});
    });
  });
  ['interim','final'].forEach(function(k){
    var a=D.reports[k];
    if(!a)return;
    add({tab:'summary',id:'v-summary',where:'Summary · Mentor reports',color:'#2f5691',
      title:(k==='interim'?'Interim report':'Final report'),
      fields:[{label:'File',text:[a.name,a.title].filter(Boolean).join(' ')},{label:'Note',text:a.note}]});
  });
  (D.library||[]).forEach(function(it){
    add({tab:'summary',id:'v-summary',where:'Summary · Supporting documents',color:'#2f5691',
      title:it.title||it.name||'Document',
      fields:[{label:'File',text:it.name},{label:'Note',text:it.note},{label:'Date',text:prettyDate(it.date)}]});
  });
  indexCache=ix;
  return ix;
}
function terms(q){
  return norm(q).split(/[^a-z0-9.+#']+/).filter(function(t){return t.length>0;});
}
function scoreEntry(e,tl,phrase){
  var ntitle=norm(e.title),score=0;
  for(var i=0;i<tl.length;i++){
    var t=tl[i];
    if(e.hay.indexOf(t)<0)return 0;              /* every word must appear */
    if(new RegExp('(^|[^a-z0-9])'+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(ntitle))score+=60;
    else if(ntitle.indexOf(t)>=0)score+=32;
    var from=0,hits=0;
    while(hits<4){
      var at=e.hay.indexOf(t,from);
      if(at<0)break;
      hits++;from=at+t.length;
    }
    score+=hits*9;
  }
  if(phrase.length>1){
    if(ntitle.indexOf(phrase)>=0)score+=140;
    else if(e.hay.indexOf(phrase)>=0)score+=50;
  }
  if(e.code&&tl.indexOf(norm(e.code))>=0)score+=400;
  if(e.code&&tl.length===1&&norm(e.code).indexOf(tl[0])===0)score+=200;
  return score;
}
function runSearch(q){
  var tl=terms(q);
  if(!tl.length)return [];
  var phrase=norm(q).trim();
  var out=[];
  buildIndex().forEach(function(e){
    var s=scoreEntry(e,tl,phrase);
    if(s>0)out.push({e:e,score:s});
  });
  out.sort(function(a,b){return b.score-a.score;});
  return out;
}
function highlight(text,tl){
  if(!text)return '';
  var pat=tl.map(function(t){return t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).sort(function(a,b){return b.length-a.length;}).join('|');
  if(!pat)return esc(text);
  var re=new RegExp('('+pat+')','gi');
  var parts=String(text).split(re);
  var html='';
  for(var i=0;i<parts.length;i++){
    if(i%2===1)html+='<mark>'+esc(parts[i])+'</mark>';
    else html+=esc(parts[i]);
  }
  return html;
}
function snippet(text,tl,len){
  var n=norm(text),first=-1;
  tl.forEach(function(t){var at=n.indexOf(t);if(at>=0&&(first<0||at<first))first=at;});
  if(first<0)return null;
  len=len||150;
  var start=Math.max(0,first-60);
  if(start>0){var sp=text.indexOf(' ',start);if(sp>=0&&sp<start+25)start=sp+1;}
  var out=text.slice(start,start+len);
  return (start>0?'…':'')+highlight(out,tl)+(start+len<text.length?'…':'');
}
var searchFilter='all',selIdx=-1;
function viewSearch(){
  var v=el('div');
  var q=state.query;
  var tl=terms(q);
  var hits=q.trim().length?runSearch(q):[];
  var groups={};
  hits.forEach(function(h){ (groups[h.e.tab]=groups[h.e.tab]||[]).push(h); });
  var h=el('div','res-head');
  var hw=el('div','wrap');
  var h1=el('h1');
  if(!q.trim())h1.innerHTML='Search the portfolio';
  else h1.innerHTML=hits.length+' result'+(hits.length===1?'':'s')+' for <b>'+esc(q)+'</b>';
  hw.appendChild(h1);
  hw.appendChild(el('p',null,q.trim()
    ? 'Every result opens the tab it lives in and jumps to the exact card. Use the arrow keys from the search box, then Enter.'
    : 'Type at least two characters in the search box, or press the slash key from anywhere.'));
  if(hits.length){
    var fl=el('div','res-filters');
    var mk=function(key,label,color,n){
      var b=el('button');b.type='button';
      b.setAttribute('aria-pressed',searchFilter===key?'true':'false');
      b.innerHTML=(color?'<i style="background:'+esc(color)+'"></i>':'')+esc(label)+' <span>'+n+'</span>';
      b.onclick=function(){searchFilter=key;selIdx=-1;rebuild('search');showPanel('search');};
      return b;
    };
    fl.appendChild(mk('all','Everything','',hits.length));
    PANELS_ORDER.forEach(function(id){
      if(!groups[id])return;
      var label=tabLabel(id),color=id.charAt(0)==='s'?domainOf(id.slice(1)).color:'#d99518';
      fl.appendChild(mk(id,label,color,groups[id].length));
    });
    hw.appendChild(fl);
  }
  h.appendChild(hw);v.appendChild(h);

  var w=el('div','wrap');
  var list=el('div','res-list');
  var shown=hits.filter(function(x){return searchFilter==='all'||x.e.tab===searchFilter;});
  if(!q.trim()){
    list.appendChild(el('div','res-none','<b>Nothing searched yet</b>Try a focus area code such as 1.2, a phrase such as cognitive load, or a file name.'));
  }else if(!shown.length){
    var none=el('div','res-none');
    none.innerHTML='<b>No matches for “'+esc(q)+'”</b>'+
      'Every word you type has to appear somewhere in a card.'+
      '<div class="res-tips">Try fewer words, a focus area code such as 2.3, or check the spelling.</div>';
    list.appendChild(none);
  }else{
    shown.forEach(function(x,i){
      var e=x.e;
      var b=el('button','r');b.type='button';
      b.style.setProperty('--rc',e.color||'#d99518');
      b.dataset.i=i;
      var where=el('div','where');
      where.innerHTML='<i></i>'+esc(e.where);
      b.appendChild(where);
      b.appendChild(el('div','rt',highlight(e.title,tl)));
      var used=0;
      e.fields.forEach(function(f){
        if(used>=2)return;
        var s=snippet(f.text,tl);
        if(!s)return;
        used++;
        b.appendChild(el('div','snip','<span class="fld">'+esc(f.label)+'</span>'+s));
      });
      if(!used){
        var s2=snippet(e.fields.length?e.fields[0].text:'',tl,120);
        if(s2)b.appendChild(el('div','snip',s2));
      }
      b.appendChild(el('span','go','Open '+tabLabel(e.tab)+' →'));
      b.onclick=function(){jumpTo(e);};
      list.appendChild(b);
    });
  }
  w.appendChild(list);
  v.appendChild(w);
  return v;
}
function jumpTo(e){
  go(e.tab);
  setTimeout(function(){flash(e.id);},120);
}
function flash(id){
  var n=document.getElementById(id);
  if(!n)return;
  try{ n.scrollIntoView({behavior:'smooth',block:'center'}); }catch(err){ n.scrollIntoView(); }
  n.classList.remove('flash');
  void n.offsetWidth;
  n.classList.add('flash');
  if(n.tabIndex<0)n.tabIndex=-1;
}
function moveSelection(d){
  var cards=Array.prototype.slice.call(document.querySelectorAll('#v-search .r'));
  if(!cards.length)return;
  selIdx=clamp(selIdx+d,0,cards.length-1);
  cards.forEach(function(c,i){ c.classList.toggle('sel',i===selIdx); });
  var c=cards[selIdx];
  if(c)c.scrollIntoView({block:'nearest'});
}
function openSelection(){
  var cards=document.querySelectorAll('#v-search .r');
  var c=cards[selIdx>=0?selIdx:0];
  if(c)c.click();
}

/* ------------------------------------------------------------------- panels */
var state={query:''};
var editing=false;
var panels={},dirtyPanels={},built=false;
function tabLabel(id){
  if(id==='overview')return 'Overview';
  if(id==='philosophy')return 'Philosophy';
  if(id==='summary')return 'Summary';
  if(id==='search')return 'Search results';
  return 'Standard '+id.slice(1);
}
function buildPanel(id){
  if(id==='overview')return viewOverview();
  if(id==='philosophy')return viewPhilosophy();
  if(id==='summary')return viewSummary();
  if(id==='search')return viewSearch();
  return viewStandard(id.slice(1));
}
function rebuild(id){
  invalidateIndex();
  if(!id)return;
  if(id==='all'){ PANELS_ORDER.concat(['search']).forEach(function(p){dirtyPanels[p]=true;}); id=state.current; }
  dirtyPanels[id]=true;
  if(state.current===id)renderPanel(id);
}
function markDirty(){
  invalidateIndex();
  Array.prototype.forEach.call(arguments,function(id){ if(id!==state.current)dirtyPanels[id]=true; });
}
function renderPanel(id){
  var host=panels[id];
  if(!host)return;
  var y=window.scrollY;
  host.innerHTML='';
  host.appendChild(buildPanel(id));
  dirtyPanels[id]=false;
  if(state.current===id)window.scrollTo(0,y);
}
function showPanel(id){
  if(dirtyPanels[id])renderPanel(id);
  PANELS_ORDER.concat(['search']).forEach(function(p){
    if(panels[p])panels[p].classList.toggle('on',p===id);
  });
}
function syncTabs(){
  var bar=document.querySelector('.tabs-in');
  if(!bar)return;
  SN.forEach(function(sn){
    var t=bar.querySelector('.tab[data-id="s'+sn+'"] .cnt');
    if(t){var c=counts(sn);t.textContent=c.full+'/'+c.total;}
  });
  Array.prototype.forEach.call(bar.querySelectorAll('.tab'),function(b){
    var on=b.dataset.id===state.current;
    b.setAttribute('aria-selected',on?'true':'false');
    b.tabIndex=on?0:-1;
  });
  var cur=bar.querySelector('.tab[aria-selected="true"]');
  if(cur&&cur.scrollIntoView){
    try{ cur.scrollIntoView({block:'nearest',inline:'nearest'}); }catch(e){}
  }
  updateTabMask(bar);
  var st=bar.querySelector('.tab.searchtab');
  var want=!!state.query.trim();
  if(want&&!st){
    var b=makeTab('search','Search',null,null);
    b.classList.add('searchtab');
    bar.appendChild(b);
    st=b;
  }
  if(st){
    st.style.display=want?'':'none';
    var n=st.querySelector('.cnt');
    if(n)n.textContent=state.query.trim()?String(runSearch(state.query).length):'';
    if(want&&state.current==='search'&&st.scrollIntoView){
      try{ st.scrollIntoView({block:'nearest',inline:'nearest'}); }catch(e){}
    }
  }
}
/* Fade the right edge only while there are tabs still off screen. */
function updateTabMask(bar){
  bar=bar||document.querySelector('.tabs-in');
  if(!bar)return;
  var atEnd=bar.scrollWidth-bar.clientWidth<=1||bar.scrollLeft+bar.clientWidth>=bar.scrollWidth-2;
  bar.classList.toggle('atend',atEnd);
}

/* Update just the progress chips and meter in the panel on screen. */
function syncStateChips(){
  var id=state.current;
  if(!id||id.charAt(0)!=='s')return;
  var sn=id.slice(1),host=panels[id];
  if(!host)return;
  (D.standards[sn].focus||[]).forEach(function(fo){
    var card=host.querySelector('.fcard[data-code="'+String(fo.code).replace(/"/g,'')+'"]');
    if(!card)return;
    var chip=card.querySelector('.state');
    if(!chip)return;
    var s=stateOf(fo);
    chip.className='state'+(s===2?' done':(s===1?' part':''));
    chip.textContent=stateLabel(s);
  });
  var c=counts(sn);
  var track=host.querySelectorAll('.std-head .track i');
  if(track.length===2){
    track[0].style.width=pct(c.full,c.total)+'%';
    track[1].style.width=pct(c.part,c.total)+'%';
  }
  var mt=host.querySelector('.std-head .mtext');
  if(mt)mt.textContent=c.full+' of '+c.total+' focus areas evidenced'+(c.part?', '+c.part+' in progress':'');
}

/* -------------------------------------------------------------------- shell */
var LOGO='<svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">'+
 '<rect width="34" height="34" rx="9" fill="#d99518"/>'+
 '<rect x="7" y="8.5" width="14" height="2.6" rx="1.3" fill="#0f1c23"/>'+
 '<rect x="7" y="14" width="20" height="2.6" rx="1.3" fill="#0f1c23" opacity=".55"/>'+
 '<rect x="7" y="19.5" width="11" height="2.6" rx="1.3" fill="#0f1c23" opacity=".3"/>'+
 '<path d="M19.5 24.2l3 3 6.2-7" stroke="#0f1c23" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

function makeTab(id,label,color,cnt){
  var b=el('button','tab');
  b.type='button';b.dataset.id=id;
  b.setAttribute('role','tab');
  b.id='tab-'+id;
  b.setAttribute('aria-controls','v-'+id);
  b.setAttribute('aria-selected',state.current===id?'true':'false');
  b.tabIndex=state.current===id?0:-1;
  if(color)b.style.setProperty('--tabc',color);
  b.innerHTML=(color?'<span class="chip"></span>':'')+esc(label)+
    ((cnt||id==='search')?'<span class="cnt">'+esc(cnt||'')+'</span>':'');
  b.onclick=function(){go(id);};
  return b;
}
function buildShell(){
  var root=document.getElementById('app');
  root.innerHTML='';

  var skip=el('a','skip','Skip to content');skip.href='#main';root.appendChild(skip);

  var mast=el('header','mast');
  var mw=el('div','wrap mast-in');
  var lg=el('a','logo');lg.href='#overview';
  lg.onclick=function(e){e.preventDefault();go('overview');};
  lg.innerHTML=LOGO+'<span style="display:block"><b class="logoname">'+esc(D.profile.name)+'</b><span>Professional experience portfolio</span></span>';
  mw.appendChild(lg);

  var sw=el('div','search');
  sw.innerHTML='<svg class="ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#cfe0e1" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
  var si=el('input');
  si.type='search';si.placeholder='Search the portfolio';si.value=state.query;
  si.setAttribute('aria-label','Search the portfolio');
  si.setAttribute('aria-describedby','search-help');
  si.autocomplete='off';si.spellcheck=false;
  var clr=el('button','clr','×');clr.type='button';clr.setAttribute('aria-label','Clear the search');
  clr.onclick=function(){ si.value='';onSearchInput('');si.focus(); };
  var searchTimer;
  si.addEventListener('input',function(){
    clearTimeout(searchTimer);
    var val=si.value;
    searchTimer=setTimeout(function(){onSearchInput(val);},140);
  });
  si.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){e.preventDefault();moveSelection(1);}
    else if(e.key==='ArrowUp'){e.preventDefault();moveSelection(-1);}
    else if(e.key==='Enter'){e.preventDefault();openSelection();}
    else if(e.key==='Escape'){ if(si.value){si.value='';onSearchInput('');} else si.blur(); }
  });
  sw.appendChild(si);sw.appendChild(clr);
  sw.appendChild(el('span','sr','Results appear in a Search tab below the header. Use the arrow keys then Enter to open one.')).id='search-help';
  mw.appendChild(sw);

  var act=el('div','mast-actions');
  var pill=el('button','savepill');pill.type='button';pill.onclick=saveFile;
  act.appendChild(pill);
  var be=el('button','btn'+(editing?' live':''),editing?'Done editing':'Edit');
  be.type='button';
  be.onclick=toggleEditing;
  act.appendChild(be);
  var bs=el('button','btn icon','⚙');
  bs.type='button';bs.title='Portfolio details';bs.setAttribute('aria-label','Portfolio details and appearance');
  bs.onclick=openSettings;
  act.appendChild(bs);
  var menu=el('div','menu');
  var mb=el('button','btn solid');mb.type='button';
  mb.innerHTML='Download <span style="opacity:.65">▾</span>';
  mb.setAttribute('aria-haspopup','true');mb.setAttribute('aria-expanded','false');
  var ml=el('div','menu-list');
  [['Save file (keeps everything)','Your text, photos and documents in one .html file',saveFile],
   ['PDF document','Opens a print view, choose Save as PDF',downloadPDF],
   ['Word document (.doc)','Opens in Word for further editing',downloadDOCX],
   [null,null,null],
   ['Portfolio data (.json)','Text and files as data, for backup',exportJSON],
   ['Import data (.json)','Replace the content from a backup',pickJSON],
   ['Restore from a saved portfolio (.html)','Bring back attachments from a saved copy',pickHTML]
  ].forEach(function(o){
    if(!o[0]){ml.appendChild(el('hr'));return;}
    var b=el('button',null,esc(o[0])+'<small>'+esc(o[1])+'</small>');
    b.type='button';
    b.onclick=function(){ml.classList.remove('on');mb.setAttribute('aria-expanded','false');o[2]();};
    ml.appendChild(b);
  });
  mb.onclick=function(e){
    e.stopPropagation();
    var on=ml.classList.toggle('on');
    mb.setAttribute('aria-expanded',on?'true':'false');
  };
  menu.appendChild(mb);menu.appendChild(ml);
  act.appendChild(menu);
  var bh=el('button','btn icon','?');
  bh.type='button';bh.title='Keyboard shortcuts';bh.setAttribute('aria-label','Keyboard shortcuts');
  bh.onclick=openHelp;
  act.appendChild(bh);
  mw.appendChild(act);
  mast.appendChild(mw);
  root.appendChild(mast);

  var tabs=el('nav','tabs');
  tabs.setAttribute('aria-label','Portfolio sections');
  var tw=el('div','wrap tabs-in');
  tw.setAttribute('role','tablist');
  tw.appendChild(makeTab('overview','Overview'));
  tw.appendChild(makeTab('philosophy','Philosophy'));
  SN.forEach(function(sn){
    var c=counts(sn);
    tw.appendChild(makeTab('s'+sn,'Standard '+sn,domainOf(sn).color,c.full+'/'+c.total));
  });
  tw.appendChild(makeTab('summary','Summary'));
  tw.addEventListener('keydown',tabKeys);
  tw.addEventListener('scroll',function(){updateTabMask(tw);});
  tabs.appendChild(tw);
  root.appendChild(tabs);

  var main=el('main');main.id='main';
  PANELS_ORDER.concat(['search']).forEach(function(id){
    var sec=el('section','view');
    sec.id='v-'+id;
    sec.setAttribute('role','tabpanel');
    sec.setAttribute('aria-labelledby','tab-'+id);
    sec.tabIndex=-1;
    panels[id]=sec;
    dirtyPanels[id]=true;
    main.appendChild(sec);
  });
  root.appendChild(main);

  root.appendChild(buildFooter());

  if(!document.getElementById('viewer'))buildViewer();
  syncSavePill();
}
function buildFooter(){
  var f=el('footer');
  var fw=el('div','wrap');
  var g=el('div','fgrid');
  var c1=el('div');
  c1.innerHTML='<h5>'+esc(D.profile.name)+'</h5><p class="blurb">'+esc(D.profile.role)+' in '+esc(D.profile.tagline)+
    '. Currently on placement at '+esc(D.profile.school)+'.</p>';
  if(D.profile.email){
    var a=el('a','mail');a.href='mailto:'+D.profile.email;a.textContent=D.profile.email;
    var p=el('p');p.appendChild(a);c1.appendChild(p);
  }
  g.appendChild(c1);
  var col=function(title,arr,extra){
    var c=el('div');
    c.innerHTML='<h5>'+esc(title)+'</h5>';
    var u=el('ul');
    arr.forEach(function(s){
      var b=el('button','link','Standard '+s+'. '+esc(D.standards[s].title));
      b.type='button';b.onclick=function(){go('s'+s);};
      var li=el('li');li.appendChild(b);u.appendChild(li);
    });
    (extra||[]).forEach(function(pair){
      var b=el('button','link',esc(pair[0]));
      b.type='button';b.onclick=function(){go(pair[1]);};
      var li=el('li');li.appendChild(b);u.appendChild(li);
    });
    c.appendChild(u);return c;
  };
  D.domains.forEach(function(d,i){
    g.appendChild(col(d.name,d.standards,i===D.domains.length-1?[['Teaching philosophy','philosophy'],['Summary','summary']]:null));
  });
  fw.appendChild(g);
  var fb=el('div','fbot');
  fb.innerHTML='<span style="margin-left:0">Mapped to the Australian Professional Standards for Teachers, Graduate career stage.</span>'+
    '<span>'+esc(D.profile.program)+'</span>';
  fw.appendChild(fb);
  f.appendChild(fw);
  return f;
}
function buildViewer(){
  var vw=el('div','viewer');
  vw.id='viewer';
  vw.setAttribute('role','dialog');
  vw.setAttribute('aria-modal','true');
  vw.setAttribute('aria-label','Document viewer');
  vw.innerHTML='<div class="viewer-box"><div class="viewer-bar">'+
    '<span class="t"></span><span class="ct"></span>'+
    '<span class="sp"><button type="button" class="nav-prev" aria-label="Previous">‹ Prev</button>'+
    '<button type="button" class="nav-next" aria-label="Next">Next ›</button>'+
    '<a class="dl" href="#">Download</a><button type="button" class="x">Close</button></span>'+
    '</div><div class="viewer-body"></div></div>';
  document.body.appendChild(vw);
  vw.addEventListener('click',function(e){ if(e.target===vw)closeViewer(); });
  vw.querySelector('.x').onclick=closeViewer;
  vw.querySelector('.nav-prev').onclick=function(){stepViewer(-1);};
  vw.querySelector('.nav-next').onclick=function(){stepViewer(1);};
  vw.addEventListener('keydown',function(e){
    if(e.key==='Tab'){
      var f=vw.querySelectorAll('button:not([style*="display: none"]),a[href]');
      if(!f.length)return;
      var first=f[0],last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
    if(e.key==='ArrowLeft')stepViewer(-1);
    if(e.key==='ArrowRight')stepViewer(1);
  });
}
function tabKeys(e){
  var keys=['ArrowLeft','ArrowRight','Home','End'];
  if(keys.indexOf(e.key)<0)return;
  var tabs=Array.prototype.slice.call(e.currentTarget.querySelectorAll('.tab')).filter(function(t){return t.style.display!=='none';});
  var i=tabs.indexOf(document.activeElement);
  if(i<0)i=tabs.findIndex(function(t){return t.getAttribute('aria-selected')==='true';});
  var j=i;
  if(e.key==='ArrowLeft')j=i-1;
  if(e.key==='ArrowRight')j=i+1;
  if(e.key==='Home')j=0;
  if(e.key==='End')j=tabs.length-1;
  j=clamp(j,0,tabs.length-1);
  e.preventDefault();
  tabs[j].focus();
  tabs[j].click();
}
function toggleEditing(){
  editing=!editing;
  document.body.classList.toggle('editing',editing);
  rebuild('all');
  buildShellChrome();
  showPanel(state.current);
  toast(editing
    ? 'Edit mode on. Every heading and paragraph is now editable. Paste screenshots straight into an Evidence panel.'
    : 'Edit mode off. Use Save file to keep a copy you can reopen anywhere.');
}
/* Refresh only the header controls that depend on edit mode. */
function buildShellChrome(){
  var be=document.querySelector('.mast-actions .btn');
  if(be){
    be.className='btn'+(editing?' live':'');
    be.textContent=editing?'Done editing':'Edit';
  }
  var ln=document.querySelector('.logoname');
  if(ln)ln.textContent=D.profile.name;
}

/* ------------------------------------------------------------------ routing */
function parseHash(){
  var raw=(location.hash||'').replace(/^#/,'');
  var q='';
  var m=raw.indexOf('?q=');
  if(m>=0){ q=decodeURIComponent(raw.slice(m+3).replace(/\+/g,' ')); raw=raw.slice(0,m); }
  if(PANELS_ORDER.indexOf(raw)<0&&raw!=='search')raw='overview';
  return {id:raw,q:q};
}
var suppressHash=false;
function go(id,opts){
  opts=opts||{};
  if(PANELS_ORDER.indexOf(id)<0&&id!=='search')id='overview';
  state.current=id;
  var hash=id+(id==='search'&&state.query?('?q='+encodeURIComponent(state.query)):'');
  suppressHash=true;
  try{
    if(opts.replace)history.replaceState(null,'','#'+hash);
    else if(('#'+hash)!==location.hash)location.hash=hash;
  }catch(err){ try{location.hash=hash;}catch(e2){} }
  setTimeout(function(){suppressHash=false;},0);
  showPanel(id);
  syncTabs();
  if(!opts.keepScroll)window.scrollTo(0,0);
  var p=panels[id];
  if(p&&opts.focus)p.focus();
}
window.addEventListener('resize',function(){ updateTabMask(); });
window.addEventListener('hashchange',function(){
  if(suppressHash)return;
  var h=parseHash();
  if(h.id==='search'&&h.q!==state.query){
    state.query=h.q;
    var si=document.querySelector('.search input');
    if(si)si.value=h.q;
    rebuild('search');
  }
  state.current=h.id;
  showPanel(h.id);
  syncTabs();
});
function onSearchInput(val){
  state.query=val;
  selIdx=-1;searchFilter='all';
  var sw=document.querySelector('.search');
  if(sw)sw.classList.toggle('has',!!val.trim());
  dirtyPanels.search=true;
  syncTabs();
  if(val.trim().length>=2){
    if(state.current!=='search'){ lastBeforeSearch=state.current; }
    go('search',{replace:state.current==='search',keepScroll:state.current==='search'});
  }else if(state.current==='search'&&!val.trim()){
    go(lastBeforeSearch||'overview',{replace:true});
  }else if(state.current==='search'){
    renderPanel('search');
  }
}
var lastBeforeSearch='overview';

/* -------------------------------------------------------- settings and help */
function modal(title,buildBody){
  var m=el('div','modal');
  m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label',title);
  var box=el('div','modal-box');
  var bar=el('div','modal-bar');
  bar.appendChild(el('h2',null,esc(title)));
  var x=el('button',null,'Close');x.type='button';
  bar.appendChild(x);
  box.appendChild(bar);
  var body=el('div','modal-body');
  buildBody(body,close);
  box.appendChild(body);
  m.appendChild(box);
  document.body.appendChild(m);
  document.body.classList.add('locked');
  m.classList.add('on');
  var ret=document.activeElement;
  x.focus();
  function close(){
    m.remove();
    document.body.classList.remove('locked');
    if(ret&&ret.focus)try{ret.focus();}catch(e){}
    rebuild('all');
    showPanel(state.current);
    buildShellChrome();
    syncTabs();
  }
  x.onclick=close;
  m.addEventListener('click',function(e){ if(e.target===m)close(); });
  m.addEventListener('keydown',function(e){ if(e.key==='Escape'){e.stopPropagation();close();} });
  return close;
}
function textRow(body,label,hint,get,set,opts){
  opts=opts||{};
  var row=el('div','fieldrow');
  var id='f'+Math.random().toString(36).slice(2,8);
  var lab=el('label',null,esc(label)+(hint?'<span class="hint">'+esc(hint)+'</span>':''));
  lab.setAttribute('for',id);
  row.appendChild(lab);
  var inp=el(opts.area?'textarea':'input','inp');
  inp.id=id;
  if(!opts.area)inp.type=opts.type||'text';
  inp.value=get()||'';
  if(opts.ph)inp.placeholder=opts.ph;
  inp.oninput=function(){ set(inp.value); touched(opts.recount); };
  row.appendChild(inp);
  body.appendChild(row);
  return inp;
}
function openSettings(){
  modal('Portfolio details',function(body){
    body.appendChild(el('h3',null,'Who this portfolio belongs to'));
    textRow(body,'Full name','Shown in the header, hero and footer',function(){return D.profile.name;},function(v){D.profile.name=v;});
    textRow(body,'Initials','Used on the cover of the PDF and Word exports',function(){return D.profile.initials;},function(v){D.profile.initials=v;});
    textRow(body,'Role',null,function(){return D.profile.role;},function(v){D.profile.role=v;});
    textRow(body,'Teaching areas',null,function(){return D.profile.tagline;},function(v){D.profile.tagline=v;});
    textRow(body,'Placement school',null,function(){return D.profile.school;},function(v){D.profile.school=v;});
    textRow(body,'Unit and university',null,function(){return D.profile.program;},function(v){D.profile.program=v;});

    body.appendChild(el('h3',null,'Contact, shown on the overview'));
    textRow(body,'Email',null,function(){return D.profile.email;},function(v){D.profile.email=v;},{type:'email',ph:'you@example.com'});
    textRow(body,'LinkedIn',null,function(){return D.profile.linkedin;},function(v){D.profile.linkedin=v;},{ph:'linkedin.com/in/…'});
    textRow(body,'Phone',null,function(){return D.profile.phone;},function(v){D.profile.phone=v;});

    body.appendChild(el('h3',null,'Words on the page'));
    textRow(body,'Hero introduction',null,function(){return D.profile.intro;},function(v){D.profile.intro=v;},{area:true});
    textRow(body,'About my practice',null,function(){return D.profile.about;},function(v){D.profile.about=v;},{area:true});
    textRow(body,'Quote',null,function(){return D.profile.quote;},function(v){D.profile.quote=v;},{area:true});
    textRow(body,'Philosophy heading',null,function(){return D.philosophy.heading;},function(v){D.philosophy.heading=v;});
    textRow(body,'Philosophy lead',null,function(){return D.philosophy.lead;},function(v){D.philosophy.lead=v;},{area:true});

    body.appendChild(el('h3',null,'Domain names and colours'));
    D.domains.forEach(function(d){
      var row=el('div','fieldrow');
      var lab=el('label',null,'Standards '+d.standards.join(', ')+'<span class="hint">Name and colour</span>');
      row.appendChild(lab);
      var wrapd=el('div');
      wrapd.style.display='flex';wrapd.style.gap='10px';
      var n=el('input','inp');n.type='text';n.value=d.name;n.setAttribute('aria-label','Name for standards '+d.standards.join(', '));
      n.oninput=function(){d.name=n.value;touched(false);};
      var c=el('input','inp');c.type='color';c.value=d.color;c.style.width='58px';c.style.flex='none';
      c.setAttribute('aria-label','Colour for standards '+d.standards.join(', '));
      c.oninput=function(){d.color=c.value;touched(false);};
      wrapd.appendChild(n);wrapd.appendChild(c);
      row.appendChild(wrapd);
      body.appendChild(row);
    });

    body.appendChild(el('h3',null,'Standard titles'));
    SN.forEach(function(sn){
      textRow(body,'Standard '+sn,null,function(){return D.standards[sn].title;},function(v){D.standards[sn].title=v;});
    });

    body.appendChild(el('h3',null,'Saving'));
    var note=el('p','note');
    note.innerHTML='This page keeps a draft in your browser as you type, and writes everything, including photos and documents, '+
      'into the file when you press <b>Save file</b> or Ctrl+S. Keep that saved file as your real portfolio: it opens on any computer, '+
      'with no internet needed.';
    body.appendChild(note);
    var srow=el('div','storage');
    var r=el('div','row');
    [['Save file now',saveFile],['Export data (.json)',exportJSON],['Import data (.json)',pickJSON]].forEach(function(o){
      var b=el('button',null,o[0]);b.type='button';b.onclick=o[1];r.appendChild(b);
    });
    srow.appendChild(r);body.appendChild(srow);
  });
}
function openHelp(){
  modal('Keyboard shortcuts and tips',function(body){
    var g=el('div','shortcuts');
    [['Search the portfolio','/ or Ctrl + K'],['Move through results','↑ ↓'],['Open a result','Enter'],
     ['Clear the search','Esc'],['Move between tabs','← → when a tab has focus'],
     ['Save the file','Ctrl + S'],['Close a dialog','Esc'],['Print or make a PDF','Ctrl + P'],
     ['Paste a screenshot as evidence','Ctrl + V in edit mode'],['Show this help','?']
    ].forEach(function(p){
      var d=el('div');
      d.appendChild(el('span',null,esc(p[0])));
      d.appendChild(el('kbd',null,esc(p[1])));
      g.appendChild(d);
    });
    body.appendChild(g);
    body.appendChild(el('h3',null,'How editing works'));
    var ul=el('ul');
    ['Press Edit. Every heading, paragraph and list item on the page becomes editable in place.',
     'In an Evidence panel you can drag files in, choose files, paste a screenshot, or add a titled item with a link and a date.',
     'A focus area counts as evidenced once it has both an attachment or listed item and an explanation.',
     'The gear icon opens the details that are not on the page, such as your contact details and the domain colours.',
     'Your work is drafted in this browser automatically. Press Save file to write the real portfolio, with all attachments inside it.'
    ].forEach(function(s){ul.appendChild(el('li',null,esc(s)));});
    ul.style.fontSize='15px';ul.style.lineHeight='1.6';ul.style.paddingLeft='20px';
    body.appendChild(ul);
  });
}

/* ------------------------------------------------------------------ exports */
function exportJSON(){
  var blob=new Blob([JSON.stringify(D,null,2)],{type:'application/json'});
  downloadBlob(blob,fileBase()+'_data.json');
  toast('Data exported.');
}
function fileBase(){ return (D.profile.name||'portfolio').replace(/[^\w]+/g,'_'); }
function pickJSON(){
  pickFile('.json,application/json',function(file){
    var fr=new FileReader();
    fr.onload=function(){
      var o;
      try{ o=JSON.parse(fr.result); }catch(e){ toast('That file could not be read as portfolio data.'); return; }
      if(!o||!o.standards){ toast('That does not look like portfolio data.'); return; }
      if(!confirm('Replace the content of this portfolio with the data in '+file.name+'?'))return;
      Object.keys(o).forEach(function(k){ D[k]=o[k]; });
      normalise();
      afterBulkChange('Data imported.');
    };
    fr.readAsText(file);
  });
}
function pickHTML(){
  pickFile('.html,text/html',function(file){
    var fr=new FileReader();
    fr.onload=function(){
      var text=String(fr.result);
      var start=text.indexOf('window.DATA=');
      var end=text.indexOf(';<'+'/script>',start);
      if(start<0||end<0){ toast('That file does not contain portfolio data.'); return; }
      var o;
      try{ o=JSON.parse(text.slice(start+12,end)); }catch(e){ toast('The data inside that file could not be read.'); return; }
      if(!confirm('Restore this portfolio from '+file.name+'? Anything currently on screen is replaced.'))return;
      Object.keys(o).forEach(function(k){ D[k]=o[k]; });
      normalise();
      afterBulkChange('Restored from '+file.name+'.');
    };
    fr.readAsText(file);
  });
}
function afterBulkChange(msg){
  invalidateIndex();
  touched(true);
  rebuild('all');
  buildShellChrome();
  showPanel(state.current);
  syncTabs();
  toast(msg);
}
function pickFile(accept,cb){
  var inp=el('input');
  inp.type='file';inp.accept=accept;inp.style.display='none';
  inp.onchange=function(){ if(inp.files[0])cb(inp.files[0]); inp.remove(); };
  document.body.appendChild(inp);
  inp.click();
}

/* Save the whole thing as one self-contained page. Uses the file picker where
   the browser has it, so Save writes over the same file next time. */
function buildStandaloneHTML(){
  var css=document.getElementById('style-main').textContent;
  var js=document.getElementById('app-script').textContent;
  var dj=JSON.stringify(D).replace(/<\//g,'<\\/').replace(/<!--/g,'<\\!--');
  var fonts='<link rel="preconnect" href="https://fonts.googleapis.com">'+
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'+
    '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap" rel="stylesheet">';
  var icon='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34"><rect width="34" height="34" rx="8" fill="#d99518"/><path d="M19.5 24.2l3 3 6.2-7" stroke="#0f1c23" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="7" y="9" width="14" height="2.6" rx="1.3" fill="#0f1c23"/><rect x="7" y="14.5" width="20" height="2.6" rx="1.3" fill="#0f1c23" opacity=".55"/></svg>');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>'+esc(D.profile.name)+', professional experience portfolio</title>'+
    '<meta name="description" content="Teaching portfolio mapped to the Australian Professional Standards for Teachers.">'+
    '<link rel="icon" href="'+icon+'">'+fonts+
    '<style id="style-main">'+css+'</style></head><body><div id="app"></div>'+
    '<noscript><div style="padding:40px;font-family:Georgia,serif">This portfolio needs JavaScript switched on to display. '+
    'The content is stored inside this file and is not sent anywhere.</div></noscript>'+
    '<script id="data-script">window.DATA='+dj+';<\/script>'+
    '<script id="app-script">'+js+'<\/script></body></html>';
}
function saveFile(){
  var html=buildStandaloneHTML();
  var name=fileBase()+'_Portfolio.html';
  if(window.showSaveFilePicker){
    (function(){
      var chain=fileHandle?Promise.resolve(fileHandle):window.showSaveFilePicker({
        suggestedName:name,
        types:[{description:'Web page',accept:{'text/html':['.html']}}]
      });
      return chain.then(function(h){
        fileHandle=h;
        return h.createWritable().then(function(w){
          return w.write(new Blob([html],{type:'text/html'})).then(function(){return w.close();});
        }).then(function(){
          markSaved();
          toast('Saved to '+(h.name||name));
        });
      });
    })().catch(function(e){
      if(e&&(e.name==='AbortError'))return;
      fileHandle=null;
      downloadBlob(new Blob([html],{type:'text/html'}),name);
      markSaved();
      toast('Saved '+name+' to your downloads.');
    });
    return;
  }
  downloadBlob(new Blob([html],{type:'text/html'}),name);
  markSaved();
  toast('Saved '+name+'. Keep this file, it holds everything.');
}
function markSaved(){
  dirty=false;lastSavedAt=new Date();
  saveDraft();
  syncSavePill();
  markDirty('summary');
}

/* ---- print and Word documents ---- */
function docEvidence(fo){
  var links=fo.evidence.filter(function(e){return !hasBytes(e);});
  var docs=fo.evidence.filter(function(e){return e.file;});
  var imgs=fo.evidence.filter(function(e){return e.img;});
  var h='';
  if(links.length)h+='<ul class="d-ev">'+links.map(function(e){
    return '<li>'+esc(e.title||'Untitled')+
      (e.date?' <span class="d-url">'+esc(prettyDate(e.date))+'</span>':'')+
      (e.note?' — '+esc(e.note):'')+
      (safeURL(e.href)?' <span class="d-url">'+esc(e.href)+'</span>':'')+'</li>';
  }).join('')+'</ul>';
  if(docs.length)h+=docs.map(function(e){
    return '<div class="d-att">Attached document: <b>'+esc(e.name||e.title)+'</b>'+
      (e.date?' · '+esc(prettyDate(e.date)):'')+(e.note?' · '+esc(e.note):'')+'</div>';
  }).join('');
  if(imgs.length)h+='<div class="d-shots">'+imgs.map(function(e){
    return '<figure><img src="'+e.img+'" alt="'+esc(e.title||'')+'"><figcaption>'+esc(e.title||'')+'</figcaption></figure>';
  }).join('')+'</div>';
  if(!links.length&&!docs.length&&!imgs.length)h+='<div class="d-empty">Evidence to be added</div>';
  return h;
}
function docFocus(fo,color){
  return '<div class="fa" style="border-left-color:'+color+'">'+
    '<div><span class="code" style="color:'+color+'">'+esc(fo.code)+'</span> <span class="ftitle">'+esc(fo.title)+'</span></div>'+
    '<div class="desc">'+esc(fo.desc)+'</div>'+
    '<div class="lab">Evidence</div>'+docEvidence(fo)+
    '<div class="lab">How this evidence meets the standard</div>'+
    (fo.demo?'<div>'+esc(fo.demo).replace(/\n/g,'<br>')+'</div>':'<div class="d-empty">To be completed</div>')+
    '<div class="lab">Developing next</div>'+
    (fo.dev?'<div>'+esc(fo.dev).replace(/\n/g,'<br>')+'</div>':'<div class="d-empty">To be completed</div>')+
    '</div>';
}
function docReport(key,label){
  var a=D.reports[key];
  if(!a)return '<div class="d-slot d-empty">'+esc(label)+' — to be attached</div>';
  if(a.img)return '<div class="d-slot"><b>'+esc(label)+'</b>'+(a.note?' · '+esc(a.note):'')+'<img src="'+a.img+'" alt="'+esc(label)+'"></div>';
  return '<div class="d-slot"><b>'+esc(label)+'</b> — attached: '+esc(a.name||'')+(a.note?' · '+esc(a.note):'')+'</div>';
}
function buildDocHTML(mode){
  var css='@page{margin:17mm 15mm}*{box-sizing:border-box}'+
    'body{font-family:Georgia,"Times New Roman",serif;color:#1c2730;font-size:11.5pt;line-height:1.5;margin:0}'+
    'h1,h2,h3{font-family:"Segoe UI",Arial,sans-serif}'+
    '.cover{border-top:6px solid #d99518;padding-top:18px;margin-bottom:22px}'+
    '.badge{display:inline-block;width:40px;height:40px;border-radius:9px;background:#d99518;color:#0f1c23;'+
      'font-family:"Segoe UI",sans-serif;font-weight:700;text-align:center;line-height:40px;font-size:15px}'+
    '.cover h1{font-size:28pt;margin:12px 0 2px}'+
    '.cover .role{font-family:"Segoe UI",sans-serif;color:#8a5e12;font-size:13pt;margin:0 0 8px}'+
    '.cover .meta div{color:#4a5a62;font-size:10.5pt;font-family:"Segoe UI",sans-serif;margin:1px 0}'+
    '.cover .prog{margin-top:10px;font-family:"Segoe UI",sans-serif;font-size:11pt;color:#1f6f5c;font-weight:700}'+
    '.toc{font-family:"Segoe UI",sans-serif;font-size:10.5pt;margin:14px 0 0}'+
    '.toc div{padding:2px 0;border-bottom:1px dotted #d7dbd6}'+
    '.sec{margin:20px 0}.sec h2{font-size:14.5pt;border-bottom:2px solid #e5e7e2;padding-bottom:5px;margin:0 0 10px}'+
    '.pill{margin:0 0 10px}.pill .n{font-family:"Segoe UI",sans-serif;font-weight:700;color:#d99518}'+
    '.pill h3{margin:0;font-size:12pt}.pill ul{margin:3px 0 0 18px}'+
    '.std{page-break-inside:avoid;margin-top:16px}'+
    '.sh{font-family:"Segoe UI",sans-serif;font-size:13pt;font-weight:700;color:#fff;padding:7px 12px;border-radius:6px}'+
    '.fa{border-left:3px solid #ccc;padding:9px 0 9px 14px;margin:11px 0;page-break-inside:avoid}'+
    '.code,.ftitle{font-family:"Segoe UI",sans-serif;font-weight:700}'+
    '.desc{color:#5a6a72;font-size:10pt;margin:2px 0 8px}'+
    '.lab{font-family:"Segoe UI",sans-serif;font-size:8.5pt;color:#7a8890;letter-spacing:.4px;margin:9px 0 3px;text-transform:uppercase}'+
    '.d-ev{margin:2px 0 0 16px}.d-url{color:#2f5691;font-size:9pt}'+
    '.d-att,.d-empty,.d-slot{border:1px solid #cfd6d2;border-radius:6px;padding:8px 12px;margin:6px 0;font-family:"Segoe UI",sans-serif;font-size:10pt}'+
    '.d-empty{border-style:dashed;color:#9aa5a3}'+
    '.d-shots{display:block}.d-shots figure{display:inline-block;width:46%;margin:5px 6px 0 0;vertical-align:top}'+
    '.d-shots img{width:100%;border:1px solid #dcdfda;border-radius:5px}'+
    '.d-shots figcaption{font-family:"Segoe UI",sans-serif;font-size:8.5pt;color:#5a6a72;margin-top:2px}'+
    '.d-slot img{display:block;max-width:100%;margin-top:6px;border:1px solid #dcdfda;border-radius:5px}'+
    '.appx li{margin-bottom:4px;font-family:"Segoe UI",sans-serif;font-size:10.5pt}'+
    '.contact{font-family:"Segoe UI",sans-serif;font-size:10.5pt;color:#4a5a62;margin-top:6px}';
  var p=D.profile,t=totals();
  var pil=D.philosophy.pillars.map(function(x,i){
    return '<div class="pill"><span class="n">'+(i+1)+'.</span> <h3 style="display:inline">'+esc(x.t)+'</h3><ul>'+
      x.b.map(function(z){return '<li>'+esc(z)+'</li>';}).join('')+'</ul>'+
      (x.apst.length?'<div style="font-family:Segoe UI,sans-serif;font-size:9pt;color:#8a5e12;margin-top:3px">'+
        x.apst.map(function(a){return 'Standard '+esc(a);}).join(' · ')+'</div>':'')+'</div>';
  }).join('');
  var stds='';
  D.domains.forEach(function(dom){
    dom.standards.forEach(function(sn){
      var st=D.standards[sn];
      if(!st)return;
      stds+='<div class="std"><div class="sh" style="background:'+dom.color+'">Standard '+sn+'. '+esc(st.title)+'</div>';
      (st.focus||[]).forEach(function(fo){ stds+=docFocus(fo,dom.color); });
      stds+='</div>';
    });
  });
  var toc='<div class="toc">'+D.domains.map(function(dom){
    return dom.standards.map(function(sn){
      var c=counts(String(sn));
      return '<div>Standard '+sn+'. '+esc(D.standards[sn]?D.standards[sn].title:'')+
        ' <span style="float:right">'+c.full+'/'+c.total+'</span></div>';
    }).join('');
  }).join('')+'</div>';
  var contact=[p.email,p.phone,p.linkedin].filter(Boolean).join(' · ');
  var cover='<div class="cover"><span class="badge">'+esc(p.initials||'')+'</span>'+
    '<h1>'+esc(p.name)+'</h1><div class="role">'+esc(p.role)+', '+esc(p.tagline)+'</div>'+
    '<div class="meta"><div>'+esc(p.school)+'</div><div>'+esc(p.program)+'</div><div>'+
    new Date().toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'})+'</div></div>'+
    (contact?'<div class="contact">'+esc(contact)+'</div>':'')+
    '<div class="prog">'+t.full+' of '+t.total+' focus areas evidenced'+(t.part?', '+t.part+' in progress':'')+'</div>'+
    toc+'</div>';
  var about='<div class="sec"><h2>About my practice</h2><p>'+esc(p.about).replace(/\n/g,'<br>')+'</p>'+
    (p.quote?'<p style="font-style:italic;color:#3c4f57">“'+esc(p.quote)+'”</p>':'')+'</div>';
  var phil='<div class="sec"><h2>Teaching philosophy: '+esc(D.philosophy.heading)+'</h2><p>'+esc(D.philosophy.lead)+'</p>'+pil+'</div>';
  var reports='<div class="sec"><h2>Mentor reports</h2>'+docReport('interim','Interim report')+docReport('final','Final report')+'</div>';
  var atts=[];
  SN.forEach(function(sn){
    (D.standards[sn].focus||[]).forEach(function(fo){
      (fo.evidence||[]).forEach(function(e){ if(e.file)atts.push((e.name||e.title)+' — focus area '+fo.code); });
    });
  });
  if(D.reports.interim&&D.reports.interim.name)atts.push('Interim report: '+D.reports.interim.name);
  if(D.reports.final&&D.reports.final.name)atts.push('Final report: '+D.reports.final.name);
  (D.library||[]).forEach(function(e){ if(e.file)atts.push((e.name||e.title)+' — supporting document'); });
  var appx='<div class="sec"><h2>Attached documents</h2>'+
    (atts.length?'<ul class="appx">'+atts.map(function(a){return '<li>'+esc(a)+'</li>';}).join('')+'</ul>':'')+
    '<div class="d-empty">Space reserved for further evidence to be attached as the placement continues.</div></div>';
  var body=cover+about+phil+
    '<div class="sec"><h2>Evidence against the Australian Professional Standards for Teachers</h2></div>'+
    stds+reports+appx;
  if(mode==='word'){
    var wcss=css+'@page WordSection1{size:595.3pt 841.9pt;margin:2cm}div.WordSection1{page:WordSection1}';
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" '+
      'xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>'+esc(p.name)+', portfolio</title>'+
      '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->'+
      '<style>'+wcss+'</style></head><body><div class="WordSection1">'+body+'</div></body></html>';
  }
  /* Waiting for window.onload means every embedded photograph is decoded
     before the print dialog opens, so nothing prints blank. */
  return '<!doctype html><html><head><meta charset="utf-8"><title>'+esc(p.name)+', portfolio</title>'+
    '<style>'+css+'</style></head><body>'+body+
    '<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300);};<\/script>'+
    '</body></html>';
}
function downloadPDF(){
  var w=window.open('','_blank');
  if(!w){ toast('Allow pop‑ups for this page to build the PDF, or press Ctrl+P to print this page instead.'); return; }
  w.document.open();
  w.document.write(buildDocHTML());
  w.document.close();
  toast('Opening a print view. Choose Save as PDF as the destination.');
}
function downloadDOCX(){
  try{
    var blob=new Blob(['﻿'+buildDocHTML('word')],{type:'application/msword'});
    downloadBlob(blob,fileBase()+'_Portfolio.doc');
    toast('Word document downloaded. Open it in Word, then Save As .docx if you want to keep editing there.');
  }catch(e){ toast('The Word export failed. Try the PDF option.'); }
}

/* --------------------------------------------------------- global shortcuts */
document.addEventListener('keydown',function(e){
  var t=e.target,typing=t&&(/input|textarea|select/i.test(t.tagName)||t.isContentEditable);
  if((e.ctrlKey||e.metaKey)&&(e.key==='s'||e.key==='S')){ e.preventDefault(); saveFile(); return; }
  if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){
    e.preventDefault();
    var i=document.querySelector('.search input');
    if(i){i.focus();i.select();}
    return;
  }
  if(e.key==='Escape'){
    if(document.querySelector('.viewer.on')){ closeViewer(); return; }
    var m=document.querySelector('.modal.on');
    if(m){ return; }
  }
  if(typing||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='/'){
    e.preventDefault();
    var s=document.querySelector('.search input');
    if(s)s.focus();
  }else if(e.key==='?'){
    e.preventDefault();openHelp();
  }
});
document.addEventListener('paste',function(e){
  if(!editing)return;
  var files=e.clipboardData?Array.prototype.slice.call(e.clipboardData.files):[];
  if(!files.length)return;
  var col=document.activeElement&&document.activeElement.closest?document.activeElement.closest('.col'):null;
  if(!col)col=document.querySelector('.view.on .col');
  if(col&&col._focus){
    e.preventDefault();
    filesToItems(files,function(x){col._focus.evidence.push(x);},state.current);
  }
});
document.addEventListener('click',function(e){
  var m=document.querySelector('.menu');
  if(m&&!m.contains(e.target)){
    var l=m.querySelector('.menu-list');
    if(l&&l.classList.contains('on')){
      l.classList.remove('on');
      var mb=m.querySelector('.btn.solid');
      if(mb)mb.setAttribute('aria-expanded','false');
    }
  }
});
window.addEventListener('beforeunload',function(e){
  if(!dirty)return;
  if(draftState==='fail'||idbOK===false){
    e.preventDefault();
    e.returnValue='Your latest edits are only in this tab. Use Save file first.';
    return e.returnValue;
  }
});
/* Print everything, including panels that have not been opened yet. */
window.addEventListener('beforeprint',function(){
  PANELS_ORDER.forEach(function(id){ if(dirtyPanels[id])renderPanel(id); });
});

/* ---------------------------------------------------------------- start up */
normalise();
var restored=loadDraft(fileUpdated);
if(restored)normalise();
var fileUpdated=(D.meta&&D.meta.updated)?new Date(D.meta.updated).getTime():0;
var h0=parseHash();
state.current=h0.id;
state.query=h0.q||'';
lastBeforeSearch=h0.id==='search'?'overview':h0.id;
buildShell();
var sw0=document.querySelector('.search');
if(sw0&&state.query)sw0.classList.add('has');
showPanel(state.current);
syncTabs();
ATT.available().then(function(v){ idbOK=v; });
if(restored){
  rehydrate().then(function(){
    var missing=0;
    eachAttachment(function(it){ if(isMissing(it))missing++; });
    if(missing){
      rebuild('all');showPanel(state.current);
      toast(missing+' attachment'+(missing>1?'s':'')+' could not be read back from this browser. Open your saved portfolio file to restore them.');
    }else{
      rebuild('all');showPanel(state.current);
    }
  });
  syncSavePill();
}
})();
