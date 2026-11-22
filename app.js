/* Venezia CHS – Resident KYC app logic.
   Data is never stored in this app. Everything is sent to the Society's Google Apps Script
   (window.KYC_API), which saves it in the Society's Google Drive / Sheet. */
(function(){
  const $=id=>document.getElementById(id);
  const API=(window.KYC_API||'').trim();
  const LIVE=!!API;
  if(!LIVE) $('preview-banner').hidden=false;

  // ---------- server calls ----------
  async function call(fn,args){
    if(!LIVE) throw new Error('Preview mode: the Society server is not connected yet.');
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn:fn,args:args||[]}),redirect:'follow'});
    if(!r.ok) throw new Error('The Society server did not respond ('+r.status+'). Please try again.');
    const j=await r.json();
    if(j&&j.ok===false) throw new Error(j.msg||'Request was not accepted.');
    return j;
  }

  // ---------- personal link (key) ----------
  const qs=new URLSearchParams(location.search);
  let KEY='', ROLE='', FLAT='';
  const store={get:k=>{try{return localStorage.getItem(k)||''}catch(e){return ''}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
  function keyFrom(s){ s=String(s||'').trim(); const m=s.match(/[?&]k=([A-Za-z0-9]{10,40})/); if(m) return m[1]; return /^[A-Za-z0-9]{10,40}$/.test(s)?s:''; }

  const RELATION_F=['Self','Spouse','Son','Daughter','Father','Mother','Daughter-in-law','Son-in-law','Grandchild','Brother','Sister','Other relative'];
  const RELATION_T=['Spouse','Son','Daughter','Father','Mother','Other relative','Flatmate / co-licensee'];
  const AGE=['Adult','Senior 60+','Minor'];
  const SPEC={
    family:{label:'Member',preset:6,summary:'name',fields:[
      {k:'name',t:'text',l:'Full name',full:1,req:1},
      {k:'relation',t:'select',l:'Relation to member',opts:RELATION_F},
      {k:'age',t:'chips',l:'Age group',opts:AGE},
      {k:'mobile',t:'tel',l:'Mobile',opt:1},
      {k:'email',t:'email',l:'Email',opt:1}]},
    tenants:{label:'Occupant',preset:6,summary:'name',fields:[
      {k:'name',t:'text',l:'Full name',full:1,req:1},
      {k:'relation',t:'select',l:'Relation',opts:RELATION_T},
      {k:'age',t:'chips',l:'Age group',opts:AGE},
      {k:'mobile',t:'tel',l:'Mobile',opt:1},
      {k:'email',t:'email',l:'Email',opt:1}]},
    staff:{label:'Staff',preset:3,summary:'name',defaults:[{role:'Driver'},{role:'Maid'},{role:'Helper'}],fields:[
      {k:'role',t:'chips',l:'Role',opts:['Driver','Maid','Helper','Cook','Nanny','Attendant','Other'],full:1},
      {k:'name',t:'text',l:'Full name',req:1},
      {k:'mobile',t:'tel',l:'Mobile'},
      {k:'work',t:'chips',l:'Works',opts:['Full time','Part time','Stays in flat'],full:1},
      {k:'hours',t:'text',l:'Working hours',ph:'e.g. 8 am – 1 pm',opt:1},
      {k:'police',t:'chips',l:'Police verification done?',opts:['Yes','No']},
      {k:'address',t:'text',l:'Where they live',full:1,opt:1},
      {k:'photo',t:'photo',l:'Photo',full:1},
      {k:'dlfile',t:'file',l:'Driving licence copy (front & back)',multi:1,full:1,hint:'Compulsory for drivers. Seen only by the Chairman, Secretary and Treasurer.'},
      {k:'idtype',t:'select',l:'Photo ID type',opts:['Aadhaar card (masked)','Voter ID card','Passport','Driving licence','Other govt ID with photo']},
      {k:'idfile',t:'file',l:'Photo ID copy (front & back)',multi:1,full:1,hint:'Compulsory for every maid, helper, cook and other staff. For Aadhaar, upload the masked copy. Seen only by the Chairman, Secretary and Treasurer.'},
      {k:'polfile',t:'file',l:'Police verification receipt',full:1,opt:1}]},
    vehicles:{label:'Vehicle',preset:4,summary:'reg',defaults:[{type:'2-wheeler'},{type:'2-wheeler'},{type:'4-wheeler'},{type:'4-wheeler'}],fields:[
      {k:'type',t:'chips',l:'Type',opts:['2-wheeler','2-wheeler EV','4-wheeler','4-wheeler EV'],full:1},
      {k:'reg',t:'text',l:'Registration no.',ph:'MH01AB1234',upper:1,req:1},
      {k:'model',t:'text',l:'Make & model',ph:'e.g. Honda Activa',opt:1},
      {k:'slot',t:'text',l:'Parking slot no. (P1–P4)',opt:1}]}
  };
  const counters={family:0,tenants:0,staff:0,vehicles:0};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function fieldHTML(kind,n,f){
    const id=kind+n+'_'+f.k, opt=f.opt?' <span class="opt">optional</span>':'';
    let inner='';
    if(f.t==='text') inner='<input type="text" id="'+id+'" data-k="'+f.k+'"'+(f.ph?' placeholder="'+esc(f.ph)+'"':'')+(f.upper?' data-upper="1" autocapitalize="characters"':'')+'>';
    else if(f.t==='email') inner='<input type="email" id="'+id+'" data-k="'+f.k+'">';
    else if(f.t==='tel') inner='<div class="tel"><span>+91</span><input type="tel" id="'+id+'" data-k="'+f.k+'" inputmode="numeric" maxlength="11"></div>';
    else if(f.t==='select') inner='<select id="'+id+'" data-k="'+f.k+'"><option value="">Select</option>'+f.opts.map(o=>'<option>'+esc(o)+'</option>').join('')+'</select>';
    else if(f.t==='chips') inner='<div class="chips">'+f.opts.map(o=>'<label class="chip"><input type="radio" name="'+id+'" value="'+esc(o)+'" data-k="'+f.k+'"><span>'+esc(o)+'</span></label>').join('')+'</div>';
    else if(f.t==='photo') inner='<div class="photo"><div class="thumb">No photo</div><div class="filebtn"><label>Take / choose photo<input type="file" accept="image/*" data-k="'+f.k+'" data-photo="1"></label></div></div>';
    else if(f.t==='file') inner='<div class="filebtn"><label>Choose file'+(f.multi?'s':'')+'<input type="file" accept=".pdf,image/*" data-k="'+f.k+'"'+(f.multi?' multiple':'')+'></label><span class="fn"></span></div>';
    const lab=(['text','email','select','tel'].includes(f.t))?'<label class="l" for="'+id+'">'+esc(f.l)+opt+'</label>':'<span class="l">'+esc(f.l)+opt+'</span>';
    return '<div class="field'+(f.full?' full':'')+'" data-fk="'+f.k+'">'+lab+inner+(f.hint?'<span class="hint">'+esc(f.hint)+'</span>':'')+'<span class="err"></span></div>';
  }

  function addBlock(kind,removable){
    const sp=SPEC[kind], n=++counters[kind], idx=$(kind).children.length;
    const d=document.createElement('details'); d.className='block'; d.dataset.kind=kind;
    if(idx===0) d.open=true;
    d.innerHTML='<summary><span class="num">'+(idx+1)+'</span><span class="sumtxt"><em>'+esc(sp.label)+' '+(idx+1)+' · tap to fill</em></span><span class="chev">›</span></summary>'+
      '<div class="blockbody"><div class="grid">'+sp.fields.map(f=>fieldHTML(kind,n,f)).join('')+'</div>'+(removable?'<button type="button" class="rm">Remove this block</button>':'')+'</div>';
    $(kind).appendChild(d);
    const def=(sp.defaults||[])[idx];
    if(def) Object.keys(def).forEach(k=>{ const r=d.querySelector('input[data-k="'+k+'"][value="'+def[k]+'"]'); if(r) r.checked=true; });
    d.addEventListener('input',()=>refreshBlock(d));
    d.addEventListener('change',e=>{
      const t=e.target;
      if(t.type==='file'){
        const fn=t.closest('.filebtn')&&t.closest('.filebtn').querySelector('.fn');
        if(fn) fn.textContent=t.files.length?[...t.files].map(f=>f.name).join(', '):'';
        if(t.dataset.photo){ const th=d.querySelector('.thumb'); th.textContent=''; if(t.files[0]){const im=document.createElement('img'); im.alt='Photo preview'; im.src=URL.createObjectURL(t.files[0]); th.appendChild(im);} else th.textContent='No photo'; }
      }
      refreshBlock(d);
    });
    const rm=d.querySelector('.rm'); if(rm) rm.onclick=()=>{ d.remove(); renumber(kind); };
    refreshBlock(d);
    return d;
  }
  function renumber(kind){ [...$(kind).children].forEach((d,i)=>{ d.querySelector('.num').textContent=i+1; refreshBlock(d); }); }
  function blockData(d){
    const o={};
    d.querySelectorAll('[data-k]').forEach(el=>{
      const k=el.dataset.k;
      if(el.type==='radio'){ if(el.checked) o[k]=el.value; else if(!(k in o)) o[k]=''; }
      else if(el.type==='file') o[k]=[...el.files];
      else o[k]=el.value.trim();
    });
    return o;
  }
  function isFilled(kind,o){ return SPEC[kind].fields.some(f=>['text','tel','email'].includes(f.t)&&o[f.k]); }
  function refreshBlock(d){
    const kind=d.dataset.kind, sp=SPEC[kind], o=blockData(d), i=[...$(kind).children].indexOf(d)+1;
    d.querySelectorAll('input[data-upper]').forEach(el=>{ const v=el.value.toUpperCase().replace(/\s+/g,''); if(v!==el.value){ el.value=v; } });
    if(kind==='staff'){ const drv=o.role==='Driver'; d.querySelector('[data-fk="dlfile"]').hidden=!drv; d.querySelector('[data-fk="idtype"]').hidden=drv; d.querySelector('[data-fk="idfile"]').hidden=drv; }
    d.classList.toggle('filled',isFilled(kind,o));
    const main=o[sp.summary]||'';
    const extra=kind==='vehicles'?o.type:kind==='staff'?o.role:o.relation;
    const st=d.querySelector('.sumtxt'); st.textContent='';
    if(main){ st.textContent=main; if(extra){const e=document.createElement('em'); e.textContent=' · '+extra; st.appendChild(e);} }
    else { const e=document.createElement('em'); e.textContent=sp.label+' '+i+' · tap to fill'; st.appendChild(e); }
  }
  Object.keys(SPEC).forEach(kind=>{ for(let i=0;i<SPEC[kind].preset;i++) addBlock(kind,false); });
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{ const k=b.dataset.add; [...$(k).children].forEach(x=>x.open=false); const d=addBlock(k,true); d.open=true; const f=d.querySelector('input:not([type=radio]),select'); if(f) f.focus(); });

  document.querySelectorAll('section:not([data-step=staff]) .filebtn input').forEach(inp=>inp.addEventListener('change',()=>{ inp.closest('.filebtn').querySelector('.fn').textContent=[...inp.files].map(f=>f.name).join(', '); }));

  const val=n=>{const r=document.querySelector('input[name="'+n+'"]:checked'); return r?r.value:'';};
  const digits=s=>String(s||'').replace(/\D/g,'').replace(/^(91|0)(?=\d{10}$)/,'');
  const okMob=s=>{ const d=digits(s); return /^[6-9]\d{9}$/.test(d)&&!/^(\d)\1{9}$/.test(d)&&!['9876543210','9123456789'].includes(d); };
  const okEmail=s=>/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(s)&&!/\.\./.test(s)&&!/^\.|\.@/.test(s);
  function mobWhy(v){ const d=digits(v); if(d.length<10) return 'has only '+d.length+' digits. Indian mobile numbers have 10 digits.'; if(d.length>10) return 'has more than 10 digits.'; if(!/^[6-9]/.test(d)) return 'must start with 6, 7, 8 or 9.'; return 'does not look like a real number. Please check it.'; }
  function emailWhy(v){ if(!v.includes('@')) return 'is missing the @ sign.'; if(/\s/.test(v)) return 'has a space in it.'; if(!/@[^@]+\.[A-Za-z]{2,}$/.test(v)) return 'is missing the part after the dot, e.g. .com or .in.'; if(/\.\./.test(v)) return 'has two dots together.'; return 'is not a valid email address.'; }
  document.addEventListener('input',e=>{ if(e.target.matches('input[inputmode=numeric]')) e.target.value=e.target.value.replace(/\D/g,''); const f=e.target.closest('.field'); if(f) f.classList.remove('bad'); });
  document.addEventListener('change',e=>{ const f=e.target.closest('.field'); if(f) f.classList.remove('bad'); });
  document.querySelectorAll('input[name=occ]').forEach(r=>r.addEventListener('change',()=>{$('f-addr').hidden=val('occ')==='self'}));
  document.querySelectorAll('input[name=mode],input[name=occ]').forEach(r=>r.addEventListener('change',()=>{ applyMode(); paint(); }));

  function steps(){
    if(!KEY) return ['link'];
    const m=val('mode'), o=val('occ'), s=['start','you'];
    if(m==='owner'){ s.push('occ'); if(o==='self'||o==='family') s.push('family'); if(o==='tenant') s.push('tenants'); if(o&&o!=='vacant') s.push('staff','vehicles'); }
    else if(m==='tenant') s.push('tenants','staff','vehicles');
    s.push('emergency','review'); return s;
  }
  let cur='link';
  function applyMode(){
    const t=val('mode')==='tenant';
    document.querySelectorAll('[data-only]').forEach(el=>el.hidden=el.dataset.only!==(t?'tenant':'owner'));
    $('you-h').textContent=t?'Your details (main tenant)':'Your details';
    $('name-l').textContent=t?'Name as in the agreement':'First name on the agreement';
    $('name-h').textContent=t?'Exactly as written in your registered leave & licence agreement.':'Full name of the person named first in your registered agreement, written exactly as in it.';
    $('ten-h').textContent=t?'Others living with you':'Tenant details';
    $('fam-lead').textContent=val('occ')==='family'?'List the relatives living in the flat, with their relation to you. Tap a block to fill it; leave the rest empty.':'Include yourself. Tap a block to fill it; leave the rest empty.';
    $('ten-lead').textContent=t?'Family or flatmates living with you. Leave empty if you live alone.':'Everyone living in the flat under the leave & licence. Tap a block to fill it.';
    $('decl-text').textContent=t
      ?'I confirm these details are correct, that I occupy the flat under a valid leave & licence agreement, that I am responsible for the verification and conduct of my staff, and that I will follow the society’s bye-laws.'
      :'I confirm these details are correct, that I am responsible for the verification and conduct of staff working in my flat, and that I will inform the society in writing of any change in ownership or occupancy.';
  }
  function paint(){
    document.querySelectorAll('section.step').forEach(s=>s.hidden=s.dataset.step!==cur);
    const list=steps(), i=list.indexOf(cur);
    if(cur==='done'){ $('progress').hidden=true; $('nav').hidden=true; return; }
    $('progress').hidden=cur==='link';
    $('stepname').textContent=document.querySelector('[data-step="'+cur+'"]').dataset.name;
    $('stepcount').textContent='Step '+(i+1)+' of '+list.length;
    $('barfill').style.width=((i+1)/list.length*100)+'%';
    $('back').style.visibility=(i<=0||cur==='start')?'hidden':'visible';
    $('next').textContent=cur==='link'?'Open my KYC':cur==='review'?'Submit KYC':(['staff','vehicles'].includes(cur)&&!anyFilled(cur))?'Skip':'Next';
    if(cur==='review'){ buildReview(); $('dl-consent-row').hidden=!hasDriver(); }
  }
  function anyFilled(kind){ return [...$(kind).children].some(d=>isFilled(kind,blockData(d))); }
  function hasDriver(){ return steps().includes('staff')&&[...$('staff').children].map(blockData).some(o=>isFilled('staff',o)); }
  document.addEventListener('input',()=>{ if(['staff','vehicles'].includes(cur)) $('next').textContent=anyFilled(cur)?'Next':'Skip'; });

  let ERR=[];
  const labelOf=f=>{ const l=f.querySelector('.l'); return l?l.childNodes[0].textContent.trim():'A field'; };
  function bad(id,msg){ const f=$(id); f.classList.add('bad'); if(msg) f.querySelector('.err').textContent=msg; ERR.push(labelOf(f)+': '+f.querySelector('.err').textContent); return false; }
  function toast(type,title,lines,ms){
    const t=document.createElement('div'); t.className='toast '+type;
    const b=document.createElement('b'); b.textContent=title; t.appendChild(b);
    if(lines&&lines.length){ const ul=document.createElement('ul'); lines.slice(0,6).forEach(x=>{const li=document.createElement('li'); li.textContent=x; ul.appendChild(li);}); if(lines.length>6){const li=document.createElement('li'); li.textContent='and '+(lines.length-6)+' more'; ul.appendChild(li);} t.appendChild(ul); }
    const x=document.createElement('button'); x.className='x'; x.type='button'; x.setAttribute('aria-label','Dismiss'); x.textContent='×'; x.onclick=()=>t.remove(); t.appendChild(x);
    const box=$('toasts'); box.innerHTML=''; box.appendChild(t);
    if(ms!==0) setTimeout(()=>t.remove(),ms||(type==='err'?9000:type==='warn'?12000:4000));
  }
  function checkBlocks(kind,needOne){
    let ok=true, first=null, count=0; const box=$(kind+'-err'); box.hidden=true;
    [...$(kind).children].forEach(d=>{
      const o=blockData(d); if(!isFilled(kind,o)) return; count++;
      const errs=[];
      SPEC[kind].fields.forEach(f=>{
        const fe=d.querySelector('[data-fk="'+f.k+'"]'); let m='';
        if(f.req&&!o[f.k]) m='Required.';
        else if(f.t==='tel'&&o[f.k]&&!okMob(o[f.k])) m='This mobile number '+mobWhy(o[f.k]);
        else if(f.t==='email'&&o[f.k]&&!okEmail(o[f.k])) m='This email '+emailWhy(o[f.k]);
        else if(kind==='staff'&&f.k==='mobile'&&!o.mobile) m='Required for staff.';
        else if(kind==='staff'&&f.k==='idtype'&&o.role!=='Driver'&&!o.idtype) m='Please choose the ID type.';
        else if(kind==='staff'&&f.k==='idfile'&&o.role!=='Driver'&&!o.idfile.length) m='A photo ID copy is compulsory for all staff.';
        else if(kind==='staff'&&f.k==='dlfile'&&o.role==='Driver'&&!o.dlfile.length) m='A copy of the driving licence is compulsory for drivers.';
        if(m){ fe.classList.add('bad'); fe.querySelector('.err').textContent=m; errs.push(m); ERR.push(SPEC[kind].label+' '+([...$(kind).children].indexOf(d)+1)+' · '+f.l+': '+m); }
      });
      if(errs.length){ ok=false; d.open=true; if(!first) first=d; }
    });
    if(needOne&&count===0){ box.textContent=needOne; box.hidden=false; ok=false; ERR.push(needOne); first=$(kind).children[0]; first.open=true; }
    else if(!ok){ box.textContent='Please fix the highlighted entries.'; box.hidden=false; }
    if(first) first.scrollIntoView({behavior:'smooth',block:'center'});
    return ok;
  }
  function validate(step){
    let ok=true; ERR=[];
    if(step==='start'){
      if(!/^\d{3,4}$/.test($('flat').value)) ok=bad('f-flat');
      if(!val('mode')) ok=bad('f-mode');
    }
    if(step==='you'){
      if($('name').value.trim().length<3) ok=bad('f-name');
      if(!okMob($('mob').value)) ok=bad('f-mob',$('mob').value?'This mobile number '+mobWhy($('mob').value):'Enter your 10-digit mobile number.');
      if($('alt').value&&!okMob($('alt').value)) ok=bad('f-alt','This mobile number '+mobWhy($('alt').value));
      if(!okEmail($('email').value.trim())) ok=bad('f-email',$('email').value.trim()?'This email '+emailWhy($('email').value.trim()):'Enter your email address.');
      if(!$('idtype').value) ok=bad('f-idtype');
      if(!$('idfile').files.length) ok=bad('f-idfile');
      if(val('mode')==='tenant'&&!$('ownername').value.trim()) ok=bad('f-ownername');
      if(val('mode')==='owner'){
        const jn=$('jname').value.trim(), jm=$('jmob').value, je=$('jemail').value.trim();
        if(!jn&&(jm||je)) ok=bad('f-jname');
        if(jm&&!okMob(jm)) ok=bad('f-jmob','This mobile number '+mobWhy(jm));
        if(je&&!okEmail(je)) ok=bad('f-jemail','This email '+emailWhy(je));
      }
    }
    if(step==='occ'&&!val('occ')) ok=bad('f-occ');
    if(step==='family') ok=checkBlocks('family','Please add at least one person living in the flat.');
    if(step==='tenants'){
      ok=checkBlocks('tenants',val('mode')==='owner'?'Please add at least the main tenant.':null);
      if(!$('llfrom').value) ok=bad('f-llfrom');
      if(!$('llto').value||($('llfrom').value&&$('llto').value<=$('llfrom').value)) ok=bad('f-llto');
      if(!val('llreg')) ok=bad('f-llreg');
      if(!val('llpol')) ok=bad('f-llpol');
    }
    if(step==='staff') ok=checkBlocks('staff');
    if(step==='vehicles') ok=checkBlocks('vehicles');
    if(step==='emergency'&&$('emob').value&&!okMob($('emob').value)) ok=bad('f-emob','This mobile number '+mobWhy($('emob').value));
    if(!ok){
      const f=document.querySelector('section[data-step="'+step+'"] .field.bad'); if(f) f.scrollIntoView({behavior:'smooth',block:'center'});
      toast('err',ERR.length===1?'1 thing to fix before you continue':ERR.length+' things to fix before you continue',ERR);
    }
    return ok;
  }

  // ---------- soft warnings ----------
  const TYPO={'gmial.com':'gmail.com','gmai.com':'gmail.com','gamil.com':'gmail.com','gmail.co':'gmail.com','gmail.con':'gmail.com','gnail.com':'gmail.com','yahoo.co':'yahoo.com','yaho.com':'yahoo.com','yahoo.con':'yahoo.com','hotmial.com':'hotmail.com','hotmail.co':'hotmail.com','rediffmail.co':'rediffmail.com','outlok.com':'outlook.com'};
  const today=new Date().toISOString().slice(0,10);
  function typo(e){ const dmn=(e.split('@')[1]||'').toLowerCase(); return TYPO[dmn]?'Did you mean '+e.split('@')[0]+'@'+TYPO[dmn]+'?':''; }
  function dupes(arr){ const seen={},out=[]; arr.filter(Boolean).forEach(v=>{ if(seen[v]&&!out.includes(v)) out.push(v); seen[v]=1; }); return out; }
  function warnings(step){
    const w=[], rows=k=>[...$(k).children].map(blockData).filter(o=>isFilled(k,o));
    if(step==='you'){
      const t=typo($('email').value.trim()); if(t) w.push('Email: '+t);
      if($('alt').value&&digits($('alt').value)===digits($('mob').value)) w.push('Alternate mobile is the same as your main mobile.');
      if(/aadhaar/i.test($('idtype').value)) w.push('Please make sure the Aadhaar copy is the masked version, with the first 8 digits hidden.');
      if(val('mode')==='owner'){ const jm=digits($('jmob').value), je=$('jemail').value.trim().toLowerCase();
        if(jm&&jm===digits($('mob').value)) w.push('Joint member\'s mobile is the same as yours. Give their own number if they have one.');
        if(je&&je===$('email').value.trim().toLowerCase()) w.push('Joint member\'s email is the same as yours.'); }
    }
    if(step==='family'||step==='tenants'){
      const r=rows(step);
      dupes(r.map(o=>digits(o.mobile))).forEach(m=>w.push('Mobile +91 '+m+' is entered for more than one person.'));
      r.forEach(o=>{ const t=o.email&&typo(o.email); if(t) w.push(o.name+': '+t); });
      if(step==='family'&&val('occ')==='self'&&!r.some(o=>o.relation==='Self')) w.push('No one is marked as "Self". Please include yourself.');
      if(r.some(o=>o.name&&!o.age)) w.push('Age group is missing for '+r.filter(o=>o.name&&!o.age).map(o=>o.name).join(', ')+'.');
    }
    if(step==='tenants'){
      if($('llto').value&&$('llto').value<today) w.push('The leave & licence ended on '+$('llto').value+'. Please upload the renewed agreement.');
      else if($('llto').value){ const days=(new Date($('llto').value)-new Date(today))/864e5; if(days<=30) w.push('The leave & licence ends in '+Math.round(days)+' days. Please send the renewed agreement to the office.'); }
      if(val('llreg')==='No') w.push('An unregistered leave & licence agreement is not valid under Maharashtra law. Please register it.');
      if(val('llpol')==='No') w.push('Police verification of tenants is compulsory in Mumbai. Please complete it and send the receipt.');
      if(!$('llfile').files.length) w.push('The leave & licence agreement has not been uploaded.');
      if(val('llpol')==='Yes'&&!$('llpolfile').files.length) w.push('Police verification is marked done but the receipt is not uploaded.');
    }
    if(step==='staff'){
      rows('staff').forEach(o=>{ const n=o.name||o.role;
        if(o.police==='No') w.push(n+': police verification not done. Staff without verification may be refused entry.');
        if(!o.police) w.push(n+': police verification not answered.');
        if(!o.photo.length) w.push(n+': no photo uploaded.');
        if(o.police==='Yes'&&!o.polfile.length) w.push(n+': police receipt not uploaded.'); });
      dupes(rows('staff').map(o=>digits(o.mobile))).forEach(m=>w.push('Mobile +91 '+m+' is entered for more than one staff member.'));
    }
    if(step==='vehicles'){
      rows('vehicles').forEach(o=>{ if(o.reg&&!/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$|^\d{2}BH\d{4}[A-Z]{1,2}$/.test(o.reg)) w.push(o.reg+' does not look like a valid registration number (e.g. MH01AB1234).'); });
      dupes(rows('vehicles').map(o=>o.reg)).forEach(v=>w.push(v+' is entered twice.'));
    }
    if(step==='emergency'){
      if($('ename').value.trim()&&!$('erel').value) w.push('Please select how the emergency contact is related to you.');
      if(!$('ename').value.trim()&&!$('emob').value) w.push('No emergency contact given. We strongly recommend adding one.');
      else if($('emob').value&&digits($('emob').value)===digits($('mob').value)) w.push('Emergency contact mobile is the same as yours. Please give someone else\'s number.');
      else if($('ename').value.trim()&&!$('emob').value) w.push('Emergency contact has no mobile number.');
    }
    return w;
  }
  let warnedSig='';

  document.addEventListener('focusout',e=>{
    const el=e.target; if(!el.matches||!el.matches('input,select')) return;
    const f=el.closest('.field'); if(!f) return;
    const v=el.value.trim(); let m='';
    if(el.type==='tel'&&v&&!okMob(v)){ m='This mobile number '+mobWhy(v); toast('err','Check the mobile number',[labelOf(f)+': '+v+' '+mobWhy(v)]); }
    else if(el.type==='email'&&v&&!okEmail(v)){ m='This email '+emailWhy(v); toast('err','Check the email address',[labelOf(f)+': '+v+' '+emailWhy(v)]); }
    if(m){ f.classList.add('bad'); f.querySelector('.err').textContent=m; }
    let wm=f.querySelector('.wmsg'); const tw=el.type==='email'&&v&&okEmail(v)?typo(v):'';
    if(tw){ if(!wm){ wm=document.createElement('span'); wm.className='wmsg'; f.appendChild(wm);} wm.textContent=tw; } else if(wm) wm.remove();
  });
  const MAX_PDF=5*1024*1024;
  document.addEventListener('change',e=>{
    const el=e.target; if(el.type!=='file') return;
    const big=[...el.files].filter(f=>!f.type.startsWith('image/')&&f.size>MAX_PDF), wrong=[...el.files].filter(f=>!(f.type.startsWith('image/')||f.type==='application/pdf'));
    if(wrong.length) toast('err','File type not accepted',wrong.map(f=>f.name+': please upload a PDF or a photo (JPG/PNG).'));
    else if(big.length) toast('err','File too large',big.map(f=>f.name+' is over 5 MB. Upload a photo of it instead, or a smaller PDF.'));
    else if(el.files.length) toast('ok',el.files.length===1?'File attached':el.files.length+' files attached',null,2500);
  });

  function collect(){
    const m=val('mode'), list=steps(), rows=k=>list.includes(k)?[...$(k).children].map(blockData).filter(o=>isFilled(k,o)):[];
    return {
      key:KEY, mode:m, flat:'B-'+$('flat').value,
      name:$('name').value.trim(), mobile:digits($('mob').value), alt:digits($('alt').value), email:$('email').value.trim().toLowerCase(),
      idType:$('idtype').value,
      joint:m==='owner'?{name:$('jname').value.trim(),mobile:digits($('jmob').value),email:$('jemail').value.trim().toLowerCase()}:{name:'',mobile:'',email:''},
      ownerName:m==='tenant'?$('ownername').value.trim():'',
      occupancy:m==='owner'?val('occ'):'tenant', address:m==='owner'&&val('occ')!=='self'?$('addr').value.trim():'',
      ll:list.includes('tenants')?{from:$('llfrom').value,to:$('llto').value,registered:val('llreg'),police:val('llpol')}:null,
      family:rows('family'), tenants:rows('tenants'), staff:rows('staff'), vehicles:rows('vehicles'),
      emergency:{name:$('ename').value.trim(),relation:$('erel').value,mobile:digits($('emob').value),address:$('eaddr').value.trim()}, remarks:$('rem').value.trim(),
      dlConsent:$('dlconsent').checked,
      files:{id:[...$('idfile').files], ll:list.includes('tenants')?[...$('llfile').files]:[], llpol:list.includes('tenants')?[...$('llpolfile').files]:[]}
    };
  }

  function buildReview(){
    const d=collect(), R=$('review'); R.innerHTML='';
    const occLabel={self:'Owner and family',family:'Other family members (owner not living here)',tenant:'Given on leave & licence',vacant:'Vacant / locked'};
    const card=(title,step,pairs)=>{
      const c=document.createElement('div'); c.className='rv';
      const h=document.createElement('h3'); h.textContent=title; const b=document.createElement('button'); b.type='button'; b.textContent='Edit'; b.onclick=()=>{cur=step;paint();scrollTo(0,0);}; h.appendChild(b); c.appendChild(h);
      const dl=document.createElement('dl');
      pairs.filter(p=>p[1]).forEach(p=>{const dt=document.createElement('dt'); dt.textContent=p[0]; const dd=document.createElement('dd'); dd.textContent=p[1]; dl.append(dt,dd);});
      c.appendChild(dl); R.appendChild(c);
    };
    card('Flat','start',[['Flat',d.flat],['Filling as',d.mode==='owner'?'Owner / member':'Tenant / licensee']]);
    card('Your details','you',[['Name',d.name],['Mobile','+91 '+d.mobile],['Alternate',d.alt?'+91 '+d.alt:''],['Email',d.email],['Photo ID',d.idType+' · '+d.files.id.length+' file(s)'],['Joint member',d.joint.name],['Joint mobile',d.joint.mobile?'+91 '+d.joint.mobile:''],['Joint email',d.joint.email],['Flat owner',d.ownerName]]);
    if(d.mode==='owner') card('Occupancy','occ',[['Who lives here',occLabel[d.occupancy]],['Address',d.address]]);
    if(d.family.length) card('Family ('+d.family.length+')','family',d.family.map((p,i)=>[p.relation||('Member '+(i+1)),[p.name,p.age,p.mobile].filter(Boolean).join(' · ')]));
    if(d.ll) card((d.mode==='tenant'?'Others living with you':'Tenants')+' & licence','tenants',d.tenants.map((p,i)=>[p.relation||('Occupant '+(i+1)),[p.name,p.age,p.mobile].filter(Boolean).join(' · ')]).concat([['L&L period',d.ll.from+' to '+d.ll.to],['Registered',d.ll.registered],['Police verified',d.ll.police],['Documents',(d.files.ll.length+d.files.llpol.length)+' file(s)']]));
    if(steps().includes('staff')) card('Staff ('+d.staff.length+')','staff',d.staff.length?d.staff.map(s=>[s.role||'Staff',[s.name,s.work,s.mobile,s.photo.length?'photo ✓':'no photo',s.role==='Driver'?(s.dlfile.length?'licence ✓':'licence missing'):(s.idfile.length?'ID ✓':'ID missing'),s.police==='Yes'?'police verified':s.police==='No'?'not police verified':''].filter(Boolean).join(' · ')]):[['','None']]);
    if(steps().includes('vehicles')) card('Vehicles ('+d.vehicles.length+')','vehicles',d.vehicles.length?d.vehicles.map(v=>[v.type||'Vehicle',[v.reg,v.model,v.slot].filter(Boolean).join(' · ')]):[['','None']]);
    card('Emergency contact','emergency',[['Name',d.emergency.name||'Not given'],['Relation',d.emergency.relation],['Mobile',d.emergency.mobile?'+91 '+d.emergency.mobile:''],['Address',d.emergency.address],['Remarks',d.remarks]]);
  }

  // ---------- files: compress photos, read PDFs ----------
  function readFile(file){
    return new Promise((res,rej)=>{
      if(file.type.startsWith('image/')){
        const img=new Image(), url=URL.createObjectURL(file);
        img.onload=()=>{ const s=Math.min(1,1600/Math.max(img.width,img.height)), c=document.createElement('canvas'); c.width=Math.round(img.width*s); c.height=Math.round(img.height*s); c.getContext('2d').drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url); res({name:file.name.replace(/\.[^.]+$/,'')+'.jpg',mimeType:'image/jpeg',data:c.toDataURL('image/jpeg',0.82).split(',')[1]}); };
        img.onerror=()=>rej(new Error('Could not read the image '+file.name+'. Please choose a JPG or PNG photo.'));
        img.src=url;
      } else {
        if(file.size>MAX_PDF) return rej(new Error(file.name+' is larger than 5 MB. Please upload a smaller file or a photo instead.'));
        const r=new FileReader(); r.onload=()=>res({name:file.name,mimeType:file.type||'application/pdf',data:String(r.result).split(',')[1]}); r.onerror=()=>rej(new Error('Could not read '+file.name+'.')); r.readAsDataURL(file);
      }
    });
  }
  const readAll=arr=>Promise.all((arr||[]).map(readFile));

  async function submit(){
    const err=$('submit-err'); err.hidden=true;
    if(!$('agree').checked){ err.textContent='Please tick the declaration to submit.'; err.hidden=false; toast('err','Declaration not ticked',['Tick the declaration box above the Submit button.']); $('agree').focus(); return; }
    if(hasDriver()&&!$('dlconsent').checked){ err.textContent='Please confirm you have your staff\'s consent to share their ID and licence copies.'; err.hidden=false; toast('err','Staff consent not ticked',[err.textContent]); return; }
    const btn=$('next'); btn.disabled=true; $('back').disabled=true; btn.textContent='Uploading…';
    try{
      const d=collect();
      d.files={id:await readAll(d.files.id), ll:await readAll(d.files.ll), llpol:await readAll(d.files.llpol)};
      for(const s of d.staff){ s.photo=await readAll(s.photo); s.dlfile=s.role==='Driver'?await readAll(s.dlfile):[]; s.idfile=s.role!=='Driver'?await readAll(s.idfile):[]; if(s.role==='Driver') s.idtype=''; s.polfile=await readAll(s.polfile); }
      let ref;
      if(LIVE){ const r=await call('submitKyc',[d]); ref=r.ref||r.data||''; }
      else ref='VCHS-KYC-'+d.flat.replace('-','')+'-'+(d.mode==='tenant'?'T':'M')+'-0001 (preview)';
      $('ref').textContent=ref; cur='done'; paint(); scrollTo(0,0);
    }catch(e){ err.textContent='Could not submit: '+e.message; err.hidden=false; toast('err','Submission failed',[e.message],0); btn.disabled=false; $('back').disabled=false; btn.textContent='Submit KYC'; }
  }

  // ---------- link handling ----------
  async function openKey(k){
    if(!k) return false;
    if(!LIVE){ KEY=k; FLAT=''; $('flat').readOnly=false; $('f-flat').querySelector('.hint').textContent='Preview: type any flat number.'; return true; }
    const r=await call('verifyKey',[k]);
    KEY=k; FLAT=String(r.flat||'').replace(/\D/g,''); ROLE=r.role||'';
    $('flat').value=FLAT;
    if(ROLE==='owner'||ROLE==='tenant'){ const el=document.querySelector('input[name=mode][value='+ROLE+']'); el.checked=true; document.querySelectorAll('input[name=mode]').forEach(x=>{ if(x!==el) x.closest('.card').hidden=true; }); applyMode(); }
    store.set('vkyc_key',k);
    return true;
  }

  $('next').onclick=async ()=>{
    if(cur==='link'){
      const k=keyFrom($('code').value);
      if(!k){ ERR=[]; bad('f-code'); toast('err','Code not valid',ERR); return; }
      const btn=$('next'); btn.disabled=true;
      try{ await openKey(k); cur='start'; paint(); scrollTo(0,0); }
      catch(e){ bad('f-code',e.message); toast('err','Could not open your KYC',[e.message],0); }
      finally{ btn.disabled=false; }
      return;
    }
    if(cur==='review') return submit();
    if(!validate(cur)) return;
    const w=warnings(cur), sig=cur+'|'+w.join('|');
    if(w.length&&warnedSig!==sig){ warnedSig=sig; toast('warn','Please check before continuing',w,0); $('next').textContent='Continue anyway'; return; }
    warnedSig=''; $('toasts').innerHTML='';
    const l=steps(); cur=l[l.indexOf(cur)+1]; paint(); scrollTo(0,0);
  };
  $('back').onclick=()=>{ warnedSig=''; $('toasts').innerHTML=''; const l=steps(), i=l.indexOf(cur); if(i>0){ cur=l[i-1]; paint(); scrollTo(0,0); } };

  (async function init(){
    applyMode();
    const k=keyFrom(location.href)||store.get('vkyc_key');
    if(qs.get('k')){ try{ history.replaceState(null,'',location.pathname); }catch(e){} } // keep the code out of screenshots and shared URLs
    if(k){ try{ await openKey(k); cur='start'; }catch(e){ store.del('vkyc_key'); $('link-msg').textContent=e.message+' Please open the latest link sent by the Society.'; } }
    paint();
  })();

  // ---------- install as an app ----------
  if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
  const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const dismissed=store.get('vkyc_install_dismissed');
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  let deferred=null;
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; if(!standalone&&!dismissed){ $('install-text').textContent='Install the Venezia KYC app on this phone.'; $('install-btn').hidden=false; $('install').hidden=false; } });
  $('install-btn').onclick=async()=>{ if(!deferred) return; deferred.prompt(); await deferred.userChoice; deferred=null; $('install').hidden=true; };
  $('install-close').onclick=()=>{ $('install').hidden=true; store.set('vkyc_install_dismissed','1'); };
  if(ios&&!standalone&&!dismissed){ $('install-text').textContent='To install on iPhone: tap the Share button in Safari, then "Add to Home Screen".'; $('install').hidden=false; }
})();
