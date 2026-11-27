
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

  /* 6) 크로스 점프 — 화면 안 링크는 부드럽게 이동하고 대상 카드를 1.5초 강조한다 */
  function jumpTo(id) {
    var el = document.getElementById(id);
    if (!el) return false;
    if (el.tagName === 'DETAILS') el.open = true;
    var top = el.getBoundingClientRect().top + window.pageYOffset - 72;
    try { window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); }
    catch (e) { window.scrollTo(0, Math.max(0, top)); }
    el.classList.remove('jump-hit');
    void el.offsetWidth;
    el.classList.add('jump-hit');
    clearTimeout(el._jt);
    el._jt = setTimeout(function () { el.classList.remove('jump-hit'); }, 1600);
    return true;
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.length < 2) return;
    if (!document.getElementById(href.slice(1))) return;
    e.preventDefault();
    jumpTo(href.slice(1));
    try { history.replaceState(null, '', href); } catch (err) {}
  });

  function openHash() {
    var h = (location.hash || '').replace('#', '');
    if (h) setTimeout(function () { jumpTo(h); }, 120);
  }
  openHash();
  window.addEventListener('hashchange', openHash);


  /* 8) 일정표 달력 / 목록 뷰 토글 */
  var viewBtns = Array.prototype.slice.call(document.querySelectorAll('.cal-v'));
  var calGrid = document.getElementById('calGrid');
  var calList = document.getElementById('calList');
  function setView(v) {
    viewBtns.forEach(function (b) {
      var on = b.dataset.view === v;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (calGrid) calGrid.hidden = (v !== 'grid');
    if (calList) calList.hidden = (v !== 'list');
  }
  viewBtns.forEach(function (b) {
    b.addEventListener('click', function () { setView(b.dataset.view); });
  });

  /* 9) 종목 1초 검색 · 요약 모달 · 달력 칸 상세 */
  var DATA = {};
  try { DATA = JSON.parse((document.getElementById('site-data') || {}).textContent || '{}'); } catch (e) { DATA = {}; }
  var IDX = DATA.search_index || [];
  var CAL = DATA.cal_days || [];
  var form = document.getElementById('searchForm');
  var input = document.getElementById('q');
  var box = document.getElementById('sres');
  var sBtn = document.getElementById('searchBtn');
  var modal = document.getElementById('stockModal');
  var smBody = document.getElementById('smBody');
  var smClose = document.getElementById('smClose');
  var lastFocus = null;
  var rows = [], cursor = -1;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cls(v) { return v == null ? 'flat' : (v > 0 ? 'up' : (v < 0 ? 'down' : 'flat')); }
  function pct(v) {
    if (v == null) return '';
    return (v > 0 ? '+' : (v < 0 ? '−' : '')) + Math.abs(v).toFixed(2) + '%';
  }
  function comma(v, d) {
    if (v == null) return '—';
    return Number(v).toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s\-_.·()]/g, ''); }
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  function isCho(q) { return /^[ㄱ-ㅎ]+$/.test(q); }
  function choOf(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xAC00 && c <= 0xD7A3) out += CHO.charAt(Math.floor((c - 0xAC00) / 588));
      else out += s.charAt(i).toLowerCase();
    }
    return out;
  }
  function scoreOf(e, q, qCho) {
    var n = norm(e.n), t = String(e.t || '').toLowerCase();
    if (t === q) return 100;
    if (n === q) return 96;
    if (t.indexOf(q) === 0) return 88;
    if (n.indexOf(q) === 0) return 82;
    if (n.indexOf(q) > -1) return 64;
    if (qCho && e.hs && e.hs.indexOf(qCho) === 0) return 58;
    if (q.length > 1 && qCho && e.hs && e.hs.indexOf(qCho) > -1) return 42;
    if (t.indexOf(q) > -1) return 30;
    return 0;
  }
  function search() {
    var raw = input.value.replace(/^\s+|\s+$/g, '');
    var q = norm(raw);
    cursor = -1;
    if (q.length < 1) { box.hidden = true; box.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); return; }
    var qCho = isCho(raw) ? raw : '';
    var hits = [];
    for (var i = 0; i < IDX.length; i++) {
      var s = scoreOf(IDX[i], q, qCho);
      if (s > 0) hits.push({ e: IDX[i], s: s + (IDX[i].a ? 2 : 0) - (IDX[i].m === 'ETF' ? 4 : 0) });
    }
    hits.sort(function (a, b) { return b.s - a.s; });
    hits = hits.slice(0, 8);
    rows = hits;
    if (!hits.length) {
      box.innerHTML = '<div class="sr-empty">‘' + esc(raw) + '’에 맞는 종목이 없습니다. 이름·초성·티커로 다시 입력해 보세요.</div>';
    } else {
      box.innerHTML = hits.map(function (h, i) {
        var e = h.e;
        var tags = [];
        if (e.pk) tags.push('타점');
        if (e.sh != null) tags.push('공매도');
        if (e.sq != null && e.sq >= 40) tags.push('물량잠김');
        var sub = e.m + (e.p != null ? ' · ' + comma(e.p, 0) : '');
        if (e.c != null) sub += ' · ' + pct(e.c);
        box_last = i;
        return '<div class="sr" role="option" data-i="' + i + '" aria-selected="false">'
          + '<span class="sr-main"><span class="sr-name">' + esc(e.n) + '<span class="code">' + esc(e.t) + '</span></span>'
          + '<span class="sr-sub">' + esc(sub) + (tags.length ? ' · ' + esc(tags.join(' · ')) : '') + '</span></span>'
          + '<span class="sr-act">'
          + (e.a ? '<button class="sr-go" type="button" data-act="jump">이동</button>' : '')
          + '<button class="sr-go sum" type="button" data-act="sum">요약</button>'
          + '</span></div>';
      }).join('');
    }
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  var box_last = -1;
  function jumpEntry(e) {
    if (e.a && document.getElementById(e.a)) {
      jumpTo(e.a);
      hideSearch();
      return;
    }
    openStock(e);
  }
  function hideSearch() {
    box.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    if (form) form.classList.remove('open');
  }

  if (input) {
    input.addEventListener('input', search);
    input.addEventListener('focus', function () { if (input.value) search(); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!rows.length) return;
        cursor = (cursor + (ev.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
        Array.prototype.forEach.call(box.querySelectorAll('.sr'), function (el, i) {
          el.classList.toggle('on', i === cursor);
          el.setAttribute('aria-selected', i === cursor ? 'true' : 'false');
        });
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        var pick = rows[cursor > -1 ? cursor : 0];
        if (pick) jumpEntry(pick.e);
      } else if (ev.key === 'Escape') {
        hideSearch();
        input.blur();
      }
    });
    if (form) form.addEventListener('submit', function (ev) { ev.preventDefault(); });
  }
  if (box) {
    box.addEventListener('click', function (ev) {
      var act = ev.target.getAttribute && ev.target.getAttribute('data-act');
      var row = ev.target.closest ? ev.target.closest('.sr') : null;
      if (!row) return;
      var e = rows[Number(row.getAttribute('data-i'))];
      if (!e) return;
      if (act === 'sum') { openStock(e.e); hideSearch(); return; }
      if (act === 'jump') { jumpTo(e.e.a); hideSearch(); return; }
      jumpEntry(e.e);
    });
  }
  if (sBtn && form) {
    sBtn.addEventListener('click', function () {
      form.classList.toggle('open');
      if (form.classList.contains('open') && input) input.focus();
    });
  }
  document.addEventListener('click', function (ev) {
    if (!form) return;
    if (form.contains(ev.target)) return;
    if (sBtn && (ev.target === sBtn || sBtn.contains(ev.target))) return;
    hideSearch();
  });
  document.addEventListener('keydown', function (ev) {
    var tag = (ev.target && ev.target.tagName) || '';
    if (ev.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !modalOpen()) {
      ev.preventDefault();
      if (form) form.classList.add('open');
      if (input) { input.focus(); input.select(); }
    }
    if (ev.key === 'Escape' && modalOpen()) closeModal();
  });

  /* 모달 */
  function modalOpen() { return modal && !modal.hidden; }
  function openModal(html) {
    if (!modal) return;
    lastFocus = document.activeElement;
    smBody.innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (smClose) smClose.focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    smBody.innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (smClose) smClose.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', function (ev) {
    var t = ev.target;
    if (t.getAttribute && t.getAttribute('data-close')) closeModal();
  });

  function cell(label, value, sub) {
    return '<div class="sm-cell"><span>' + esc(label) + '</span><b>' + value + '</b>'
      + (sub ? '<em>' + esc(sub) + '</em>' : '') + '</div>';
  }

  function openStock(e) {
    var head = '<div class="sm-head"><div><h3 id="smTitle">' + esc(e.n)
      + '<span class="code">' + esc(e.t) + '</span></h3>'
      + '<div class="sm-sub">' + esc(e.m) + (e.d ? ' · ' + esc(e.d) + ' 종가 기준' : ' (가격 정보 없음)') + '</div></div>'
      + '<div class="sm-px"><b>' + (e.p != null ? comma(e.p, 0) : '—') + '</b>'
      + '<span class="chg ' + cls(e.c) + '">' + pct(e.c) + '</span></div></div>';

    var cells = [];
    if (e.m === 'ETF') {
      if (e.div != null) cells.push(cell('분배율(TTM)', e.div.toFixed(2) + '%', '최근 1년'));
      if (e.ter != null) cells.push(cell('총보수', e.ter.toFixed(2) + '%', '연 기준'));
      if (!cells.length) cells.push(cell('구분', 'ETF', '구성은 ETF 2안 참고'));
    } else {
      if (e.fr != null) cells.push(cell('외인 지분율', e.fr.toFixed(2) + '%',
        e.frd != null ? '전일 ' + (e.frd > 0 ? '+' : '') + e.frd.toFixed(2) + 'p' : ''));
      if (e.fl != null) cells.push(cell('유통비율', e.fl.toFixed(1) + '%', '주요주주·자사주 제외'));
      if (e.sh != null) cells.push(cell('공매도 비중', e.sh.toFixed(2) + '%',
        e.shb != null ? '잔량 ' + e.shb.toFixed(2) + '%' : ''));
      if (e.sq != null) cells.push(cell('품절 점수', e.sq.toFixed(1), '유통물량 잠김 정도'));
      if (e.tn != null) cells.push(cell('회전율', e.tn.toFixed(1) + '%', '유통주식수 대비'));
      cells.push(cell('구분', esc(e.m), e.sec ? esc(e.sec) : ''));
    }
    var grid = cells.join('');

    var body = '';
    if (e.pk) {
      var p = e.pk;
      body += '<div class="sm-row"><span>선점 타점</span><div>#' + p.rank + ' · ' + esc(p.grade || '')
        + ' · ' + (p.sc != null ? p.sc.toFixed(1) + '점' : '')
        + '<br>1차 ' + comma(p.e1, 0) + ' · 목표 ' + comma(p.tgt, 0)
        + ' · 손절 ' + comma(p.stop, 0) + (p.rr ? ' · R:R ' + p.rr : '') + '</div></div>';
    }
    if (e.rs) body += '<div class="sm-row"><span>리서치</span><div>' + esc(e.rs) + '</div></div>';
    if (e.etf && e.etf.length) {
      body += '<div class="sm-row"><span>연관 ETF</span><div>'
        + e.etf.map(function (x) { return esc(x[1]) + ' <b>' + x[2].toFixed(2) + '%</b>'; }).join(' · ')
        + '</div></div>';
    }
    var links = '';
    if (e.pk) links += '<a class="sm-chip link" href="#pick-' + esc(e.t) + '" data-jump="1">타점 카드로</a>';
    if (document.getElementById('tl-' + e.t)) links += '<a class="sm-chip link" href="#tl-' + esc(e.t) + '" data-jump="1">타임라인</a>';
    if (document.getElementById('flow-st-' + e.t)) links += '<a class="sm-chip link" href="#flow-st-' + esc(e.t) + '" data-jump="1">수급 표로</a>';
    if (document.getElementById('sq-' + e.t)) links += '<a class="sm-chip link" href="#sq-' + esc(e.t) + '" data-jump="1">품절 표로</a>';
    if (e.m === 'ETF') links += '<a class="sm-chip link" href="#etf" data-jump="1">ETF 2안으로</a>';
    links += '<a class="sm-chip link" href="#scorecard" data-jump="1">성적표</a>';

    openModal(head + '<div class="sm-grid">' + grid + '</div>' + body
      + (links ? '<div class="sm-chips">' + links + '</div>' : '')
      + '<p class="sm-note">표시된 값은 기준일 종가·확정치입니다. 잠정치나 집계 지연 값은 기준일을 함께 적었습니다.</p>');
  }

  function openDay(i) {
    var d = CAL[i];
    if (!d) return;
    var head = '<div class="sm-head"><div><h3 id="smTitle">' + esc(d.md) + ' (' + esc(d.dow) + ')</h3>'
      + '<div class="sm-sub">' + (d.kind === 'past' ? '지난 결과' : (d.kind === 'future' ? '조건부 시나리오' : '예정 일정'))
      + '</div></div>'
      + (d.kind === 'past'
        ? '<div class="sm-px"><b>' + comma(d.close, 2) + '</b><span class="chg ' + cls(d.chg) + '">' + pct(d.chg) + '</span></div>'
        : '') + '</div>';
    var body = '';
    if (d.kind === 'past') {
      body += '<div class="sm-row"><span>당시 판정</span><div>' + esc(d.verdict || '—') + '</div></div>';
      if (d.driver) body += '<div class="sm-row"><span>그날 재료</span><div>' + esc(d.driver) + '</div></div>';
      if (d.scenario) body += '<div class="sm-row"><span>당시 시나리오</span><div>' + esc(d.scenario) + '</div></div>';
    }
    if (d.kind === 'future') {
      if (d.event_title) body += '<div class="sm-row"><span>이벤트</span><div>' + esc(d.event_title) + '</div></div>';
      var c = d.call || {}, p = d.put || {};
      body += '<div class="sm-row"><span>콜 조건</span><div>' + esc(c.cond || '—')
        + (c.target ? ' → 목표 ' + comma(c.target, 0) : '') + '</div></div>';
      body += '<div class="sm-row"><span>풋 조건</span><div>' + esc(p.cond || '—')
        + (p.target ? ' → 목표 ' + comma(p.target, 0) : '') + '</div></div>';
    }
    if ((d.macro || []).length) {
      body += '<div class="sm-row"><span>지표</span><div>'
        + d.macro.map(function (m) {
          var rng = (m.l != null && m.h != null) ? '예상 ' + m.l + '~' + m.h + ' · ' : '';
          return esc(m.n) + ' — ' + rng + '실제 ' + (m.a != null ? m.a : '—')
            + ' <b class="' + (m.hit ? 'up' : 'down') + '">' + (m.hit ? '범위 안' : '범위 밖') + '</b>';
        }).join('<br>') + '</div></div>';
    }
    if ((d.events || []).length) {
      body += '<div class="sm-row"><span>일정</span><div>'
        + d.events.map(function (e) { return esc((e.t ? e.t + ' ' : '') + e.n); }).join('<br>') + '</div></div>';
    }
    var chips = '';
    if (d.kind === 'past' && d.iso) chips += '<a class="sm-chip link" href="#cal-' + esc(d.iso) + '" data-jump="1">목록에서 보기</a>';
    if (d.kind === 'future' && d.iso) chips += '<a class="sm-chip link" href="#cf-' + esc(d.iso) + '" data-jump="1">조건 카드로</a>';
    chips += '<a class="sm-chip link" href="#scorecard" data-jump="1">성적표</a>';
    openModal(head + body + '<div class="sm-chips">' + chips + '</div>');
  }

  document.addEventListener('click', function (ev) {
    var c = ev.target.closest ? ev.target.closest('[data-cal]') : null;
    if (c) { openDay(Number(c.getAttribute('data-cal'))); return; }
    var j = ev.target.closest ? ev.target.closest('[data-jump]') : null;
    if (j) {
      ev.preventDefault();
      var href = j.getAttribute('href') || '';
      closeModal();
      if (href.length > 1) setTimeout(function () { jumpTo(href.slice(1)); }, 80);
    }
  });
  /* 달력에서 '목록 보기'로 갈 때 목록 뷰로 전환 */
  window.addEventListener('hashchange', function () {
    var h = location.hash || '';
    if (h.indexOf('#cal-') === 0 || h.indexOf('#cf-') === 0 || h === '#schedule') setView('list');
  });

  /* 7) PWA 서비스워커(http/https에서만 — file:// 미리보기에서는 건너뜀) */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
