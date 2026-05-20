/**
 * app.js — IPC Monitor 클라이언트 entrypoint
 * 해시 라우팅: #/ → Dashboard, #/channels/:name → Channel Viewer
 */
import { SseClient } from '/lib/sse.js';
import { VirtualList } from '/lib/virtual-list.js';

// ── 상태 ─────────────────────────────────────────────
const state = {
  theme: localStorage.getItem('theme') ?? 'light',
  sseClient: null,   // 전역 SSE (Dashboard heartbeat용)
};

// ── 테마 ─────────────────────────────────────────────
function applyTheme(t) {
  state.theme = t;
  document.documentElement.dataset.theme = t === 'dark' ? 'dark' : '';
  localStorage.setItem('theme', t);
}
applyTheme(state.theme);

// ── 라우터 ────────────────────────────────────────────
function parseRoute() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const m = hash.match(/^\/channels\/([^/?]+)/);
  if (m) return { name: 'channel', channelName: decodeURIComponent(m[1]) };
  return { name: 'dashboard' };
}

function navigate(path) {
  location.hash = path;
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

function render() {
  // 기존 SSE 정리
  state.sseClient?.close();
  state.sseClient = null;

  const route = parseRoute();
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '';

  if (route.name === 'channel') {
    renderChannelViewer(app, route.channelName);
  } else {
    renderDashboard(app);
  }
}

// ── 공통 헤더 빌더 ────────────────────────────────────
function buildHeader({ title, extra = [] } = {}) {
  const header = document.createElement('header');
  header.className = 'page-header';

  const logo = document.createElement('span');
  logo.className = 'logo';
  logo.textContent = title ?? 'IPC Monitor';
  header.append(logo);

  extra.forEach(el => header.append(el));

  const spacer = document.createElement('span');
  spacer.className = 'spacer';
  header.append(spacer);

  // SSE 상태 인디케이터
  const ind = document.createElement('span');
  ind.className = 'sse-indicator';
  ind.innerHTML = '<span class="sse-dot"></span><span class="sse-label">--</span>';
  header.append(ind);
  header._sseIndicator = ind;

  // 테마 토글
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.title = 'Toggle theme';
  toggle.textContent = state.theme === 'dark' ? '☀' : '☾';
  toggle.onclick = () => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    toggle.textContent = next === 'dark' ? '☀' : '☾';
  };
  header.append(toggle);

  return header;
}

function setSseStatus(header, status, label) {
  const ind = header._sseIndicator;
  if (!ind) return;
  ind.className = `sse-indicator ${status}`;
  ind.querySelector('.sse-label').textContent = label;
}

// ── 상대 시간 포맷 ────────────────────────────────────
function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── SC-001 Dashboard ──────────────────────────────────
function renderDashboard(app) {
  const header = buildHeader();
  app.append(header);

  const main = document.createElement('div');
  main.className = 'dashboard';
  app.append(main);

  main.innerHTML = `
    <h2>Channels</h2>
    <div class="channel-grid" id="channel-grid">
      ${[1, 2, 3].map(() => `<div class="skeleton-card"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>`).join('')}
    </div>`;

  loadChannels(main.querySelector('#channel-grid'), header);
}

