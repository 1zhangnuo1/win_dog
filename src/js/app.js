import * as THREE from 'three';
import { initScene } from './renderer/scene.js';
import { setupLighting } from './renderer/lighting.js';
import { createProceduralDog, DogAnimator } from './renderer/dog.js';
import { InputBubble } from './ui/input-bubble.js';
import { ResponseBubble } from './ui/response-bubble.js';
import { MoodIndicator } from './ui/mood-indicator.js';
import { setupDragSimple } from './utils/drag.js';
import state from './core/state.js';
import moodSystem from './core/mood-system.js';
import chatEngine from './core/chat-engine.js';

// ===== 初始化 =====
const canvas = document.getElementById('dog-canvas');
const { renderer, scene, camera } = initScene(canvas);
setupLighting(scene);

// 创建小狗
const dogParts = createProceduralDog(scene);
const animator = new DogAnimator(dogParts);

// UI组件
const inputBubble = new InputBubble();
const responseBubble = new ResponseBubble();
const moodIndicator = new MoodIndicator();

// 拖拽
setupDragSimple();

// 思考气泡
const thinkingBubble = document.getElementById('thinking-bubble');

// 文件拖放指示器
const dropIndicator = document.getElementById('drop-indicator');

// ===== 右键旋转相机 =====
const orbit = {
  theta: 0,         // 水平角度
  phi: Math.PI / 6, // 垂直角度（从顶部算）
  radius: 6.0,      // 距离
  target: new THREE.Vector3(0, 0.0, 0), // 看向的点
  isRotating: false,
  lastX: 0,
  lastY: 0,
};

function updateCameraFromOrbit() {
  const x = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
  const y = orbit.radius * Math.cos(orbit.phi);
  const z = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
  camera.position.set(
    orbit.target.x + x,
    orbit.target.y + y,
    orbit.target.z + z
  );
  camera.lookAt(orbit.target);
}
updateCameraFromOrbit();

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2) { // 右键
    orbit.isRotating = true;
    orbit.hasDragged = false;
    orbit.startX = e.clientX;
    orbit.startY = e.clientY;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    e.preventDefault();
  }
});

document.addEventListener('mousemove', (e) => {
  if (orbit.isRotating) {
    const dx = e.clientX - orbit.lastX;
    const dy = e.clientY - orbit.lastY;
    if (Math.abs(e.clientX - orbit.startX) > 5 || Math.abs(e.clientY - orbit.startY) > 5) {
      orbit.hasDragged = true;
    }
    orbit.theta -= dx * 0.008;
    orbit.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, orbit.phi - dy * 0.008));
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    updateCameraFromOrbit();
  }
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    // 只有没拖动过才弹出菜单
    if (!orbit.hasDragged) {
      window.electronAPI.showContextMenu();
    }
    orbit.isRotating = false;
    orbit.hasDragged = false;
  }
});

// ===== 滚轮缩放 =====
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  orbit.radius += e.deltaY * 0.005;
  orbit.radius = Math.max(2.5, Math.min(12, orbit.radius));
  updateCameraFromOrbit();
}, { passive: false });

// 历史面板
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const btnCloseHistory = document.getElementById('btn-close-history');

function showHistory() {
  const history = state.get('chatHistory');
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">还没有对话记录~</div>';
  } else {
    for (const msg of history) {
      const div = document.createElement('div');
      div.className = `history-item ${msg.role}`;
      div.textContent = msg.content;
      historyList.appendChild(div);
    }
    historyList.scrollTop = historyList.scrollHeight;
  }
  historyPanel.classList.remove('hidden');
}

function hideHistory() {
  historyPanel.classList.add('hidden');
}

btnCloseHistory.addEventListener('click', hideHistory);

