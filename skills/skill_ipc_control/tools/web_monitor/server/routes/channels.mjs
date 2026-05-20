/**
 * GET /api/v1/channels
 * GET /api/v1/channels/:name/messages?limit=N
 *
 * IPC_ROOT가 설정되지 않은 경우 mock 데이터를 반환.
 * 실제 파일 tail 연동은 FileTailer 구현 후 교체 예정.
 */
import { Router } from 'express';
import { config } from '../config.mjs';
import { log } from '../log.mjs';
import fs from 'node:fs';
import path from 'node:path';

export const channelsRouter = Router();

// ── IPC_ROOT에서 채널 목록 스캔 ──────────────────────
function scanChannels() {
  const root = config.IPC_ROOT;
  if (!root) return null;

  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => {
        const name = e.name;
        const inboxPath = path.join(root, name, 'inbox.log');
        let total = 0;
        let lastTs = null;
        try {
          const stat = fs.statSync(inboxPath);
          lastTs = stat.mtime.toISOString();
          total = Math.floor(stat.size / 120);
        } catch { /* inbox.log 없음 */ }
        return { name, total, lastTs };
      });
  } catch (err) {
    log.warn({ err }, 'scanChannels failed');
    return null;
  }
}

// ── GET /api/v1/channels ─────────────────────────────
channelsRouter.get('/', (_req, res) => {
  const channels = scanChannels() ?? mockChannels();
  res.json({ channels });
});

// ── GET /api/v1/channels/:name/messages ──────────────
channelsRouter.get('/:name/messages', (req, res) => {
  const { name } = req.params;
  const limit = Math.min(parseInt(req.query.limit ?? '200'), 500);
  const messages = readMessages(name, limit) ?? mockMessages(name, limit);
  res.json({ messages });
});

// ── 파일 읽기: 최근 N줄 ──────────────────────────────
function readMessages(channelName, limit) {
  const root = config.IPC_ROOT;
  if (!root) return null;

  const inboxPath = path.join(root, channelName, 'inbox.log');
  try {
    const text = fs.readFileSync(inboxPath, 'utf8');
    const lines = text.split('\n').filter(Boolean);
    const recent = lines.slice(-limit);
    const baseOffset = lines.length - recent.length;
    return recent.map((line, i) => {
      try {
        return { ...JSON.parse(line), offset: baseOffset + i };
      } catch (e) {
        return { kind: 'malformed', raw: line, error: e.message, offset: baseOffset + i, ts: new Date().toISOString() };
      }
    });
  } catch {
    return null;
  }
}

// ── Mock 데이터 ───────────────────────────────────────
function mockChannels() {
  const now = new Date();
  return [
    { name: 'plan-loop', total: 842, lastTs: new Date(now - 12000).toISOString() },
    { name: 'build-loop', total: 311, lastTs: new Date(now - 65000).toISOString() },
    { name: 'debug', total: 4, lastTs: new Date(now - 3700000).toISOString() },
  ];
}

function mockMessages(channelName, limit) {
  const now = Date.now();
  const templates = [
    { from: 'a', to: 'all', toKind: 'all', body: 'snapshot ok' },
    { from: 'b', to: 'a', toKind: 'single', body: 'ack 42' },
    { from: 'a', to: 'a,b', toKind: 'group', body: 'broadcast update' },
    { from: 'c', to: 'a', toKind: 'single', body: 'hello' },
  ];
  return Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
    kind: 'msg',
    channel: channelName,
    id: `mock-${i}`,
    ts: new Date(now - (20 - i) * 3000).toISOString(),
    offset: i,
    ...templates[i % templates.length],
  }));
}
