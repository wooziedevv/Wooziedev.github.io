/* ================== DEMO BACKEND using localStorage ================== */

/* Utility: localStorage arrays */
function _get(key){ try{ return JSON.parse(localStorage.getItem(key)) || []; }catch(e){ return []; } }
function _set(key,val){ localStorage.setItem(key, JSON.stringify(val)); }

/* Seed admin user into "users" (if not exist) */
(function seed(){
  const users = _get('users');
  if(!users.find(u=>u.username==='wooziedev')){
    users.push({
      uid: 'admin-uid',
      username: 'wooziedev',
      email: 'admin@local',
      password: 'Ati1234', // demo only
      about: 'Site sahibi admin.',
      profileImg: '',
      instagram:'wooziedev',
      tiktok:'wooziedev',
      friends: []
    });
    _set('users', users);
  }
  if(!localStorage.getItem('products')) _set('products', []);
  if(!localStorage.getItem('events')) _set('events', []);
  if(!localStorage.getItem('notifications')) _set('notifications', []);
  if(!localStorage.getItem('globalChat')) _set('globalChat', []);
  if(!localStorage.getItem('feedback')) _set('feedback', []);
  if(!localStorage.getItem('dms')) localStorage.setItem('dms', JSON.stringify({}));
})();

/* Globals */
let currentUser = null;
let currentDMWith = null;

/* banned words */
const bannedWords = ["amk","aq","piç","orospu","sikerim","göt","yarak","sürtük","pedofil","sapık","sapkın"];