// 右键菜单动作
window.electronAPI.onMenuAction((action) => {
  switch (action) {
    case 'chat':
      inputBubble.show();
      break;
    case 'write-doc':
      inputBubble.show();
      document.getElementById('chat-input').value = '帮我写一个';
      document.getElementById('chat-input').focus();
      break;
    case 'view-history':
      showHistory();
      break;
    case 'reset-mood':
      state.set('mood', { happiness: 70, energy: 80, curiosity: 50 });
      moodSystem.evaluate();
      animator.play(state.get('moodState'));
      break;
    case 'clear-chat':
      state.clearChatHistory();
      break;
    case 'anim-rollover':
    case 'anim-cute':
    case 'anim-sit':
    case 'anim-lie': {
      const animName = action.replace('anim-', '');
      animator.play(animName);
      moodSystem.applyEvent('click');
      // 动作播放3秒后恢复心情动画
      setTimeout(() => {
        animator.play(state.get('moodState'));
      }, 3000);
      break;
    }
  }
});

// ===== 鼠标注视 + 穿透检测 =====
let mouseX = 0, mouseY = 0;

// 小狗命中区域（椭圆：中心点 + 水平/垂直半径）
function isDogHit(x, y) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.58;
  const rx = window.innerWidth * 0.38;
  const ry = window.innerHeight * 0.30;
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

// ===== 鼠标注视 + 穿透检测 =====
const isLinux = window.electronAPI.platform === 'linux';

if (isLinux) {
  // Linux: forward:true 不生效，通过主进程轮询 + IPC 实现穿透检测
  window.electronAPI.onLinuxMouseMove(({ x, y }) => {
    mouseX = (x / window.innerWidth) * 2 - 1;
    mouseY = -(y / window.innerHeight) * 2 + 1;

    const el = document.elementFromPoint(x, y);
    if (el && el !== document.body && el !== document.documentElement && el !== canvas) {
      window.electronAPI.sendHitResult(true);
      return;
    }

    const hit = isDogHit(x, y);
    window.electronAPI.sendHitResult(hit);
  });

  // 非穿透状态下的常规 mousemove（更平滑的眼睛跟踪）
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });
} else {
  // Windows/macOS: forward: true 正常工作
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

    // 检查是否在UI元素上（气泡、指示器等）
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== document.body && el !== document.documentElement && el !== canvas) {
      window.electronAPI.setIgnoreMouseEvents(false);
      return;
    }

    // 检查是否在小狗区域
    const hit = isDogHit(e.clientX, e.clientY);
    window.electronAPI.setIgnoreMouseEvents(!hit);
  });
}

// ===== 点击小狗 =====
canvas.addEventListener('dog-click', () => {
  moodSystem.applyEvent('click');
  inputBubble.toggle();
});

// ===== 动作关键词检测 =====
const TRICK_KEYWORDS = {
  rollover: ['打滚', '翻滚', '滚一个', '翻个'],
  cute:     ['撒娇', '卖萌', '装可爱', '求求', '可怜'],
  sit:      ['坐下', '坐好', '坐', '乖乖坐'],
  lie:      ['趴下', '趴着', '躺下', '趴'],
};

