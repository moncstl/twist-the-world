
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
        if (e.k === 'sector') tags.push('섹터');
        if (e.k === 'event') tags.push('일정');
        if (e.pk) tags.push('관찰');
        if (e.sh != null) tags.push('공매도');
        if (e.sq != null && e.sq >= 40) tags.push('물량잠김');
        var sub = (e.k === 'sector' ? '섹터' : (e.k === 'event' ? '일정 ' + (e.d || '') : e.m))
          + (e.p != null ? ' · ' + comma(e.p, 0) : '');
        if (e.c != null) sub += ' · ' + pct(e.c);
        box_last = i;
        return '<div class="sr" role="option" data-i="' + i + '" aria-selected="false">'
          + '<span class="sr-main"><span class="sr-name">' + esc(e.n) + '<span class="code">' + esc(e.t) + '</span></span>'
          + '<span class="sr-sub">' + esc(sub) + (tags.length ? ' · ' + esc(tags.join(' · ')) : '') + '</span></span>'
          + '<span class="sr-act">'
          + (e.a ? '<button class="sr-go" type="button" data-act="jump">이동</button>' : '')
          + (e.k ? '' : '<button class="sr-go sum" type="button" data-act="sum">요약</button>')
          + '</span></div>';
      }).join('');
    }
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  var box_last = -1;
  function jumpEntry(e) {
    if (e.k === 'event') {
      hideSearch();
      if (e.cal != null && e.cal >= 0) { openDay(e.cal); } else { location.hash = '#calendar'; }
      return;
    }
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
        + '<div class="tbl-wrap"><table class="d-tbl"><thead><tr><th>날짜</th><th>등락</th><th>구분</th><th>같은 날 재료</th></tr></thead><tbody>';
      (tl.points || []).forEach(function (pt) {
        h += '<tr><td>' + esc(pt.date) + '</td><td class="num ' + cls(pt.chg) + '">' + pct2(pt.chg) + '</td>'
          + '<td>' + esc(pt.kind) + '</td><td>' + esc((pt.cause || {}).text || '') + '</td></tr>';
      });
      h += '</tbody></table></div>';
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
      + '</div><p class="d-hint">분배율이 높아도 그만큼 주가가 빠지면 남는 수익이 없습니다. 위 1·3개월 수익률과 함께 보세요. NAV는 기준일이 하루 전일 수 있어, 현재가와 NAV의 차이는 괴리율이 아닙니다(괴리율은 iNAV 기준).</p></section>';

    var tops = d.tops || [];
    h += '<section class="card d-card wide"><h3>구성종목 TOP 10 <em>비중 · 전일비 변동</em></h3>';
    if (tops.length) {
      h += '<div class="tbl-wrap"><table class="d-tbl"><thead><tr><th>#</th><th>종목</th><th>비중</th><th>전일비</th><th>현재가</th><th>등락</th></tr></thead><tbody>';
      tops.slice(0, 10).forEach(function (t, i) {
        h += '<tr><td>' + (i + 1) + '</td>'
          + '<td>' + (t.c ? '<a class="row-link" href="#detail/stock/' + esc(t.c) + '">' + esc(t.n) + '</a>' : esc(t.n)) + '</td>'
          + '<td class="num">' + (t.w != null ? t.w.toFixed(2) + '%' : '—') + '</td>'
          + '<td class="num ' + cls(t.d) + '">' + (t.d ? pp(t.d) : '—') + '</td>'
          + '<td class="num">' + (t.px != null ? won(t.px) : '—') + '</td>'
          + '<td class="num ' + cls(t.chg) + '">' + pct2(t.chg) + '</td></tr>';
      });
      h += '</tbody></table></div>';
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
      + '<div class="tbl-wrap"><table class="d-tbl"><thead><tr><th>날짜</th><th>종가</th><th>등락</th><th>상승/하락</th><th>외국인</th><th>기관</th></tr></thead><tbody>';
    (d.series || []).slice().reverse().forEach(function (r) {
      h += '<tr><td>' + esc(r.d) + '</td><td class="num">' + won(r.c, 2) + '</td>'
        + '<td class="num ' + cls(r.chg) + '">' + pct2(r.chg) + '</td>'
        + '<td class="num">' + (r.up != null ? r.up + '/' + r.down : '—') + '</td>'
        + '<td class="num ' + cls(r.f) + '">' + eok(r.f) + '</td>'
        + '<td class="num ' + cls(r.i) + '">' + eok(r.i) + '</td></tr>';
    });
    h += '</tbody></table></div></section>';

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

  /* 11) v4 모듈(site_v4.js)에 넘기는 최소 인터페이스 — 화면 렌더 함수를 복사하지 않고 재사용한다 */
  window.__MR = {
    DATA: DATA, DET: DET, IDX: IDX,
    openDetail: openDetail, closeDetail: closeDetail, goBack: goBack,
    renderStock: renderStock, renderEtf: renderEtf, renderIndex: renderIndex,
    bindCalc: bindCalc, openDay: openDay, openStock: openStock, jumpTo: jumpTo,
    esc: esc, comma: comma, pct: pct, cls: cls,
  };

  /* 7) PWA 서비스워커(http/https에서만 — file:// 미리보기에서는 건너뜀) */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();

/* ── v4 개편 추가 모듈 ── */
/* ══════════════════════════════════════════════════════════════════
   세상을비틀다 v4 — 화면 모드 · 상세 패널 · 관심종목 · 투자계획 · 가격 조건
   · 모든 사용자 데이터는 localStorage 에만 저장한다(서버 전송 없음)
   · 백그라운드 알림·자동 주문·기기 간 동기화는 없다(있는 척하지 않는다)
   ══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MR = window.__MR || {};
  var DATA = MR.DATA || {};
  var DET = MR.DET || {};
  var IDX = MR.IDX || [];
  if (!MR.esc) return;

  var esc = MR.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;

  /* ── 0) 저장소 ─────────────────────────────────────────── */
  var K = { watch: 'mr:watch', plan: 'mr:plan', alert: 'mr:alert', color: 'mr:color', side: 'mr:side', ex: 'mr:ex' };
  function load(k, d) { try { var s = localStorage.getItem(k); return s ? JSON.parse(s) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  var watch = load(K.watch, {}) || {};
  var plans = load(K.plan, []) || [];
  var alerts = load(K.alert, []) || [];
  if (!watch || typeof watch !== 'object' || Array.isArray(watch)) watch = {};
  if (!Array.isArray(plans)) plans = [];
  if (!Array.isArray(alerts)) alerts = [];

  function nowIso() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.hidden = true; }, 2400);
  }

  /* ── 1) 종목 정보 해석 — 상세 데이터 우선, 없으면 검색 색인 ── */
  var idxBy = {};
  IDX.forEach(function (e) { if (e && e.t) idxBy[e.t] = e; });

  function stockInfo(code) {
    var d = (DET.stocks || {})[code];
    if (d) {
      return { code: code, name: d.n, px: d.px, chg: d.chg, market: d.m, sec: d.sec,
               plan: d.plan || {}, pick: d.pick || null, date: d.d };
    }
    var e = idxBy[code];
    if (e) {
      var pk = e.pk || null;
      return { code: code, name: e.n, px: e.p, chg: e.c, market: e.m, sec: pk && pk.sec || '',
               plan: pk ? { entry: pk.e1, stop: pk.stop, target: pk.tgt } : {}, pick: pk, date: e.d };
    }
    return null;
  }
  function nameOf(code) { var i = stockInfo(code); return i ? i.name : code; }
  function pxOf(code) { var i = stockInfo(code); return i && i.px != null ? Number(i.px) : null; }

  function won(v, d) {
    if (v == null || v === '') return '—';
    return Number(v).toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function pct2(v) {
    if (v == null) return '—';
    return (v > 0 ? '+' : (v < 0 ? '−' : '')) + Math.abs(v).toFixed(2) + '%';
  }
  function cls(v) { return v == null ? 'flat' : (v > 0 ? 'up' : (v < 0 ? 'down' : 'flat')); }
  function escAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  /* ── 2) 화면 모드: home / explore / watch ───────────────── */
  var EX_TABS = ['picks', 'sectors', 'flow', 'etf', 'content'];
  var exTab = 'picks';
  try { exTab = sessionStorage.getItem(K.ex) || 'picks'; } catch (e) {}
  if (EX_TABS.indexOf(exTab) < 0) exTab = 'picks';

  function applyExplore(tab) {
    exTab = tab || exTab;
    $$('#main > section').forEach(function (s) { s.classList.toggle('ex-active', s.id === exTab); });
    $$('.ex-tab').forEach(function (b) {
      var on = b.getAttribute('data-ex') === exTab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    try { sessionStorage.setItem(K.ex, exTab); } catch (e) {}
  }

  function setScreen(name) {
    var cur = document.body.getAttribute('data-screen') || 'home';
    document.body.setAttribute('data-screen', name || 'home');
    $$('.tabbar .tb').forEach(function (a) {
      var nav = a.getAttribute('data-nav');
      var on = (name === 'explore' && nav === 'explore') || (name === 'watch' && nav === 'watch')
            || ((!name || name === 'home') && nav === 'home');
      a.classList.toggle('active', !!on);
    });
    if (name === 'explore' && cur !== 'explore') applyExplore(exTab);
    if (name === 'explore') window.scrollTo(0, 0);
  }

  $$('.ex-tab').forEach(function (b) {
    b.addEventListener('click', function () { applyExplore(b.getAttribute('data-ex')); window.scrollTo(0, 0); });
  });

  /* ── 3) 테마·색상 모드 ─────────────────────────────────── */
  function applyColor(mode) {
    root.setAttribute('data-colormode', mode === 'global' ? 'global' : 'kr');
    try { localStorage.setItem(K.color, mode); } catch (e) {}
    $$('[data-set-color]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-set-color') === (mode === 'global' ? 'global' : 'kr'));
    });
  }
  applyColor(load(K.color, 'kr') || 'kr');
  function syncThemeBtns() {
    var t = root.getAttribute('data-theme');
    $$('[data-set-theme]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-set-theme') === t); });
  }

  /* ── 4) 시트(전체·도움말·입력) ─────────────────────────── */
  var sheet = $('#sheet'), sheetBody = $('#sheetBody'), sheetTitle = $('#sheetTitle');
  function openSheet(title, html) {
    if (!sheet) return;
    sheetTitle.textContent = title;
    sheetBody.innerHTML = html;
    sheet.hidden = false;
    syncThemeBtns();
    var first = sheetBody.querySelector('input, button, a');
    if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 30);
  }
  function closeSheet() { if (sheet) { sheet.hidden = true; sheetBody.innerHTML = ''; } }
  function openAll() {
    var tpl = $('#tplAll');
    openSheet('전체 메뉴 · 표시 설정', tpl ? tpl.innerHTML : '');
    syncThemeBtns();
  }
  function openHelp() {
    var tpl = $('#tplHelp');
    openSheet('도움말 센터 — 지표 읽는 법', tpl ? tpl.innerHTML : '');
  }
  if (sheet) {
    sheet.addEventListener('click', function (ev) {
      if (ev.target.getAttribute && ev.target.getAttribute('data-sheet-close')) closeSheet();
    });
  }

  /* ── 5) 상세 패널(drawer) ──────────────────────────────── */
  var drawer = $('#drawer'), dBody = $('#drawerBody'), dScrim = $('#drawerScrim'), dTitle = $('#drawerTitle'), dFull = $('#drawerFull');
  var wide = function () { return window.matchMedia('(min-width:1240px)').matches; };

  function renderDetail(kind, code) {
    if (kind === 'stock') { var s = (DET.stocks || {})[code]; return s ? MR.renderStock(s) : null; }
    if (kind === 'etf') { var e = (DET.etfs || {})[code]; return e ? MR.renderEtf(e) : null; }
    var i = (DET.indices || {})[code];
    return i ? MR.renderIndex(i) : null;
  }
  function detailName(kind, code) {
    if (kind === 'stock') { var s = (DET.stocks || {})[code]; return s ? s.n : code; }
    if (kind === 'etf') { var e = (DET.etfs || {})[code]; return e ? e.n : code; }
    var i = (DET.indices || {})[code]; return i ? (i.n || code) : code;
  }

  function openDrawer(kind, code, push) {
    if (!drawer) return;
    var html = renderDetail(kind, code);
    if (!html) {
      html = '<div class="wrap"><p class="wp-empty"><b>데이터가 없는 종목입니다</b>' + esc(nameOf(code)) +
             ' — 상세 데이터를 아직 수집하지 못했습니다. 검색 색인 값으로만 확인할 수 있습니다.</p></div>';
    }
    dBody.innerHTML = html;
    dTitle.textContent = detailName(kind, code);
    dFull.setAttribute('href', '#detail/' + kind + '/' + code);
    dFull.setAttribute('data-nodrawer', '1');
    drawer.hidden = false;
    dScrim.hidden = false;
    document.body.classList.add('drawer-open');
    try { MR.bindCalc(dBody); } catch (e) {}
    injectTools(dBody, kind, code);
    if (push) { try { history.pushState({ panel: 1 }, '', '#panel/' + kind + '/' + code); } catch (e) {} }
    dBody.scrollTop = 0;
  }
  function closeDrawer(pop) {
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    dScrim.hidden = true;
    dBody.innerHTML = '';
    document.body.classList.remove('drawer-open');
    if (!pop && history.state && history.state.panel) { try { history.back(); } catch (e) {} }
  }
  if ($('#drawerClose')) $('#drawerClose').addEventListener('click', function () { closeDrawer(false); });
  if (dScrim) dScrim.addEventListener('click', function () { closeDrawer(false); });

  /* 링크 클릭: PC에서는 상세 페이지 대신 우측 패널 */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href^="#detail/"]') : null;
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;
    if (a.hasAttribute('data-nodrawer') || a.closest('[data-nodrawer]')) return;
    if (!wide()) return;
    var m = (a.getAttribute('href') || '').match(/^#detail\/(stock|etf|index)\/([A-Za-z0-9._-]+)/);
    if (!m) return;
    ev.preventDefault();
    ev.stopPropagation();
    openDrawer(m[1], m[2], true);
  }, true);

  /* ── 6) 사용자 도구(관심·계획·조건·공유) ───────────────── */
  function watchBtnHtml(code, info) {
    var on = !!watch[code];
    return '<button class="btn' + (on ? ' starred' : '') + '" type="button" data-watch="' + escAttr(code) + '" ' +
      'data-name="' + escAttr(info && info.name || nameOf(code)) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
      (on ? '★ 관심 등록됨' : '☆ 관심 등록') + '</button>';
  }

  function injectTools(box, kind, code) {
    if (!box || kind !== 'stock') return;
    if (box.querySelector('.user-tools[data-code="' + code + '"]')) return;
    var info = stockInfo(code);
    if (!info) return;
    var bar = document.createElement('div');
    bar.className = 'user-tools';
    bar.setAttribute('data-code', code);
    bar.innerHTML = watchBtnHtml(code, info) +
      '<button class="btn" type="button" data-plan="' + escAttr(code) + '">🧮 투자계획</button>' +
      '<button class="btn" type="button" data-alert="' + escAttr(code) + '">🔔 가격 조건</button>' +
      '<button class="btn ghost" type="button" data-share="' + escAttr(kind + '/' + code) + '">🔗 링크 복사</button>';
    var anchor = box.querySelector('.d-top') || box.firstElementChild;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    else box.insertBefore(bar, box.firstChild);
  }

  function syncWatchButtons(code) {
    var on = !!watch[code];
    $$('[data-watch="' + code + '"]').forEach(function (b) {
      b.classList.toggle('starred', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? '★ 관심 등록됨' : '☆ 관심 등록';
    });
  }

  function toggleWatch(code, name) {
    if (watch[code]) { delete watch[code]; toast(name + ' 관심 해제'); }
    else { watch[code] = { code: code, name: name || nameOf(code), added: nowIso() }; toast(name + ' 관심 등록 — 관심 탭에서 관리'); }
    save(K.watch, watch);
    syncWatchButtons(code);
    renderWatch();
  }

  /* ── 7) 관심·계획·조건 렌더 ─────────────────────────────── */
  var wtab = 'watch';
  function counts() {
    return { w: Object.keys(watch).length, p: plans.length, a: alerts.length };
  }
  function planStatus(p, px) {
    if (px == null) return { k: 'info', t: '가격 미확인' };
    if (px <= p.stop) return { k: 'bad', t: '무효 — 무효 기준 이탈' };
    if (px >= p.target) return { k: 'on', t: '목표 도달' };
    if (px <= p.entry) return { k: 'info', t: '관찰 구간 안' };
    return { k: '', t: '관찰 중 — 진입가 위' };
  }
  function alertState(a, px) {
    if (px == null) return { k: 'info', t: '가격 미확인' };
    var hit = a.op === 'above' ? px >= a.price : px <= a.price;
    return hit ? { k: 'on', t: '조건 충족 — 앱 열 때 확인됨' } : { k: '', t: '대기' };
  }

  function itemHead(code, info, px) {
    return '<div class="wp-top"><h3><a href="#detail/stock/' + escAttr(code) + '">' + esc(info ? info.name : nameOf(code)) +
      '</a><span class="code">' + esc(code) + '</span></h3>' +
      '<div class="wp-px"><b>' + (px != null ? won(px) + '원' : '—') + '</b>' +
      '<span class="' + cls(info && info.chg) + '">' + (info && info.chg != null ? pct2(info.chg) : '기준가 미확인') + '</span></div></div>';
  }

  function renderWatch() {
    var pane = $('#watchPane');
    var c = counts();
    if ($('#wCount')) $('#wCount').textContent = c.w;
    if ($('#pCount')) $('#pCount').textContent = c.p;
    if ($('#aCount')) $('#aCount').textContent = c.a;
    var badge = $('#watchBadge');
    if (badge) {
      badge.textContent = c.w;
      if (c.w) badge.hidden = false; else badge.hidden = true;
    }
    var sc = $('#sideWatchCount');
    if (sc) sc.textContent = c.w;
    $$('#watch-tabs button').forEach(function (b) {
      var on = b.getAttribute('data-wtab') === wtab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var asof = $('#watchAsOf');
    if (asof) asof.textContent = '이 브라우저에 저장 · ' + nowIso();

    if (!pane) return;
    var html = '';
    if (wtab === 'watch') {
      var codes = Object.keys(watch);
      if (!codes.length) {
        html = '<div class="wp-empty"><b>아직 등록한 종목이 없습니다</b>' +
          '종목 카드나 상세 화면의 <b>☆ 관심 등록</b>을 누르면 여기에 모입니다.' +
          '<div class="wp-actions" style="justify-content:center"><a class="btn primary" href="#explore">탐색에서 종목 찾기</a></div></div>';
      } else {
        html = codes.map(function (code) {
          var info = stockInfo(code);
          var px = info && info.px != null ? Number(info.px) : null;
          var pl = plans.filter(function (x) { return x.code === code; })[0];
          var al = alerts.filter(function (x) { return x.code === code; })[0];
          var badges = '';
          if (pl) { var st = planStatus(pl, px); badges += '<span class="wp-badge ' + st.k + '">계획 · ' + esc(st.t) + '</span>'; }
          if (al) { var as = alertState(al, px); badges += '<span class="wp-badge ' + as.k + '">조건 · ' + esc(as.t) + '</span>'; }
          var line = pl ? '<div class="wp-planline"><span>진입 <b>' + won(pl.entry) + '</b></span><span>무효 <b>' + won(pl.stop) + '</b></span>' +
            '<span>목표 <b>' + won(pl.target) + '</b></span><span>수량 <b>' + won(pl.qty) + '주</b></span>' +
            '<span>손익비 <b>' + (pl.rr != null ? Number(pl.rr).toFixed(2) : '—') + '</b></span></div>' : '';
          return '<article class="wp-item" data-item="' + escAttr(code) + '">' + itemHead(code, info, px) +
            '<div class="wp-badges">' + (badges || '<span class="wp-badge">계획 없음</span>') + '</div>' + line +
            '<div class="wp-actions">' +
            '<a class="btn" href="#detail/stock/' + escAttr(code) + '">상세</a>' +
            '<button class="btn" type="button" data-plan="' + escAttr(code) + '">계획 ' + (pl ? '수정' : '만들기') + '</button>' +
            '<button class="btn" type="button" data-alert="' + escAttr(code) + '">조건 ' + (al ? '수정' : '설정') + '</button>' +
            '<button class="btn danger" type="button" data-unwatch="' + escAttr(code) + '">관심 해제</button>' +
            '</div></article>';
        }).join('');
      }
    } else if (wtab === 'plan') {
      if (!plans.length) {
        html = '<div class="wp-empty"><b>아직 만든 투자계획이 없습니다</b>' +
          '종목 상세에서 <b>🧮 투자계획</b>을 누르면 진입·무효·목표 가격과 손실 한도로 수량을 계산해 저장합니다.' +
          '<div class="wp-actions" style="justify-content:center"><a class="btn primary" href="#explore">종목 보기</a></div></div>';
      } else {
        html = plans.slice().reverse().map(function (p) {
          var info = stockInfo(p.code);
          var px = info && info.px != null ? Number(info.px) : null;
          var st = planStatus(p, px);
          return '<article class="wp-item">' + itemHead(p.code, info, px) +
            '<div class="wp-badges"><span class="wp-badge ' + st.k + '">' + esc(st.t) + '</span>' +
            '<span class="wp-badge">' + esc(p.created || '') + ' 저장</span></div>' +
            '<div class="wp-planline"><span>진입 <b>' + won(p.entry) + '</b> <em>' + (px != null ? pct2((px / p.entry - 1) * 100) : '') + '</em></span>' +
            '<span>무효 <b>' + won(p.stop) + '</b></span><span>목표 <b>' + won(p.target) + '</b></span>' +
            '<span>수량 <b>' + won(p.qty) + '주</b></span><span>예상 손실 <b>' + won(p.loss) + '원</b></span>' +
            '<span>손익비 <b>' + (p.rr != null ? Number(p.rr).toFixed(2) : '—') + '</b></span></div>' +
            '<div class="wp-actions"><a class="btn" href="#detail/stock/' + escAttr(p.code) + '">상세</a>' +
            '<button class="btn" type="button" data-plan="' + escAttr(p.code) + '" data-planid="' + escAttr(p.id) + '">수정</button>' +
            '<button class="btn danger" type="button" data-delplan="' + escAttr(p.id) + '">삭제</button></div></article>';
        }).join('');
      }
    } else {
      if (!alerts.length) {
        html = '<div class="wp-empty"><b>설정한 가격 조건이 없습니다</b>' +
          '종목 상세에서 <b>🔔 가격 조건</b>을 누르면 ‘이 가격 이상/이하’를 저장합니다. 조건은 앱을 열 때 비교합니다.' +
          '<div class="wp-actions" style="justify-content:center"><a class="btn primary" href="#explore">종목 보기</a></div></div>';
      } else {
        html = alerts.slice().reverse().map(function (a) {
          var info = stockInfo(a.code);
          var px = info && info.px != null ? Number(info.px) : null;
          var st = alertState(a, px);
          return '<article class="wp-item">' + itemHead(a.code, info, px) +
            '<div class="wp-badges"><span class="wp-badge ' + st.k + '">' + esc(st.t) + '</span></div>' +
            '<div class="wp-planline"><span>조건 <b>' + (a.op === 'above' ? '이상' : '이하') + ' ' + won(a.price) + '원</b></span>' +
            '<span>현재 <b>' + (px != null ? won(px) + '원' : '—') + '</b></span><span>' + esc(a.created || '') + ' 저장</span></div>' +
            '<div class="wp-actions"><a class="btn" href="#detail/stock/' + escAttr(a.code) + '">상세</a>' +
            '<button class="btn" type="button" data-alert="' + escAttr(a.code) + '" data-alertid="' + escAttr(a.id) + '">수정</button>' +
            '<button class="btn danger" type="button" data-delalert="' + escAttr(a.id) + '">삭제</button></div></article>';
        }).join('');
      }
    }
    pane.innerHTML = html;

    // 우측 패널의 관심종목 미니 목록
    var rail = $('#railWatch');
    if (rail) {
      var codes2 = Object.keys(watch).slice(0, 5);
      if (!codes2.length) rail.innerHTML = '<p class="rail-empty">아직 등록한 종목이 없습니다.</p>';
      else rail.innerHTML = codes2.map(function (code) {
        var i = stockInfo(code);
        var px = i && i.px != null ? Number(i.px) : null;
        return '<a class="rw-item" href="#detail/stock/' + escAttr(code) + '"><b>' + esc(i ? i.name : code) + '</b>' +
          '<span class="rw-px">' + (px != null ? won(px) : '—') + '</span>' +
          '<span class="rw-chg ' + cls(i && i.chg) + '">' + (i && i.chg != null ? pct2(i.chg) : '') + '</span></a>';
      }).join('');
    }
  }

  $$('#watch-tabs button').forEach(function (b) {
    b.addEventListener('click', function () { wtab = b.getAttribute('data-wtab'); renderWatch(); });
  });

  /* ── 8) 투자계획 입력 ───────────────────────────────────── */
  function calcPlan(v) {
    var entry = Number(v.entry), stop = Number(v.stop), target = Number(v.target);
    var cap = Number(v.capital), riskPct = Number(v.riskPct);
    var out = { ok: false, qty: 0, loss: 0, amt: 0, weight: 0, rr: null, gain: 0, warn: '' };
    if (!(entry > 0) || !(stop > 0) || !(target > 0)) { out.warn = '진입·무효·목표 가격을 모두 입력하세요.'; return out; }
    if (stop >= entry) { out.warn = '무효(손절) 가격은 진입가보다 낮아야 합니다.'; return out; }
    if (target <= entry) { out.warn = '목표 가격은 진입가보다 높아야 합니다.'; return out; }
    if (!(cap > 0) || !(riskPct > 0)) { out.warn = '총 투자금과 허용 손실률을 확인하세요.'; return out; }
    var per = entry - stop;
    var budget = cap * riskPct / 100;
    var qRisk = Math.floor(budget / per);
    var qCap = Math.floor(cap / entry);
    out.qty = Math.max(0, Math.min(qRisk, qCap));
    out.loss = out.qty * per;
    out.amt = out.qty * entry;
    out.weight = cap > 0 ? out.amt / cap * 100 : 0;
    out.rr = (target - entry) / per;
    out.gain = out.qty * (target - entry);
    out.ok = out.qty > 0;
    if (!out.qty) out.warn = '계산된 수량이 0주입니다 — 허용 손실 또는 투자금을 늘리거나 가격 폭을 확인하세요.';
    else if (qRisk > qCap) out.warn = '허용 손실로는 ' + won(qRisk) + '주지만 투자금 한도에서 ' + won(qCap) + '주로 제한했습니다.';
    return out;
  }

  function planForm(p) {
    var code = p.code, info = stockInfo(code) || {};
    var base = p.id ? plans.filter(function (x) { return x.id === p.id; })[0] : null;
    var entry = base ? base.entry : (p.entry || info.plan.entry || info.px || '');
    var stop = base ? base.stop : (p.stop || info.plan.stop || '');
    var target = base ? base.target : (p.target || info.plan.target || '');
    var capital = base ? base.capital : 10000000;
    var riskPct = base ? base.riskPct : 0.5;
    return {
      title: '투자계획 — ' + (info.name || code),
      html: '<form class="form-grid" id="planForm" novalidate>' +
        '<p class="help-lead">' + esc(info.name || code) + ' <b>' + esc(code) + '</b> · 현재가 ' +
        (info.px != null ? won(info.px) + '원' : '미확인') + ' (기준 ' + esc(info.date || '—') + ')' +
        '<br>값을 바꾸면 수량·손실이 바로 계산됩니다. 저장은 이 브라우저에만 됩니다.</p>' +
        '<div class="form-3"><div class="fld"><label for="plEntry">진입가</label><input id="plEntry" type="number" min="1" step="1" value="' + (entry || '') + '" inputmode="numeric"></div>' +
        '<div class="fld"><label for="plStop">무효(손절)가</label><input id="plStop" type="number" min="1" step="1" value="' + (stop || '') + '" inputmode="numeric"></div>' +
        '<div class="fld"><label for="plTarget">목표가</label><input id="plTarget" type="number" min="1" step="1" value="' + (target || '') + '" inputmode="numeric"></div></div>' +
        '<div class="form-2"><div class="fld"><label for="plCap">총 투자금(원)</label><input id="plCap" type="number" min="0" step="100000" value="' + capital + '" inputmode="numeric"><span class="hint">이 종목에 배정할 금액</span></div>' +
        '<div class="fld"><label for="plRisk">1회 허용 손실률(%)</label><input id="plRisk" type="number" min="0.1" max="100" step="0.1" value="' + riskPct + '" inputmode="decimal"><span class="hint">총 투자금 대비</span></div></div>' +
        '<div class="plan-calc" id="planCalc"></div>' +
        '<p class="plan-warn" id="planWarn" hidden></p>' +
        '<div class="sheet-actions"><button class="btn primary" type="submit">계획 저장</button>' +
        (base ? '<button class="btn danger" type="button" data-delplan="' + escAttr(base.id) + '">삭제</button>' : '') +
        '<button class="btn ghost" type="button" data-sheet-close="1">취소</button></div>' +
        '<p class="wp-note">계산은 입력값에 따른 산술 결과이며 매수 권유가 아닙니다. 실제 체결가는 수수료·슬리피지로 달라집니다.</p>' +
        '</form>'
    };
  }

  function openPlan(code, planId) {
    var info = stockInfo(code);
    if (!info && !planId) { toast('종목 정보를 찾지 못했습니다'); return; }
    var p = { code: code, entry: info && info.plan ? info.plan.entry : null, stop: info && info.plan ? info.plan.stop : null,
              target: info && info.plan ? info.plan.target : null, id: planId || null };
    var f = planForm(p);
    openSheet(f.title, f.html);
    var form = $('#planForm');
    if (!form) return;
    function read() {
      return { entry: $('#plEntry').value, stop: $('#plStop').value, target: $('#plTarget').value,
               capital: $('#plCap').value, riskPct: $('#plRisk').value };
    }
    function run() {
      var v = read();
      var r = calcPlan(v);
      var el = $('#planCalc');
      el.innerHTML =
        '<div><span>매수 가능 수량</span><b>' + won(r.qty) + '주</b></div>' +
        '<div><span>주문 금액</span><b>' + won(r.amt) + '원</b></div>' +
        '<div><span>투자금 대비</span><b>' + (r.weight ? r.weight.toFixed(1) : '0') + '%</b></div>' +
        '<div><span>예상 손실(무효 시)</span><b>' + won(r.loss) + '원</b></div>' +
        '<div><span>목표 시 이익</span><b>' + won(r.gain) + '원</b></div>' +
        '<div><span>손익비</span><b>' + (r.rr != null ? r.rr.toFixed(2) + ' : 1' : '—') + '</b></div>';
      var w = $('#planWarn');
      if (r.warn) { w.textContent = r.warn; w.hidden = false; w.className = 'plan-warn' + (r.ok ? '' : ' bad'); }
      else w.hidden = true;
      return r;
    }
    ['plEntry', 'plStop', 'plTarget', 'plCap', 'plRisk'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', run);
    });
    run();
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = read();
      var r = calcPlan(v);
      if (!r.ok) { toast(r.warn || '입력값을 확인하세요'); return; }
      var rec = {
        id: planId || ('p' + Date.now().toString(36)),
        code: code, name: info ? info.name : nameOf(code),
        entry: Number(v.entry), stop: Number(v.stop), target: Number(v.target),
        capital: Number(v.capital), riskPct: Number(v.riskPct),
        qty: r.qty, loss: r.loss, amt: r.amt, rr: Math.round(r.rr * 100) / 100,
        created: nowIso()
      };
      var i = plans.findIndex(function (x) { return x.id === rec.id; });
      if (i >= 0) plans[i] = rec; else plans.push(rec);
      save(K.plan, plans);
      if (!watch[code]) { watch[code] = { code: code, name: rec.name, added: nowIso() }; save(K.watch, watch); syncWatchButtons(code); }
      wtab = 'plan';
      renderWatch();
      closeSheet();
      toast(rec.name + ' 투자계획 저장 — ' + won(rec.qty) + '주 · 예상 손실 ' + won(rec.loss) + '원');
    });
  }

  /* ── 9) 가격 조건 입력 ──────────────────────────────────── */
  function openAlert(code, alertId) {
    var info = stockInfo(code) || {};
    var base = alertId ? alerts.filter(function (x) { return x.id === alertId; })[0] : null;
    var op = base ? base.op : 'above';
    var price = base ? base.price : (info.px != null ? info.px : '');
    openSheet('가격 조건 — ' + (info.name || code),
      '<form class="form-grid" id="alertForm" novalidate>' +
      '<p class="help-lead">' + esc(info.name || code) + ' <b>' + esc(code) + '</b> · 현재가 ' +
      (info.px != null ? won(info.px) + '원' : '미확인') + '</p>' +
      '<div class="form-2"><div class="fld"><label for="alOp">조건</label><select id="alOp">' +
      '<option value="above"' + (op === 'above' ? ' selected' : '') + '>이 가격 이상이면</option>' +
      '<option value="below"' + (op === 'below' ? ' selected' : '') + '>이 가격 이하이면</option></select></div>' +
      '<div class="fld"><label for="alPrice">가격(원)</label><input id="alPrice" type="number" min="1" step="1" value="' + (price || '') + '" inputmode="numeric"></div></div>' +
      '<p class="plan-warn" id="alertWarn" hidden></p>' +
      '<div class="sheet-actions"><button class="btn primary" type="submit">조건 저장</button>' +
      (base ? '<button class="btn danger" type="button" data-delalert="' + escAttr(base.id) + '">삭제</button>' : '') +
      '<button class="btn ghost" type="button" data-sheet-close="1">취소</button></div>' +
      '<p class="wp-note">이 조건은 <b>앱을 열 때</b> 현재가와 비교해 ‘조건 충족’을 표시합니다. 백그라운드 푸시 알림·문자·자동 주문은 지원하지 않습니다.</p>' +
      '</form>');
    var form = $('#alertForm');
    if (!form) return;
    function check() {
      var pr = Number($('#alPrice').value);
      var w = $('#alertWarn');
      if (!(pr > 0)) { w.textContent = '가격을 입력하세요.'; w.hidden = false; w.className = 'plan-warn bad'; return false; }
      var opv = $('#alOp').value;
      if (info.px != null && ((opv === 'above' && pr <= info.px) || (opv === 'below' && pr >= info.px))) {
        w.textContent = '현재가(' + won(info.px) + '원) 기준으로 이미 충족되는 조건입니다 — 저장은 되지만 바로 ‘조건 충족’으로 표시됩니다.';
        w.hidden = false; w.className = 'plan-warn';
      } else w.hidden = true;
      return true;
    }
    $('#alPrice').addEventListener('input', check);
    $('#alOp').addEventListener('change', check);
    check();
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!check()) return;
      var rec = { id: alertId || ('a' + Date.now().toString(36)), code: code, name: info.name || nameOf(code),
                  op: $('#alOp').value, price: Number($('#alPrice').value), created: nowIso() };
      var i = alerts.findIndex(function (x) { return x.id === rec.id; });
      if (i >= 0) alerts[i] = rec; else alerts.push(rec);
      save(K.alert, alerts);
      if (!watch[code]) { watch[code] = { code: code, name: rec.name, added: nowIso() }; save(K.watch, watch); syncWatchButtons(code); }
      wtab = 'alert';
      renderWatch();
      closeSheet();
      toast(rec.name + ' 가격 조건 저장 — ' + (rec.op === 'above' ? '이상 ' : '이하 ') + won(rec.price) + '원');
    });
  }

  /* ── 10) 캘린더 ICS 내보내기 ───────────────────────────── */
  function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
  }
  function exportIcs(name, date, time) {
    var d = String(date || '').replace(/-/g, '');
    if (!d) { toast('날짜가 없어 일정 파일을 만들 수 없습니다'); return; }
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//twist-the-world//market-radar//KO', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + d + '-' + Math.abs(String(name).split('').reduce(function (h, c) { return (h * 31 + c.charCodeAt(0)) | 0; }, 7)) + '@moncstl.github.io',
      'DTSTAMP:' + stamp];
    if (time && /^\d{1,2}:\d{2}/.test(time)) {
      var t = time.slice(0, 5).replace(':', '');
      if (t.length === 3) t = '0' + t;
      lines.push('DTSTART;TZID=Asia/Seoul:' + d + 'T' + t + '00');
      lines.push('DTEND;TZID=Asia/Seoul:' + d + 'T' + t + '00');
      lines.push('BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(name), 'END:VALARM');
    } else {
      lines.push('DTSTART;VALUE=DATE:' + d);
      lines.push('DTEND;VALUE=DATE:' + d);
    }
    lines.push('SUMMARY:' + icsEscape(name));
    lines.push('DESCRIPTION:세상을비틀다 시장 레이더의 공개 시장 일정입니다.');
    lines.push('END:VEVENT', 'END:VCALENDAR');
    download(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }), 'market-event-' + d + '.ics');
    toast('일정 파일을 내려받았습니다 — 캘린더 앱에서 열어 추가하세요');
  }

  /* ── 11) 공유 링크 복사 ─────────────────────────────────── */
  function shareLink(path) {
    var base = location.protocol === 'file:' ? location.href.split('#')[0] : location.origin + location.pathname;
    var url = base + '#detail/' + path;
    function done() { toast('링크를 복사했습니다 — ' + url); }
    function fallback() {
      var t = document.createElement('textarea');
      t.value = url; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('링크: ' + url); }
      t.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback);
    else fallback();
  }

  /* ── 12) 클릭 위임 ──────────────────────────────────────── */
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var el;
    if ((el = t.closest('[data-watch]'))) {
      ev.preventDefault();
      toggleWatch(el.getAttribute('data-watch'), el.getAttribute('data-name'));
      return;
    }
    if ((el = t.closest('[data-unwatch]'))) {
      ev.preventDefault();
      var c = el.getAttribute('data-unwatch');
      toggleWatch(c, watch[c] && watch[c].name);
      return;
    }
    if ((el = t.closest('[data-plan]'))) {
      ev.preventDefault();
      openPlan(el.getAttribute('data-plan'), el.getAttribute('data-planid'));
      return;
    }
    if ((el = t.closest('[data-alert]'))) {
      ev.preventDefault();
      openAlert(el.getAttribute('data-alert'), el.getAttribute('data-alertid'));
      return;
    }
    if ((el = t.closest('[data-delplan]'))) {
      ev.preventDefault();
      var idp = el.getAttribute('data-delplan');
      plans = plans.filter(function (x) { return x.id !== idp; });
      save(K.plan, plans);
      if (sheet && !sheet.hidden) closeSheet();
      renderWatch();
      toast('투자계획을 삭제했습니다');
      return;
    }
    if ((el = t.closest('[data-delalert]'))) {
      ev.preventDefault();
      var ida = el.getAttribute('data-delalert');
      alerts = alerts.filter(function (x) { return x.id !== ida; });
      save(K.alert, alerts);
      if (sheet && !sheet.hidden) closeSheet();
      renderWatch();
      toast('가격 조건을 삭제했습니다');
      return;
    }
    if ((el = t.closest('[data-share]'))) {
      ev.preventDefault();
      shareLink(el.getAttribute('data-share'));
      return;
    }
    if ((el = t.closest('[data-ics-name]'))) {
      ev.preventDefault();
      exportIcs(el.getAttribute('data-ics-name'), el.getAttribute('data-ics-date'), el.getAttribute('data-ics-time'));
      return;
    }
    if ((el = t.closest('[data-set-theme]'))) {
      var th = el.getAttribute('data-set-theme');
      root.setAttribute('data-theme', th);
      try { localStorage.setItem('mr-theme', th); } catch (e) {}
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', th === 'dark' ? '#10151F' : '#F4F6FA');
      syncThemeBtns();
      return;
    }
    if ((el = t.closest('[data-set-color]'))) { applyColor(el.getAttribute('data-set-color')); return; }
    if ((el = t.closest('[data-sheet]'))) {
      ev.preventDefault();
      openAll();
      return;
    }
    if ((el = t.closest('[data-open-search]'))) {
      ev.preventDefault();
      closeSheet();
      var sb = $('#searchBtn'), q = $('#q');
      if (sb && sb.offsetParent !== null) sb.click();
      if (q) setTimeout(function () { q.focus(); }, 60);
      return;
    }
  });

  /* 시트 안의 바로가기 링크는 시트를 닫고 이동 */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('#sheetBody a[href^="#"]') : null;
    if (!a) return;
    if (a.hasAttribute('data-open-search')) return;
    closeSheet();
  });

  /* 메뉴 버튼(좁은 화면) */
  var side = $('#sideNav'), scrim = $('#sideScrim'), menuBtn = $('#menuBtn');
  function openSide(open) {
    if (!side) return;
    side.classList.toggle('open', open);
    if (scrim) scrim.hidden = !open;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { openSide(!side.classList.contains('open')); });
  if (scrim) scrim.addEventListener('click', function () { openSide(false); });
  $$('#sideNav .side-nav a').forEach(function (a) { a.addEventListener('click', function () { openSide(false); }); });

  /* 좌측 접기(데스크톱) */
  var shell = $('.appshell'), sideBtn = $('#sideCollapse');
  if (sideBtn) sideBtn.addEventListener('click', function () {
    var col = shell.classList.toggle('side-collapsed');
    sideBtn.textContent = col ? '»' : '«';
    try { localStorage.setItem(K.side, col ? '1' : '0'); } catch (e) {}
  });
  if (load(K.side, '0') === '1' && shell) { shell.classList.add('side-collapsed'); if (sideBtn) sideBtn.textContent = '»'; }

  /* 도움말·설정 */
  ['#helpBtn', '#helpBtn2'].forEach(function (sel) {
    var b = $(sel);
    if (b) b.addEventListener('click', function (ev) { ev.preventDefault(); openHelp(); });
  });
  var setBtn = $('#settingsBtn');
  if (setBtn) setBtn.addEventListener('click', function () { openAll(); });

  /* ── 13) 화면 전환·해시 라우팅 ─────────────────────────── */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href === '#explore') { ev.preventDefault(); setScreen('explore'); try { history.pushState(null, '', '#explore'); } catch (e) { location.hash = '#explore'; } return; }
    if (href === '#watch') { setScreen('watch'); return; }
    if (href === '#help' || href === '#guide') { ev.preventDefault(); openHelp(); return; }
    if (href.charAt(0) === '#' && href.length > 1) {
      if (document.body.getAttribute('data-screen') !== 'home') setScreen('home');
    }
  }, true);

  function routeV4() {
    var h = '';
    try { h = decodeURIComponent((location.hash || '').replace(/^#/, '')); } catch (e) { h = ''; }
    var m = h.match(/^panel\/(stock|etf|index)\/([A-Za-z0-9._-]+)$/);
    if (m) {
      if (wide()) { openDrawer(m[1], m[2], false); }
      else { location.hash = '#detail/' + m[1] + '/' + m[2]; }
      return;
    }
    if (h !== '' && h.indexOf('detail/') !== 0) closeDrawer(true);
    if (h === 'explore') { setScreen('explore'); return; }
    if (h === 'watch') { setScreen('watch'); return; }
    if (h === 'help' || h === 'guide') { openHelp(); return; }
    if (h === '' || h === 'top' || (h.indexOf('detail/') !== 0)) {
      if (!h || document.getElementById(h)) setScreen('home');
    }
  }
  window.addEventListener('hashchange', routeV4);
  window.addEventListener('popstate', routeV4);

  /* 공유용 쿼리 — ?code=006260 → 종목 상세 */
  (function () {
    try {
      var qs = new URLSearchParams(location.search);
      var code = qs.get('code');
      if (code && !location.hash) {
        var kind = (DET.etfs || {})[code] ? 'etf' : 'stock';
        location.replace(location.pathname + location.search + '#detail/' + kind + '/' + code.replace(/[^A-Za-z0-9._-]/g, ''));
      }
    } catch (e) {}
  })();

  /* ── 14) 종목 카드에 관심·계획 버튼 ─────────────────────── */
  $$('.pick').forEach(function (card) {
    var code = (card.id || '').replace('pick-', '');
    if (!code) return;
    var body = card.querySelector('.pick-body');
    if (!body) return;
    var bar = document.createElement('div');
    bar.className = 'pick-userbar';
    bar.innerHTML = '<button type="button" data-watch="' + escAttr(code) + '" data-name="' + escAttr(nameOf(code)) + '">☆ 관심</button>' +
      '<button type="button" data-plan="' + escAttr(code) + '">🧮 계획</button>' +
      '<button type="button" data-alert="' + escAttr(code) + '">🔔 조건</button>';
    body.appendChild(bar);
    syncWatchButtons(code);
  });

  /* ── 15) 통합 검색 색인 보강(섹터·일정) ─────────────────── */
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  function choseong(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xAC00 && c <= 0xD7A3) out += CHO.charAt(Math.floor((c - 0xAC00) / 588));
      else out += s.charAt(i).toLowerCase();
    }
    return out;
  }
  (function () {
    var anchor = {};
    ((DATA.flow || {}).sectors || []).forEach(function (s) {
      if (s && s.name && s.anchor) anchor[s.name] = String(s.anchor).replace('#', '');
    });
    ((DATA.sectors || {}).inflow || []).forEach(function (s) {
      if (!s || !s.name) return;
      IDX.push({ t: 'sec:' + s.name, n: s.name, m: '섹터', k: 'sector', hs: choseong(s.name),
                 a: anchor[s.name] || 'sectors', c: s.chg });
    });
    var calIdx = {};
    ((DATA.cal_days || [])).forEach(function (d, i) { if (d && d.iso) calIdx[d.iso] = i; });
    ((DATA.schedule || [])).forEach(function (e) {
      if (!e || !e.name) return;
      var iso = String(e.date || '').slice(0, 10);
      IDX.push({ t: 'ev:' + iso + ':' + String(e.name).slice(0, 8), n: e.name, m: '일정', k: 'event',
                 hs: choseong(e.name), d: iso.slice(5).replace('-', '/'),
                 cal: calIdx[iso] != null ? calIdx[iso] : -1 });
    });
  })();

  /* ── 16) 초기 상태 ─────────────────────────────────────── */
  renderWatch();
  setScreen(location.hash === '#explore' ? 'explore' : (location.hash === '#watch' ? 'watch' : 'home'));
  if (location.hash === '#explore') applyExplore(exTab);
  routeV4();
  syncThemeBtns();

  /* 상세 페이지(#detail/...)에 도구 붙이기 — 기존 라우터가 그린 뒤 실행 */
  function decorateDetailRoot() {
    var r = $('#detailRoot');
    if (!r || r.hidden) return;
    var m = (location.hash || '').match(/^#detail\/(stock|etf|index)\/([A-Za-z0-9._-]+)$/);
    if (m && m[1] === 'stock') injectTools(r, 'stock', m[2]);
  }
  window.addEventListener('hashchange', function () { setTimeout(decorateDetailRoot, 60); });
  setTimeout(decorateDetailRoot, 120);

  /* ESC: 시트 → 패널 순서로 닫기 */
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (sheet && !sheet.hidden) { closeSheet(); return; }
    if (drawer && !drawer.hidden) closeDrawer(false);
  });

  /* 화면 폭이 넓어지면 열린 패널 유지, 좁아지면 전체 페이지로 */
  window.addEventListener('resize', function () {
    if (!wide() && drawer && !drawer.hidden) {
      var m = (location.hash || '').match(/^#panel\/(stock|etf|index)\/(.+)$/);
      if (m) location.hash = '#detail/' + m[1] + '/' + m[2];
      else closeDrawer(true);
    }
  });
})();
