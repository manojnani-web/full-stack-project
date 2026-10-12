const D=864e5,RATE=2,MAX=3,now=()=>Date.now();
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COL={Fiction:'#c2410c',Technology:'#2457d6',History:'#7c3aed',Biography:'#0f766e','Self-help':'#be185d'};
const seed=()=>({books:[
[1,'Wings of Fire','A.P.J. Abdul Kalam','Biography',3],[2,'The Alchemist','Paulo Coelho','Fiction',2],
[3,'Clean Code','Robert C. Martin','Technology',2],[4,'Introduction to Algorithms','Cormen et al.','Technology',1],
[5,'Sapiens','Yuval Noah Harari','History',2],[6,'The Guide','R.K. Narayan','Fiction',2],
[7,'Atomic Habits','James Clear','Self-help',3],[8,"You Don't Know JS",'Kyle Simpson','Technology',2],
[9,'Discovery of India','Jawaharlal Nehru','History',1],[10,'Malgudi Days','R.K. Narayan','Fiction',2]
].map(a=>({id:a[0],t:a[1],a:a[2],c:a[3],n:a[4],i:'LIB-'+String(1000+a[0])})),
loans:[
{id:1,u:'Demo Student',b:1,s:now()-20*D,d:now()-6*D,r:null},
{id:2,u:'Demo Student',b:3,s:now()-3*D,d:now()+11*D,r:null},
{id:3,u:'Ravi',b:7,s:now()-5*D,d:now()+9*D,r:null},
{id:4,u:'Ravi',b:2,s:now()-30*D,d:now()-16*D,r:now()-18*D},
{id:5,u:'Anu',b:7,s:now()-25*D,d:now()-11*D,r:now()-12*D},
{id:6,u:'Anu',b:3,s:now()-22*D,d:now()-8*D,r:now()-9*D},
{id:7,u:'Ravi',b:4,s:now()-2*D,d:now()+12*D,r:null}],
res:[],notes:[],nid:8,bid:11});
let S=null;try{S=JSON.parse(localStorage.getItem('shelfmark'))}catch(e){}
if(!S)S=seed();
const save=()=>{try{localStorage.setItem('shelfmark',JSON.stringify(S))}catch(e){}};
let me=null,tab='cat',q='',cat='All';
const act=b=>S.loans.filter(l=>l.b==b&&!l.r).length;
const av=b=>b.n-act(b.id);
const book=id=>S.books.find(b=>b.id==id);
const fine=l=>{const o=Math.ceil(((l.r||now())-l.d)/D);return o>0?o*RATE:0};
const dt=t=>new Date(t).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const status=l=>{if(l.r)return'Returned '+dt(l.r);const k=Math.ceil((l.d-now())/D);return k<0?`<span class="no">Overdue by ${-k} day${k<-1?'s':''}</span>`:k==0?'<span class="no">Due today</span>':`${k} day${k>1?'s':''} left`};
const mine=()=>S.loans.filter(l=>l.u==me.name&&!l.r);
function toast(m){const t=$('#toast');t.textContent=m;t.className='s';clearTimeout(toast.h);toast.h=setTimeout(()=>t.className='',2400)}
function login(){
$('#app').innerHTML=`<div class="login"><h1>Shelfmark</h1><p>Online library: search, borrow, reserve and track books.</p>
<input id="nm" value="Demo Student" aria-label="Your name" maxlength="30">
<button class="btn" onclick="enter(false)">Sign in as member</button>
<button class="btn o" onclick="enter(true)">Sign in as librarian</button>
<p style="font-size:12px">Demo login: no password needed. Data is saved in this browser.</p></div>`}
function enter(admin){const n=$('#nm').value.trim()||'Guest';me={name:admin?'Librarian':n,admin};tab='cat';draw()}
function draw(){
if(!me)return login();
const T=me.admin?[['cat','Catalog'],['loans','Loans'],['add','Add book'],['rep','Reports']]:[['cat','Catalog'],['my','My books']];
$('#app').innerHTML=`<header><b>Shelfmark</b><span>${esc(me.name)} · ${me.admin?'Librarian':'Member'} <button class="btn o" style="margin-left:8px;color:var(--bg);border-color:var(--bg)" onclick="me=null;draw()">Sign out</button></span></header>
<nav>${T.map(t=>`<button class="${t[0]==tab?'on':''}" onclick="tab='${t[0]}';draw()">${t[1]}</button>`).join('')}</nav><main id="m"></main>`;
({cat:vCat,my:vMy,loans:vLoans,add:vAdd,rep:vRep})[tab]();
if(tab=='cat')grid()}
function vCat(){
const cats=['All',...new Set(S.books.map(b=>b.c))];
$('#m').innerHTML=`<div class="bar"><input id="q" placeholder="Search by title, author or code" value="${esc(q)}" oninput="q=this.value;grid()" aria-label="Search books">
<select onchange="cat=this.value;grid()" aria-label="Category">${cats.map(c=>`<option ${c==cat?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="grid" id="g"></div>`}
function grid(){
const k=q.toLowerCase(),L=S.books.filter(b=>(cat=='All'||b.c==cat)&&(b.t+b.a+b.i).toLowerCase().includes(k));
$('#g').innerHTML=L.length?L.map(b=>{
const a=av(b),has=!me.admin&&S.loans.some(l=>l.b==b.id&&l.u==me.name&&!l.r),rs=S.res.some(r=>r.b==b.id&&r.u==me.name);
let btn='';
if(me.admin)btn=`<button class="btn r" onclick="del(${b.id})">Remove</button>`;
else if(has)btn='<button class="btn o" disabled>Borrowed</button>';
else if(a>0)btn=`<button class="btn" onclick="borrow(${b.id})">Borrow</button>`;
else btn=`<button class="btn o" ${rs?'disabled':''} onclick="reserve(${b.id})">${rs?'Reserved':'Reserve'}</button>`;
return`<div class="bk" style="--sp:${COL[b.c]||'var(--ac)'}"><h3>${esc(b.t)}</h3><small>${esc(b.a)} · ${esc(b.c)}</small><small>${esc(b.i)}</small>
<div class="row"><span class="${a?'ok':'no'}">${a?`${a} of ${b.n} available`:'All copies out'}</span>${btn}</div></div>`}).join(''):'<p>No books match your search. Try a different title or category.</p>'}
function borrow(id){
if(mine().length>=MAX)return toast(`Limit reached: you can borrow ${MAX} books at a time.`);
if(mine().some(l=>fine(l)>0))return toast('Return your overdue books before borrowing more.');
const b=book(id);if(av(b)<1)return;
S.loans.push({id:S.nid++,u:me.name,b:id,s:now(),d:now()+14*D,r:null});
S.res=S.res.filter(r=>!(r.b==id&&r.u==me.name));save();toast(`Borrowed. Due ${dt(now()+14*D)}.`);grid()}
function reserve(id){S.res.push({b:id,u:me.name,t:now()});save();toast('Reserved. We will notify you when a copy is free.');grid()}
function ret(id){
const l=S.loans.find(x=>x.id==id);l.r=now();const f=fine(l);
const nx=S.res.find(r=>r.b==l.b);
if(nx){S.notes.push({u:nx.u,m:`"${book(l.b).t}" is now available. Borrow it before someone else does.`});S.res.splice(S.res.indexOf(nx),1)}
save();toast(f?`Returned. Fine due: ₹${f}.`:'Returned. Thank you!');draw()}
function renew(id){const l=S.loans.find(x=>x.id==id);
if(l.rn)return toast('This book was already renewed once.');
if(l.d<now())return toast('Overdue books cannot be renewed.');
if(S.res.some(r=>r.b==l.b))return toast('Another member has reserved this book.');
l.d+=7*D;l.rn=1;save();toast('Renewed for 7 more days.');draw()}
function del(id){if(act(id))return toast('Cannot remove: copies are on loan.');S.books=S.books.filter(b=>b.id!=id);save();toast('Book removed.');grid()}
function vMy(){
const A=mine(),H=S.loans.filter(l=>l.u==me.name&&l.r).sort((a,b)=>b.r-a.r),N=S.notes.filter(n=>n.u==me.name);
const od=A.filter(l=>fine(l)>0),soon=A.filter(l=>l.d>=now()&&l.d-now()<=2*D);
$('#m').innerHTML=(od.length?`<div class="alert">Reminder: ${od.length} book${od.length>1?'s are':' is'} overdue. Fine so far: ₹${od.reduce((s,l)=>s+fine(l),0)} (₹${RATE} per day).</div>`:'')
+(soon.length?`<div class="note">Due within 2 days: ${soon.map(l=>esc(book(l.b).t)).join(', ')}.</div>`:'')
+N.map(n=>`<div class="note">${esc(n.m)}</div>`).join('')
+`<div class="panel"><h2>Currently borrowed (${A.length} of ${MAX})</h2>${A.length?A.map(l=>`<div class="li"><div><b class="t">${esc(book(l.b).t)}</b><br><small>Issued ${dt(l.s)} · Due ${dt(l.d)}</small></div><div>${status(l)}${fine(l)?` · Fine ₹${fine(l)}`:''}</div><div><button class="btn o" onclick="renew(${l.id})">Renew</button> <button class="btn" onclick="ret(${l.id})">Return</button></div></div>`).join(''):'<p>Nothing borrowed yet. Open the Catalog to find your next read.</p>'}</div>
<div class="panel"><h2>Reservations</h2>${S.res.filter(r=>r.u==me.name).map(r=>`<div class="li"><div>${esc(book(r.b).t)}</div><small>Waiting since ${dt(r.t)}</small></div>`).join('')||'<p>No active reservations.</p>'}</div>
<div class="panel"><h2>Borrowing history</h2>${H.length?H.map(l=>`<div class="li"><div>${esc(book(l.b).t)}</div><small>${dt(l.s)} to ${dt(l.r)}${fine(l)?` · Fine ₹${fine(l)}`:''}</small></div>`).join(''):'<p>No past loans yet.</p>'}</div>`}
function vLoans(){
const A=S.loans.filter(l=>!l.r).sort((a,b)=>a.d-b.d);
$('#m').innerHTML=`<div class="panel"><h2>Active loans (${A.length})</h2>${A.map(l=>`<div class="li"><div><b class="t">${esc(book(l.b).t)}</b><br><small>${esc(l.u)} · Due ${dt(l.d)}</small></div><div>${status(l)}${fine(l)?` · Fine ₹${fine(l)}`:''}</div><button class="btn" onclick="ret(${l.id})">Mark returned</button></div>`).join('')||'<p>No books are on loan.</p>'}</div>
<div class="panel"><h2>Reservation queue</h2>${S.res.map(r=>`<div class="li"><div>${esc(book(r.b).t)}</div><small>${esc(r.u)} · since ${dt(r.t)}</small></div>`).join('')||'<p>No reservations.</p>'}</div>`}
function vAdd(){
$('#m').innerHTML=`<div class="panel"><h2>Add a book</h2><div class="fm">
<label>Title<input id="at"></label><label>Author<input id="aa"></label>
<label>Category<input id="ac" list="cl" placeholder="e.g. Fiction"></label><datalist id="cl">${Object.keys(COL).map(c=>`<option>${c}`).join('')}</datalist>
<label>Copies<input id="an" type="number" min="1" value="1"></label>
<button class="btn" onclick="addBook()">Save book</button></div></div>`}
function addBook(){
const t=$('#at').value.trim(),a=$('#aa').value.trim(),c=$('#ac').value.trim()||'General',n=Math.max(1,+$('#an').value||1);
if(!t||!a)return toast('Enter both a title and an author.');
const id=S.bid++;S.books.push({id,t,a,c,n,i:'LIB-'+(1000+id)});save();toast('Book added to the catalog.');tab='cat';draw()}
function vRep(){
const A=S.loans.filter(l=>!l.r),O=A.filter(l=>fine(l)>0),cnt={};
S.loans.forEach(l=>cnt[l.b]=(cnt[l.b]||0)+1);
const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5);
const fines=S.loans.reduce((s,l)=>s+fine(l),0);
const st=(n,l)=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`;
$('#m').innerHTML=`<div class="stats">${st(S.books.length,'Titles')}${st(S.books.reduce((s,b)=>s+b.n,0),'Total copies')}${st(A.length,'On loan')}${st(O.length,'Overdue')}${st('₹'+fines,'Fines accrued')}${st(new Set(S.loans.map(l=>l.u)).size,'Active members')}</div>
<div class="panel"><h2>Most borrowed</h2>${top.map(([id,n])=>`<div class="li"><div>${esc(book(id).t)}</div><b>${n} loan${n>1?'s':''}</b></div>`).join('')}</div>
<div class="panel"><h2>Overdue list</h2>${O.map(l=>`<div class="li"><div>${esc(book(l.b).t)}<br><small>${esc(l.u)}</small></div><div>${status(l)}</div><b>₹${fine(l)}</b></div>`).join('')||'<p>No overdue books.</p>'}</div>
<button class="btn r" onclick="if(confirm('Reset all demo data?')){S=seed();save();draw()}">Reset demo data</button>`}
draw();
