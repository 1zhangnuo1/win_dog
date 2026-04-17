const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 文本对话（非流式）
  chatText: (messages, model) => ipcRenderer.invoke('chat:text', { messages, model }),

  // 文本对话（流式）
  chatStream: (messages, model) => ipcRenderer.invoke('chat:stream', { messages, model }),

  // 图片分析（流式）
  chatImage: (messages) => ipcRenderer.invoke('chat:image', { messages }),

  // 流式事件监听
  onStreamChunk: (callback) => {
    ipcRenderer.on('chat:stream:chunk', (_, chunk) => callback(chunk));
  },
  onStreamDone: (callback) => {
    ipcRenderer.on('chat:stream:done', (_, content) => callback(content));
  },

  // 移除监听
  removeAllStreamListeners: () => {
    ipcRenderer.removeAllListeners('chat:stream:chunk');
    ipcRenderer.removeAllListeners('chat:stream:done');
  },

  // 窗口拖拽
  dragStart: (screenX, screenY) => ipcRenderer.send('drag:start', { screenX, screenY }),
  dragMove: (screenX, screenY) => ipcRenderer.send('drag:move', { screenX, screenY }),

  // 文件读取
  fileRead: (filePath) => ipcRenderer.invoke('file:read', filePath),

  // 文件写入（保存到桌面）
  fileWrite: (fileName, content) => ipcRenderer.invoke('file:write', { fileName, content }),

  // 鼠标穿透控制
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),

  // 右键菜单
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (_, action) => callback(action)),

  // 平台信息 & Linux 鼠标穿透支持
  platform: process.platform,
  onLinuxMouseMove: (callback) => {
    ipcRenderer.on('linux-mouse-move', (_, pos) => callback(pos));
  },
  sendHitResult: (hit) => {
    ipcRenderer.send('linux-hit-result', hit);
  },
});
