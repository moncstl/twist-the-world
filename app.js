
/* 세상을비틀다 · 시장 레이더 — 정적 사이트 인터랙션. 외부 라이브러리 없음. */
(function () {
  'use strict';

  /* 0) 오류 기록기 — 화면이 조용히 깨지지 않았는지 검증할 때 읽는다(콘솔 0건 확인용) */
  window.__errs = window.__errs || [];
  window.addEventListener('error', function (ev) {
    window.__errs.push(String((ev && ev.message) || (ev && ev.error) || 'error'));
  });
  window.addEventListener('unhandledrejection', function (ev) {
    window.__errs.push('promise: ' + String((ev && ev.reason) || 'rejected'));
  });

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
    // 2026-11-27: 종목·ETF는 상세페이지로, 상세 데이터가 없으면 요약 모달로
    if (e.m === 'ETF' && (DET.etfs || {})[e.t]) {
      hideSearch();
      location.hash = '#detail/etf/' + e.t;
      return;
    }
    if ((DET.stocks || {})[e.t]) {
      hideSearch();
      location.hash = '#detail/stock/' + e.t;
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
        e.sh5 != null ? '5일 ' + (e.sh5 > 0 ? '+' : '') + e.sh5.toFixed(2) + 'p' : (e.shb != null ? '잔량 ' + e.shb.toFixed(2) + '%' : '')));
      if (e.per != null) cells.push(cell('PER', e.per.toFixed(1) + '배',
        e.up != null ? '컨센 ' + (e.up > 0 ? '+' : '') + e.up.toFixed(0) + '%' : '공개 재무'));
      if (e.atr != null) cells.push(cell('20일 ATR', e.atr.toFixed(2) + '%', '변동성 기준'));
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
    if (e.m === 'ETF' && (DET.etfs || {})[e.t]) links += '<a class="sm-chip link" href="#detail/etf/' + esc(e.t) + '">ETF 상세페이지</a>';
    else if ((DET.stocks || {})[e.t]) links += '<a class="sm-chip link" href="#detail/stock/' + esc(e.t) + '">종목 상세페이지</a>';
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
          var rng = (m.l != null && m.h != null) ? '예상 ' + comma(m.l, Math.abs(m.l) >= 1000 ? 0 : 2)
            + '~' + comma(m.h, Math.abs(m.h) >= 1000 ? 0 : 2) + ' · ' : '';
          return esc(m.n) + ' — ' + rng + '실제 ' + (m.a != null ? comma(m.a, Math.abs(m.a) >= 1000 ? 0 : 2) : '—')
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

  /* 10) 🔍 지수·종목·ETF 상세페이지 (#detail/stock|etf|index/{code}) */
  var DET = DATA.details || {};
  var dRoot = document.getElementById('detailRoot');
  var dMain = document.getElementById('main');

  function won(v, d) {
    if (v == null || v === '') return '—';
    return Number(v).toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function pct2(v) {
    if (v == null) return '—';
    return (v > 0 ? '+' : (v < 0 ? '−' : '')) + Math.abs(v).toFixed(2) + '%';
  }
  function pp(v) {
    if (v == null) return '—';
    return (v > 0 ? '+' : (v < 0 ? '−' : '')) + Math.abs(v).toFixed(2) + 'p';
  }
  function eok(v) {
    if (v == null) return '—';
    var a = Math.abs(Number(v));
    var sign = v < 0 ? '−' : (v > 0 ? '+' : '');
    if (a >= 9999.5) {
      var jo = Math.floor(a / 10000);
      var rest = Math.round(a - jo * 10000);
      return sign + jo + '조' + (rest ? ' ' + rest.toLocaleString('ko-KR') + '억' : '');
    }
    return sign + Math.round(a).toLocaleString('ko-KR') + '억';
  }
  function sparkPath(closes, w, h) {
    if (!closes || closes.length < 2) return '';
    var mn = Math.min.apply(null, closes), mx = Math.max.apply(null, closes);
    var span = (mx - mn) || 1;
    var pts = closes.map(function (c, i) {
      var x = (i / (closes.length - 1)) * w;
      var y = h - ((c - mn) / span) * (h - 6) - 3;
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    return '<svg class="d-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">'
      + '<polyline points="' + pts.join(' ') + '" fill="none" stroke="currentColor" stroke-width="1.8" '
      + 'stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  function kv(label, value, sub) {
    return '<div><span>' + esc(label) + '</span><b>' + value + '</b>' + (sub ? '<em>' + esc(sub) + '</em>' : '') + '</div>';
  }
  function calcBox(entry, stop, atrPct, atrStop, note) {
    if (!entry || !stop) return '';
    return '<div class="poscalc" data-entry="' + entry + '" data-stop="' + stop + '" data-price="' + entry + '">'
      + '<div class="pc-head"><b>포지션 계산기</b><span>백테스트 기준 · 권유 아님</span></div>'
      + '<div class="pc-fields">'
      + '<label>총 투자금<input type="text" inputmode="numeric" class="pc-cap" value="10,000,000" aria-label="총 투자금"></label>'
      + '<label>1회 허용 손실<input type="number" step="0.1" min="0.1" max="10" class="pc-risk" value="0.5" aria-label="1회 허용 손실률">%</label>'
      + '</div>'
      + '<div class="pc-out" aria-live="polite"><span>매수 가능 수량 <b class="pc-qty">—</b></span>'
      + '<span>예상 손실 <b class="pc-loss">—</b></span><span>주문 금액 <b class="pc-amt">—</b></span>'
      + '<span>총 투자금 대비 <b class="pc-w">—</b></span></div>'
      + (atrPct ? '<span class="pc-note">20일 ATR ' + atrPct.toFixed(2) + '% · 변동성 기준 손절 참고폭 ' + pct2(atrStop) + '</span>' : '')
      + '<p class="pc-note">' + (note || ('기준 ' + won(entry) + '원 · 무효 ' + won(stop) + '원. 허용 손실을 넘지 않는 수량만 계산합니다(수수료·세금 제외).')) + '</p>'
      + '</div>';
  }

  function bindCalc(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.poscalc'), function (box) {
      var entry = Number(box.getAttribute('data-entry')) || 0;
      var stop = Number(box.getAttribute('data-stop')) || 0;
      var capEl = box.querySelector('.pc-cap');
      var riskEl = box.querySelector('.pc-risk');
      var qtyEl = box.querySelector('.pc-qty');
      var lossEl = box.querySelector('.pc-loss');
      var amtEl = box.querySelector('.pc-amt');
      var wEl = box.querySelector('.pc-w');
      function num(sel) {
        var raw = String(sel.value || '').replace(/[^\d.]/g, '');
        return Number(raw) || 0;
      }
      function run() {
        var cap = num(capEl);
        var riskPct = num(riskEl);
        if (!entry || !stop || stop >= entry || !cap || !riskPct) {
          qtyEl.textContent = '—'; lossEl.textContent = '—'; amtEl.textContent = '—'; wEl.textContent = '—';
          return;
        }
        var perShare = entry - stop;
        var budget = cap * riskPct / 100;
        var qtyByRisk = Math.floor(budget / perShare);
        var qtyByCap = Math.floor(cap / entry);
        var qty = Math.max(0, Math.min(qtyByRisk, qtyByCap));
        var loss = qty * perShare;
        var amt = qty * entry;
        qtyEl.textContent = qty.toLocaleString('ko-KR') + '주';
        lossEl.textContent = won(Math.round(loss)) + '원';
        amtEl.textContent = won(Math.round(amt)) + '원';
        wEl.textContent = cap ? ((amt / cap) * 100).toFixed(1) + '%' : '—';
        var lim = (qtyByRisk < qtyByCap) ? '손실 한도 기준' : '투자금 한도 기준';
        qtyEl.setAttribute('title', lim);
      }
      capEl.addEventListener('input', run);
      capEl.addEventListener('focus', function () { capEl.value = String(num(capEl) || ''); });
      capEl.addEventListener('blur', function () { capEl.value = won(num(capEl)); run(); });
      riskEl.addEventListener('input', run);
      run();
    });
  }

  function detailNotFound(kind, code) {
    return '<div class="wrap d-wrap"><div class="d-top"><button class="d-back" type="button" data-dback="1">← 돌아가기</button>'
      + '<div class="d-title"><h2>자료 없음<span class="code">' + esc(kind) + '/' + esc(code) + '</span></h2>'
      + '<div class="d-sub">이 항목의 상세 데이터가 아직 없습니다. 검색창에서 다른 종목을 찾아보세요.</div></div></div></div>';
  }

  function renderStock(d) {
    var h = '<div class="wrap d-wrap"><div class="d-top">'
      + '<button class="d-back" type="button" data-dback="1">← 돌아가기</button>'
      + '<div class="d-title"><h2>' + esc(d.n) + '<span class="code">' + esc(d.c) + '</span></h2>'
      + '<div class="d-sub">' + esc(d.m) + (d.sec ? ' · ' + esc(d.sec) : '') + (d.d ? ' · ' + esc(d.d) + ' 기준' : '') + '</div></div>'
      + '<div class="d-price"><b>' + (d.px != null ? won(d.px) : '—') + '</b>'
      + '<span class="' + cls(d.chg) + '">' + pct2(d.chg) + '</span></div></div>'
      + '<div class="d-grid">';

    /* 시세 */
    h += '<section class="card d-card"><h3>시세·등락 <em>최근 20거래일</em></h3>'
      + '<div class="' + cls(d.chg) + '">' + sparkPath(d.series || [], 320, 56) + '</div>'
      + '<div class="d-kv">'
      + kv('현재가', d.px != null ? won(d.px) + '원' : '—', d.d ? d.d + ' 종가' : '')
      + kv('전일 대비', '<span class="' + cls(d.chg) + '">' + pct2(d.chg) + '</span>', '')
      + kv('52주 밴드', (d.fund && d.fund.low52 ? won(d.fund.low52) + '~' + won(d.fund.high52) : '—'), '')
      + '</div>'
      + '<p class="d-hint">' + (function () {
          var s2 = d.series || [];
          if (s2.length < 2) return '최근 20거래일 종가 흐름입니다.';
          var mn = Math.min.apply(null, s2), mx = Math.max.apply(null, s2);
          return '최근 ' + s2.length + '거래일 종가 흐름 — 최저 ' + won(mn) + '원 · 최고 ' + won(mx) + '원';
        })() + '</p></section>';

    /* 펀더멘털 */
    var f = d.fund;
    if (f) {
      h += '<section class="card d-card"><h3>펀더멘털 <em>공개 재무·컨센서스 ' + esc(f.date || '') + '</em></h3><div class="d-kv">'
        + kv('PER', f.per != null ? f.per.toFixed(1) + '배' : '—', f.cns_per != null ? '추정 ' + f.cns_per.toFixed(1) + '배' : '')
        + kv('PBR', f.pbr != null ? f.pbr.toFixed(2) + '배' : '—', f.bps != null ? 'BPS ' + won(f.bps) : '')
        + kv('ROE', f.roe_annual != null ? f.roe_annual.toFixed(1) + '%' : (f.roe != null ? f.roe.toFixed(1) + '%' : '—'), '연환산')
        + kv('배당수익률', f.div_yield != null ? f.div_yield.toFixed(2) + '%' : '—', f.dps != null ? 'DPS ' + won(f.dps) + '원' : '')
        + kv('컨센서스 목표', f.target != null ? won(f.target) + '원' : '—', f.upside != null ? pct2(f.upside) : '')
        + kv('투자의견', f.rec_mean != null ? f.rec_mean.toFixed(1) + ' / 5' : '—', '5=매수 우위')
        + kv('영업이익(당기)', f.op_annual != null ? won(f.op_annual) + '억' : '—', f.op_annual_yoy != null ? pct2(f.op_annual_yoy) + ' YoY' : '')
        + kv('영업이익(분기)', f.op_q != null ? won(f.op_q) + '억' : '—', f.op_q_qoq != null ? pct2(f.op_q_qoq) + ' QoQ' : '')
        + kv('실적 모멘텀', f.momentum != null ? f.momentum.toFixed(0) + '점' : '—', f.fiscal_a || '')
        + '</div></section>';
    }

    /* ATR · 포지션 계산기 */
    var a = d.atr;
    h += '<section class="card d-card wide"><h3>20일 ATR · 포지션 계산기 <em>변동성 기준</em></h3>';
    if (a) {
      h += '<div class="d-kv">'
        + kv('ATR20', a.atr20 != null ? won(a.atr20) + '원' : '—', a.atr_pct != null ? a.atr_pct.toFixed(2) + '%' : '')
        + kv('변동성 국면', a.regime || '—', a.rank20 != null ? '20일 백분위 ' + a.rank20.toFixed(0) : '')
        + kv('손절 참고밴드', a.stop_band != null ? won(a.stop_band) : '—', a.stop_dist != null ? pct2(a.stop_dist) + ' (1.5×ATR)' : '')
        + kv('목표 참고밴드', a.target_band != null ? won(a.target_band) : '—', a.target_dist != null ? pct2(a.target_dist) + ' (2.5×ATR)' : '')
        + kv('손익비', a.rr != null ? a.rr.toFixed(2) : '—', '밴드 기준')
        + kv('산출 근거', a.bars != null ? a.bars + '봉' : '—', a.date || '')
        + '</div>';
    } else {
      h += '<p class="d-hint">ATR 데이터가 아직 없습니다.</p>';
    }
    var plan = d.plan || {};
    h += calcBox(plan.entry || d.px, plan.stop || (a && a.stop_band), a && a.atr_pct, a && a.stop_dist,
      d.pick ? ('타점 카드 기준 · 1차 관찰 ' + won(plan.entry) + '원 · 무효 ' + won(plan.stop) + '원') : '')
      + '</section>';

    /* 수급·유통비율 */
    var fl = d.float || {}, fm = d.fm || {}, sh = d.sh || {};
    h += '<section class="card d-card"><h3>수급 · 유통비율 <em>공개 지분 기준</em></h3><div class="d-kv">'
      + kv('외인 지분율', fm.fr != null ? fm.fr.toFixed(2) + '%' : '—', fm.frd != null ? pp(fm.frd) + ' 전일' : '')
      + kv('유통비율', fl.float != null ? fl.float.toFixed(1) + '%' : '—',
           fl.float != null ? '주요주주·자사주 제외' : '공개 지분 없음')
      + kv('내부자·주요주주', fl.insider != null ? fl.insider.toFixed(1) + '%' : '—', fl.disclosed != null ? '공개 지분 ' + fl.disclosed.toFixed(1) + '%' : '')
      + kv('회전율', fm.turn != null ? fm.turn.toFixed(1) + '%' : '—',
           fm.turn != null ? '유통주식수 대비' : '수급 집계 전')
      + kv('품절 점수', fm.sq != null ? fm.sq.toFixed(1) : '—', '유통물량 잠김 정도')
      + kv('상장주식수', fl.shares != null ? won(fl.shares) + '주' : '—', '')
      + '</div></section>';

    /* 공매도 5/20일 */
    h += '<section class="card d-card"><h3>공매도 5·20일 추이 <em>' + esc(sh.date || '') + ' 기준</em></h3>'
      + '<div class="d-kv">'
      + kv('공매도 비중', sh.ratio != null ? sh.ratio.toFixed(2) + '%' : '—', '거래량 기준')
      + kv('5일 변화', '<span class="' + cls(sh.chg5) + '">' + pp(sh.chg5) + '</span>', '비중 증감')
      + kv('20일 변화', '<span class="' + cls(sh.chg20) + '">' + pp(sh.chg20) + '</span>', '비중 증감')
      + kv('잔량 5일', sh.balance5 != null ? pct2(sh.balance5) : '—', '집계 ' + (sh.lag != null ? sh.lag + '일 지연' : '—'))
      + kv('신호', ({ STRONG_PRESSURE: '압력 강화', PRESSURE: '압력', COVER: '숏커버', STRONG_COVER: '숏커버 강함', NEUTRAL: '중립' })[sh.signal] || '—', '')
      + kv('현재 비중 순위', sh.rank20 != null ? sh.rank20.toFixed(0) + ' 백분위' : '—', '최근 20관측 중')
      + '</div><p class="d-hint">비중이 줄면 숏커버(매수 여력), 늘면 공매도 압력으로 읽습니다. 잔량은 공개분·2~3거래일 지연입니다.</p></section>';

    /* 타임라인 */
    var tl = (DATA.timelines || {})[d.c];
    if (tl && (tl.points || []).length) {
      h += '<section class="card d-card wide"><h3>변곡점 타임라인 <em>' + esc(tl.start || '') + ' ~ ' + esc(tl.end || '') + '</em></h3>'
        + '<table class="d-tbl"><thead><tr><th>날짜</th><th>등락</th><th>구분</th><th>같은 날 재료</th></tr></thead><tbody>';
      (tl.points || []).forEach(function (pt) {
        h += '<tr><td>' + esc(pt.date) + '</td><td class="num ' + cls(pt.chg) + '">' + pct2(pt.chg) + '</td>'
          + '<td>' + esc(pt.kind) + '</td><td>' + esc((pt.cause || {}).text || '') + '</td></tr>';
      });
      h += '</tbody></table>';
      if ((tl.common || []).length) {
        h += '<div class="d-hint">같은 기간 글로벌 이벤트(발표 시차 보정 · 다음 한국 거래일 기준): '
          + (tl.common || []).map(function (c) { return esc(c.date + ' ' + c.label); }).join(' / ') + '</div>';
      }
      if ((tl.future || []).length) {
        h += '<div class="d-hint">다가오는 일정: '
          + (tl.future || []).map(function (e) { return esc(e.date + ' ' + (e.time || '') + ' ' + e.name); }).join(' / ') + '</div>';
      }
      h += '</section>';
    }

    /* 연관 ETF */
    if ((d.etfs || []).length) {
      h += '<section class="card d-card wide"><h3>연관 ETF <em>구성 비중 상위</em></h3><div class="d-chips">';
      d.etfs.forEach(function (e) {
        h += '<a class="d-chip" href="#detail/etf/' + esc(e[0]) + '"><b>' + esc(e[1]) + '</b>'
          + '<span>' + (e[2] != null ? e[2].toFixed(2) + '%' : '') + '</span>'
          + (e[3] ? '<em class="' + cls(e[3]) + '">' + pp(e[3]) + '</em>' : '') + '</a>';
      });
      h += '</div></section>';
    }
    h += '</div></div>';
    return h;
  }

  function renderEtf(d) {
    var h = '<div class="wrap d-wrap"><div class="d-top">'
      + '<button class="d-back" type="button" data-dback="1">← 돌아가기</button>'
      + '<div class="d-title"><h2>' + esc(d.n) + '<span class="code">' + esc(d.c) + '</span></h2>'
      + '<div class="d-sub">ETF · ' + esc(d.issuer || '') + (d.d ? ' · ' + esc(d.d) + ' 기준' : '') + '</div></div>'
      + '<div class="d-price"><b>' + (d.px != null ? won(d.px) : '—') + '</b>'
      + '<span class="' + cls(d.chg) + '">' + pct2(d.chg) + '</span></div></div><div class="d-grid">';

    h += '<section class="card d-card"><h3>시세 · NAV <em>괴리율 포함</em></h3><div class="d-kv">'
      + kv('현재가', d.px != null ? won(d.px) + '원' : '—', '')
      + kv('NAV', (d.nav || d.inav) != null ? won(d.nav || d.inav) : '—', d.inav && d.nav && d.inav !== d.nav ? 'iNAV ' + won(d.inav) : '')
      + kv('괴리율', d.dev != null ? pct2(d.dev) : '—', '동시호가 iNAV 대비')
      + kv('거래대금', d.val != null ? won(d.val) + '억' : '—', '당일')
      + kv('순자산', d.aum != null ? won(d.aum) + '억' : '—', '')
      + kv('구성종목', d.holdings != null ? d.holdings + '종' : '—', d.top10 != null ? '상위10 ' + d.top10.toFixed(1) + '%' : '')
      + '</div></section>';

    h += '<section class="card d-card"><h3>수익률 · 비용 · 분배</h3><div class="d-kv">'
      + kv('1개월', '<span class="' + cls(d.r1m) + '">' + pct2(d.r1m) + '</span>', '')
      + kv('3개월', '<span class="' + cls(d.r3m) + '">' + pct2(d.r3m) + '</span>', '')
      + kv('1년', '<span class="' + cls(d.r1y) + '">' + pct2(d.r1y) + '</span>', '')
      + kv('총보수', d.ter != null ? d.ter.toFixed(2) + '%' : '—', '연 기준')
      + kv('분배율(TTM)', d.div != null ? d.div.toFixed(2) + '%' : '—', d.cycle || '')
      + kv('최근 분배금', d.last_div != null ? won(d.last_div) + '원' : '—', d.ex_date ? '배당락 ' + d.ex_date : '')
      + '</div><p class="d-hint">분배율이 높아도 그만큼 주가가 빠지면 남는 수익이 없습니다. 위 1·3개월 수익률과 함께 보세요.
        NAV는 기준일이 하루 전일 수 있어, 현재가와 NAV의 차이는 괴리율이 아닙니다(괴리율은 iNAV 기준).</p></section>';

    var tops = d.tops || [];
    h += '<section class="card d-card wide"><h3>구성종목 TOP 10 <em>비중 · 전일비 변동</em></h3>';
    if (tops.length) {
      h += '<table class="d-tbl"><thead><tr><th>#</th><th>종목</th><th>비중</th><th>전일비</th><th>현재가</th><th>등락</th></tr></thead><tbody>';
      tops.slice(0, 10).forEach(function (t, i) {
        h += '<tr><td>' + (i + 1) + '</td>'
          + '<td>' + (t.c ? '<a class="row-link" href="#detail/stock/' + esc(t.c) + '">' + esc(t.n) + '</a>' : esc(t.n)) + '</td>'
          + '<td class="num">' + (t.w != null ? t.w.toFixed(2) + '%' : '—') + '</td>'
          + '<td class="num ' + cls(t.d) + '">' + (t.d ? pp(t.d) : '—') + '</td>'
          + '<td class="num">' + (t.px != null ? won(t.px) : '—') + '</td>'
          + '<td class="num ' + cls(t.chg) + '">' + pct2(t.chg) + '</td></tr>';
      });
      h += '</tbody></table>';
    } else {
      h += '<p class="d-hint">구성종목 스냅샷이 없습니다.</p>';
    }
    h += '</section>';

    if ((d.sectors || []).length) {
      h += '<section class="card d-card wide"><h3>연관 섹터 흐름 <em>' + esc(d.flow_date || '') + '</em></h3><div class="d-chips">';
      d.sectors.forEach(function (x) {
        h += '<a class="d-chip" href="#sectors"><b>' + esc(x.n) + '</b>'
          + (x.chg != null ? '<span class="' + cls(x.chg) + '">' + pct2(x.chg) + '</span>' : '')
          + (x.score != null ? '<em>자금점수 ' + x.score.toFixed(0) + '</em>' : '') + picta(x.state) + '</a>';
      });
      h += '</div><p class="d-hint">이 ETF가 담는 업종의 당일 자금 흐름입니다. 칩을 누르면 섹터 레이더로 이동합니다.</p></section>';
    }
    h += '</div></div>';
    return h;
  }

  function picta(state) {
    return state ? '<em>' + esc(state) + '</em>' : '';
  }

  function renderIndex(d) {
    var up = d.up || 0, dn = d.down || 0, tot = up + dn;
    var upw = tot ? (up / tot * 100) : 0;
    var h = '<div class="wrap d-wrap"><div class="d-top">'
      + '<button class="d-back" type="button" data-dback="1">← 돌아가기</button>'
      + '<div class="d-title"><h2>' + esc(d.n) + '<span class="code">' + esc(d.c) + '</span></h2>'
      + '<div class="d-sub">지수 · ' + esc(d.d) + ' 기준</div></div>'
      + '<div class="d-price"><b>' + won(d.px, 2) + '</b><span class="' + cls(d.chg) + '">' + pct2(d.chg) + '</span></div></div>'
      + '<div class="d-grid">';

    h += '<section class="card d-card"><h3>시장 내부 강도 <em>시장 폭</em></h3><div class="d-kv">'
      + kv('상승 종목', up.toLocaleString('ko-KR'), '')
      + kv('하락 종목', dn.toLocaleString('ko-KR'), '')
      + kv('상승 비율', upw.toFixed(1) + '%', '상승÷(상승+하락)')
      + '</div><div class="int-bar"><i style="width:' + upw.toFixed(1) + '%"></i></div>'
      + '<p class="d-hint">지수 등락이 커도 상승 종목이 적으면 좁은 상승입니다. 하루 수치보다 3~5일 추세로 읽으세요.</p></section>';

    h += '<section class="card d-card"><h3>투자자별 순매수 <em>당일 확정</em></h3><div class="d-kv">'
      + kv('외국인', '<span class="' + cls(d.f) + '">' + eok(d.f) + '</span>', '')
      + kv('기관', '<span class="' + cls(d.i) + '">' + eok(d.i) + '</span>', '')
      + kv('개인', '<span class="' + cls(d.p) + '">' + eok(d.p) + '</span>', '')
      + '</div></section>';

    h += '<section class="card d-card wide"><h3>최근 5거래일 <em>종가 · 폭 · 수급</em></h3>'
      + '<table class="d-tbl"><thead><tr><th>날짜</th><th>종가</th><th>등락</th><th>상승/하락</th><th>외국인</th><th>기관</th></tr></thead><tbody>';
    (d.series || []).slice().reverse().forEach(function (r) {
      h += '<tr><td>' + esc(r.d) + '</td><td class="num">' + won(r.c, 2) + '</td>'
        + '<td class="num ' + cls(r.chg) + '">' + pct2(r.chg) + '</td>'
        + '<td class="num">' + (r.up != null ? r.up + '/' + r.down : '—') + '</td>'
        + '<td class="num ' + cls(r.f) + '">' + eok(r.f) + '</td>'
        + '<td class="num ' + cls(r.i) + '">' + eok(r.i) + '</td></tr>';
    });
    h += '</tbody></table></section>';

    /* 글로벌 릴레이 내 위치 · 거시 연계 */
    var reg = null;
    ((DATA.relay || {}).regions || []).forEach(function (r) {
      (r.items || []).forEach(function (it) {
        if (reg) return;
        var nm = String(it.name || '');
        if ((d.c === 'KOSPI' && nm.indexOf('코스피') === 0) || (d.c === 'KOSDAQ' && nm.indexOf('코스닥') === 0)) reg = { region: r, item: it };
      });
    });
    var ls = DATA.longshort || {};
    var wh = (DATA.whale || {}).net || {};
    h += '<section class="card d-card wide"><h3>글로벌 릴레이 내 위치 · 거시 연계</h3><div class="d-kv">'
      + kv('아시아 평균', reg ? '<span class="' + cls(reg.region.avg_pct) + '">' + pct2(reg.region.avg_pct) + '</span>' : '—', reg ? reg.region.state || '' : '')
      + kv('매크로 롱:숏', (ls.long != null ? ls.long + ' : ' + ls.short : '—'), ls.regime || '')
      + kv('큰손 순유동성', wh.value != null ? won(wh.value) + 'bn$' : '—', wh.chg4w != null ? '4주 ' + (wh.chg4w > 0 ? '+' : '') + won(wh.chg4w) + 'bn$' : '')
      + '</div><div class="d-chips" style="margin-top:10px">'
      + '<a class="d-chip" href="#global">🌍 글로벌 릴레이</a><a class="d-chip" href="#top">롱·숏 게이지</a>'
      + '<a class="d-chip" href="#sectors">섹터 레이더</a><a class="d-chip" href="#scorecard">성적표</a></div></section>';

    h += '</div></div>';
    return h;
  }

  function openDetail(kind, code) {
    if (!dRoot) return;
    if (typeof modalOpen === 'function' && modalOpen()) closeModal();
    var box, html;
    if (kind === 'stock') { box = (DET.stocks || {})[code]; html = box ? renderStock(box) : detailNotFound(kind, code); }
    else if (kind === 'etf') { box = (DET.etfs || {})[code]; html = box ? renderEtf(box) : detailNotFound(kind, code); }
    else { box = (DET.indices || {})[code]; html = box ? renderIndex(box) : detailNotFound(kind, code); }
    dRoot.innerHTML = html;
    dRoot.hidden = false;
    document.body.classList.add('detail-open');
    bindCalc(dRoot);
    var back = dRoot.querySelector('[data-dback]');
    if (back) back.addEventListener('click', goBack);
    window.scrollTo(0, 0);
    var ttl = box ? (box.n || code) : code;
    document.title = ttl + ' — ' + (DATA.meta || {}).site;
  }

  function closeDetail() {
    if (!dRoot) return;
    if (!dRoot.hidden) {
      dRoot.hidden = true;
      dRoot.innerHTML = '';
      document.body.classList.remove('detail-open');
      document.title = ((DATA.meta || {}).site || '세상을비틀다') + ' — 시장 레이더';
    }
  }

  function goBack() {
    // 상세로 들어올 때 해시가 쌓였으면 뒤로, 바로 열었으면 목록으로
    if (window.history.length > 1) {
      window.history.back();
      setTimeout(function () {
        if (location.hash.indexOf('#detail/') === 0) { location.hash = '#top'; }
      }, 220);
    } else {
      location.hash = '#top';
    }
  }

  function routeDetail() {
    var h = '';
    try { h = decodeURIComponent((location.hash || '').replace(/^#/, '')); } catch (err) { h = ''; }
    var m = h.match(/^detail\/(stock|etf|index)\/([A-Za-z0-9_-]+)$/);
    if (m) { openDetail(m[1], m[2]); return true; }
    closeDetail();
    return false;
  }
  window.addEventListener('hashchange', routeDetail);
  routeDetail();
  bindCalc(document);

  /* 7) PWA 서비스워커(http/https에서만 — file:// 미리보기에서는 건너뜀) */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
