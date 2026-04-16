import state from '../core/state.js';
import moodSystem from '../core/mood-system.js';

export class ResponseBubble {
  constructor() {
    this.el = document.getElementById('response-bubble');
    this.textEl = document.getElementById('response-text');
    this._hideTimer = null;
    this._fullText = '';
  }

  show() {
    this.el.classList.remove('hidden');
    // 添加心情颜色
    const moodClass = moodSystem.getBubbleClass();
    this.el.className = 'bubble response-bubble ' + moodClass;
    this._fullText = '';
    this.textEl.textContent = '';
    this._clearHideTimer();
  }

  appendChunk(chunk) {
    this._fullText += chunk;
    this.textEl.textContent = this._fullText;
    // 自动滚动到底部
    this.el.scrollTop = this.el.scrollHeight;
  }

  setText(text) {
    this._fullText = text;
    this.textEl.textContent = text;
  }

  hide() {
    this.el.style.animation = 'bubbleOut 0.3s ease forwards';
    setTimeout(() => {
      this.el.classList.add('hidden');
      this.el.style.animation = '';
    }, 300);
  }

  // 显示完成后自动消失
  autoHide(delay = 8000) {
    this._clearHideTimer();
    this._hideTimer = setTimeout(() => this.hide(), delay);
  }

  _clearHideTimer() {
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
  }
}
