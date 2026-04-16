// 窗口拖拽 + 点击检测（通过IPC与主进程通信移动窗口）
export function setupDragSimple() {
  let isDragging = false;
  let hasMoved = false;
  let startX, startY;

  const canvas = document.getElementById('dog-canvas');

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // 只响应左键，右键留给旋转
    isDragging = true;
    hasMoved = false;
    startX = e.screenX;
    startY = e.screenY;
    window.electronAPI.dragStart(e.screenX, e.screenY);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = Math.abs(e.screenX - startX);
    const dy = Math.abs(e.screenY - startY);
    if (dx > 3 || dy > 3) {
      hasMoved = true;
      window.electronAPI.dragMove(e.screenX, e.screenY);
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging && !hasMoved) {
      canvas.dispatchEvent(new CustomEvent('dog-click'));
    }
    isDragging = false;
  });

  return { isDragging: () => isDragging, hasMoved: () => hasMoved };
}
