import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from './config.mjs';
import { log } from './log.mjs';
import { channelsRouter } from './routes/channels.mjs';
import { streamRouter } from './routes/stream.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const app = express();

// ── 미들웨어 ──────────────────────────────────────────
app.use(express.json());
app.use((req, _res, next) => {
  log.info({ method: req.method, url: req.url }, 'req');
  next();
});

// ── API 라우터 ────────────────────────────────────────
app.get('/healthz', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get('/api/v1/config', (_req, res) => res.json({ ipcRoot: config.IPC_ROOT || null, port: config.PORT }));
app.use('/api/v1/channels', channelsRouter);
app.use('/api/v1/stream', streamRouter);

// ── Static 파일 서비스 (SPA) ──────────────────────────
app.use(express.static(publicDir));

// 해시 라우팅: 모든 미지정 경로는 index.html로 (Express 5 wildcard 문법)
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── 서버 기동 ─────────────────────────────────────────
app.listen(config.PORT, config.HOST, () => {
  log.info({ port: config.PORT, host: config.HOST, ipcRoot: config.IPC_ROOT || '(mock mode)' }, 'IPC Monitor started');
  console.log(`\nIPC Monitor: http://${config.HOST}:${config.PORT}\n`);
});
