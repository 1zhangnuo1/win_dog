import state from './state.js';
import moodSystem from './mood-system.js';

class ChatEngine {
  constructor() {
    this._isProcessing = false;
  }

  get isProcessing() {
    return this._isProcessing;
  }

  // 发送文本消息（流式）
  async sendText(text, onChunk, onDone, onError) {
    if (this._isProcessing) return;
    this._isProcessing = true;
    state.set('isThinking', true);

    // 情感检测
    const sentiment = moodSystem.detectSentiment(text);
    moodSystem.applyEvent(sentiment);

    // 构建消息
    const systemPrompt = this._buildSystemPrompt();
    state.addChatHistory('user', text);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...state.get('chatHistory'),
    ];

    try {
      // 注册流式监听
      window.electronAPI.onStreamChunk((chunk) => {
        if (onChunk) onChunk(chunk);
      });

      window.electronAPI.onStreamDone((content) => {
        state.addChatHistory('assistant', content);
        moodSystem.applyEvent('chat');
        this._isProcessing = false;
        state.set('isThinking', false);
        if (onDone) onDone(content);
      });

      const result = await window.electronAPI.chatStream(messages, 'glm-4-flash');

      if (result.error) {
        this._isProcessing = false;
        state.set('isThinking', false);
        if (onError) onError(result.error);
      }
    } catch (err) {
      this._isProcessing = false;
      state.set('isThinking', false);
      if (onError) onError(err.message);
    }
  }

  // 发送图片+文本（流式）
  async sendImage(imageBase64, text, onChunk, onDone, onError) {
    if (this._isProcessing) return;
    this._isProcessing = true;
    state.set('isThinking', true);

    moodSystem.applyEvent('image');

    const systemPrompt = this._buildSystemPrompt();
    const userMessage = {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageBase64 },
        },
        {
          type: 'text',
          text: text || '请描述这张图片',
        },
      ],
    };

    const messages = [
      { role: 'system', content: systemPrompt },
      ...state.get('chatHistory'),
      userMessage,
    ];

    try {
      window.electronAPI.onStreamChunk((chunk) => {
        if (onChunk) onChunk(chunk);
      });

      window.electronAPI.onStreamDone((content) => {
        state.addChatHistory('user', '[图片] ' + (text || '请描述这张图片'));
        state.addChatHistory('assistant', content);
        this._isProcessing = false;
        state.set('isThinking', false);
        if (onDone) onDone(content);
      });

      const result = await window.electronAPI.chatImage(messages);

      if (result.error) {
        this._isProcessing = false;
        state.set('isThinking', false);
        if (onError) onError(result.error);
      }
    } catch (err) {
      this._isProcessing = false;
      state.set('isThinking', false);
      if (onError) onError(err.message);
    }
  }

  _buildSystemPrompt() {
    const moodPrompt = moodSystem.getMoodPrompt();
    return `${moodPrompt}\n\n你是一只住在桌面上的可爱3D小狗。你的名字叫"汪小智"。你用中文回复，回复简洁有趣（不超过100字）。你可以帮用户回答问题、聊天、分析图片。`;
  }

  // 分析文档内容（流式）
  async analyzeDocument(text, fileName, onChunk, onDone, onError) {
    if (this._isProcessing) return;
    this._isProcessing = true;
    state.set('isThinking', true);
    moodSystem.applyEvent('curious');

    const systemPrompt = `${moodSystem.getMoodPrompt()}\n\n你是一只住在桌面上的可爱3D小狗，叫"汪小智"。用户给你了一份文档，请用中文简要概括文档的核心内容（不超过150字），用可爱的语气。`;

    const userMessage = `这是文件"${fileName}"的内容，请帮我看看这是什么文档，简要说明：\n\n${text}`;
    state.addChatHistory('user', `[拖入文件] ${fileName}`);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    try {
      window.electronAPI.onStreamChunk((chunk) => {
        if (onChunk) onChunk(chunk);
      });

      window.electronAPI.onStreamDone((content) => {
        state.addChatHistory('assistant', content);
        moodSystem.applyEvent('chat');
        this._isProcessing = false;
        state.set('isThinking', false);
        if (onDone) onDone(content);
      });

      const result = await window.electronAPI.chatStream(messages, 'glm-4-flash');

      if (result.error) {
        this._isProcessing = false;
        state.set('isThinking', false);
        if (onError) onError(result.error);
      }
    } catch (err) {
      this._isProcessing = false;
      state.set('isThinking', false);
      if (onError) onError(err.message);
    }
  }

  // 检测是否是文档生成请求
  isDocumentRequest(text) {
    const keywords = [
      '写一个文档', '写一份文档', '创建文档', '生成文档',
      '写一个文件', '创建文件', '生成文件',
      '帮我写', '帮我生成', '帮我创建',
      '写个', '写一篇', '写一份',
    ];
    const lower = text.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
  }

  // 生成文档并保存（流式）
  async generateDocument(userText, onChunk, onDone, onError) {
    if (this._isProcessing) return;
    this._isProcessing = true;
    state.set('isThinking', true);
    moodSystem.applyEvent('chat');

    const systemPrompt = `${moodSystem.getMoodPrompt()}\n\n你是一只住在桌面上的可爱3D小狗，叫"汪小智"。

用户想让你帮忙写一个文档/文件。请按以下格式回复，小狗会用魔法帮用户保存文件：

第一行必须是文件名，格式为 [文件名.扩展名]（根据内容选 .md / .txt）
第二行必须是分隔线 ---
从第三行开始是文件的实际内容。

写完内容后，用可爱的语气告诉用户文件已经生成。

示例回复：
[项目计划.md]
---
# 项目计划
## 一、项目概述
...
（内容）

汪汪！文件已经帮你生成好啦~ 📄`;

    state.addChatHistory('user', userText);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...state.get('chatHistory'),
    ];

    try {
      let fullContent = '';
      window.electronAPI.onStreamChunk((chunk) => {
        fullContent += chunk;
        if (onChunk) onChunk(chunk);
      });

      window.electronAPI.onStreamDone(async (content) => {
        state.addChatHistory('assistant', content);
        this._isProcessing = false;
        state.set('isThinking', false);

        // 解析文件名和内容
        const parsed = this._parseDocument(content);
        if (parsed) {
          const result = await window.electronAPI.fileWrite(parsed.fileName, parsed.content);
          if (result.data) {
            if (onDone) onDone(content, result.data.path);
          } else {
            if (onDone) onDone(content, null);
          }
        } else {
          if (onDone) onDone(content, null);
        }
      });

      const result = await window.electronAPI.chatStream(messages, 'glm-4-flash');
      if (result.error) {
        this._isProcessing = false;
        state.set('isThinking', false);
        if (onError) onError(result.error);
      }
    } catch (err) {
      this._isProcessing = false;
      state.set('isThinking', false);
      if (onError) onError(err.message);
    }
  }

  // 解析API返回的文档内容
  _parseDocument(text) {
    const match = text.match(/\[([^\]]+\.\w+)\]\s*\n---\n([\s\S]*)/);
    if (!match) return null;
    return {
      fileName: match[1].trim(),
      content: match[2].trim(),
    };
  }
}

const chatEngine = new ChatEngine();
export default chatEngine;