async function loadChannels(grid, header) {
  try {
    const res = await fetch('/api/v1/channels');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { channels } = await res.json();
    setSseStatus(header, 'connected', 'live');

    if (!channels?.length) {
      grid.innerHTML = `<div class="state-box"><div class="title">채널이 없습니다</div><div class="sub">IPC 채널 디렉토리를 확인하세요</div></div>`;
      return;
    }

    grid.innerHTML = '';
    channels.forEach(ch => {
      const card = buildChannelCard(ch);
      card.onclick = () => navigate(`/channels/${encodeURIComponent(ch.name)}`);
      grid.append(card);
    });

    // 30초마다 카드 메타 갱신
    const interval = setInterval(async () => {
      if (!document.getElementById('channel-grid')) { clearInterval(interval); return; }
      const r = await fetch('/api/v1/channels').catch(() => null);
      if (!r?.ok) return;
      const { channels: updated } = await r.json();
      updated.forEach(ch => {
        const card = grid.querySelector(`[data-channel="${ch.name}"]`);
        if (card) updateChannelCardMeta(card, ch);
      });
    }, 30000);

  } catch (err) {
    setSseStatus(header, 'error', 'error');
    grid.innerHTML = `
      <div class="state-box">
        <div class="title">데이터 로드 실패</div>
        <div class="sub">${err.message}</div>
        <button id="retry-btn">재시도</button>
      </div>`;
    grid.querySelector('#retry-btn').onclick = () => {
      grid.innerHTML = '';
      loadChannels(grid, header);
    };
  }
}

function buildChannelCard(ch) {
  const el = document.createElement('div');
  el.className = 'channel-card';
  el.dataset.channel = ch.name;
  el.innerHTML = `<div class="name">${escHtml(ch.name)}</div><div class="meta"></div>`;
  updateChannelCardMeta(el, ch);
  return el;
}

function updateChannelCardMeta(card, ch) {
  card.querySelector('.meta').innerHTML = `
    <span>msgs <strong>${(ch.total ?? 0).toLocaleString()}</strong></span>
    <span>last <strong>${relativeTime(ch.lastTs)}</strong></span>`;
}

// ── SC-002 Channel Viewer ─────────────────────────────
function renderChannelViewer(app, channelName) {
  // 뷰어 레이아웃
  const viewer = document.createElement('div');
  viewer.className = 'viewer';
  app.append(viewer);

  // 헤더
  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.title = '뒤로가기';
  backBtn.innerHTML = '&#8592;';
  backBtn.onclick = () => navigate('/');

  const nameSp = document.createElement('span');
  nameSp.className = 'channel-name';
  nameSp.textContent = channelName;

  const liveBadge = document.createElement('span');
  liveBadge.className = 'live-badge';
  liveBadge.textContent = 'live';

  const pauseBtn = document.createElement('button');
  pauseBtn.className = 'pause-btn';
  pauseBtn.textContent = '⏸ pause';

  const header = buildHeader({ title: null, extra: [backBtn, nameSp, liveBadge, pauseBtn] });
  header.querySelector('.logo')?.remove(); // 로고 불필요
  viewer.append(header);

  // 재연결 배너
  const reconnBanner = document.createElement('div');
  reconnBanner.className = 'reconnect-banner';
  reconnBanner.textContent = '연결 중…';
  viewer.append(reconnBanner);

  // "N new" 띠
  const newBanner = document.createElement('div');
  newBanner.className = 'new-banner';
  newBanner.onclick = () => flushPending();
  viewer.append(newBanner);

  // 스트림 컨테이너
  const streamEl = document.createElement('div');
  streamEl.className = 'stream-container';
  viewer.append(streamEl);

  // ── 상태 변수 ──────────────────────────────────
  let paused = false;
  let pendingItems = [];    // pause 중 누적
  let vl = null;            // VirtualList 인스턴스

  // 가상 스크롤 초기화
  vl = new VirtualList(streamEl, { rowHeight: 24, renderRow: buildMsgRow });

  function flushPending() {
    if (!pendingItems.length) return;
    pendingItems.forEach(item => vl.append(item));
    pendingItems = [];
    newBanner.classList.remove('visible');
    vl.setAutoScroll(true);
  }

  // pause 토글
  pauseBtn.onclick = () => {
    paused = !paused;
    pauseBtn.classList.toggle('active', paused);
    pauseBtn.textContent = paused ? '▶ resume' : '⏸ pause';
    liveBadge.classList.toggle('paused', paused);
    if (!paused) flushPending();
  };

  function pushMessage(item) {
    if (paused) {
      pendingItems.push(item);
      newBanner.textContent = `${pendingItems.length} new — 클릭해서 보기`;
      newBanner.classList.add('visible');
    } else {
      vl.append(item);
    }
  }

  // ── snapshot 로드 ──────────────────────────────
  loadSnapshot(channelName, vl, header);

  // ── SSE 구독 ───────────────────────────────────
  const sseUrl = `/api/v1/stream?channels=${encodeURIComponent(channelName)}`;
  const sse = new SseClient(sseUrl, {
    open: () => {
      setSseStatus(header, 'connected', 'live');
      reconnBanner.classList.remove('visible');
    },
    message: (data) => {
      if (data.channel !== channelName) return;
      pushMessage(data);
    },
    snapshot_begin: () => {},
    heartbeat: () => {},
    error: (code, delay) => {
      if (code === 'max_retries') {
        setSseStatus(header, 'error', 'failed');
        streamEl.innerHTML = `<div class="sse-failed">
          <div>SSE 연결에 실패했습니다</div>
          <button id="manual-retry">재시도</button>
        </div>`;
        document.getElementById('manual-retry').onclick = () => renderChannelViewer(app, channelName);
      } else {
        setSseStatus(header, 'reconnecting', `재연결 ${Math.round(delay / 1000)}s…`);
        reconnBanner.textContent = `연결 끊김 — ${Math.round(delay / 1000)}s 후 재연결`;
        reconnBanner.classList.add('visible');
      }
    },
  });
  state.sseClient = sse;
}

