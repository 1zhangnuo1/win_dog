import moodSystem from '../core/mood-system.js';
import state from '../core/state.js';

export class MoodIndicator {
  constructor() {
    this.el = document.getElementById('mood-indicator');
    this.emojiEl = this.el.querySelector('.mood-emoji');
    this._update();

    // 监听心情变化
    state.on('moodState', () => this._update());
  }

  _update() {
    const emoji = moodSystem.getMoodEmoji();
    this.emojiEl.textContent = emoji;
  }
}
