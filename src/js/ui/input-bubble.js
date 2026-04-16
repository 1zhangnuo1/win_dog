import state from '../core/state.js';

export class InputBubble {
  constructor() {
    this.el = document.getElementById('input-bubble');
    this.textarea = document.getElementById('chat-input');
    this.imagePreview = document.getElementById('image-preview');
    this.previewImg = document.getElementById('preview-img');
    this.btnRemoveImage = document.getElementById('btn-remove-image');
    this.btnImage = document.getElementById('btn-image');
    this.btnSend = document.getElementById('btn-send');
    this._pendingImage = null;
    this._justClosed = false; // 防抖标记

    this._bindEvents();
    this._bindOutsideClick();
  }

  show() {
    this.el.classList.remove('hidden');
    state.set('isInputVisible', true);
    // 输入框打开时关闭鼠标穿透，让点击事件正常工作
    window.electronAPI.setIgnoreMouseEvents(false);
    setTimeout(() => this.textarea.focus(), 100);
  }

  hide() {
    this.el.classList.add('hidden');
    state.set('isInputVisible', false);
    this.textarea.value = '';
    this.clearImage();
    // 防抖：短时间内防止dog-click再次打开
    this._justClosed = true;
    setTimeout(() => { this._justClosed = false; }, 300);
  }

  toggle() {
    if (this._justClosed) return; // 防抖，刚关闭不打开
    if (this.el.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }

  getText() {
    return this.textarea.value.trim();
  }

  getImage() {
    return this._pendingImage;
  }

  clearImage() {
    this._pendingImage = null;
    this.imagePreview.classList.add('hidden');
    this.previewImg.src = '';
  }

  _bindEvents() {
    // Enter发送（Shift+Enter换行）
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._onSend();
      }
      // Escape关闭
      if (e.key === 'Escape') {
        this.hide();
      }
    });

    // 发送按钮
    this.btnSend.addEventListener('click', () => this._onSend());

    // 粘贴图片
    this.textarea.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          this._handleImageFile(file);
          return;
        }
      }
    });

    // 图片按钮 - 点击选择文件
    this.btnImage.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) this._handleImageFile(file);
      };
      input.click();
    });

    // 移除图片
    this.btnRemoveImage.addEventListener('click', () => this.clearImage());
  }

  // 点击外部关闭
  _bindOutsideClick() {
    document.addEventListener('mousedown', (e) => {
      if (this.el.classList.contains('hidden')) return;
      // 如果点击的不是输入气泡内部，就关闭
      if (!this.el.contains(e.target)) {
        this.hide();
      }
    });
  }

  _handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this._pendingImage = e.target.result;
      this.previewImg.src = this._pendingImage;
      this.imagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  _onSend() {
    const text = this.getText();
    const image = this.getImage();

    if (!text && !image) return;

    // 触发自定义事件，由app.js监听
    this.el.dispatchEvent(new CustomEvent('send', {
      detail: { text, image },
      bubbles: true,
    }));

    this.hide();
  }
}
