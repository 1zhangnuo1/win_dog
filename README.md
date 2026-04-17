# 桌面3D小狗机器人

一个基于 Electron + Three.js 的桌面宠物应用，集成智谱 AI GLM-4 API，拥有心情系统、3D 动画、流式对话、图片识别和文件分析等功能。

## 功能特性

- **3D 小狗** — Three.js 程序化建模，支持心情驱动的动画（开心摇尾巴、好奇歪头、打瞌睡等）和眼睛追踪鼠标
- **AI 对话** — 流式输出，支持上下文记忆（40 条历史），系统提示词随心情动态变化
- **心情系统** — 三个维度（开心/精力/好奇），随交互和空闲时间自动变化，驱动动画和 AI 人设
- **图片识别** — 粘贴图片（Ctrl+V），调用 GLM-4V 视觉模型分析
- **文件拖放** — 支持 PDF、Word、文本文件拖入窗口，自动解析内容并分析
- **文档生成** — 根据对话内容生成文档
- **桌面穿透** — 透明无边框窗口，鼠标点击可穿透到桌面，只在小狗区域拦截
- **系统托盘** — 最小化到托盘，右键菜单

## 技术栈

- **Electron 28** — 桌面应用框架
- **Three.js** — 3D 渲染（ES Module + importmap）
- **智谱 AI** — GLM-4-Flash（快速对话）、GLM-4（降级回退）、GLM-4V-Flash（图片分析）
- **Axios** — SSE 流式请求
- **mammoth** — Word 文档解析
- **pdf-parse** — PDF 文档解析

## 项目结构

```
├── main.js                # Electron 主进程（窗口、API、文件 I/O）
├── preload.js             # contextBridge IPC 桥接
├── src/
│   ├── index.html         # 渲染进程页面
│   ├── css/style.css      # 样式
│   ├── assets/            # 3D 模型和纹理资源
│   └── js/
│       ├── app.js         # 渲染入口，组装各模块
│       ├── core/
│       │   ├── state.js       # 状态管理（单例，发布/订阅，点号路径）
│       │   ├── mood-system.js # 心情评估系统
│       │   └── chat-engine.js # 对话引擎（构建提示词、流式调用）
│       ├── renderer/
│       │   ├── scene.js       # Three.js 场景初始化
│       │   ├── lighting.js    # 光照设置
│       │   └── dog.js         # 小狗模型 + 动画控制器
│       ├── ui/
│       │   ├── input-bubble.js    # 输入气泡
│       │   ├── response-bubble.js # 回复气泡（流式追加）
│       │   └── mood-indicator.js  # 心情指示器
│       └── utils/
│           └── drag.js           # 窗口拖拽
└── package.json
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm

### 安装

```bash
git clone <repo-url>
cd 01_application
npm install
```

### 配置

在项目根目录创建 `.env` 文件：

```
ZHIPU_API_KEY=your_api_key_here
```

在 [智谱 AI 开放平台](https://open.bigmodel.cn/) 申请 API Key。

### 运行

```bash
npm start
```

### 打包

```bash
npm run build
```

默认构建 Windows 安装包。Linux 构建需调整 `package.json` 中的 `electron-builder` 配置。

## 使用方法

| 操作 | 说明 |
|------|------|
| **左键点击小狗** | 打开/关闭聊天输入框 |
| **右键拖拽** | 旋转 3D 视角 |
| **滚轮** | 缩放 |
| **Ctrl+V** | 粘贴图片进行分析 |
| **拖入文件** | 支持 PDF / Word / 文本文件 |
| **托盘图标** | 右键菜单控制显示/退出 |

## 许可证

ISC
