/**
 * Flat list — 동일 API 유지 (setItems/append/setAutoScroll/length)
 * 가변 높이 메시지(전문 표시 + JSON pretty)를 지원하기 위해 가상화 비활성.
 * MVP 채널 메시지 수가 크지 않아 충분.
 */

export class VirtualList {
  /**
   * @param {HTMLElement} container  scroll container (overflow-y: auto)
   * @param {{ renderRow: (item: any, index: number) => HTMLElement }} opts
   */
  constructor(container, opts) {
    this.container = container;
    this.renderRow = opts.renderRow;
    this._items = [];
    this._autoScroll = true;

    this._viewport = Object.assign(document.createElement('div'), { className: 'vl-viewport' });
    container.appendChild(this._viewport);
  }

  setItems(items) {
    this._items = items.slice();
    this._viewport.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < this._items.length; i++) {
      frag.appendChild(this.renderRow(this._items[i], i));
    }
    this._viewport.appendChild(frag);
    if (this._autoScroll) this._scrollToBottom();
  }

  append(item) {
    this._items.push(item);
    this._viewport.appendChild(this.renderRow(item, this._items.length - 1));
    if (this._autoScroll) this._scrollToBottom();
  }

  setAutoScroll(enabled) {
    this._autoScroll = enabled;
    if (enabled) this._scrollToBottom();
  }

  get length() { return this._items.length; }

  _scrollToBottom() {
    requestAnimationFrame(() => {
      this.container.scrollTop = this.container.scrollHeight;
    });
  }
}
