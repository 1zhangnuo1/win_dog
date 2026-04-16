const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '.env') });

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 340,
    height: 480,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // 鼠标穿透：渲染进程通知是否穿透
  ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  });

  // 右键菜单
  ipcMain.on('show-context-menu', () => {
    const menu = Menu.buildFromTemplate([
      { label: '和小狗聊天', click: () => mainWindow.webContents.send('menu-action', 'chat') },
      { label: '让小狗写文档', click: () => mainWindow.webContents.send('menu-action', 'write-doc') },
      { type: 'separator' },
      { label: '小狗表演', submenu: [
        { label: '打滚', click: () => mainWindow.webContents.send('menu-action', 'anim-rollover') },
        { label: '撒娇', click: () => mainWindow.webContents.send('menu-action', 'anim-cute') },
        { label: '坐下', click: () => mainWindow.webContents.send('menu-action', 'anim-sit') },
        { label: '趴下', click: () => mainWindow.webContents.send('menu-action', 'anim-lie') },
      ]},
      { type: 'separator' },
      { label: '重置心情', click: () => mainWindow.webContents.send('menu-action', 'reset-mood') },
      { label: '查看历史对话', click: () => mainWindow.webContents.send('menu-action', 'view-history') },
      { label: '清空对话', click: () => mainWindow.webContents.send('menu-action', 'clear-chat') },
      { type: 'separator' },
      { label: '隐藏小狗', click: () => mainWindow.hide() },
      { label: '退出', click: () => { app.isQuitting = true; app.quit(); } },
    ]);
    menu.popup({ window: mainWindow });
  });

  // 保存文件到桌面
  ipcMain.handle('file:write', async (event, { fileName, content }) => {
    try {
      const desktop = require('os').homedir() + '/Desktop';
      const filePath = path.join(desktop, fileName);
      // 避免覆盖已有文件，加序号
      let finalPath = filePath;
      let counter = 1;
      while (fs.existsSync(finalPath)) {
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        finalPath = path.join(desktop, `${base}_${counter}${ext}`);
        counter++;
      }
      fs.writeFileSync(finalPath, content, 'utf-8');
      return { data: { path: finalPath } };
    } catch (err) {
      return { error: err.message };
    }
  });

  // 窗口拖拽：通过IPC移动窗口
  let dragStartX, dragStartY, winStartX, winStartY;
  ipcMain.on('drag:start', (event, { screenX, screenY }) => {
    dragStartX = screenX;
    dragStartY = screenY;
    const [x, y] = mainWindow.getPosition();
    winStartX = x;
    winStartY = y;
  });
  ipcMain.on('drag:move', (event, { screenX, screenY }) => {
    const dx = screenX - dragStartX;
    const dy = screenY - dragStartY;
    mainWindow.setPosition(winStartX + dx, winStartY + dy);
  });

  // 点击关闭按钮时隐藏到托盘
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  // 使用一个简单的16x16像素图标（程序化生成）
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示小狗', click: () => mainWindow.show() },
    { label: '隐藏小狗', click: () => mainWindow.hide() },
    { type: 'separator' },
    { label: '退出', click: () => {
      app.isQuitting = true;
      app.quit();
    }},
  ]);
  tray.setToolTip('桌面小狗机器人');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
}

// ===== IPC: 智谱API调用 =====

// 文件读取与解析
ipcMain.handle('file:read', async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let text = '';

    if (ext === '.md' || ext === '.txt') {
      text = fs.readFileSync(filePath, 'utf-8');
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      text = data.text;
    } else {
      return { error: `不支持的文件格式: ${ext}` };
    }

    // 截取前3000字符，避免token过多
    if (text.length > 3000) {
      text = text.slice(0, 3000) + '\n...(文档过长，已截取前3000字)';
    }

    const fileName = path.basename(filePath);
    return { data: { text, fileName } };
  } catch (err) {
    return { error: `文件读取失败: ${err.message}` };
  }
});

ipcMain.handle('chat:text', async (event, { messages, model }) => {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    return { error: '请先在 .env 文件中配置 ZHIPU_API_KEY' };
  }

  try {
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: model || 'glm-4',
        messages,
        stream: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );
    return { data: response.data };
  } catch (err) {
    return { error: err.response?.data?.error?.message || err.message };
  }
});

// 流式调用
ipcMain.handle('chat:stream', async (event, { messages, model }) => {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    return { error: '请先在 .env 文件中配置 ZHIPU_API_KEY' };
  }

  try {
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: model || 'glm-4',
        messages,
        stream: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        timeout: 120000,
      }
    );

    return new Promise((resolve) => {
      let fullContent = '';
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(l => l.startsWith('data:'));
        for (const line of lines) {
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullContent += delta;
              event.sender.send('chat:stream:chunk', delta);
            }
          } catch (_) {}
        }
      });
      response.data.on('end', () => {
        event.sender.send('chat:stream:done', fullContent);
        resolve({ data: { content: fullContent } });
      });
      response.data.on('error', (err) => {
        resolve({ error: err.message });
      });
    });
  } catch (err) {
    return { error: err.response?.data?.error?.message || err.message };
  }
});

// 图片分析
ipcMain.handle('chat:image', async (event, { messages }) => {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    return { error: '请先在 .env 文件中配置 ZHIPU_API_KEY' };
  }

  try {
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: 'glm-4v-flash',
        messages,
        stream: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        timeout: 120000,
      }
    );

    return new Promise((resolve) => {
      let fullContent = '';
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(l => l.startsWith('data:'));
        for (const line of lines) {
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullContent += delta;
              event.sender.send('chat:stream:chunk', delta);
            }
          } catch (_) {}
        }
      });
      response.data.on('end', () => {
        event.sender.send('chat:stream:done', fullContent);
        resolve({ data: { content: fullContent } });
      });
      response.data.on('error', (err) => {
        resolve({ error: err.message });
      });
    });
  } catch (err) {
    return { error: err.response?.data?.error?.message || err.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
