/**
 * SSE wrapper: 자동 재연결 + exponential backoff
 * 브라우저가 Last-Event-ID를 자동 송신하므로 재연결 시 별도 처리 불필요.
 */

const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30000;
const MAX_RETRIES = 10;

export class SseClient {
  /** @param {string} url  @param {Record<string, (data: any) => void>} handlers */
  constructor(url, handlers = {}) {
    this.url = url;
    this.handlers = handlers;
    this._es = null;
    this._retries = 0;
    this._closed = false;
    this._connect();
  }

  _connect() {
    if (this._closed) return;
    this._es = new EventSource(this.url);

    this._es.onopen = () => {
      this._retries = 0;
      this.handlers.open?.();
    };

    // 등록된 이벤트 타입마다 리스너 연결
    for (const [type, fn] of Object.entries(this.handlers)) {
      if (type === 'open' || type === 'error') continue;
      this._es.addEventListener(type, (e) => {
        try { fn(JSON.parse(e.data)); } catch { fn(e.data); }
      });
    }

    this._es.onerror = () => {
      this._es.close();
      if (this._closed) return;
      this._retries++;
      if (this._retries > MAX_RETRIES) {
        this.handlers.error?.('max_retries');
        return;
      }
      const delay = Math.min(BACKOFF_BASE_MS * 2 ** (this._retries - 1), BACKOFF_MAX_MS);
      this.handlers.error?.('reconnecting', delay);
      setTimeout(() => this._connect(), delay);
    };
  }

  close() {
    this._closed = true;
    this._es?.close();
  }
}
