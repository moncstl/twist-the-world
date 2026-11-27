
/* 세상을비틀다 · 시장 레이더 — 정적 사이트 인터랙션. 외부 라이브러리 없음. */
(function () {
  'use strict';

  /* 1) 테마: 저장값 → 없으면 OS 설정 */
  var root = document.documentElement;
  var btn = document.getElementById('themeBtn');
  function paint(t) {
    root.setAttribute('data-theme', t);
    if (btn) btn.setAttribute('aria-label', t === 'dark' ? '라이트 테마로 전환' : '다크 테마로 전환');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#070b14' : '#f4f6fb');
  }
  var saved = null;
  try { saved = localStorage.getItem('mr-theme'); } catch (e) {}
  var mq = window.matchMedia('(prefers-color-scheme: light)');
  paint(saved || (mq.matches ? 'light' : 'dark'));
  if (btn) btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    paint(next);
    try { localStorage.setItem('mr-theme', next); } catch (e) {}
  });

  /* 2) 일정표 탭 */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  function selectTab(name) {
    tabs.forEach(function (t) {
      var on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      var on = p.id === 'tab-' + name;
      p.hidden = !on;
      p.classList.toggle('active', on);
    });
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { selectTab(t.dataset.tab); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var i = tabs.indexOf(t);
      var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); selectTab(n.dataset.tab);
    });
  });

  /* 3) 스크롤 등장 */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* 4) 상단·하단 내비 현재 섹션 표시 */
  var links = Array.prototype.slice.call(document.querySelectorAll('nav.nav a, .tabbar .tb'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = '#' + en.target.id;
        links.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* 5) 썸네일 로드 실패 시 그라데이션 카드로 대체 */
  document.querySelectorAll('.thumb img').forEach(function (img) {
    img.addEventListener('error', function () { img.classList.add('broken'); });
  });

  /* 6) PWA 서비스워커(http/https에서만 — file:// 미리보기에서는 건너뜀) */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