function escapeHtml(unsafe){
  if(unsafe===undefined || unsafe===null) return '';
  return String(unsafe)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ----------------- Auth: register / login / logout ----------------- */
function register(){
  const regUsername = document.getElementById('regUsername');
  if(!regUsername) return; // bu sayfada değil
  const username = regUsername.value.trim();
  const emailEl = document.getElementById('regEmail');
  const pwdEl = document.getElementById('regPassword');
  const email = emailEl.value.trim();
  const password = pwdEl.value;

  if(!username || !email || !password) return alert('Tüm alanları doldurun.');
  const low = username.toLowerCase();
  if(bannedWords.some(w=>low.includes(w))) return alert('Kullanıcı adı uygun değil (argo).');

  const users = _get('users');
  if(users.find(u=>u.username.toLowerCase()===username.toLowerCase())) return alert('Bu kullanıcı adı alınmış.');
  if(users.find(u=>u.email.toLowerCase()===email.toLowerCase())) return alert('Bu e-mail zaten kullanılmış.');

  const uid = 'u'+Date.now();
  users.push({ uid, username, email, password, about:'', profileImg:'', instagram:'', tiktok:'', friends:[] });
  _set('users', users);

  alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
  const loginEmail = document.getElementById('loginEmail');
  if(loginEmail) loginEmail.value = email;
}
window.register = register;

function login(){
  const emailEl = document.getElementById('loginEmail');
  const pwdEl = document.getElementById('loginPassword');
  if(!emailEl || !pwdEl) return;
  const email = emailEl.value.trim();
  const password = pwdEl.value;
  const users = _get('users');
  const user = users.find(u=>u.email.toLowerCase()===email.toLowerCase() && u.password===password);
  if(!user) return alert('E-mail veya şifre yanlış.');
  sessionStorage.setItem('currentUser', JSON.stringify(user));
  currentUser = user;
  refreshUI();
}
window.login = login;

function logout(){
  sessionStorage.removeItem('currentUser');
  currentUser = null;
  refreshUI();
  alert('Çıkış yapıldı.');
}
window.logout = logout;

/* Header + sayfa bazlı UI güncelle */
function refreshUI(){
  const cur = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
  currentUser = cur;

  // header’daki kullanıcı bilgisi
  const headerUser = document.getElementById('headerUser');
  if(headerUser){
    if(currentUser){
      headerUser.textContent = `Giriş yapan: ${currentUser.username}`;
    }else{
      headerUser.textContent = 'Giriş yapmadınız';
    }
  }

  // auth sayfasındaki kutular
  const userBox = document.getElementById('userBox');
  const regBox = document.getElementById('registerBox');
  const loginBox = document.getElementById('loginBox');
  if(currentUser){
    if(userBox) userBox.style.display = 'block';
    if(regBox) regBox.style.display = 'none';
    if(loginBox) loginBox.style.display = 'none';
    const ue = document.getElementById('userEmail');
    const un = document.getElementById('userName');
    if(ue) ue.textContent = currentUser.email;
    if(un) un.textContent = currentUser.username;
  }else{
    if(userBox) userBox.style.display = 'none';
    if(regBox) regBox.style.display = 'block';
    if(loginBox) loginBox.style.display = 'block';
  }

  // ana sayfadaki chat alanı
  const interactive = document.getElementById('interactiveArea');
  if(interactive){
    if(currentUser) interactive.style.display = 'block';
    else interactive.style.display = 'none';
  }
}

/* ----------------- Global chat: store in localStorage ----------------- */
function listenGlobalChat(){
  if(!document.getElementById('globalChat')) return;
  renderGlobalChat();
  window.addEventListener('storage', (e)=>{
    if(e.key === 'globalChat') renderGlobalChat();
  });
}
function renderGlobalChat(){
  const container = document.getElementById('globalChat');
  if(!container) return;
  const msgs = _get('globalChat');
  container.innerHTML = '';
  msgs.forEach(m=>{
    const d = document.createElement('div');
    d.className = 'msg';
    const time = m.createdAt ? new Date(m.createdAt).toLocaleString() : '';
    d.innerHTML =
      `<strong>${escapeHtml(m.senderName)}</strong> `+
      `<small style="color:#aaa">(${time})</small>`+
      `<div>${escapeHtml(m.text)}</div>`;
    container.appendChild(d);
  });
  container.scrollTop = container.scrollHeight;
}
function sendGlobalMsg(){
  if(!currentUser) return alert('Önce giriş yapın.');
  const inp = document.getElementById('globalMsg');
  if(!inp) return;
  const text = inp.value.trim();
  if(!text) return;
  const msgs = _get('globalChat');
  msgs.push({
    senderUid: currentUser.uid,
    senderEmail: currentUser.email,
    senderName: currentUser.username,
    text,
    createdAt: Date.now()
  });
  _set('globalChat', msgs);
  inp.value='';
  renderGlobalChat();
}
window.sendGlobalMsg = sendGlobalMsg;

/* ----------------- DM ve kullanıcı arama (sadece ana sayfada) ----------------- */
let searchTimeout = null;
function searchUsersDebounced(){
  if(searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(searchUsers, 300);
}
window.searchUsersDebounced = searchUsersDebounced;

function searchUsers(){
  const input = document.getElementById('searchUserInput');
  const list = document.getElementById('searchResults');
  if(!input || !list) return;
  const qv = input.value.trim().toLowerCase();
  list.innerHTML='';
  if(!qv) return;
  const users = _get('users').filter(u =>
    (u.username && u.username.toLowerCase().includes(qv)) ||
    (u.email && u.email.toLowerCase().includes(qv))
  );
  users.forEach(u=>{
    const li = document.createElement('li');
    li.textContent = `${u.username} — ${u.email}`;
    li.onclick = ()=>{ openDMWith(u.uid, u.username); };
    list.appendChild(li);
  });
}
function dmDocId(a,b){ return (a<b)? a+'_'+b : b+'_'+a; }
function openDMWith(uid, displayName){
  if(!currentUser) return alert('Önce giriş yapın.');
  if(uid === currentUser.uid) return alert('Kendinle DM olmaz.');
  currentDMWith = uid;
  const dmWith = document.getElementById('dmWith');
  if(dmWith) dmWith.textContent = displayName;
  renderDM();
}
window.openDMWith = openDMWith;

function renderDM(){
  const box = document.getElementById('dmBox');
  if(!box || !currentDMWith || !currentUser) return;
  box.innerHTML='';
  const dms = JSON.parse(localStorage.getItem('dms') || '{}');
  const id = dmDocId(currentUser.uid, currentDMWith);
  const msgs = dms[id] || [];
  msgs.forEach(m=>{
    const d = document.createElement('div');
    d.className='msg';
    d.innerHTML =
      `<strong>${escapeHtml(m.fromName)}</strong> `+
      `<small style="color:#aaa">${new Date(m.createdAt).toLocaleString()}</small>`+
      `<div>${escapeHtml(m.text)}</div>`;
    box.appendChild(d);
  });
  box.scrollTop = box.scrollHeight;
}
function sendDM(){
  if(!currentUser) return alert('Önce giriş yapın.');
  if(!currentDMWith) return alert('Bir kullanıcı seçin.');
  const inp = document.getElementById('dmMsg');
  if(!inp) return;
  const txt = inp.value.trim(); if(!txt) return;
  const dms = JSON.parse(localStorage.getItem('dms') || '{}');
  const id = dmDocId(currentUser.uid, currentDMWith);
  if(!dms[id]) dms[id]=[];
  dms[id].push({
    fromUid: currentUser.uid,
    fromName: currentUser.username,
    text: txt,
    createdAt: Date.now()
  });
  localStorage.setItem('dms', JSON.stringify(dms));
  inp.value='';
  renderDM();
  localStorage.setItem('dms_last_update', Date.now());
}
window.sendDM = sendDM;
window.addEventListener('storage',(e)=>{
  if(e.key === 'dms' || e.key === 'dms_last_update'){
    if(currentDMWith) renderDM();
  }
});

/* ----------------- Feedback (isteğe göre sayfaya ekleyebilirsin) ----------------- */
function sendFeedback(){
  const area = document.getElementById('feedbackText');
  if(!area) return;
  const text = area.value.trim();
  if(!text) return alert('Geri bildirim girin.');
  const arr = _get('feedback');
  arr.push({
    id:'f'+Date.now(),
    from: currentUser? currentUser.uid : null,
    email: currentUser? currentUser.email : null,
    text,
    createdAt: Date.now()
  });
  _set('feedback', arr);
  const status = document.getElementById('feedbackStatus');
  if(status) status.textContent = 'Teşekkürler! Mesajınız iletildi.';
  area.value='';
  renderAdminFeedback();
}
window.sendFeedback = sendFeedback;

/* ----------------- Products & Events (render) ----------------- */
function renderProducts(targetId){
  const out = document.getElementById(targetId || 'productList');
  if(!out) return;
  const p = _get('products');
  out.innerHTML = p.length
    ? p.map(item =>
        `<div><strong>${escapeHtml(item.name)}</strong>`+
        `<div>Fiyat: ${item.price} TL • Stok: ${item.stock}</div></div>`
      ).join('')
    : '<div style="color:#aaa">Ürün yok.</div>';
}
function renderEvents(targetId){
  const out = document.getElementById(targetId || 'scrimList');
  if(!out) return;
  const e = _get('events');
  out.innerHTML = e.length
    ? e.map(ev =>
        `<div><strong>${escapeHtml(ev.name)}</strong>`+
        `<div>${escapeHtml(ev.date)}</div>`+
        `<div>Kazanan: ${escapeHtml(ev.winner||'-')}</div></div>`
      ).join('')
    : '<div style="color:#aaa">Etkinlik yok.</div>';
}

/* ----------------- Notifications ----------------- */
function renderNotifications(targetId){
  const el = document.getElementById(targetId || 'notifList');
  if(!el) return;
  const n = _get('notifications');
  el.innerHTML = n.map(x =>
    `<div><strong>${escapeHtml(x.title)}</strong>`+
    `<div style="color:#ccc">${escapeHtml(x.body)}</div>`+
    `<small style="color:#777">${new Date(x.createdAt).toLocaleString()}</small></div>`
  ).join('');
  const bellCount = document.getElementById('notifCount');
  if(bellCount){
    const cnt = n.length;
    if(cnt>0){ bellCount.style.display='inline-block'; bellCount.textContent = cnt; }
    else bellCount.style.display='none';
  }
}

/* ----------------- Admin features ----------------- */
function adminAddProduct(){
  const nameEl = document.getElementById('productName');
  if(!nameEl) return;
  const name = nameEl.value.trim();
  const stock = Number(document.getElementById('productStock').value) || 0;
  const price = Number(document.getElementById('productPrice').value) || 0;
  if(!name) return alert('Ürün adı girin');
  const p = _get('products');
  p.push({ id:'p'+Date.now(), name, stock, price });
  _set('products', p);
  renderProducts('adminProductList');
  alert('Ürün eklendi (demo).');
  nameEl.value=''; document.getElementById('productStock').value=''; document.getElementById('productPrice').value='';
}
window.adminAddProduct = adminAddProduct;

function adminAddEvent(){
  const nameEl = document.getElementById('eventName');
  if(!nameEl) return;
  const name = nameEl.value.trim();
  const date = document.getElementById('eventDate').value.trim();
  if(!name) return alert('Etkinlik adı girin');
  const e = _get('events');
  e.push({ id:'e'+Date.now(), name, date, winner:null });
  _set('events', e);
  renderEvents('adminEventList');
  alert('Event eklendi');
  nameEl.value=''; document.getElementById('eventDate').value='';
}
window.adminAddEvent = adminAddEvent;

function adminSendNotif(){
  const titleEl = document.getElementById('notifTitle');
  const bodyEl = document.getElementById('notifBody');
  if(!titleEl || !bodyEl) return;
  const title = titleEl.value.trim();
  const body = bodyEl.value.trim();
  if(!title || !body) return alert('Başlık ve ileti girin');
  const n = _get('notifications');
  n.unshift({ id:'n'+Date.now(), title, body, createdAt: Date.now(), to:'all' });
  _set('notifications', n);
  renderNotifications('adminNotifList');
  alert('Bildirim gönderildi');
  titleEl.value=''; bodyEl.value='';
}
window.adminSendNotif = adminSendNotif;

function renderAdminUsers(){
  const el = document.getElementById('adminUsersList');
  if(!el) return;
  const users = _get('users');
  el.innerHTML = users.map(u =>
    `<div style="padding:6px;border-bottom:1px solid #222">`+
    `<strong>${escapeHtml(u.username)}</strong>`+
    `<div style="color:#aaa">${escapeHtml(u.email)}</div>`+
    `</div>`
  ).join('');
}
function renderAdminFeedback(){
  const el = document.getElementById('adminFeedbackList');
  if(!el) return;
  const fb = _get('feedback');
  el.innerHTML = fb.map(f =>
    `<div style="padding:6px;border-bottom:1px solid #222">`+
    `${escapeHtml(f.text)}<br>`+
    `<small style="color:#777">${new Date(f.createdAt).toLocaleString()}</small>`+
    `</div>`
  ).join('');
}

function openAdminModal(){
  const m = document.getElementById('adminModal');
  if(m){ m.style.display = 'flex'; const msg = document.getElementById('adminMsg'); if(msg) msg.textContent=''; }
}
window.openAdminModal = openAdminModal;
function closeAdminModal(){
  const m = document.getElementById('adminModal');
  if(m) m.style.display = 'none';
}
window.closeAdminModal = closeAdminModal;

function adminLogin(){
  const uEl = document.getElementById('adminUser');
  const pEl = document.getElementById('adminPass');
  if(!uEl || !pEl) return;
  const u = uEl.value.trim();
  const p = pEl.value;
  const msg = document.getElementById('adminMsg');
  if(u === 'wooziedev' && p === 'Ati1234'){
    localStorage.setItem('isAdmin', '1');
    closeAdminModal();
    alert('Admin girişi başarılı.');
    // admin sayfasında listeyi yenile
    renderAdminUsers();
    renderAdminFeedback();
    renderProducts('adminProductList');
    renderEvents('adminEventList');
    renderNotifications('adminNotifList');
  } else {
    if(msg) msg.textContent = 'Hatalı admin bilgileri';
  }
}
window.adminLogin = adminLogin;

/* ----------------- Settings helpers (dilersen sonraya bırak) ----------------- */
function resendVerification(){ alert('Demo: Doğrulama maili, backend bağlanınca çalışacak.'); }
window.resendVerification = resendVerification;
function sendPasswordReset(){
  const em = document.getElementById('pwdResetEmail');
  if(!em) return;
  if(!em.value.trim()) return alert('Email girin');
  alert('Demo: şifre sıfırlama maili, backend bağlanınca çalışacak.');
}
window.sendPasswordReset = sendPasswordReset;

/* ----------------- On load (sayfa algıla) ----------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  refreshUI();

  // ana sayfa
  if(document.getElementById('globalChat')){
    listenGlobalChat();
  }
  // ürün sayfası
  if(document.getElementById('productListPage')){
    renderProducts('productListPage');
  }
  // bildirim sayfası
  if(document.getElementById('notifListPage')){
    renderNotifications('notifListPage');
  }
  // admin sayfası
  if(document.getElementById('adminUsersList')){
    if(localStorage.getItem('isAdmin') === '1'){
      renderAdminUsers();
      renderAdminFeedback();
      renderProducts('adminProductList');
      renderEvents('adminEventList');
      renderNotifications('adminNotifList');
    }
  }
});