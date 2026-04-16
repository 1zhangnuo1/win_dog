import state from './state.js';

// 心情状态判定
function computeMoodState(mood) {
  const { happiness, energy, curiosity } = mood;

  if (energy < 30) return 'sleepy';
  if (happiness < 30) return 'sad';
  if (happiness >= 70 && energy >= 70) return 'excited';
  if (happiness >= 70 && energy >= 50) return 'happy';
  if (curiosity >= 60 && energy >= 40) return 'curious';
  return 'neutral';
}

// 心情描述 - 注入API prompt
const MOOD_PROMPTS = {
  happy: '你现在很开心，说话活泼热情，偶尔用可爱的语气。',
  excited: '你现在超级兴奋，说话充满活力，会用很多感叹号！',
  sad: '你现在有点难过委屈，说话低落，希望主人能多陪陪你。',
  curious: '你现在充满好奇心，对什么都感兴趣，会追问很多问题。',
  sleepy: '你现在很困，说话迷糊，偶尔打哈欠~',
  neutral: '你是一个可爱的桌面小狗助手，友好且乐于助人。',
};

// 心情emoji
const MOOD_EMOJIS = {
  happy: '😊',
  excited: '🤩',
  sad: '😢',
  curious: '🤔',
  sleepy: '😴',
  neutral: '🐶',
};

// 气泡CSS类
const MOOD_BUBBLE_CLASSES = {
  happy: 'mood-happy',
  excited: 'mood-excited',
  sad: 'mood-sad',
  curious: 'mood-curious',
  sleepy: 'mood-sleepy',
  neutral: '',
};

// 心情变化规则
const MOOD_DELTAS = {
  chat:       { happiness: 7, energy: -4, curiosity: 4 },
  idle:       { happiness: -3, energy: -2, curiosity: 2 },
  click:      { happiness: 2, energy: -1, curiosity: 1 },
  praise:     { happiness: 12, energy: 2, curiosity: 0 },
  negative:   { happiness: -8, energy: -2, curiosity: 3 },
  image:      { happiness: 3, energy: -3, curiosity: 10 },
  rest:       { happiness: 1, energy: 5, curiosity: -1 },
};

class MoodSystem {
  constructor() {
    this._idleTimer = null;
    this._startIdleTimer();
  }

  // 根据当前心情值计算状态
  evaluate() {
    const mood = state.get('mood');
    const newMoodState = computeMoodState(mood);
    const currentMoodState = state.get('moodState');

    if (newMoodState !== currentMoodState) {
      state.setMoodState(newMoodState);
    }

    return newMoodState;
  }

  // 触发心情变化
  applyEvent(eventType) {
    const deltas = MOOD_DELTAS[eventType];
    if (!deltas) return;
    state.updateMood(deltas);
    this.evaluate();
  }

  // 获取当前心情的system prompt
  getMoodPrompt() {
    const moodState = state.get('moodState');
    return MOOD_PROMPTS[moodState] || MOOD_PROMPTS.neutral;
  }

  // 获取心情emoji
  getMoodEmoji() {
    const moodState = state.get('moodState');
    return MOOD_EMOJIS[moodState] || MOOD_EMOJIS.neutral;
  }

  // 获取气泡CSS类
  getBubbleClass() {
    const moodState = state.get('moodState');
    return MOOD_BUBBLE_CLASSES[moodState] || '';
  }

  // 检测用户文本情感（简单关键词匹配）
  detectSentiment(text) {
    const positiveWords = ['可爱', '棒', '好', '喜欢', '爱', '聪明', '乖', '优秀', '厉害', '谢谢你', '谢谢'];
    const negativeWords = ['笨', '丑', '讨厌', '滚', '闭嘴', '烦', '坏', '走开', '不乖'];

    for (const w of positiveWords) {
      if (text.includes(w)) return 'praise';
    }
    for (const w of negativeWords) {
      if (text.includes(w)) return 'negative';
    }
    return 'chat';
  }

  // 空闲计时器 - 每5分钟降低心情
  _startIdleTimer() {
    this._idleTimer = setInterval(() => {
      if (!state.get('isThinking') && !state.get('isInputVisible')) {
        this.applyEvent('idle');
      }
    }, 5 * 60 * 1000);
  }

  destroy() {
    if (this._idleTimer) clearInterval(this._idleTimer);
  }
}

const moodSystem = new MoodSystem();
export default moodSystem;
export { MOOD_PROMPTS, MOOD_EMOJIS, MOOD_BUBBLE_CLASSES };
