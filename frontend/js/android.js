/* ===== Move Better – Android UI layer =====
   Original app.js / api.js ne touch karto nathi. Fakt bottom-nav + app-bar ni UI banave chhe
   ane original tab buttons ne click kari ne show() chalave chhe. */
(function () {
  'use strict';
  /* ---- CSS embedded: alag css file / path / cache ni jarur nathi ---- */
  (function(){
    var id='android-ui-css'; if(document.getElementById(id)) return;
    var st=document.createElement('style'); st.id=id; st.textContent="/* ===== Move Better \u2013 Android style layer =====\n   Sirf main app (html body.in-app) par lagu pade chhe. Login page ne koi asar nathi. */\n:root{--a-navy:#1B3A5C;--a-cyan:#3AAECC;--a-mid:#2A7FA8;--a-bg:#F3F7FA;--a-sf:#fff;--a-chip:#E8F6FA;--a-ln:#d5e0e8;--a-out:#cfd8de;--a-tx:#14212e;--a-tx2:#5b6b78;--a-nav:64px}\n\nhtml body.in-app{background:var(--a-bg);overscroll-behavior-y:none;-webkit-tap-highlight-color:transparent;\n  padding-bottom:calc(var(--a-nav) + env(safe-area-inset-bottom,0px));-webkit-text-size-adjust:100%}\n\n/* ---------- App bar ---------- */\nhtml body.in-app #app-section{max-width:none!important;width:100%!important;margin:0!important;border-radius:0!important;\n  box-shadow:none!important;border:0!important;overflow:visible!important;background:var(--a-bg)!important}\nhtml body.in-app .header{position:sticky;top:0;z-index:80;display:flex;align-items:center;gap:12px;\n  background:var(--a-navy)!important;color:#fff!important;border-radius:0!important;\n  padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 12px!important;box-shadow:0 2px 6px rgba(0,0,0,.25)}\nhtml body.in-app .logo-box{width:38px;height:38px;border-radius:10px;background:#fff;color:var(--a-navy);font-size:11px;\n  font-weight:700;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.1;flex-shrink:0}\nhtml body.in-app .header-info{flex:1;min-width:0}\nhtml body.in-app .header-info h1{font-size:12px!important;font-weight:400!important;opacity:.8;margin:0!important;color:#fff!important;\n  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\nhtml body.in-app .header-info p{display:none!important}\nhtml body.in-app #a-title{font-size:19px;font-weight:500;line-height:1.25;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\nhtml body.in-app #user-profile{display:none!important}\n#a-avatar{display:none;width:38px;height:38px;border-radius:50%;border:0;background:var(--a-cyan);color:#06222c;\n  font:inherit;font-size:15px;font-weight:600;cursor:pointer;flex-shrink:0}\nhtml body.in-app #a-avatar{display:block}\n\n/* original top tab bar hide (JS hajI use kare chhe, etle DOM ma rahe chhe) */\nhtml body.in-app .nav{display:none!important}\n\n/* ---------- Content ---------- */\nhtml body.in-app .content{max-width:760px;margin:0 auto!important;padding:14px 14px 20px!important;background:transparent!important}\nhtml body.in-app .section.active{animation:aIn .22s ease}\n@keyframes aIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}\nhtml body.in-app .section-title{font-size:13px!important;font-weight:500!important;text-transform:uppercase;letter-spacing:.4px;\n  color:var(--a-tx2)!important;margin:4px 2px 12px!important;border:0!important;padding:0!important}\n\nhtml body.in-app .card-white,html body.in-app .stat-card,html body.in-app .card{border-radius:18px!important;border:0!important;\n  box-shadow:0 1px 3px rgba(0,0,0,.1)!important;background:var(--a-sf)}\nhtml body.in-app .stat-card{padding:14px!important}\nhtml body.in-app .stat-num{color:var(--a-mid)!important;font-weight:500!important}\nhtml body.in-app .card-white{padding:16px!important}\nhtml body.in-app .msg{border-radius:14px!important}\nhtml body.in-app #dashboard-welcome{background:linear-gradient(135deg,var(--a-navy),var(--a-mid))!important;color:#fff!important;\n  border:0!important;border-radius:20px!important;padding:18px 16px!important;font-size:15px}\n\nhtml body.in-app .grid4{display:grid;grid-template-columns:1fr 1fr!important;gap:10px!important}\n@media(max-width:700px){\n  html body.in-app .grid2,html body.in-app .grid3{grid-template-columns:1fr!important;gap:12px!important}\n  html body.in-app .content table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}\n  html body.in-app #pt-panel,html body.in-app #view-panel,html body.in-app #trash-panel{width:100%!important;max-width:100%!important}\n}\n\n/* ---------- Form fields (Material style) ---------- */\nhtml body.in-app .content input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=hidden]),\nhtml body.in-app .content select,html body.in-app .content textarea{font-size:16px!important;min-height:48px;border-radius:12px!important;\n  border:1px solid var(--a-out)!important;padding:12px!important;background:#fff;color:var(--a-tx);box-sizing:border-box;outline:0}\nhtml body.in-app .content textarea{min-height:90px}\nhtml body.in-app .content input:focus,html body.in-app .content select:focus,html body.in-app .content textarea:focus{\n  border-color:var(--a-cyan)!important;box-shadow:0 0 0 1px var(--a-cyan)}\nhtml body.in-app .content label{font-size:13px;color:var(--a-tx2)}\nhtml body.in-app input[type=checkbox],html body.in-app input[type=radio],html body.in-app input[type=range]{accent-color:var(--a-cyan)}\nhtml body.in-app input[type=checkbox],html body.in-app input[type=radio]{width:20px;height:20px}\n\n/* ---------- Buttons ---------- */\nhtml body.in-app .btn,html body.in-app .btn-outline{border-radius:99px!important;min-height:46px;font-weight:500;font-size:14px}\nhtml body.in-app .btn-primary{background:var(--a-navy)!important;color:#fff!important;border-color:var(--a-navy)!important}\nhtml body.in-app .btn-outline{color:var(--a-mid)!important;border:1px solid var(--a-out)!important;background:transparent!important}\nhtml body.in-app button,html body.in-app .tab-btn,html body.in-app .b-filter-btn{transition:transform .12s,opacity .12s}\nhtml body.in-app button:active{opacity:.85;transform:scale(.98)}\nhtml body.in-app .b-filters{display:flex;gap:8px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px;-webkit-overflow-scrolling:touch}\nhtml body.in-app .b-filter-btn{border-radius:99px!important;white-space:nowrap;flex-shrink:0}\n\n/* ---------- Bottom navigation ---------- */\n#a-nav{display:none;position:fixed;left:0;right:0;bottom:0;z-index:90;box-sizing:border-box;\n  height:calc(var(--a-nav) + env(safe-area-inset-bottom,0px));padding-bottom:env(safe-area-inset-bottom,0px);\n  background:#fff;border-top:1px solid var(--a-ln)}\nhtml body.in-app #a-nav{display:flex}\n#a-nav button{flex:1;border:0;background:transparent;color:var(--a-tx2);font:inherit;font-size:11px;cursor:pointer;\n  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}\n#a-nav .ic{width:64px;height:30px;border-radius:99px;display:flex;align-items:center;justify-content:center;transition:background .2s}\n#a-nav svg{width:22px;height:22px;fill:currentColor}\n#a-nav button.on{color:var(--a-tx);font-weight:500}\n#a-nav button.on .ic{background:var(--a-chip);color:var(--a-mid)}\n\n/* ---------- \"More\" bottom sheet ---------- */\n#a-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s;z-index:200}\n#a-sheet{position:fixed;left:0;right:0;bottom:0;z-index:201;background:#fff;border-radius:24px 24px 0 0;\n  padding:8px 16px calc(16px + env(safe-area-inset-bottom,0px));transform:translateY(105%);\n  transition:transform .28s cubic-bezier(.2,.8,.2,1);max-width:760px;margin:0 auto}\n#a-bg.on{opacity:1;visibility:visible}#a-sheet.on{transform:none}\n#a-sheet .grab{width:36px;height:4px;border-radius:2px;background:var(--a-out);margin:4px auto 12px}\n#a-sheet .who{display:flex;align-items:center;gap:12px;padding:6px 4px 12px;border-bottom:1px solid var(--a-ln);margin-bottom:6px}\n#a-sheet .who .av{width:42px;height:42px;border-radius:50%;background:var(--a-navy);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:500}\n#a-sheet .who b{display:block;font-size:15px;font-weight:500;color:var(--a-tx)}#a-sheet .who span{font-size:12px;color:var(--a-tx2)}\n#a-sheet .it{display:flex;align-items:center;gap:14px;width:100%;border:0;background:transparent;font:inherit;font-size:15px;\n  color:var(--a-tx);padding:13px 6px;border-radius:12px;cursor:pointer;text-align:left}\n#a-sheet .it:active{background:var(--a-chip)}\n#a-sheet .it i{font-style:normal;width:40px;height:40px;border-radius:12px;background:var(--a-chip);display:flex;align-items:center;justify-content:center;font-size:19px}\n#a-sheet .it.on{color:var(--a-mid);font-weight:500}\n#a-sheet .it.out{color:#B3261E}#a-sheet .it.out i{background:#FDECEA}\n\n/* ---------- Floating items lift above bottom nav ---------- */\nhtml body.in-app #trash-fab,html body.in-app #floating-chat-container{bottom:calc(var(--a-nav) + 16px + env(safe-area-inset-bottom,0px))!important}\nhtml body.in-app #toast-container{top:auto!important;bottom:calc(var(--a-nav) + 12px + env(safe-area-inset-bottom,0px))!important;left:12px!important;right:12px!important}\n\n\n/* =====================================================================\n   v3: NO SIDE-SCROLL + mobile layout fixes\n   ===================================================================== */\nhtml,html body.in-app{max-width:100%;overflow-x:clip}\nhtml body.in-app #app-section,html body.in-app .content{max-width:100%;overflow-x:clip}\nhtml body.in-app .content *{box-sizing:border-box}\nhtml body.in-app .content input,html body.in-app .content select,html body.in-app .content textarea,\nhtml body.in-app .content img,html body.in-app .content canvas,html body.in-app .content .card-white{max-width:100%}\n\n@media(max-width:700px){\n  /* inline-style grids (1fr 1fr / 350px 1fr, bade gap vala) -> 1 column */\n  html body.in-app .content [style*=\"grid-template-columns\"]:not([style*=\"auto-fill\"]):not([style*=\"110px\"]):not([style*=\"gap:8px\"]):not([style*=\"gap: 8px\"]):not([style*=\"gap:10px\"]):not([style*=\"gap: 10px\"]):not([style*=\"gap:12px\"]):not([style*=\"gap: 12px\"]){\n    grid-template-columns:minmax(0,1fr)!important;gap:16px!important}\n  /* nana field pairs 2 column ma rahe, pan overflow na kare */\n  html body.in-app .content [style*=\"grid-template-columns\"]{min-width:0}\n  html body.in-app .content [style*=\"grid-template-columns\"]>*{min-width:0}\n  html body.in-app .content .assessment-container,html body.in-app .content .assessment-col{grid-template-columns:minmax(0,1fr)!important;gap:16px!important;min-width:0;width:100%}\n  /* flex rows wrap thay (column vala sivay) */\n  html body.in-app .content [style*=\"display:flex\"]:not([style*=\"column\"]),\n  html body.in-app .content [style*=\"display: flex\"]:not([style*=\"column\"]){flex-wrap:wrap}\n  html body.in-app .content [style*=\"width:200px\"]{width:100%!important}\n  html body.in-app .content [style*=\"min-height: 500px\"]{min-height:320px!important}\n  /* original mode-option cards (manual / audio) */\n  html body.in-app .mode-option-v2{flex:1 1 100%}\n  /* tables: nana, scroll fakt table ni andar */\n  html body.in-app .content table input,html body.in-app .content table select{min-height:38px!important;padding:8px!important;font-size:14px!important;min-width:64px}\n  html body.in-app .content th,html body.in-app .content td{padding:6px 4px!important;font-size:13px}\n}\n\n/* radio / checkbox : sacha size */\nhtml body.in-app .content input[type=radio],html body.in-app .content input[type=checkbox]{\n  width:20px!important;height:20px!important;min-height:0!important;padding:0!important;margin:0;flex-shrink:0;box-shadow:none!important}\nhtml body.in-app .radio-item,html body.in-app .check-item-mini,html body.in-app .check-item{display:flex!important;align-items:center;gap:10px;min-height:46px}\n\n/* =====================================================================\n   v3: Colours\n   ===================================================================== */\nhtml body.in-app .header{background:linear-gradient(135deg,#1B3A5C 0%,#2A7FA8 100%)!important}\nhtml body.in-app .section-title{position:relative;padding-left:12px!important;color:var(--a-navy)!important}\nhtml body.in-app .section-title:before{content:\"\";position:absolute;left:0;top:2px;bottom:2px;width:4px;border-radius:2px;background:var(--a-cyan)}\n/* dashboard stat cards: alag alag rang */\nhtml body.in-app .grid4 .stat-card{border-left:0!important;position:relative;overflow:hidden}\nhtml body.in-app .grid4 .stat-card:before{content:\"\";position:absolute;left:0;top:0;bottom:0;width:5px}\nhtml body.in-app .grid4 .stat-card:nth-child(1):before{background:#3AAECC}.grid4 .stat-card:nth-child(1) .stat-num{color:#2A7FA8!important}\nhtml body.in-app .grid4 .stat-card:nth-child(2):before{background:#F39C12}html body.in-app .grid4 .stat-card:nth-child(2) .stat-num{color:#D68910!important}\nhtml body.in-app .grid4 .stat-card:nth-child(3):before{background:#27AE60}html body.in-app .grid4 .stat-card:nth-child(3) .stat-num{color:#1E8449!important}\nhtml body.in-app .grid4 .stat-card:nth-child(4):before{background:#8E6CEF}html body.in-app .grid4 .stat-card:nth-child(4) .stat-num{color:#6C4FD1!important}\nhtml body.in-app .stat-lbl{color:var(--a-tx2)!important}\n/* primary button gradient */\nhtml body.in-app .btn-primary{background:linear-gradient(135deg,#1B3A5C,#2A7FA8)!important;border:0!important;box-shadow:0 2px 6px rgba(27,58,92,.3)}\nhtml body.in-app .btn-primary:disabled{background:#c5d0d8!important;box-shadow:none}\n/* card headings */\nhtml body.in-app .content h2,html body.in-app .content h3,html body.in-app .content h4{color:var(--a-navy)}\nhtml body.in-app .content label.as-step-indicator{color:var(--a-mid);font-weight:600}\nhtml body.in-app .as-step-indicator span{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--a-cyan);color:#fff;font-size:12px;margin-right:6px}\n/* selected options = cyan chip */\nhtml body.in-app .radio-item:has(input:checked),html body.in-app .check-item-mini:has(input:checked),html body.in-app .check-item:has(input:checked){\n  background:var(--a-chip)!important;border-color:var(--a-cyan)!important;color:var(--a-mid);font-weight:500}\nhtml body.in-app .radio-item,html body.in-app .check-item-mini,html body.in-app .check-item{border:1px solid var(--a-out);border-radius:12px;padding:8px 12px;background:#fff}\nhtml body.in-app .mode-option-v2{border-radius:16px!important}\nhtml body.in-app .mode-option-v2.active,html body.in-app .mode-option-v2.selected{border-color:var(--a-cyan)!important;background:var(--a-chip)!important}\nhtml body.in-app input[type=range]{accent-color:var(--a-cyan)}\nhtml body.in-app .assessment-header-banner{background:linear-gradient(135deg,rgba(58,174,204,.14),rgba(42,127,168,.08))!important;border:1px solid rgba(58,174,204,.35)!important;border-radius:16px!important}\nhtml body.in-app .b-filter-btn.active{background:var(--a-navy)!important;color:#fff!important;border-color:var(--a-navy)!important}\nhtml body.in-app .b-filter-btn{border:1px solid var(--a-out)!important;background:#fff}\nhtml body.in-app .m-stat{border-radius:12px;background:var(--a-chip)}\nhtml body.in-app .content input[type=range]{display:block;width:100%!important;min-height:0!important;padding:0!important;border:0!important;margin-top:10px}\n";
    (document.head||document.documentElement).appendChild(st);
    var meta=document.querySelector('meta[name=viewport]');
    if(meta && meta.content.indexOf('viewport-fit')<0) meta.content+=', viewport-fit=cover';
    window.__androidUI='v3 loaded';
  })();
  var PRIMARY = [
    { id: 'dashboard',   label: 'Home',    p: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
    { id: 'register',    label: 'Register',p: 'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
    { id: 'assessment',  label: 'Assess',  p: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' },
    { id: 'appointments',label: 'Bookings',p: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z' }
  ];
  var MORE = [
    { id: 'session-design', label: 'Session Design', ic: '🧩' },
    { id: 'treatment-plan', label: 'Treatment Plan', ic: '📝' },
    { id: 'exercise',       label: 'Exercises',      ic: '🏋️' },
    { id: 'progress',       label: 'Progress',       ic: '📈' },
    { id: 'admin',          label: 'Admin',          ic: '🛡️' }
  ];
  var TITLES = { dashboard: 'Dashboard', register: 'Patient Registration', assessment: 'Assessment',
    'session-design': 'Session Design', 'treatment-plan': 'Treatment Plan', exercise: 'Exercises',
    appointments: 'Appointments', progress: 'Progress', admin: 'Administration' };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function init() {
    var app = $('#app-section'); if (!app) return;
    var header = $('.header', app), info = $('.header-info', app);

    /* App-bar: current screen title + profile button */
    var title = document.createElement('div'); title.id = 'a-title'; title.textContent = 'Dashboard';
    if (info) info.appendChild(title);
    var av = document.createElement('button'); av.id = 'a-avatar'; av.setAttribute('aria-label', 'Menu');
    if (header) header.appendChild(av);

    /* Bottom nav */
    var nav = document.createElement('nav'); nav.id = 'a-nav';
    nav.innerHTML = PRIMARY.map(function (n) {
      return '<button data-go="' + n.id + '"><span class="ic"><svg viewBox="0 0 24 24"><path d="' + n.p + '"/></svg></span>' + n.label + '</button>';
    }).join('') +
      '<button data-more="1"><span class="ic"><svg viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg></span>More</button>';
    document.body.appendChild(nav);

    /* More sheet */
    var bg = document.createElement('div'); bg.id = 'a-bg';
    var sheet = document.createElement('div'); sheet.id = 'a-sheet';
    document.body.appendChild(bg); document.body.appendChild(sheet);

    function userName() { var e = $('#current-user-name'); return (e && e.textContent.trim()) || 'Clinic user'; }
    function initials() { return userName().replace(/^Dr\.?\s*/i, '').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() || 'MB'; }
    function adminVisible() { var a = $('#admin-nav-tab'); return !!a && getComputedStyle(a).display !== 'none'; }
    function activeId() { var s = $('#app-section .section.active'); return s ? s.id : 'dashboard'; }

    function buildSheet() {
      var cur = activeId();
      sheet.innerHTML = '<div class="grab"></div><div class="who"><div class="av">' + esc(initials()) + '</div><div><b>' +
        esc(userName()) + '</b><span>Move Better Physiotherapy</span></div></div>' +
        MORE.filter(function (m) { return m.id !== 'admin' || adminVisible(); }).map(function (m) {
          return '<button class="it' + (cur === m.id ? ' on' : '') + '" data-go="' + m.id + '"><i>' + m.ic + '</i>' + m.label + '</button>';
        }).join('') +
        '<button class="it out" data-logout="1"><i>⎋</i>Logout</button>';
    }
    function openSheet() { buildSheet(); bg.classList.add('on'); sheet.classList.add('on'); }
    function closeSheet() { bg.classList.remove('on'); sheet.classList.remove('on'); }
    function sheetOpen() { return sheet.classList.contains('on'); }

    /* Screen change = original tab button click (original show() chalse) */
    function go(id) {
      var btn = $$('#app-section .nav .nav-btn').filter(function (b) {
        return (b.getAttribute('onclick') || '').indexOf("'" + id + "'") > -1;
      })[0];
      if (btn) btn.click(); else if (typeof window.show === 'function') window.show(id, null);
      window.scrollTo(0, 0);
      setTimeout(sync, 30);
    }

    function sync() {
      var cur = activeId(), inPrimary = PRIMARY.some(function (n) { return n.id === cur; });
      $$('#a-nav button').forEach(function (b) {
        var on = b.dataset.more ? !inPrimary : b.dataset.go === cur;
        b.classList.toggle('on', on);
      });
      title.textContent = TITLES[cur] || 'Move Better';
      av.textContent = initials();
    }

    nav.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.more) openSheet(); else if (b.dataset.go) go(b.dataset.go);
    });
    sheet.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.logout) {
        closeSheet();
        var lo = $$('#user-profile div').filter(function (d) { return /logout/i.test(d.textContent) && d.getAttribute('onclick'); })[0];
        if (lo) lo.click(); else if (window.API && API.logout) API.logout();
      } else if (b.dataset.go) { closeSheet(); go(b.dataset.go); }
    });
    bg.addEventListener('click', closeSheet);
    av.addEventListener('click', openSheet);

    /* Login / app screen switch: bottom-nav sirf app ma dekhay */
    function syncShell() {
      var visible = getComputedStyle(app).display !== 'none';
      document.body.classList.toggle('in-app', visible);
      if (visible) sync();
    }
    new MutationObserver(function () { syncShell(); }).observe(app, { attributes: true, attributeFilter: ['style', 'class'] });
    var content = $('.content', app);
    if (content) new MutationObserver(sync).observe(content, { attributes: true, subtree: true, attributeFilter: ['class'] });
    setInterval(syncShell, 500); /* safety net */
    syncShell();

    /* Android back button (Capacitor) */
    var C = window.Capacitor, A = C && C.Plugins && C.Plugins.App;
    if (A && A.addListener) {
      A.addListener('backButton', function () {
        if (sheetOpen()) return closeSheet();
        var panel = $$('.pt-panel.open,.pt-panel.active,.view-overlay.open,.view-overlay.active,.view-overlay.show,#sched-overlay.open,#sched-overlay.active,#sched-overlay.show')[0];
        if (panel) { var ov = panel.classList.contains('pt-panel') ? $('#pt-overlay') : panel; if (ov) ov.click(); return; }
        if (activeId() !== 'dashboard' && getComputedStyle(app).display !== 'none') return go('dashboard');
        A.exitApp();
      });
    }
  }

  /* PDF download – Android WebView ma doc.save() chalatu nathi, etle Share/Save sheet vapariye */
  function patchPdf() {
    var C = window.Capacitor;
    if (!(C && C.isNativePlatform && C.isNativePlatform()) || !window.jspdf || !window.jspdf.jsPDF) return;
    var P = window.jspdf.jsPDF.prototype, orig = P.save;
    P.save = function (name) {
      var self = this, FS = C.Plugins.Filesystem, SH = C.Plugins.Share;
      if (!FS || !SH) return orig.apply(self, arguments);
      try {
        var file = (name || 'document.pdf'); if (!/\.pdf$/i.test(file)) file += '.pdf';
        var data = self.output('datauristring').split('base64,')[1];
        FS.writeFile({ path: file, data: data, directory: 'CACHE' })
          .then(function (r) { return SH.share({ title: file, url: r.uri, dialogTitle: 'Save / Share PDF' }); })
          .catch(function () { orig.call(self, name); });
      } catch (e) { orig.apply(self, arguments); }
    };
  }

  function boot() { init(); patchPdf(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