function detectTrick(text) {
  for (const [name, keywords] of Object.entries(TRICK_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return name;
  }
  return null;
}

function playTrick(name) {
  animator.play(name);
  moodSystem.applyEvent('praise');
  // 3秒后恢复
  setTimeout(() => {
    animator.play(state.get('moodState'));
  }, 3000);
}

// ===== 监听心情状态变化 =====
state.on('moodState', (moodState) => {
  // 心情变化时更新动画（但thinking优先级更高）
  if (!state.get('isThinking')) {
    animator.play(moodState);
  }
});

// ===== 发送消息 =====
document.addEventListener('send', (e) => {
  const { text, image } = e.detail;
  sendMessage(text, image);
});

async function sendMessage(text, image) {
  // 检测是否是动作指令
  const trick = detectTrick(text);
  if (trick) {
    playTrick(trick);
    responseBubble.show();
    const trickNames = { rollover: '打滚', cute: '撒娇', sit: '坐下', lie: '趴下' };
    responseBubble.setText(`汪汪！看我的${trickNames[trick]}~`);
    responseBubble.autoHide(3000);
    return;
  }

  // 显示思考状态
  thinkingBubble.classList.remove('hidden');
  animator.play('thinking');

  // 清理之前的流式监听
  window.electronAPI.removeAllStreamListeners();

  // 显示回复气泡
  responseBubble.show();

  const onChunk = (chunk) => {
    responseBubble.appendChunk(chunk);
  };

  const onDone = () => {
    thinkingBubble.classList.add('hidden');
    animator.play(state.get('moodState'));
    responseBubble.autoHide(8000);
  };

  const onError = (err) => {
    thinkingBubble.classList.add('hidden');
    responseBubble.setText(`出错啦: ${err}`);
    animator.play('sad');
    responseBubble.autoHide(5000);
  };

  if (image) {
    await chatEngine.sendImage(image, text, onChunk, onDone, onError);
  } else if (chatEngine.isDocumentRequest(text)) {
    // 文档生成请求 → 走特殊流程
    await chatEngine.generateDocument(text, onChunk, (content, filePath) => {
      thinkingBubble.classList.add('hidden');
      animator.play('happy');
      if (filePath) {
        // 在气泡末尾追加文件路径提示
        responseBubble.appendChunk(`\n\n📄 文件已保存到桌面: ${filePath}`);
      }
      responseBubble.autoHide(15000);
    }, onError);
  } else {
    await chatEngine.sendText(text, onChunk, onDone, onError);
  }
}

// ===== 文件拖放分析 =====
const supportedExts = ['.md', '.txt', '.docx', '.pdf'];
let prevAnim = null;

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  // 检查是否是支持的文件
  const files = e.dataTransfer?.items;
  if (!files || files.length === 0) return;
  const file = files[0];
  if (file.kind === 'file') {
    const name = (file.getAsFile?.()?.name || '').toLowerCase();
    const ext = name.substring(name.lastIndexOf('.'));
    if (supportedExts.includes(ext)) {
      dropIndicator.classList.remove('hidden');
      if (!prevAnim) prevAnim = animator.currentAnim;
      animator.play('confused');
    }
  }
});

document.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropIndicator.classList.add('hidden');
  if (prevAnim) {
    animator.play(prevAnim);
    prevAnim = null;
  }
});

document.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropIndicator.classList.add('hidden');
  prevAnim = null;

  const file = e.dataTransfer?.files?.[0];
  if (!file) return;

  const name = file.name.toLowerCase();
  const ext = name.substring(name.lastIndexOf('.'));
  if (!supportedExts.includes(ext)) {
    responseBubble.show();
    responseBubble.setText(`汪？我不认识 "${ext}" 格式的文件呢，试试 .md/.txt/.docx/.pdf 吧~`);
    responseBubble.autoHide(5000);
    return;
  }

  // Electron的file对象有path属性（仅在主进程中）
  const filePath = file.path;
  if (!filePath) {
    responseBubble.show();
    responseBubble.setText('汪？获取不到文件路径...');
    responseBubble.autoHide(5000);
    return;
  }

  // 读取文件
  thinkingBubble.classList.remove('hidden');
  animator.play('thinking');

  const result = await window.electronAPI.fileRead(filePath);

  if (result.error) {
    thinkingBubble.classList.add('hidden');
    responseBubble.show();
    responseBubble.setText(`汪...读不了这个文件: ${result.error}`);
    animator.play('sad');
    responseBubble.autoHide(5000);
    return;
  }

  // 分析文档
  window.electronAPI.removeAllStreamListeners();
  responseBubble.show();

  await chatEngine.analyzeDocument(
    result.data.text,
    result.data.fileName,
    (chunk) => responseBubble.appendChunk(chunk),
    () => {
      thinkingBubble.classList.add('hidden');
      animator.play(state.get('moodState'));
      responseBubble.autoHide(12000);
    },
    (err) => {
      thinkingBubble.classList.add('hidden');
      responseBubble.setText(`出错啦: ${err}`);
      animator.play('sad');
      responseBubble.autoHide(5000);
    }
  );
});

// ===== 窗口大小变化 =====
function onResize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

// ===== 渲染循环 =====
function animate() {
  requestAnimationFrame(animate);
  animator.update();

  // 非思考状态下允许注视
  if (!state.get('isThinking')) {
    animator.lookAt(mouseX * 0.5, mouseY * 0.3);
  }

  renderer.render(scene, camera);
}

// 初始心情评估
moodSystem.evaluate();
animator.play(state.get('moodState'));

animate();

console.log('🐶 桌面小狗机器人已启动！');
