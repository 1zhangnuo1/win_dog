// 全局状态管理 - 发布订阅模式
class StateManager {
  constructor() {
    this._state = {
      // 心情
      mood: {
        happiness: 70,
        energy: 80,
        curiosity: 50,
      },
      moodState: 'neutral', // neutral, happy, sad, curious, sleepy, excited

      // 聊天
      isThinking: false,
      isInputVisible: false,
      chatHistory: [], // [{role, content}]

      // 图片
      pendingImage: null, // base64

      // 拖拽
      isDragging: false,
    };

    this._listeners = new Map();
  }

  get(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this._state);
  }

  set(key, value) {
    const keys = key.split('.');
    let obj = this._state;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this._emit(key, value);
  }

  on(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, []);
    }
    this._listeners.get(key).push(callback);
  }

  off(key, callback) {
    if (!this._listeners.has(key)) return;
    const list = this._listeners.get(key);
    const idx = list.indexOf(callback);
    if (idx > -1) list.splice(idx, 1);
  }

  _emit(key, value) {
    if (this._listeners.has(key)) {
      for (const cb of this._listeners.get(key)) {
        cb(value);
      }
    }
  }

  // 便捷方法
  updateMood(deltas) {
    const mood = { ...this._state.mood };
    for (const [k, v] of Object.entries(deltas)) {
      mood[k] = Math.max(0, Math.min(100, mood[k] + v));
    }
    this._state.mood = mood;
    this._emit('mood', mood);
  }

  setMoodState(state) {
    this._state.moodState = state;
    this._emit('moodState', state);
  }

  addChatHistory(role, content) {
    this._state.chatHistory.push({ role, content });
    // 保留最近20轮
    if (this._state.chatHistory.length > 40) {
      this._state.chatHistory = this._state.chatHistory.slice(-40);
    }
    this._emit('chatHistory', this._state.chatHistory);
  }

  clearChatHistory() {
    this._state.chatHistory = [];
    this._emit('chatHistory', []);
  }
}

const state = new StateManager();
export default state;
