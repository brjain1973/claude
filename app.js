/* Venezia CHS – Resident KYC app logic.
   This app stores no member data on its own site. Everything goes to the Society's Google Apps Script
   (window.KYC_API), which saves it in the Society's Google Drive. A draft is kept on the member's own
   phone until it is submitted, so nothing typed is lost. */
(function(){
  const $=id=>document.getElementById(id);
  const API=(window.KYC_API||'').trim();
  const LIVE=!!API;
  if(!LIVE) $('preview-banner').hidden=false;
  const store={get:k=>{try{return localStorage.getItem(k)||''}catch(e){return ''}},set:(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};

  // ---------- language ----------
  let LANG=store.get('vkyc_lang')||'en';
  const HI={
    "This form opens only with the personal link the Society has sent to your registered mobile number on WhatsApp. Please tap that link once. If you have installed the app, paste the link or the code from it below.":'यह फॉर्म केवल उस व्यक्तिगत लिंक से खुलता है जो सोसायटी ने आपके रजिस्टर्ड मोबाइल पर व्हाट्सऐप से भेजा है। कृपया वह लिंक एक बार टैप करें। ऐप इंस्टॉल किया है तो लिंक या उसका कोड नीचे पेस्ट करें।',
    "Takes about 5 minutes. Keep your photo ID, your staff's photo IDs and your driver's licence copy handy.":'लगभग 5 मिनट लगेंगे। अपना फोटो पहचान पत्र, स्टाफ के पहचान पत्र और ड्राइवर के लाइसेंस की कॉपी पास रखें।',
    'Include yourself. Tap a block to fill it; leave the rest empty.':'खुद को भी शामिल करें। भरने के लिए खाने पर टैप करें; बाकी खाली छोड़ दें।',
    'Everyone who works in your flat, full time or part time. Skip if none. A driving licence copy is compulsory for every driver, and a photo ID copy for every other staff member.':'आपके फ्लैट में काम करने वाले सभी लोग, पूरे या आधे समय। कोई नहीं तो छोड़ें। हर ड्राइवर के लिए लाइसेंस की कॉपी और बाकी हर स्टाफ के लिए फोटो पहचान पत्र अनिवार्य है।',
    'Skip if none. Listing a vehicle does not allot a parking slot.':'कोई नहीं तो छोड़ें। वाहन दर्ज करने से पार्किंग स्लॉट नहीं मिलता।',
    'Filled in from your personal link.':'आपके व्यक्तिगत लिंक से भरा गया।',
    'Full name of the person named first in your registered agreement, written exactly as in it.':'रजिस्टर्ड एग्रीमेंट में पहले नाम वाले व्यक्ति का पूरा नाम, ठीक वैसा ही जैसा लिखा है।',
    'Use the number registered with the Society for this flat. Owners abroad: change +91 to your country code.':'इस फ्लैट के लिए सोसायटी में रजिस्टर्ड नंबर लिखें। विदेश में रहने वाले मालिक +91 की जगह अपने देश का कोड लिखें।',
    "AGM notices, circulars and bills go here. Use a mailbox you check and that isn't full.":'AGM सूचना, परिपत्र और बिल इसी पर आएँगे। ऐसा ईमेल दें जो आप देखते हैं।',
    'Fill this if another person is named on the agreement with you.':'अगर एग्रीमेंट में आपके साथ किसी और का नाम है तो भरें।',
    'The licensor named in your leave & licence agreement.':'आपके लीव एंड लाइसेंस एग्रीमेंट में लिखा लाइसेंसर।',
    'Name as in the agreement':'एग्रीमेंट अनुसार नाम',
    'Open your personal KYC link':'अपना व्यक्तिगत KYC लिंक खोलें','Link or code':'लिंक या कोड','Open my KYC':'मेरा KYC खोलें',
    "Let's start with your flat":'अपने फ्लैट से शुरू करें','Flat number':'फ्लैट नंबर','I am filling this as the':'मैं यह भर रहा/रही हूँ:',
    'Owner / member':'मालिक / सदस्य','Tenant / licensee':'किरायेदार / लाइसेंसी','First name on the agreement':'एग्रीमेंट में पहला नाम',
    'Living here on leave & licence':'लीव एंड लाइसेंस पर रह रहे हैं','Your details':'आपका विवरण','Your details (main tenant)':'आपका विवरण (मुख्य किरायेदार)',
    'Mobile (WhatsApp)':'मोबाइल (व्हाट्सऐप)','Alternate mobile':'वैकल्पिक मोबाइल','optional':'वैकल्पिक','Email for society notices':'सोसायटी सूचनाओं के लिए ईमेल',
    'Your photo ID (compulsory)':'आपका फोटो पहचान पत्र (अनिवार्य)','Upload ID copy (front & back)':'पहचान पत्र की कॉपी अपलोड करें (आगे और पीछे)',
    'I will upload my ID later (within 7 days)':'मैं अपना पहचान पत्र बाद में (7 दिन में) अपलोड करूँगा/करूँगी',
    'Second name on the agreement — full name':'एग्रीमेंट में दूसरा नाम — पूरा नाम',"Joint member's mobile":'संयुक्त सदस्य का मोबाइल',"Joint member's email":'संयुक्त सदस्य का ईमेल',
    "Flat owner's name as in the agreement":'एग्रीमेंट अनुसार फ्लैट मालिक का नाम','Who lives in the flat now?':'अभी फ्लैट में कौन रहता है?',
    "Everyone living in the flat under the leave & licence. The main tenant's name and mobile number are compulsory, so the Society can send them their own link to complete their KYC. Email is optional.":'लीव एंड लाइसेंस पर फ्लैट में रहने वाले सभी लोग। मुख्य किरायेदार का नाम और मोबाइल नंबर अनिवार्य है, ताकि सोसाइटी उन्हें KYC पूरा करने के लिए उनका अपना लिंक भेज सके। ईमेल वैकल्पिक है।',
    'Keep these handy':'ये पास रखें',
    "Don't have something right now? Fill what you can, tap Save, and come back to the same link later.":'अभी कुछ पास नहीं है? जितना हो सके भरें, सेव दबाएँ, और बाद में इसी लिंक से वापस आएँ।',
    'Your registered agreement':'आपका रजिस्टर्ड एग्रीमेंट',"to write your name and the joint owner's name exactly as in it":'अपना और संयुक्त मालिक का नाम बिल्कुल उसी तरह लिखने के लिए',
    'Your photo ID on your phone':'आपके फ़ोन में आपका फ़ोटो ID','masked Aadhaar, voter ID, passport or driving licence (photo or PDF, front and back)':'मास्क्ड आधार, वोटर ID, पासपोर्ट या ड्राइविंग लाइसेंस (फ़ोटो या PDF, आगे और पीछे)',
    "Joint / co-owner's details":'संयुक्त / सह-मालिक का विवरण','name, mobile and email (optional, but please give as much as you can)':'नाम, मोबाइल और ईमेल (वैकल्पिक, पर जितना हो सके दें)',
    'If you live in the flat':'अगर आप फ्लैट में रहते हैं','names, age group, mobile and email of family members living with you':'साथ रहने वाले परिवार के सदस्यों के नाम, आयु वर्ग, मोबाइल और ईमेल',
    'If the flat is rented':'अगर फ्लैट किराए पर है',"your tenant's name, mobile and email, and your current address":'किरायेदार का नाम, मोबाइल और ईमेल, और आपका वर्तमान पता',
    'Staff working in the flat':'फ्लैट में काम करने वाला स्टाफ','name, mobile and a photo; ID copy for maids, helpers and cooks; driving licence copy for drivers; police verification receipt if done':'नाम, मोबाइल और फ़ोटो; मेड, हेल्पर और कुक का ID; ड्राइवर का ड्राइविंग लाइसेंस; पुलिस वेरिफिकेशन रसीद (अगर हुई हो)',
    'name, mobile and a photo; ID copy for maids, helpers and cooks; driving licence copy for drivers':'नाम, मोबाइल और फ़ोटो; मेड, हेल्पर और कुक का ID; ड्राइवर का ड्राइविंग लाइसेंस',
    'Vehicles':'वाहन','registration number, make and model, parking slot':'रजिस्ट्रेशन नंबर, कंपनी और मॉडल, पार्किंग स्लॉट',
    'Emergency contact':'आपातकालीन संपर्क','name, relation, mobile and address':'नाम, रिश्ता, मोबाइल और पता',
    'Leave & licence agreement':'लीव एंड लाइसेंस एग्रीमेंट','registered copy, with start and end dates':'रजिस्टर्ड कॉपी, शुरू और खत्म होने की तारीख के साथ',
    'Police verification receipt':'पुलिस वेरिफिकेशन रसीद','for you as a tenant':'किरायेदार के रूप में आपकी',
    "Flat owner's name":'फ्लैट मालिक का नाम','as written in the agreement':'जैसा एग्रीमेंट में लिखा है',
    'People living with you':'आपके साथ रहने वाले लोग','names, age group, mobile and email':'नाम, आयु वर्ग, मोबाइल और ईमेल',
    "Confirm it's you":'पुष्टि करें कि यह आप हैं',
    'Registered mobile number':'रजिस्टर्ड मोबाइल नंबर',
    'Attempts left: ':'बचे प्रयास: ',
    'Continue with this number':'इसी नंबर से आगे बढ़ें',
    'My family and I':'मैं और मेरा परिवार','Other family members':'परिवार के अन्य सदस्य','A tenant':'किरायेदार','Nobody':'कोई नहीं',
    'Owner-occupied':'मालिक स्वयं रहते हैं',"My relatives live here; I don't":'मेरे रिश्तेदार रहते हैं; मैं नहीं','Given on leave & licence':'लीव एंड लाइसेंस पर दिया है','Vacant or locked':'खाली या बंद',
    'Your correspondence address':'आपका पत्राचार पता','Family members living in the flat':'फ्लैट में रहने वाले परिवार के सदस्य',
    '+ Add another family member':'+ परिवार का एक और सदस्य जोड़ें','Tenant details':'किरायेदार का विवरण','Others living with you':'आपके साथ रहने वाले अन्य',
    '+ Add another occupant':'+ एक और निवासी जोड़ें','Leave & licence':'लीव एंड लाइसेंस','From':'से','To':'तक','Agreement registered?':'एग्रीमेंट रजिस्टर्ड है?',
    'Police verification done?':'पुलिस वेरिफिकेशन हुआ?','Yes':'हाँ','No':'नहीं','Registered agreement':'रजिस्टर्ड एग्रीमेंट','Police verification receipt':'पुलिस वेरिफिकेशन रसीद',
    "I don't have these details; the tenant will fill them using their own link":'मेरे पास यह विवरण नहीं है; किरायेदार अपने लिंक से भरेंगे',
    'Drivers, maids & helpers':'ड्राइवर, नौकरानी और सहायक','+ Add another staff member':'+ एक और स्टाफ सदस्य जोड़ें',
    'Vehicles parked in the society':'सोसायटी में खड़े वाहन','+ Add another vehicle':'+ एक और वाहन जोड़ें','Emergency contact':'आपातकालीन संपर्क',
    "Someone we can call if we can't reach you.":'कोई जिसे हम आपसे संपर्क न होने पर कॉल कर सकें।','Name':'नाम','Relation to you':'आपसे संबंध','Mobile':'मोबाइल','Address':'पता',
    'Anything else the office should know?':'ऑफिस को और कुछ बताना है?','Check and submit':'जाँचें और जमा करें','Thank you, KYC received':'धन्यवाद, KYC प्राप्त हुआ',
    'Your reference number':'आपका संदर्भ नंबर','Back':'पीछे','Next':'आगे','Save':'सेव','Skip':'छोड़ें','Submit KYC':'KYC जमा करें','Continue anyway':'फिर भी आगे बढ़ें',
    'Full name':'पूरा नाम','Relation to member':'सदस्य से संबंध','Relation':'संबंध','Age group':'आयु वर्ग','Email':'ईमेल','Role':'काम','Works':'काम का समय',
    'Working hours':'काम के घंटे','Where they live':'कहाँ रहते हैं','Photo':'फोटो','Driving licence copy (front & back)':'ड्राइविंग लाइसेंस की कॉपी (आगे और पीछे)',
    'Photo ID type':'फोटो पहचान पत्र का प्रकार','Photo ID copy (front & back)':'फोटो पहचान पत्र की कॉपी (आगे और पीछे)','Type':'प्रकार','Registration no.':'रजिस्ट्रेशन नंबर',
    'Make & model':'मेक और मॉडल','Parking slot no. (P1–P4)':'पार्किंग स्लॉट नंबर (P1–P4)','Choose file':'फाइल चुनें','Choose files':'फाइलें चुनें','Take / choose photo':'फोटो लें / चुनें',
    'ID / licence will be uploaded later (within 7 days)':'पहचान पत्र / लाइसेंस बाद में (7 दिन में) अपलोड होगा','Remove this block':'यह हटाएँ',
    'Your flat':'आपका फ्लैट','Who lives here':'कौन रहता है','Family':'परिवार','Occupants':'निवासी','Staff':'स्टाफ','Vehicles':'वाहन','Review':'जाँच','Your personal link':'आपका व्यक्तिगत लिंक'
  };
  const tr=s=>LANG==='hi'&&HI[s]?HI[s]:s;
  const ORIG=new WeakMap();
  function applyLang(root){
    const walk=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);
    let n; while((n=walk.nextNode())){
      if(n.parentElement&&n.parentElement.closest('script,style,#toasts,.ref,.sumtxt,.fn')) continue;
      if(!ORIG.has(n)) ORIG.set(n,n.nodeValue);
      const o=ORIG.get(n), t=o.trim(); if(!t) continue;
      n.nodeValue=LANG==='hi'&&HI[t]?o.replace(t,HI[t]):o;
    }
    $('lang-btn').textContent=LANG==='hi'?'English':'हिंदी';
    document.documentElement.lang=LANG==='hi'?'hi':'en';
  }
  $('lang-btn').onclick=()=>{ LANG=LANG==='hi'?'en':'hi'; store.set('vkyc_lang',LANG); applyLang(); applyMode(); paint(); };

  // ---------- server ----------
  async function callRaw(fn,args){
    if(!LIVE) throw new Error('Preview mode: the Society server is not connected yet.');
    let r;
    try{ r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn:fn,args:args||[]}),redirect:'follow'}); }
    catch(e){ throw new Error('No internet connection, or the Society server could not be reached. Your entries are saved on this phone; please try again.'); }
    if(!r.ok) throw new Error('The Society server did not respond ('+r.status+'). Your entries are saved on this phone; please try again.');
    return await r.json();
  }
  async function call(fn,args){
    const j=await callRaw(fn,args);
    if(j&&j.ok===false) throw new Error(j.msg||'Request was not accepted.');
    return j;
  }

  // ---------- personal link ----------
  const qs=new URLSearchParams(location.search);
  let KEY='', TOKEN='', UNLOCKED=false, VERIFIED=true, PENDING_SAVED=null, ROLE='';
  function keyFrom(s){ s=String(s||'').trim(); const m=s.match(/[?&]k=([A-Za-z0-9]{8,40})/); if(m) return m[1]; return /^[A-Za-z0-9]{8,40}$/.test(s)?s:''; }

  // ---------- form spec ----------
  const RELATION_F=['Self','Spouse','Son','Daughter','Father','Mother','Daughter-in-law','Son-in-law','Grandchild','Brother','Sister','Other relative'];
  const RELATION_T=['Spouse','Son','Daughter','Father','Mother','Other relative','Flatmate / co-licensee'];
  const AGE=['Adult','Senior 60+','Minor'];
  const IDS=['Aadhaar card (masked)','Voter ID card','Passport','Driving licence','Other govt ID with photo'];
  const SPEC={
    family:{label:'Member',preset:6,summary:'name',fields:[
      {k:'name',t:'text',l:'Full name',full:1,req:1},{k:'relation',t:'select',l:'Relation to member',opts:RELATION_F},
      {k:'age',t:'chips',l:'Age group',opts:AGE},{k:'mobile',t:'tel',l:'Mobile',opt:1},{k:'email',t:'email',l:'Email',opt:1}]},
    tenants:{label:'Occupant',preset:6,summary:'name',fields:[
      {k:'name',t:'text',l:'Full name',full:1,req:1},{k:'relation',t:'select',l:'Relation',opts:RELATION_T},
      {k:'age',t:'chips',l:'Age group',opts:AGE},{k:'mobile',t:'tel',l:'Mobile'},{k:'email',t:'email',l:'Email',opt:1}]},
    staff:{label:'Staff',preset:3,summary:'name',defaults:[{role:'Driver'},{role:'Maid'},{role:'Helper'}],fields:[
      {k:'role',t:'chips',l:'Role',opts:['Driver','Maid','Helper','Cook','Nanny','Attendant','Other'],full:1},
      {k:'name',t:'text',l:'Full name',req:1},{k:'mobile',t:'tel',l:'Mobile'},
      {k:'work',t:'chips',l:'Works',opts:['Full time','Part time','Stays in flat'],full:1},
      {k:'hours',t:'text',l:'Working hours',ph:'e.g. 8 am – 1 pm',opt:1},{k:'police',t:'chips',l:'Police verification done?',opts:['Yes','No']},
      {k:'address',t:'text',l:'Where they live',full:1,opt:1},{k:'photo',t:'photo',l:'Photo',full:1},
      {k:'dlfile',t:'file',l:'Driving licence copy (front & back)',multi:1,full:1,hint:'Compulsory for drivers. Seen only by the Managing Committee office bearers and the Society office.'},
      {k:'idtype',t:'select',l:'Photo ID type',opts:IDS},
      {k:'idfile',t:'file',l:'Photo ID copy (front & back)',multi:1,full:1,hint:'Compulsory for every maid, helper, cook and other staff. For Aadhaar, upload the masked copy. Seen only by the Managing Committee office bearers and the Society office.'},
      {k:'later',t:'check',l:'ID / licence will be uploaded later (within 7 days)',full:1},
      {k:'polfile',t:'file',l:'Police verification receipt',full:1,opt:1}]},
    vehicles:{label:'Vehicle',preset:4,summary:'reg',defaults:[{type:'2-wheeler'},{type:'2-wheeler'},{type:'4-wheeler'},{type:'4-wheeler'}],fields:[
      {k:'type',t:'chips',l:'Type',opts:['2-wheeler','2-wheeler EV','4-wheeler','4-wheeler EV'],full:1},
      {k:'reg',t:'text',l:'Registration no.',ph:'MH01AB1234',upper:1,req:1},
      {k:'model',t:'text',l:'Make & model',ph:'e.g. Honda Activa',opt:1},{k:'slot',t:'text',l:'Parked at slot',ph:'e.g. P2-90',opt:1}]}
  };
  const counters={family:0,tenants:0,staff:0,vehicles:0};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  // Uploaded files by slot: { slot: [{id,name}] }. Files go to the Society as soon as they are chosen.
  let REFS={};

  function fieldHTML(kind,n,f){
    const id=kind+n+'_'+f.k, opt=f.opt?' <span class="opt">optional</span>':'';
    let inner='';
    if(f.t==='text') inner='<input type="text" id="'+id+'" data-k="'+f.k+'"'+(f.ph?' placeholder="'+esc(f.ph)+'"':'')+(f.upper?' data-upper="1" autocapitalize="characters"':'')+'>';
    else if(f.t==='email') inner='<input type="email" id="'+id+'" data-k="'+f.k+'">';
    else if(f.t==='tel') inner='<div class="tel"><input type="tel" class="cc" id="'+id+'cc" value="+91" maxlength="5" aria-label="Country code"><input type="tel" id="'+id+'" data-k="'+f.k+'" inputmode="numeric" maxlength="14"></div>';
    else if(f.t==='select') inner='<select id="'+id+'" data-k="'+f.k+'"><option value="">Select</option>'+f.opts.map(o=>'<option>'+esc(o)+'</option>').join('')+'</select>';
    else if(f.t==='chips') inner='<div class="chips">'+f.opts.map(o=>'<label class="chip"><input type="radio" name="'+id+'" value="'+esc(o)+'" data-k="'+f.k+'"><span>'+esc(o)+'</span></label>').join('')+'</div>';
    else if(f.t==='check') return '<label class="later full" data-fk="'+f.k+'"><input type="checkbox" id="'+id+'" data-k="'+f.k+'"><span>'+esc(f.l)+'</span></label>';
    else if(f.t==='photo') inner='<div class="photo"><div class="thumb">No photo</div><div class="filebtn"><label>Take / choose photo<input type="file" accept="image/*" id="'+id+'" data-k="'+f.k+'" data-slot="'+id+'" data-photo="1"></label><span class="fn"></span></div></div>';
    else if(f.t==='file') inner='<div class="filebtn"><label>Choose file'+(f.multi?'s':'')+'<input type="file" accept=".pdf,image/*" id="'+id+'" data-k="'+f.k+'" data-slot="'+id+'"'+(f.multi?' multiple':'')+'></label><span class="fn"></span></div>';
    const lab=(['text','email','select','tel'].includes(f.t))?'<label class="l" for="'+id+'">'+esc(f.l)+opt+'</label>':'<span class="l">'+esc(f.l)+opt+'</span>';
    return '<div class="field'+(f.full?' full':'')+'" data-fk="'+f.k+'">'+lab+inner+(f.hint?'<span class="hint">'+esc(f.hint)+'</span>':'')+'<span class="err"></span></div>';
  }

  function addBlock(kind,removable,forceN){
    const sp=SPEC[kind], n=forceN||++counters[kind], idx=$(kind).children.length;
    if(forceN&&forceN>counters[kind]) counters[kind]=forceN;
    const d=document.createElement('details'); d.className='block'; d.dataset.kind=kind; d.dataset.n=n;
    if(idx===0) d.open=true;
    d.innerHTML='<summary><span class="num">'+(idx+1)+'</span><span class="sumtxt"><em>'+esc(sp.label)+' '+(idx+1)+' · tap to fill</em></span><span class="chev">›</span></summary>'+
      '<div class="blockbody"><div class="grid">'+sp.fields.map(f=>fieldHTML(kind,n,f)).join('')+'</div>'+(removable?'<button type="button" class="rm">Remove this block</button>':'')+'</div>';
    $(kind).appendChild(d);
    const def=(sp.defaults||[])[idx];
    if(def&&!forceN) Object.keys(def).forEach(k=>{ const r=d.querySelector('input[data-k="'+k+'"][value="'+def[k]+'"]'); if(r) r.checked=true; });
    d.addEventListener('input',()=>refreshBlock(d));
    d.addEventListener('change',()=>refreshBlock(d));
    const rm=d.querySelector('.rm'); if(rm) rm.onclick=()=>{ d.querySelectorAll('[data-slot]').forEach(i=>delete REFS[i.dataset.slot]); d.remove(); renumber(kind); saveDraft(); };
    refreshBlock(d); applyLang(d);
    return d;
  }
  function renumber(kind){ [...$(kind).children].forEach((d,i)=>{ d.querySelector('.num').textContent=i+1; refreshBlock(d); }); }
  function blockData(d){
    const o={};
    d.querySelectorAll('[data-k]').forEach(el=>{
      const k=el.dataset.k;
      if(el.type==='radio'){ if(el.checked) o[k]=el.value; else if(!(k in o)) o[k]=''; }
      else if(el.type==='checkbox') o[k]=el.checked;
      else if(el.type==='file') o[k]=REFS[el.dataset.slot]||[];
      else o[k]=el.value.trim();
    });
    return o;
  }
  /** Put the member in the family list as "Self" so no one has to type themselves in again. */
  function addSelfRow(){
    const blocks=[...$('family').children]; if(blocks.some(d=>blockData(d).relation==='Self')) return;
    const d=blocks.find(x=>!isFilled('family',blockData(x))); if(!d) return; const n=d.dataset.n;
    const set=(k,v)=>{ const el=$('family'+n+'_'+k); if(el&&v) el.value=v; };
    set('name',$('name').value.trim()); set('mobile',$('mob').value.trim()); set('email',$('email').value.trim());
    const cc=$('family'+n+'_mobilecc'); if(cc) cc.value=$('mobcc').value;
    const sel=$('family'+n+'_relation'); if(sel) sel.value='Self';
    const ad=d.querySelector('input[name="family'+n+'_age"][value="Adult"]'); if(ad) ad.checked=true;
    refreshBlock(d);
  }
  function isFilled(kind,o){ return SPEC[kind].fields.some(f=>['text','tel','email'].includes(f.t)&&o[f.k]); }
  function refreshBlock(d){
    const kind=d.dataset.kind, sp=SPEC[kind], o=blockData(d), i=[...$(kind).children].indexOf(d)+1;
    d.querySelectorAll('input[data-upper]').forEach(el=>{ const v=el.value.toUpperCase().replace(/\s+/g,''); if(v!==el.value) el.value=v; });
    if(kind==='staff'){ const drv=o.role==='Driver'; d.querySelector('[data-fk="dlfile"]').hidden=!drv; d.querySelector('[data-fk="idtype"]').hidden=drv; d.querySelector('[data-fk="idfile"]').hidden=drv; }
    d.classList.toggle('filled',isFilled(kind,o));
    const main=o[sp.summary]||'', extra=kind==='vehicles'?o.type:kind==='staff'?o.role:o.relation;
    const st=d.querySelector('.sumtxt'); st.textContent='';
    if(main){ st.textContent=main; if(extra){const e=document.createElement('em'); e.textContent=' · '+extra; st.appendChild(e);} }
    else { const e=document.createElement('em'); e.textContent=sp.label+' '+i+' · tap to fill'; st.appendChild(e); }
  }
  function buildBlocks(layout){
    Object.keys(SPEC).forEach(kind=>{
      $(kind).innerHTML=''; counters[kind]=0;
      const ns=layout&&layout[kind]&&layout[kind].length?layout[kind]:null;
      if(ns) ns.forEach((n,i)=>addBlock(kind,i>=SPEC[kind].preset,n));
      else for(let i=0;i<SPEC[kind].preset;i++) addBlock(kind,false);
    });
  }
  buildBlocks();
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{ const k=b.dataset.add; [...$(k).children].forEach(x=>x.open=false); const d=addBlock(k,true); d.open=true; const f=d.querySelector('input[type=text],select'); if(f) f.focus(); });

  // ---------- validation helpers ----------
  const val=n=>{const r=document.querySelector('input[name="'+n+'"]:checked'); return r?r.value:'';};
  const digits=s=>String(s||'').replace(/\D/g,'');
  const ccOf=el=>{ const c=el&&document.getElementById(el.id+'cc'); const v=c?('+'+digits(c.value)):'+91'; return v==='+'?'+91':v; };
  function phone(cc,num){ let d=digits(num); if(cc==='+91') d=d.replace(/^(91|0)(?=\d{10}$)/,''); return {cc:cc,d:d}; }
  function okPhone(p){ if(p.cc==='+91') return /^[6-9]\d{9}$/.test(p.d)&&!/^(\d)\1{9}$/.test(p.d)&&!['9876543210','9123456789'].includes(p.d); return p.d.length>=6&&p.d.length<=14; }
  function phoneWhy(p){ if(p.cc!=='+91') return 'should have 6 to 14 digits after the country code.'; if(p.d.length<10) return 'has only '+p.d.length+' digits. Indian mobile numbers have 10 digits.'; if(p.d.length>10) return 'has more than 10 digits. For a foreign number, change +91 to the country code.'; if(!/^[6-9]/.test(p.d)) return 'must start with 6, 7, 8 or 9.'; return 'does not look like a real number. Please check it.'; }
  const fmtPhone=p=>p.d?(p.cc==='+91'?p.d:p.cc+' '+p.d):'';
  const elPhone=id=>phone(ccOf($(id)),$(id).value);
  const okEmail=s=>/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(s)&&!/\.\./.test(s)&&!/^\.|\.@/.test(s);
  function emailWhy(v){ if(!v.includes('@')) return 'is missing the @ sign.'; if(/\s/.test(v)) return 'has a space in it.'; if(!/@[^@]+\.[A-Za-z]{2,}$/.test(v)) return 'is missing the part after the dot, e.g. .com or .in.'; if(/\.\./.test(v)) return 'has two dots together.'; return 'is not a valid email address.'; }

  document.addEventListener('input',e=>{ const t=e.target; if(t.matches('input[inputmode=numeric]')) t.value=t.value.replace(/\D/g,''); if(t.classList.contains('cc')) t.value='+'+t.value.replace(/\D/g,'').slice(0,4); const f=t.closest('.field'); if(f) f.classList.remove('bad'); saveDraftSoon(); });
  document.addEventListener('change',e=>{ const f=e.target.closest('.field'); if(f) f.classList.remove('bad'); if(e.target.type!=='file') saveDraftSoon(); });
  document.querySelectorAll('input[name=occ]').forEach(r=>r.addEventListener('change',()=>{$('f-addr').hidden=val('occ')==='self'}));
  document.querySelectorAll('input[name=mode],input[name=occ]').forEach(r=>r.addEventListener('change',()=>{ applyMode(); paint(); }));
  $('llbytenant').addEventListener('change',()=>{ $('ll-grid').style.opacity=$('llbytenant').checked?.5:1; });

  function steps(){
    if(!KEY) return ['link'];
    if(!UNLOCKED) return ['check'];
    const m=val('mode'), o=val('occ'), s=['start','you'];
    if(m==='owner'){ s.push('occ'); if(o==='self'||o==='family') s.push('family'); if(o==='tenant') s.push('tenantinfo'); if(o==='self'||o==='family') s.push('staff','vehicles'); }
    else if(m==='tenant') s.push('tenants','staff','vehicles');
    s.push('emergency','review'); return s;
  }
  let cur='link';
  const HANDY={
    owner:[
      ['📄','Your registered agreement','to write your name and the joint owner\'s name exactly as in it'],
      ['🪪','Your photo ID on your phone','masked Aadhaar, voter ID, passport or driving licence (photo or PDF, front and back)'],
      ['👥','Joint / co-owner\'s details','name, mobile and email (optional, but please give as much as you can)'],
      ['👨‍👩‍👧','If you live in the flat','names, age group, mobile and email of family members living with you'],
      ['🔑','If the flat is rented','your tenant\'s name, mobile and email, and your current address'],
      ['🧹','Staff working in the flat','name, mobile and a photo; ID copy for maids, helpers and cooks; driving licence copy for drivers; police verification receipt if done'],
      ['🚗','Vehicles','registration number, make and model, parking slot'],
      ['📞','Emergency contact','name, relation, mobile and address']],
    tenant:[
      ['📄','Leave & licence agreement','registered copy, with start and end dates'],
      ['🛡️','Police verification receipt','for you as a tenant'],
      ['🪪','Your photo ID on your phone','masked Aadhaar, voter ID, passport or driving licence (photo or PDF, front and back)'],
      ['🏠','Flat owner\'s name','as written in the agreement'],
      ['👨‍👩‍👧','People living with you','names, age group, mobile and email'],
      ['🧹','Staff working in the flat','name, mobile and a photo; ID copy for maids, helpers and cooks; driving licence copy for drivers'],
      ['🚗','Vehicles','registration number, make and model, parking slot'],
      ['📞','Emergency contact','name, relation, mobile and address']]
  };
  function renderHandy(){
    const t=val('mode')==='tenant', box=$('handy'); if(!box) return;
    box.innerHTML='<h3>'+esc(tr('Keep these handy'))+'</h3><ul>'+HANDY[t?'tenant':'owner'].map(x=>'<li><span class="hi">'+x[0]+'</span><span><b>'+esc(tr(x[1]))+'</b><small>'+esc(tr(x[2]))+'</small></span></li>').join('')+'</ul><p class="tip">'+esc(tr('Don\'t have something right now? Fill what you can, tap Save, and come back to the same link later.'))+'</p>';
  }
  function applyMode(){
    renderHandy();
    const t=val('mode')==='tenant';
    document.querySelectorAll('[data-only]').forEach(el=>el.hidden=el.dataset.only!==(t?'tenant':'owner'));
    $('llbt-row').hidden=t;
    $('you-h').textContent=tr(t?'Your details (main tenant)':'Your details');
    $('name-l').textContent=tr(t?'Name as in the agreement':'First name on the agreement');
    $('name-h').textContent=t?'Exactly as written in your registered leave & licence agreement.':tr('Full name of the person named first in your registered agreement, written exactly as in it.');
    $('ten-h').textContent=tr(t?'Others living with you':'Tenant details');
    $('fam-lead').textContent=val('occ')==='family'?'List the relatives living in the flat, with their relation to you. Tap a block to fill it; leave the rest empty.':'Include yourself. Tap a block to fill it; leave the rest empty.';
    $('ten-lead').textContent=t?'Family or flatmates living with you. Leave empty if you live alone.':'Everyone living in the flat under the leave & licence.';
    $('decl-text').textContent=t
      ?'I confirm these details are correct, that I occupy the flat under a valid leave & licence agreement, that I am responsible for the verification and conduct of my staff, and that I will follow the society’s bye-laws.'
      :'I confirm these details are correct, that I am responsible for the verification and conduct of staff working in my flat, and that I will inform the society in writing of any change in ownership or occupancy.';
  }
  function paint(){
    document.querySelectorAll('section.step').forEach(s=>s.hidden=s.dataset.step!==cur);
    const list=steps(), i=list.indexOf(cur);
    if(cur==='done'){ $('progress').hidden=true; $('nav').hidden=true; return; }
    $('nav').hidden=false; $('progress').hidden=cur==='link';
    $('stepicon').textContent=({link:'🔗',check:'🔒',start:'🏠',you:'🙋',occ:'🛋️',family:'👨‍👩‍👧',tenants:'🧳',tenantinfo:'🔑',staff:'🧹',vehicles:'🚗',emergency:'📞',review:'✅',done:'🎉'})[cur]||'';
    $('stepname').textContent=tr(document.querySelector('[data-step="'+cur+'"]').dataset.name);
    $('stepcount').textContent=(LANG==='hi'?'चरण ':'Step ')+(i+1)+(LANG==='hi'?' / ':' of ')+list.length;
    $('barfill').style.width=((i+1)/list.length*100)+'%';
    if(cur==='check'||cur==='link'){ $('stepcount').textContent=''; $('barfill').style.width='4%'; }
    $('back').style.visibility=(i<=0||cur==='start')?'hidden':'visible';
    $('save').hidden=(cur==='check'||cur==='link'||cur==='done');
    $('next').textContent=tr(cur==='link'?'Open my KYC':cur==='check'?'Continue':cur==='review'?'Submit KYC':(['staff','vehicles'].includes(cur)&&!anyFilled(cur))?'Skip':'Next');
    if(cur==='review'){ buildReview(); $('dl-consent-row').hidden=!hasStaff(); }
  }
  function anyFilled(kind){ return [...$(kind).children].some(d=>isFilled(kind,blockData(d))); }
  function hasStaff(){ return steps().includes('staff')&&[...$('staff').children].map(blockData).some(o=>isFilled('staff',o)); }
  document.addEventListener('input',()=>{ if(['staff','vehicles'].includes(cur)) $('next').textContent=tr(anyFilled(cur)?'Next':'Skip'); });

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
      const errs=[], n=d.dataset.n;
      SPEC[kind].fields.forEach(f=>{
        const fe=d.querySelector('[data-fk="'+f.k+'"]'); let m='';
        const ph=f.t==='tel'?phone(ccOf($(kind+n+'_'+f.k)),o[f.k]):null;
        if(f.req&&!o[f.k]) m='Required.';
        else if(f.t==='tel'&&o[f.k]&&!okPhone(ph)) m='This mobile number '+phoneWhy(ph);
        else if(f.t==='email'&&o[f.k]&&!okEmail(o[f.k])) m='This email '+emailWhy(o[f.k]);
        else if(kind==='staff'&&f.k==='mobile'&&!o.mobile) m='Required for staff.';
        else if(kind==='staff'&&f.k==='idtype'&&o.role!=='Driver'&&!o.idtype&&!o.later) m='Please choose the ID type.';
        else if(kind==='staff'&&f.k==='idfile'&&o.role!=='Driver'&&!o.idfile.length&&!o.later) m='Upload a photo ID copy, or tick "upload later".';
        else if(kind==='staff'&&f.k==='dlfile'&&o.role==='Driver'&&!o.dlfile.length&&!o.later) m='Upload the driving licence copy, or tick "upload later".';
        if(m&&fe.classList.contains('field')){ fe.classList.add('bad'); fe.querySelector('.err').textContent=m; errs.push(m); ERR.push(SPEC[kind].label+' '+([...$(kind).children].indexOf(d)+1)+' · '+f.l+': '+m); }
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
    if(step==='start'){ if(!/^\d{3,4}$/.test($('flat').value)) ok=bad('f-flat'); if(!val('mode')) ok=bad('f-mode'); }
    if(step==='you'){
      if($('name').value.trim().length<3) ok=bad('f-name');
      const m=elPhone('mob'); if(!okPhone(m)) ok=bad('f-mob',m.d?'This mobile number '+phoneWhy(m):'Enter your mobile number.');
      const a=elPhone('alt'); if(a.d&&!okPhone(a)) ok=bad('f-alt','This mobile number '+phoneWhy(a));
      if(!okEmail($('email').value.trim())) ok=bad('f-email',$('email').value.trim()?'This email '+emailWhy($('email').value.trim()):'Enter your email address.');
      if(!$('idlater').checked){ if(!$('idtype').value) ok=bad('f-idtype'); if(!(REFS.idfile||[]).length) ok=bad('f-idfile'); }
      if(val('mode')==='tenant'&&!$('ownername').value.trim()) ok=bad('f-ownername');
      if(val('mode')==='owner'){
        const jn=$('jname').value.trim(), jm=elPhone('jmob'), je=$('jemail').value.trim();
        if(!jn&&(jm.d||je)) ok=bad('f-jname');
        if(jm.d&&!okPhone(jm)) ok=bad('f-jmob','This mobile number '+phoneWhy(jm));
        if(je&&!okEmail(je)) ok=bad('f-jemail','This email '+emailWhy(je));
      }
    }
    if(step==='occ'&&!val('occ')) ok=bad('f-occ');
    if(step==='family') ok=checkBlocks('family','Please add at least one person living in the flat.');
    if(step==='tenants'){
      const owner=val('mode')==='owner', skip=owner&&$('llbytenant').checked;
      ok=checkBlocks('tenants',null);
      if(!skip){
        if(!$('llfrom').value) ok=bad('f-llfrom');
        if(!$('llto').value||($('llfrom').value&&$('llto').value<=$('llfrom').value)) ok=bad('f-llto');
        if(!val('llreg')) ok=bad('f-llreg');
        if(!val('llpol')) ok=bad('f-llpol');
      }
    }
    if(step==='tenantinfo'){
      if($('tname').value.trim().length<3) ok=bad('f-tname');
      const t=elPhone('tmob'); if(!okPhone(t)) ok=bad('f-tmob',t.d?'This mobile number '+phoneWhy(t):'Enter the tenant\'s mobile number. Their KYC link will be sent to it.');
      else if(t.d===elPhone('mob').d) ok=bad('f-tmob','This is your own number. Please enter the tenant\'s mobile.');
      const te=$('temail').value.trim(); if(te&&!okEmail(te)) ok=bad('f-temail','This email '+emailWhy(te));
    }
    if(step==='staff') ok=checkBlocks('staff');
    if(step==='vehicles'){
      ok=checkBlocks('vehicles');
      [...$('vehicles').children].forEach(d=>{ const o=blockData(d); if(o.reg&&!/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$|^\d{2}BH\d{4}[A-Z]{1,2}$/.test(o.reg)){ const fe=d.querySelector('[data-fk="reg"]'); fe.classList.add('bad'); fe.querySelector('.err').textContent='Enter the registration number as on the RC, e.g. MH01AB1234. If you have no vehicle, clear this block.'; d.open=true; ERR.push('Vehicle '+o.reg+': not a valid registration number.'); ok=false; } });
      ['1','2'].forEach(n=>{ const l=$('pk'+n+'lvl').value, v=$('pk'+n+'no').value.trim(); if((l&&!v)||(!l&&v)) ok=bad('f-pk'+n); });
    }
    if(step==='emergency'){ const e=elPhone('emob'); if(e.d&&!okPhone(e)) ok=bad('f-emob','This mobile number '+phoneWhy(e)); if(e.d&&!$('ename').value.trim()) ok=bad('f-ename','Please enter the emergency contact\'s name.'); }
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
      if($('alt').value&&elPhone('alt').d===elPhone('mob').d) w.push('Alternate mobile is the same as your main mobile.');
      if(/aadhaar/i.test($('idtype').value)&&!$('idlater').checked) w.push('Please make sure the Aadhaar copy is the masked version, with the first 8 digits hidden.');
      if($('idlater').checked) w.push('Your ID copy is marked "upload later". Please open this link again within 7 days to upload it.');
    }
    if(step==='family'||step==='tenants'){
      const r=rows(step);
      dupes(r.map(o=>digits(o.mobile))).forEach(m=>w.push('Mobile '+m+' is entered for more than one person.'));
      r.forEach(o=>{ const t=o.email&&typo(o.email); if(t) w.push(o.name+': '+t); });
      if(step==='family'&&val('occ')==='self'&&!r.some(o=>o.relation==='Self')) w.push('No one is marked as "Self". Please include yourself.');
      if(r.some(o=>o.name&&!o.age)) w.push('Age group is missing for '+r.filter(o=>o.name&&!o.age).map(o=>o.name).join(', ')+'.');
    }
    if(step==='tenants'&&!(val('mode')==='owner'&&$('llbytenant').checked)){
      if($('llto').value&&$('llto').value<today) w.push('The leave & licence ended on '+$('llto').value+'. Please upload the renewed agreement.');
      else if($('llto').value){ const days=(new Date($('llto').value)-new Date(today))/864e5; if(days<=30) w.push('The leave & licence ends in '+Math.round(days)+' days. Please send the renewed agreement to the office.'); }
      if(val('llreg')==='No') w.push('An unregistered leave & licence agreement is not valid under Maharashtra law. Please register it.');
      if(val('llpol')==='No') w.push('Police verification of tenants is compulsory in Mumbai. Please complete it and send the receipt.');
      if(!(REFS.llfile||[]).length) w.push('The leave & licence agreement has not been uploaded. You can add it later from the same link.');
    }
    if(step==='staff'){
      rows('staff').forEach(o=>{ const n=o.name||o.role;
        if(o.police==='No') w.push(n+': police verification not done. Staff without verification may be refused entry.');
        if(!o.photo.length) w.push(n+': no photo uploaded.');
        if(o.later) w.push(n+': ID / licence marked "upload later". Please add it within 7 days from the same link.'); });
      dupes(rows('staff').map(o=>digits(o.mobile))).forEach(m=>w.push('Mobile '+m+' is entered for more than one staff member.'));
    }
    if(step==='vehicles'){
      dupes(rows('vehicles').map(o=>o.reg)).forEach(v=>w.push(v+' is entered twice.'));
    }
    if(step==='emergency'){
      if($('ename').value.trim()&&!$('erel').value) w.push('Please select how the emergency contact is related to you.');
      if(!$('ename').value.trim()&&!$('emob').value) w.push('No emergency contact given. We strongly recommend adding one.');
      else if($('emob').value&&elPhone('emob').d===elPhone('mob').d) w.push('Emergency contact mobile is the same as yours. Please give someone else\'s number.');
      else if($('emob').value){ const em=elPhone('emob').d, inFlat=[elPhone('alt').d].concat([...$('family').children,...$('tenants').children].map(d=>digits(blockData(d).mobile||'')).map(x=>x.slice(-10))).filter(Boolean); if(steps().some(x=>x==='family'||x==='tenants')&&inFlat.includes(em)) w.push('The emergency contact lives in the flat with you. It is better to give someone who does not live here, so the Society can reach them if no one at home answers.'); }
    }
    return w;
  }
  let warnedSig='';

  // ---------- files: upload as soon as chosen ----------
  const MAX_PDF=5*1024*1024;
  function readFile(file){
    return new Promise((res,rej)=>{
      const asIs=()=>{ if(file.size>MAX_PDF) return rej(new Error(file.name+' is larger than 5 MB. Please choose a smaller file or take a photo of it.'));
        const r=new FileReader(); r.onload=()=>res({name:file.name,mimeType:file.type||'application/octet-stream',data:String(r.result).split(',')[1]}); r.onerror=()=>rej(new Error('Could not read '+file.name+'.')); r.readAsDataURL(file); };
      if(file.type.startsWith('image/')||/\.(heic|heif)$/i.test(file.name)){
        const img=new Image(), url=URL.createObjectURL(file);
        img.onload=()=>{ const s=Math.min(1,1600/Math.max(img.width,img.height)), c=document.createElement('canvas'); c.width=Math.round(img.width*s); c.height=Math.round(img.height*s); c.getContext('2d').drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url); res({name:file.name.replace(/\.[^.]+$/,'')+'.jpg',mimeType:'image/jpeg',data:c.toDataURL('image/jpeg',0.82).split(',')[1]}); };
        img.onerror=()=>{ URL.revokeObjectURL(url); asIs(); }; // e.g. an iPhone HEIC photo the browser cannot show: send the original file
        img.src=url;
      } else asIs();
    });
  }
  async function uploadSlot(inp){
    const slot=inp.dataset.slot||inp.id, files=[...inp.files], fn=inp.closest('.filebtn').querySelector('.fn');
    if(!files.length) return;
    const wrong=files.filter(f=>!(f.type.startsWith('image/')||f.type==='application/pdf'||/\.(heic|heif)$/i.test(f.name)));
    if(wrong.length){ toast('err','File type not accepted',wrong.map(f=>f.name+': please upload a PDF or a photo.')); inp.value=''; return; }
    fn.className='fn up'; fn.textContent='Uploading…';
    try{
      const prev=(REFS[slot]||[]).map(r=>r.id), out=[];
      for(const f of files){
        const data=await readFile(f);
        if(LIVE){ const r=await call('uploadFile',[TOKEN,slot,data,out.length?[]:prev]); out.push({id:r.id,name:data.name}); }
        else out.push({id:'preview-'+Date.now()+'-'+out.length,name:data.name});
      }
      REFS[slot]=out; fn.className='fn up'; fn.textContent='✓ '+out.map(r=>r.name).join(', ')+' uploaded';
      const blk=inp.closest('details.block'); if(blk) refreshBlock(blk);
      if(inp.dataset.photo){ const th=inp.closest('.photo').querySelector('.thumb'); th.textContent=''; const im=document.createElement('img'); im.alt='Photo preview'; im.src=URL.createObjectURL(files[0]); th.appendChild(im); }
      const f=inp.closest('.field'); if(f) f.classList.remove('bad');
      saveDraft(); toast('ok',out.length===1?'File uploaded':out.length+' files uploaded',null,2500);
    }catch(e){ fn.className='fn up err2'; fn.textContent='Upload failed. Please choose the file again.'; toast('err','Upload failed',[e.message],0); }
    finally{ inp.value=''; }
  }
  document.addEventListener('change',e=>{ if(e.target.type==='file') uploadSlot(e.target); });
  function showRefs(){
    document.querySelectorAll('input[type=file]').forEach(inp=>{ const slot=inp.dataset.slot||inp.id, r=REFS[slot], fn=inp.closest('.filebtn').querySelector('.fn'); if(fn){ fn.className='fn up'; fn.textContent=r&&r.length?'✓ '+r.map(x=>x.name).join(', ')+' uploaded':''; } });
  }

  // ---------- drafts: kept on this phone, and with the Society when "Save" is pressed ----------
  const FORM_SEL='.wrap input:not([type=file]):not(#code), .wrap select, .wrap textarea';
  function snapshot(){
    const v={};
    document.querySelectorAll(FORM_SEL).forEach(el=>{
      if(el.type==='radio'){ if(el.checked) v['r:'+el.name]=el.value; }
      else if(el.type==='checkbox') v['c:'+el.id]=el.checked;
      else if(el.id) v[el.id]=el.value;
    });
    const layout={}; Object.keys(SPEC).forEach(k=>layout[k]=[...$(k).children].map(d=>+d.dataset.n));
    return {v:v,layout:layout,refs:REFS,cur:cur,at:new Date().toISOString()};
  }
  function restore(s){
    if(!s||!s.v) return;
    buildBlocks(s.layout); REFS=s.refs||{};
    Object.keys(s.v).forEach(k=>{
      if(k.startsWith('r:')){ document.querySelectorAll('input[name="'+k.slice(2)+'"]').forEach(r=>{ if(r.value===s.v[k]) r.checked=true; }); }
      else if(k.startsWith('c:')){ const c=$(k.slice(2)); if(c) c.checked=!!s.v[k]; }
      else { const el=$(k); if(el&&el.id!=='flat') el.value=s.v[k]; }
    });
    document.querySelectorAll('details.block').forEach(refreshBlock);
    $('f-addr').hidden=val('occ')==='self'; $('ll-grid').style.opacity=$('llbytenant').checked?.5:1;
    showRefs(); applyMode();
  }
  let saveT=null;
  function saveDraftSoon(){ clearTimeout(saveT); saveT=setTimeout(saveDraft,800); }
  function saveDraft(){ if(!KEY||!UNLOCKED||cur==='done'||cur==='link'||cur==='check') return; store.set('vkyc_draft_'+KEY,JSON.stringify(snapshot())); }
  async function saveToSociety(){
    saveDraft();
    const btn=$('save'); btn.disabled=true;
    try{
      const r=LIVE?await call('saveDraft',[TOKEN,snapshot()]):{localOnly:true};
      toast('ok','Saved',[r.localOnly?'Your entries are saved on this phone. Open the same link on this phone to finish later.':'Your entries are saved. You can close this and finish later from the same link.'],5000);
    }catch(e){ toast('warn','Saved on this phone only',[e.message],0); }
    finally{ btn.disabled=false; }
  }
  $('save').onclick=saveToSociety;

  function collect(){
    const m=val('mode'), list=steps();
    const rows=k=>list.includes(k)?[...$(k).children].map(d=>{ const o=blockData(d); if(o.mobile) o.mobile=fmtPhone(phone(ccOf($(k+d.dataset.n+'_mobile')),o.mobile)); return o; }).filter(o=>isFilled(k,o)):[];
    const ll=list.includes('tenants')?{byTenant:m==='owner'&&$('llbytenant').checked,from:$('llfrom').value,to:$('llto').value,registered:val('llreg'),police:val('llpol')}:null;
    return {
      key:KEY, token:TOKEN, mode:m, flat:'B-'+$('flat').value,
      name:$('name').value.trim(), mobile:fmtPhone(elPhone('mob')), alt:fmtPhone(elPhone('alt')), email:$('email').value.trim().toLowerCase(),
      idType:$('idtype').value, idLater:$('idlater').checked,
      joint:m==='owner'?{name:$('jname').value.trim(),mobile:fmtPhone(elPhone('jmob')),email:$('jemail').value.trim().toLowerCase()}:{name:'',mobile:'',email:''},
      ownerName:m==='tenant'?$('ownername').value.trim():'',
      occupancy:m==='owner'?val('occ'):'tenant', address:m==='owner'&&val('occ')!=='self'?$('addr').value.trim():'',
      ll:ll, family:rows('family'), tenants:list.includes('tenantinfo')?[{name:$('tname').value.trim(),relation:'Main tenant',age:'',mobile:fmtPhone(elPhone('tmob')),email:$('temail').value.trim().toLowerCase()}]:rows('tenants'), staff:rows('staff'), vehicles:rows('vehicles'), parking:['1','2'].map(n=>$('pk'+n+'lvl').value&&$('pk'+n+'no').value.trim()?$('pk'+n+'lvl').value+'-'+$('pk'+n+'no').value.trim().toUpperCase():'').filter(Boolean),
      emergency:{name:$('ename').value.trim(),relation:$('erel').value,mobile:fmtPhone(elPhone('emob')),address:$('eaddr').value.trim()}, remarks:$('rem').value.trim(),
      dlConsent:$('dlconsent').checked,
      files:{id:REFS.idfile||[], ll:list.includes('tenants')?(REFS.llfile||[]):[], llpol:list.includes('tenants')?(REFS.llpolfile||[]):[]},
      draft:snapshot()
    };
  }
  function pendingDocs(d){
    const p=[];
    if(d.idLater||!d.files.id.length) p.push('Photo ID of '+d.name);
    (d.staff||[]).forEach(s=>{ if(s.role==='Driver'&&!s.dlfile.length) p.push('Driving licence of '+s.name); if(s.role!=='Driver'&&!s.idfile.length) p.push('Photo ID of '+s.name); });
    if(d.ll&&!d.ll.byTenant&&!d.files.ll.length) p.push('Leave & licence agreement');
    return p;
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
    card('Your details','you',[['Name',d.name],['Mobile',d.mobile],['Alternate',d.alt],['Email',d.email],['Photo ID',d.idLater?'To be uploaded later':d.idType+' · '+d.files.id.length+' file(s)'],['Joint member',d.joint.name],['Joint mobile',d.joint.mobile],['Joint email',d.joint.email],['Flat owner',d.ownerName]]);
    if(d.mode==='owner') card('Occupancy','occ',[['Who lives here',occLabel[d.occupancy]],['Address',d.address]]);
    if(d.family.length) card('Family ('+d.family.length+')','family',d.family.map((p,i)=>[p.relation||('Member '+(i+1)),[p.name,p.age,p.mobile].filter(Boolean).join(' · ')]));
    if(steps().includes('tenantinfo')&&d.tenants[0]) card('Your tenant','tenantinfo',[['Name',d.tenants[0].name],['Mobile',d.tenants[0].mobile],['Email',d.tenants[0].email],['Next step','The Society will send the tenant their own KYC link']]);
    if(d.ll) card((d.mode==='tenant'?'Others living with you':'Tenants')+' & licence','tenants',d.tenants.map((p,i)=>[p.relation||('Occupant '+(i+1)),[p.name,p.age,p.mobile].filter(Boolean).join(' · ')]).concat(d.ll.byTenant?[['L&L details','Tenant will fill']]:[['L&L period',d.ll.from+' to '+d.ll.to],['Registered',d.ll.registered],['Police verified',d.ll.police],['Documents',(d.files.ll.length+d.files.llpol.length)+' file(s)']]));
    if(steps().includes('staff')) card('Staff ('+d.staff.length+')','staff',d.staff.length?d.staff.map(s=>[s.role||'Staff',[s.name,s.work,s.mobile,s.photo.length?'photo ✓':'no photo',s.role==='Driver'?(s.dlfile.length?'licence ✓':'licence later'):(s.idfile.length?'ID ✓':'ID later'),s.police==='Yes'?'police verified':s.police==='No'?'not police verified':''].filter(Boolean).join(' · ')]):[['','None']]);
    if(steps().includes('vehicles')) card('Vehicles ('+d.vehicles.length+')','vehicles',(d.vehicles.length?d.vehicles.map(v=>[v.type||'Vehicle',[v.reg,v.model,v.slot].filter(Boolean).join(' · ')]):[['','None']]).concat(d.parking.length?[['Parking slots',d.parking.join(', ')]]:[]));
    card('Emergency contact','emergency',[['Name',d.emergency.name||'Not given'],['Relation',d.emergency.relation],['Mobile',d.emergency.mobile],['Address',d.emergency.address],['Remarks',d.remarks]]);
    const p=pendingDocs(d); if(p.length) card('Documents still to upload','you',p.map(x=>['Pending',x]));
  }

  async function submit(){
    const err=$('submit-err'); err.hidden=true;
    if(!$('agree').checked){ err.textContent='Please tick the declaration to submit.'; err.hidden=false; toast('err','Declaration not ticked',['Tick the declaration box above the Submit button.']); $('agree').focus(); return; }
    if(hasStaff()&&!$('dlconsent').checked){ err.textContent='Please confirm you have your staff\'s consent to share their ID and licence copies.'; err.hidden=false; toast('err','Staff consent not ticked',[err.textContent]); return; }
    const btn=$('next'); btn.disabled=true; $('back').disabled=true; btn.textContent='Submitting…';
    try{
      const d=collect(); d.pending=pendingDocs(d);
      let r;
      if(LIVE) r=await call('submitKyc',[d]);
      else r={ref:'VCHS-KYC-'+d.flat.replace('-','')+'-'+(d.mode==='tenant'?'T':'M')+' (preview)',updated:false};
      store.del('vkyc_draft_'+KEY);
      $('ref').textContent=r.ref;
      $('done-note').textContent=(r.pendingVerification?'':(r.updated?'Your earlier entry for this flat has been replaced with these details. ':'')+'')+(d.pending.length&&!r.pendingVerification?'Pending documents: '+d.pending.join(', ')+'. Please open the same link within 7 days to upload them. ':'')+(r.note||'The office will check these details against the register.');
      cur='done'; paint(); scrollTo(0,0);
    }catch(e){ err.textContent='Could not submit: '+e.message; err.hidden=false; toast('err','Submission failed',[e.message],0); btn.disabled=false; $('back').disabled=false; btn.textContent=tr('Submit KYC'); }
  }

  // ---------- link handling ----------
  async function openKey(k){
    let flat='', role='', hint='';
    if(LIVE){
      const r=await call('verifyKey',[k]); flat=String(r.flat||'').replace(/\D/g,''); role=r.role||''; hint=r.hint||'';
    } else {
      // Preview links: TEST<flat> opens as the owner, TEST<flat>T as the tenant.
      const m=k.match(/^TEST(\d{3,4})(T?)/i); flat=m?m[1]:''; role=m?(m[2]?'tenant':'owner'):'';
    }
    KEY=k; ROLE=role; UNLOCKED=false; TOKEN='';
    $('flat').value=flat; $('flat').readOnly=!!flat;
    if(role){ const el=document.querySelector('input[name=mode][value='+role+']'); el.checked=true; document.querySelectorAll('input[name=mode]').forEach(x=>{ x.closest('.card').hidden=x!==el; }); }
    applyMode();
    const hi=LANG==='hi';
    $('check-lead').textContent=hi?('आपकी सुरक्षा के लिए, फ्लैट B-'+flat+' के लिए सोसाइटी में रजिस्टर्ड मोबाइल नंबर डालें'+(role==='tenant'?' (वह नंबर जो फ्लैट मालिक ने आपके लिए दिया है)।':'।'))
      :('For your security, enter the mobile number registered with the Society for Flat B-'+flat+(role==='tenant'?' (the number the flat owner gave the Society for you).':'.'));
    $('vmob-hint').textContent=hint?(hi?'सोसाइटी के पास इस फ्लैट के लिए '+hint.replace(/ending /g,'अंत में ').replace(/ or /g,' या ')+' वाला नंबर है।':'The Society has a number '+hint+' for this flat.'):'';
    store.set('vkyc_key',k);
    return 'check';
  }
  /** After the mobile check: load what is allowed and go to the right step. */
  function afterUnlock(r, cc, num){
    TOKEN=r.token||''; VERIFIED=r.verified!==false; UNLOCKED=true;
    const saved=VERIFIED?(r.saved||null):null;
    let ld=null; try{ const local=store.get('vkyc_draft_'+KEY); ld=local?JSON.parse(local):null; }catch(e){}
    const sd=saved&&saved.draft;
    const pick=(ld&&(!sd||ld.at>sd.at))?ld:(sd||null);
    if(pick){ restore(pick); if(ROLE){ document.querySelector('input[name=mode][value='+ROLE+']').checked=true; applyMode(); } }
    if(!$('mob').value){ $('mob').value=num; $('mobcc').value=cc; }
    if(!VERIFIED){ $('saved-banner').textContent=tr('Your number is not on the Society\'s record for this flat. You can fill the form; the office will verify with the flat owner before updating the records.'); $('saved-banner').className='banner warnbanner'; $('saved-banner').hidden=false; }
    else if(saved&&saved.status==='SUBMITTED'){ $('saved-banner').textContent='This flat\'s KYC was submitted on '+saved.at+'. You can update it or upload pending documents; your new entry will replace the earlier one.'; $('saved-banner').hidden=false; }
    else if(pick){ $('saved-banner').textContent='Your saved entries have been loaded. Continue where you left off.'; $('saved-banner').hidden=false; }
    const c=pick&&pick.cur&&!['done','link','check'].includes(pick.cur)?pick.cur:'start';
    return steps().includes(c)?c:'start';
  }
  async function doUnlock(proceed){
    const p=elPhone('vmob'); ERR=[];
    if(!okPhone(p)){ bad('f-vmob',p.d?'This mobile number '+phoneWhy(p):'Enter your mobile number.'); toast('err','Check the mobile number',ERR); return; }
    const btn=$('next'), ub=$('unverified-btn'); btn.disabled=true; ub.disabled=true; $('check-err').hidden=true;
    try{
      const r=LIVE?await callRaw('unlock',[KEY,fmtPhone(p),!!proceed]):{ok:true,token:'',verified:!/^0/.test(p.d)};
      if(r.ok){ $('check-alt').hidden=true; cur=afterUnlock(r,ccOf($('vmob')),$('vmob').value); paint(); scrollTo(0,0); return; }
      $('check-err').textContent=r.msg+(r.attemptsLeft?' '+tr('Attempts left: ')+r.attemptsLeft+'.':'');
      $('check-err').hidden=false;
      $('check-alt').hidden=!r.mismatch;
      if(r.locked||r.expired){ $('vmob').disabled=true; btn.disabled=true; return; }
    }catch(e){ toast('err','Could not check the number',[e.message],0); }
    finally{ if(!$('vmob').disabled) btn.disabled=false; ub.disabled=false; }
  }
  $('unverified-btn').onclick=()=>doUnlock(true);


  $('next').onclick=async ()=>{
    if(cur==='link'){
      const k=keyFrom($('code').value);
      if(!k){ ERR=[]; bad('f-code'); toast('err','Code not valid',ERR); return; }
      const btn=$('next'); btn.disabled=true;
      try{ cur=await openKey(k); if(!steps().includes(cur)) cur='start'; paint(); scrollTo(0,0); }
      catch(e){ bad('f-code',e.message); toast('err','Could not open your KYC',[e.message],0); }
      finally{ btn.disabled=false; }
      return;
    }
    if(cur==='check') return doUnlock(false);
    if(cur==='review') return submit();
    if(!validate(cur)) return;
    const w=warnings(cur), sig=cur+'|'+w.join('|');
    if(w.length&&warnedSig!==sig){ warnedSig=sig; toast('warn','Please check before continuing',w,0); $('next').textContent=tr('Continue anyway'); return; }
    warnedSig=''; $('toasts').innerHTML='';
    const l=steps(); cur=l[l.indexOf(cur)+1];
    if(cur==='family'&&val('occ')==='self') addSelfRow();
    saveDraft(); paint(); scrollTo(0,0);
  };
  $('back').onclick=()=>{ warnedSig=''; $('toasts').innerHTML=''; const l=steps(), i=l.indexOf(cur); if(i>0){ cur=l[i-1]; saveDraft(); paint(); scrollTo(0,0); } };
  window.addEventListener('pagehide',saveDraft);
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') saveDraft(); });

  (async function init(){
    applyMode(); applyLang();
    if(/; wv\)|FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(navigator.userAgent)) $('inapp-banner').hidden=false;
    const k=keyFrom(location.href)||store.get('vkyc_key');
    if(qs.get('k')){ try{ history.replaceState(null,'',location.pathname); }catch(e){} }
    if(k){ try{ cur=await openKey(k); if(!steps().includes(cur)) cur='start'; }catch(e){ store.del('vkyc_key'); $('link-msg').textContent=e.message+' Please open the latest link sent by the Society.'; } }
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