async function loadSnapshot(channelName, vl, header) {
  try {
    const res = await fetch(`/api/v1/channels/${encodeURIComponent(channelName)}/messages?limit=200`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { messages } = await res.json();
    if (messages?.length) {
      vl.setItems(messages);
      // 최초 렌더 후 하단 스크롤
      requestAnimationFrame(() => {
        const container = vl.container;
        container.scrollTop = container.scrollHeight;
      });
    }
  } catch (err) {
    setSseStatus(header, 'error', 'snapshot error');
    console.warn('snapshot load failed:', err.message);
  }
}

// ── 메시지 행 렌더 ────────────────────────────────────
function buildMsgRow(item) {
  const row = document.createElement('div');
  row.className = 'msg-row';

  if (item.kind === 'malformed') {
    row.innerHTML = `
      <span class="msg-ts">${fmtTs(item.ts)}</span>
      <span class="badge badge-malformed">MALFORMED</span>
      <span class="msg-body">${escHtml(item.raw ?? '')}</span>`;
    return row;
  }

  const badge = buildToBadge(item.to, item.toKind);

  row.innerHTML = `
    <span class="msg-ts">${fmtTs(item.ts)}</span>
    <span class="msg-from">${escHtml(item.from ?? '?')}</span>
    <span class="msg-arrow">→</span>
    ${badge}
    <span class="msg-body">${escHtml(bodyText(item.body))}</span>`;
  return row;
}

function buildToBadge(to, toKind) {
  if (toKind === 'all' || to === 'all') {
    return `<span class="badge badge-broadcast">→all</span>`;
  }
  if (toKind === 'group' || (typeof to === 'string' && to.includes(','))) {
    return `<span class="badge badge-group">→${escHtml(to)}</span>`;
  }
  return `<span class="badge badge-single">→${escHtml(to ?? '?')}</span>`;
}

function bodyText(body) {
  if (body === null || body === undefined) return '';
  if (typeof body === 'string') {
    // 문자열이 JSON처럼 보이면 파싱 후 pretty 출력
    const trimmed = body.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try { return JSON.stringify(JSON.parse(trimmed), null, 2); } catch { /* fallthrough */ }
    }
    return body;
  }
  try { return JSON.stringify(body, null, 2); } catch { return String(body); }
}

function fmtTs(isoStr) {
  if (!isoStr) return '--:--:--';
  const d = new Date(isoStr);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
