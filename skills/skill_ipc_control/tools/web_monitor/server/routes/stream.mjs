/**
 * GET /api/v1/stream?channels=name1,name2
 *
 * SSE 단일 endpoint. MVP에서는 IPC_ROOT 파일 tail 기반으로 push.
 * IPC_ROOT 미설정 시 heartbeat + mock 메시지만 주기적으로 emit.
 */
import { Router } from 'express';
import { config } from '../config.mjs';
import { log } from '../log.mjs';
import fs from 'node:fs';
import path from 'node:path';

export const streamRouter = Router();

// ── SSE 유틸 ─────────────────────────────────────────
function sseWrite(res, eventType, data, id) {
  if (id !== undefined) res.write(`id:${id}\n`);
  res.write(`event:${eventType}\n`);
  res.write(`data:${JSON.stringify(data)}\n\n`);
}

// ── GET /api/v1/stream ────────────────────────────────
streamRouter.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const channelParam = req.query.channels ?? '';
  const channels = channelParam.split(',').map(s => s.trim()).filter(Boolean);

  log.info({ channels }, 'SSE client connected');

  // 각 채널의 tail 상태 (offset)
  const tails = {};
  for (const ch of channels) {
    tails[ch] = { offset: 0, initialized: false };
  }

  // ── 파일 tail 폴링 (250ms) ──────────────────────────
  function pollChannel(ch) {
    const root = config.IPC_ROOT;
    if (!root) return;

    const inboxPath = path.join(root, ch, 'inbox.log');
    try {
      const stat = fs.statSync(inboxPath);
      const { offset } = tails[ch];

      if (!tails[ch].initialized) {
        // 최초 진입: 현재 파일 끝에서부터 tail
        tails[ch].offset = stat.size;
        tails[ch].initialized = true;
        sseWrite(res, 'snapshot_begin', { channel: ch, total: 0, headOffset: stat.size, serverTs: new Date().toISOString() });
        return;
      }

      if (stat.size < offset) {
        // truncate 감지 — 오프셋 리셋
        tails[ch].offset = 0;
      }

      if (stat.size <= tails[ch].offset) return;

      const fd = fs.openSync(inboxPath, 'r');
      const len = stat.size - tails[ch].offset;
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, tails[ch].offset);
      fs.closeSync(fd);
      tails[ch].offset = stat.size;

      const text = buf.toString('utf8');
      const lines = text.split('\n').filter(Boolean);
      let lineOffset = tails[ch].offset - len;

      for (const line of lines) {
        lineOffset += Buffer.byteLength(line, 'utf8') + 1;
        try {
          const msg = JSON.parse(line);
          sseWrite(res, 'message', { ...msg, channel: ch, offset: lineOffset }, `chan:${ch}:offset:${lineOffset}`);
        } catch (e) {
          sseWrite(res, 'message', {
            kind: 'malformed', channel: ch, raw: line,
            error: e.message, offset: lineOffset, ts: new Date().toISOString(),
          }, `chan:${ch}:offset:${lineOffset}`);
        }
      }
    } catch { /* 파일 없음 — 무시 */ }
  }

  const pollInterval = setInterval(() => {
    for (const ch of channels) pollChannel(ch);
  }, 250);

  // ── heartbeat (15s) ────────────────────────────────
  const hbInterval = setInterval(() => {
    sseWrite(res, 'heartbeat', { serverTs: new Date().toISOString() });
  }, 15000);

  // ── mock 모드: IPC_ROOT 없으면 3초마다 fake message ─
  let mockSeq = 0;
  let mockInterval = null;
  if (!config.IPC_ROOT) {
    const mockTemplates = [
      { from: 'a', to: 'all', toKind: 'all', body: 'heartbeat ok' },
      { from: 'b', to: 'a', toKind: 'single', body: 'ack received' },
      { from: 'a', to: 'a,b', toKind: 'group', body: 'group update' },
    ];
    mockInterval = setInterval(() => {
      const ch = channels[mockSeq % channels.length] ?? 'mock';
      const tmpl = mockTemplates[mockSeq % mockTemplates.length];
      sseWrite(res, 'message', {
        kind: 'msg', channel: ch,
        id: `mock-live-${mockSeq}`,
        ts: new Date().toISOString(),
        offset: mockSeq,
        ...tmpl,
      }, `chan:${ch}:offset:${mockSeq}`);
      mockSeq++;
    }, 3000);
  }

  // ── 클라이언트 종료 처리 ────────────────────────────
  req.on('close', () => {
    clearInterval(pollInterval);
    clearInterval(hbInterval);
    if (mockInterval) clearInterval(mockInterval);
    log.info({ channels }, 'SSE client disconnected');
  });
});
