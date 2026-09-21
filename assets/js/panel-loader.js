/* ============================================================
   PANEL LOADER —— 兴趣爱好页点进各子面板时的加载页
   ------------------------------------------------------------
   样式走「锈湖」：暗青灰底 + 骨白细线 + 锈橙。
   版式：会眨眼的机器人头 ▸ 长方形框里一格一格填满的方块 ▸ loading...
   · 不用手动调用：脚本盯住下面 PANELS 里每个面板元素的 class，
     一旦加上 is-open（面板被打开）就弹加载页；
   · 进度 = 面板里真正落地的图片比例，到 80% 才放行淡出；
     一张图都没有的面板走「假装加载」，720ms 左右完成；
   · 兜底 7 秒：网再差也不会一直卡在加载页；
   · 影视档是 iframe，图在子页面里，load 事件后再补一轮采集
     （跨域时会抛错，已 try/catch，退化为假装加载）。
   对外口子：window.__zyPanelLoader.show({zh:'音乐',tag:'MUSIC'})
   ============================================================ */
(function(){
  'use strict';
  if (window.__zyPanelLoader) return;

  /* ---------- 面板清单：桌面端与移动端的 id 都列全 ---------- */
  var PANELS = {
    deck:  { zh:'音乐', tag:'MUSIC'   },
    mdeck: { zh:'音乐', tag:'MUSIC'   },
    clips: { zh:'剪辑', tag:'EDITING' },
    race:  { zh:'竞速', tag:'RACING'  },
    sport: { zh:'运动', tag:'SPORTS'  },
    film:  { zh:'影视', tag:'FILM ARCHIVE' }
  };

  var THRESHOLD = 0.8;    // 图片落地 80% 才放行
  var MIN_MS    = 900;    // 最短停留：图秒开（缓存/本地）时也要让人看清，不然只闪一下
  var MAX_MS    = 7000;   // 兜底
  var MAX_URLS  = 40;     // 一次最多盯 40 张图（影视档图多，全盯太吃带宽）
  var SEG_N     = 14;     // 长方形框里的方格数

  /* ============================================================
     样式 —— 锈湖配色：底 #0c1012 / 骨白 #e6e9e7 / 锈橙 #b4623a
     ============================================================ */
  var CSS = [
'.zyl{',
'  position:fixed;inset:0;z-index:200;',
'  display:flex;align-items:center;justify-content:center;',
'  background:#0c1012;overflow:hidden;',
'  opacity:0;visibility:hidden;pointer-events:none;',
'  /* 加载页盖住的是整屏，全站那枚机器人光标在这里反而碍事（还会跟着进度条晃），直接隐掉 */',
'  cursor:none;',
'  font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;',
'  -webkit-user-select:none;user-select:none;',
'  transition:opacity .4s cubic-bezier(.22,.75,.16,1),visibility 0s linear .4s;',
'}',
'.zyl.is-on{',
'  opacity:1;visibility:visible;pointer-events:auto;',
'  transition:opacity .2s ease,visibility 0s linear 0s;',
'}',
/* 背景：一点锈色雾 + 极淡的网格，不做霓虹 */
'.zyl__bg{',
'  position:absolute;inset:-10%;pointer-events:none;',
'  background:',
'    radial-gradient(46% 40% at 50% 42%,rgba(180,98,58,.10),transparent 72%),',
'    radial-gradient(70% 60% at 50% 120%,rgba(180,98,58,.05),transparent 70%),',
'    linear-gradient(transparent 96%,rgba(230,236,238,.028) 96%) 0 0/100% 28px,',
'    linear-gradient(90deg,transparent 96%,rgba(230,236,238,.028) 96%) 0 0/28px 100%;',
'}',
'.zyl__scan{',
'  position:absolute;inset:0;pointer-events:none;',
'  background:repeating-linear-gradient(180deg,rgba(230,236,238,.022) 0 1px,transparent 1px 3px);',
'}',
'.zyl__box{position:relative;display:flex;flex-direction:column;align-items:center;gap:0}',
/* 主行：机器人 ▸ 方格框 ▸ loading... */
'.zyl__row{display:flex;align-items:center;gap:14px}',
'.zyl__bot{flex:0 0 auto;display:block;line-height:0}',
'.zyl__bot svg{display:block;animation:zylbob 1.7s ease-in-out infinite}',
'.zyl__led{animation:zylpulse 1.6s ease-in-out infinite}',
'.zyl__eye{transform-box:fill-box;transform-origin:center;animation:zyleye 3.2s ease-in-out infinite}',
/* 长方形框 + 里面的方格 */
'.zyl__frame{',
'  flex:0 0 auto;display:grid;grid-template-columns:repeat(' + SEG_N + ',1fr);gap:2px;',
'  width:min(56vw,226px);padding:3px;',
'  border:1px solid rgba(230,236,238,.20);background:rgba(230,236,238,.02);',
'}',
'.zyl__frame i{width:100%;aspect-ratio:1/1;background:rgba(230,236,238,.07);',
'  transition:background .16s linear}',
'.zyl__frame i.on{background:#b4623a}',
'.zyl__frame i.tip{background:#d08a5c;box-shadow:0 0 7px rgba(180,98,58,.55)}',
/* 右侧 loading... */
'.zyl__txt{flex:0 0 auto;font-size:13px;letter-spacing:.16em;color:#c4cfd4;white-space:nowrap}',
'.zyl__txt i{font-style:normal;animation:zyldots 1.2s ease-in-out infinite}',
'.zyl__txt i:nth-child(2){animation-delay:.18s}',
'.zyl__txt i:nth-child(3){animation-delay:.36s}',
'.zyl.is-ready .zyl__txt{color:#d9b48f}',
/* 两行小字 */
'.zyl__st{margin-top:16px;font-size:9.5px;letter-spacing:.14em;color:#5d7178}',
'.zyl__zh{',
'  margin-top:7px;font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;',
'  font-size:11.5px;letter-spacing:.16em;color:#6d8188;',
'}',
/* 动画 */
'@keyframes zylbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}',
'@keyframes zylpulse{0%,100%{opacity:.35}50%{opacity:1}}',
'@keyframes zyleye{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}',
'@keyframes zylldots{0%,100%{opacity:.25}50%{opacity:1}}',
'@media (prefers-reduced-motion:reduce){.zyl *,.zyl{animation:none!important}}'
  ].join('\n');

  /* 会眨眼的机器人头 */
  var BOT_SVG = [
'<svg viewBox="0 0 36 36" width="38" height="38" aria-hidden="true">',
'  <path d="M18 7.5V3.4" stroke="#8a9498" stroke-width="1.2" stroke-linecap="round"/>',
'  <circle class="zyl__led" cx="18" cy="2.6" r="1.7" fill="#b4623a"/>',
'  <rect x="2.4" y="15.5" width="2.6" height="7" rx="1.3" fill="#c4cfd4" opacity=".5"/>',
'  <rect x="31" y="15.5" width="2.6" height="7" rx="1.3" fill="#c4cfd4" opacity=".5"/>',
'  <rect x="5" y="7" width="26" height="24" rx="6.5" fill="#161d1f" stroke="#c4cfd4" stroke-width="1.3"/>',
'  <rect class="zyl__eye" x="10.8" y="15.2" width="4.4" height="4.4" rx="1.3" fill="#b4623a"/>',
'  <rect class="zyl__eye" x="20.8" y="15.2" width="4.4" height="4.4" rx="1.3" fill="#b4623a"/>',
'  <path d="M13.2 24.6h9.6" stroke="#8a9498" stroke-width="1.2" stroke-linecap="round"/>',
'</svg>'
  ].join('');

  /* ============================================================
     DOM：整站只有一个加载页，重复打开复用
     ============================================================ */
  var box = null;
  function build(){
    if (box) return box;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    var el = document.createElement('div');
    el.className = 'zyl';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="zyl__bg"></div><div class="zyl__scan"></div>' +
      '<div class="zyl__box">' +
        '<div class="zyl__row">' +
          '<span class="zyl__bot">' + BOT_SVG + '</span>' +
          '<span class="zyl__frame" id="zylSeg"></span>' +
          '<span class="zyl__txt"><span id="zylWord">loading</span>' +
            '<i>.</i><i>.</i><i>.</i></span>' +
        '</div>' +
        '<div class="zyl__st" id="zylSt"></div>' +
        '<div class="zyl__zh" id="zylZh"></div>' +
      '</div>';
    document.body.appendChild(el);

    var seg = el.querySelector('#zylSeg'), segs = [], i, s;
    for (i = 0; i < SEG_N; i++){
      s = document.createElement('i');
      seg.appendChild(s);
      segs.push(s);
    }
    box = {
      el:   el,
      pct:  null,
      st:   el.querySelector('#zylSt'),
      word: el.querySelector('#zylWord'),
      zh:   el.querySelector('#zylZh'),
      segs: segs
    };
    return box;
  }

  /* ============================================================
     采集图片地址
     ============================================================ */
  function collect(root){
    var out = [], i, u, n;
    if (!root || !root.querySelectorAll) return out;
    var imgs = root.querySelectorAll('img');
    for (i = 0; i < imgs.length; i++){
      u = imgs[i].getAttribute('data-src') || imgs[i].getAttribute('src') || '';
      if (u && u.indexOf('data:') !== 0) out.push(u);
    }
    n = root.querySelectorAll('[data-src],[data-img],[data-cover]');
    for (i = 0; i < n.length; i++){
      if (n[i].tagName === 'IMG') continue;
      u = n[i].getAttribute('data-src') || n[i].getAttribute('data-img') ||
          n[i].getAttribute('data-cover') || '';
      if (u && u.indexOf('data:') !== 0) out.push(u);
    }
    return out;
  }

  var cur = null;   // 当前这次加载（全局只允许一个）

  function addUrls(st, list){
    var i, u;
    for (i = 0; i < list.length && st.urls.length < MAX_URLS; i++){
      u = list[i];
      if (!u || st.seen[u]) continue;
      st.seen[u] = 1;
      st.urls.push(u);
      var im = new Image();
      im.onload = im.onerror = function(){ st.done++; };
      im.src = u;
    }
  }

  /* ============================================================
     画一帧：方格一格一格点亮，最后一格亮一点当「笔尖」
     ============================================================ */
  function paint(st, b){
    var p = st.shown;
    if (p < 0) p = 0; if (p > 100) p = 100;
    var lit = Math.floor(p / 100 * SEG_N + 0.0001), i;
    if (lit > SEG_N) lit = SEG_N;
    for (i = 0; i < SEG_N; i++){
      b.segs[i].classList.toggle('on', i < lit);
      b.segs[i].classList.toggle('tip', i === lit - 1 && lit < SEG_N);
    }
    b.st.textContent = '// ASSETS ' + st.done + ' / ' + st.urls.length +
      ' · ' + Math.round(p) + '% · 80% 放行';
  }

  function hide(st, b){
    b = b || box;
    if (!b) return;
    b.el.classList.remove('is-on', 'is-ready');
    b.el.setAttribute('aria-hidden', 'true');
  }

  function tick(st, b){
    if (st.dead) return;
    var el = Date.now() - st.t0;
    st.pct = st.urls.length ? st.done / st.urls.length : Math.min(1, el / 900);

    if (st.finishing){
      st.shown = Math.min(100, st.shown + (100 - st.shown) * 0.34 + 1.1);
    } else {
      var target = Math.min(99, st.pct * 100);
      var ceil   = Math.min(99, target + 8);
      st.shown   = Math.min(ceil, st.shown + Math.max(0.3, (target - st.shown) * 0.2));
      if ((st.pct >= THRESHOLD && el >= MIN_MS) || el >= MAX_MS){
        st.finishing = true;
        b.el.classList.add('is-ready');
        b.word.textContent = 'ready';
      }
    }
    paint(st, b);

    if (st.finishing && st.shown >= 99.6){
      st.shown = 100;
      paint(st, b);
      window.setTimeout(function(){ if (cur === st) hide(st, b); }, 250);
      return;
    }
    requestAnimationFrame(function(){ tick(st, b); });
  }

  function show(cfg){
    var b = build();
    if (cur) cur.dead = true;
    var st = {
      id: cfg.id || '', cfg: cfg, urls: [], seen: {},
      done: 0, pct: 0, shown: 0, t0: Date.now(),
      finishing: false, dead: false
    };
    cur = st;
    b.el.classList.remove('is-ready');
    b.el.classList.add('is-on');
    b.el.setAttribute('aria-hidden', 'false');
    b.word.textContent = 'loading';
    b.zh.textContent = '正在装填「' + (cfg.zh || '') + '」';
    b.st.textContent = '// ASSETS 0 / 0 · 0% · 80% 放行';
    var i;
    for (i = 0; i < SEG_N; i++) b.segs[i].classList.remove('on', 'tip');
    tick(st, b);
    return st;
  }

  /* ============================================================
     面板打开 → 起加载页
     ============================================================ */
  function start(id, el){
    var cfg = PANELS[id];
    var st = show({ id: id, zh: cfg.zh, tag: cfg.tag });
    addUrls(st, collect(el));

    /* 有些面板是打开后才建 DOM（剪辑/竞速/运动），隔一会儿再补一轮 */
    window.setTimeout(function(){ if (!st.dead) addUrls(st, collect(el)); }, 700);

    var ifr = el.querySelector('iframe');
    if (!ifr) return;
    /* iframe 里的图要等子页面 load 完才存在；跨域读不到就退化成假装加载 */
    var grab = function(){
      if (!st.dead) { try { addUrls(st, collect(ifr.contentDocument)); } catch (e){} }
    };
    grab();
    if (!ifr.getAttribute('data-zyl-hook')){
      ifr.setAttribute('data-zyl-hook', '1');
      ifr.addEventListener('load', function(){
        if (cur) { try { addUrls(cur, collect(ifr.contentDocument)); } catch (e){} }
      });
    }
    window.setTimeout(grab, 1200);
    window.setTimeout(grab, 3000);
  }

  function watch(){
    if (!window.MutationObserver) return;
    Object.keys(PANELS).forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      new MutationObserver(function(){
        var on = el.classList.contains('is-open');
        if (on){
          if (!cur || cur.id !== id || cur.dead) start(id, el);
        } else if (cur && cur.id === id && !cur.dead){
          cur.dead = true;
          hide(cur);
        }
      }).observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }

  window.__zyPanelLoader = { show: show, hide: function(){ if (cur){ cur.dead = true; hide(cur); } } };
})();
