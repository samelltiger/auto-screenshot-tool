# 自动截图工具

一个功能强大的自动截图工具，支持定时截图、OCR文字识别、图片搜索和管理。

## 功能特点

- 🕐 **定时截图**: 支持自定义时间间隔的自动截图
- 🏷️ **主题管理**: 为截图设置活动主题，便于分类管理  
- 🔍 **OCR识别**: 自动提取图片中的文字内容
- 📅 **日期浏览**: 按日期浏览和管理截图
- 🔎 **强大搜索**: 支持按主题、日期、OCR文本搜索
- 🗂️ **自动归档**: 自动清理过期文件，节省存储空间
- ⚙️ **丰富设置**: 灵活的配置选项和个性化设置
- 🖥️ **跨平台**: 支持 macOS 和 Windows

## 快速开始

### 安装依赖

\`\`\`bash
npm install
\`\`\`

### 开发运行

\`\`\`bash
npm run dev
\`\`\`

### 构建应用

\`\`\`bash
# 构建当前平台
npm run build

# 构建 macOS 版本
npm run build:mac

# 构建 Windows 版本  
npm run build:win
\`\`\`

## 使用说明

### 基本操作

1. **开始截图**: 设置截图间隔和活动主题，点击"开始截图"
2. **浏览图片**: 在图片浏览页面选择日期查看截图
3. **搜索功能**: 在搜索页面按条件查找特定截图
4. **设置配置**: 在设置页面调整应用行为

### 快捷键

- `Ctrl/Cmd + Shift + S`: 开始/停止截图
- `Ctrl/Cmd + Shift + X`: 立即截图一次
- `Ctrl/Cmd + Shift + A`: 显示/隐藏主窗口

### OCR功能

应用使用系统自带的OCR引擎:
- **macOS**: 使用 Vision 框架
- **Windows**: 使用 Windows.Media.Ocr API

## 项目结构

\`\`\`
auto-screenshot-tool/
├── src/
│   ├── main.js              # 主进程入口
│   ├── components/          # 界面组件
│   │   ├── index.html      # 主页面
│   │   ├── styles.css      # 样式文件
│   │   └── renderer.js     # 渲染进程逻辑
│   ├── database/           # 数据库模块
│   │   └── manager.js      # 数据库管理器
│   ├── utils/              # 工具模块
│   │   ├── screenshot.js   # 截图管理器
│   │   └── config.js       # 配置管理器
│   ├── ocr/               # OCR模块
│   │   └── manager.js     # OCR管理器
│   └── assets/            # 静态资源
│       └── icons/         # 图标文件
├── package.json
└── README.md
\`\`\`

## 配置说明

应用的配置文件保存在用户数据目录：
- **macOS**: `~/Library/Application Support/auto-screenshot-tool/`
- **Windows**: `%APPDATA%/auto-screenshot-tool/`

### 主要配置项

- `captureInterval`: 截图间隔（秒）
- `retentionDays`: 文件保留天数
- `enableOCR`: 是否启用OCR
- `autoCleanup`: 自动清理过期文件
- `theme`: 界面主题（light/dark）

## 数据存储

- **截图文件**: 按日期分文件夹存储（YYYY-MM-DD格式）
- **数据库**: SQLite数据库存储元数据和OCR结果
- **配置文件**: JSON格式的配置文件

## 技术栈

- **框架**: Electron
- **数据库**: SQLite (better-sqlite3)
- **截图**: screenshot-desktop
- **OCR**: 系统原生API
- **界面**: HTML + CSS + JavaScript

## 开发说明

### 依赖说明

主要依赖包：
- `electron`: 桌面应用框架
- `better-sqlite3`: SQLite数据库
- `screenshot-desktop`: 屏幕截图
- `fs-extra`: 文件系统操作
- `moment`: 日期时间处理

### 开发环境

- Node.js >= 14
- npm >= 6

## 许可证

MIT License