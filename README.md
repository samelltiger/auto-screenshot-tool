# 自动截图工具

一个专为自媒体开发者设计的智能截图管理工具，解决内容创作过程中的截图记录问题。

![控制面板](https://github.com/samelltiger/auto-screenshot-tool/raw/main/docs/imgs_1280p_jpg/controller.jpg)
![图片浏览](https://github.com/samelltiger/auto-screenshot-tool/raw/main/docs/imgs_1280p_jpg/imgages.png)
![搜索](https://github.com/samelltiger/auto-screenshot-tool/raw/main/docs/imgs_1280p_jpg/search.png)

## 🎯 项目背景

作为一名程序开发方向的自媒体创作者，在编写技术文章和记录编程过程时，经常遇到以下痛点：

- **遗忘截图**：编写代码时专注于开发，忘记在关键步骤进行截图
- **重复操作**：为了补充截图，需要重新执行或复现之前的开发步骤
- **效率低下**：手动截图打断编程思路，影响开发效率
- **管理混乱**：大量截图缺乏有效的分类和搜索机制

**自动截图工具**应运而生，通过智能自动化截图和强大的管理功能，彻底解决这些问题。

## ✨ 核心功能

### 🕐 智能定时截图
- **自定义间隔**：支持 5 秒到 1 小时的截图间隔设置
- **智能去重**：内置图片相似度检测，自动过滤重复截图
- **后台运行**：系统托盘静默运行，不影响正常工作

### 🏷️ 主题活动管理
- **活动标记**：可设置当前活动主题（如"登录功能开发"、"API调试"等）
- **自动归类**：活动期间的所有截图自动标记对应主题
- **项目管理**：支持多个并行项目的截图分类管理

### 📅 按日期自动归档
- **智能存储**：截图按日期（YYYY-MM-DD）自动分文件夹存储
- **自动清理**：可设置保留天数（默认30天），自动删除过期文件
- **存储统计**：实时显示存储空间使用情况

### 🔍 强大搜索功能
- **多维搜索**：支持按日期、主题、OCR文本内容搜索
- **快速定位**：秒级检索历史截图，快速找到需要的内容
- **模糊匹配**：支持关键词模糊搜索，提高查找效率

### 📝 OCR 文字识别
- **自动识别**：截图后自动提取图片中的文字内容
- **多语言支持**：支持中英文混合识别
- **文本搜索**：可通过OCR识别的文字内容搜索相关截图

### 🖼️ 可视化管理界面
- **直观浏览**：时间轴式图片浏览，支持大图预览
- **快速操作**：支持图片下载、复制、删除等操作
- **主题切换**：支持浅色/深色模式

## 🚀 快速开始

### 系统要求
- **Windows**：Windows 10 或更高版本
- **macOS**：macOS 10.13 或更高版本
- **内存**：建议 2GB 以上
- **存储**：建议 500MB 可用空间

### 安装方式

#### 方式一：下载预编译版本（推荐）

1. 访问 [GitHub Releases](https://github.com/samelltiger/auto-screenshot-tool/releases) 页面
2. 下载对应平台的安装包：
   - **Windows**：`AutoScreenshotTool-x.x.x.exe`（安装程序）或 `.msi`（MSI包）
   - **macOS**：`AutoScreenshotTool-x.x.x-mac.zip`（应用程序）
3. 运行安装程序或解压后使用

#### 方式二：源码编译

```bash
# 克隆仓库
git clone https://github.com/samelltiger/auto-screenshot-tool.git
cd auto-screenshot-tool

# 安装依赖
npm install

# 开发运行
npm run dev

# 构建应用
npm run build          # 当前平台
npm run build:win      # Windows
npm run build:mac      # macOS
```

## 📖 使用指南

### 首次启动

1. **启动应用**：双击桌面图标或从开始菜单启动
2. **系统托盘**：应用会在系统托盘显示相机图标
3. **主界面**：点击托盘图标打开主界面

### 基本操作流程

#### 1️⃣ 配置截图设置

```
控制面板 → 截图设置
├── 截图间隔：5秒-3600秒（1小时）
├── 文件保留：1-365天
├── OCR识别：开启/关闭
└── 开机自启：开启/关闭
```

#### 2️⃣ 开始自动截图

```
控制面板 → 活动管理
├── 设置活动主题：如"用户登录功能开发"
├── 点击"开始截图"按钮
└── 系统开始按设定间隔自动截图
```

#### 3️⃣ 浏览和管理截图

```
图片浏览 → 选择日期
├── 时间轴浏览：按时间顺序查看截图
├── 主题筛选：按活动主题过滤
├── 图片操作：下载、复制、删除
└── 大图预览：点击图片查看详情
```

#### 4️⃣ 搜索历史截图

```
搜索功能 → 设置条件
├── 日期范围：指定搜索时间段
├── 主题关键词：输入活动主题
├── OCR文本：输入图片中的文字
└── 组合搜索：多条件联合搜索
```

### 高级功能

#### 全局快捷键
- `Ctrl/Cmd + Shift + S`：开始/停止自动截图
- `Ctrl/Cmd + Shift + X`：立即截图一次
- `Ctrl/Cmd + Shift + A`：显示/隐藏主窗口

#### 智能相似度检测
- 自动检测连续截图的相似度
- 过滤重复或变化极小的截图
- 节省存储空间，提高浏览效率

#### OCR 文字识别
- **Windows**：使用 Windows.Media.Ocr API
- **macOS**：使用 Vision 框架
- 自动识别截图中的文字内容
- 支持中英文混合识别

## 💡 使用场景

### 🎬 技术文章创作
```
场景：编写"React Hook 使用教程"
操作：
1. 设置活动主题为"React Hook 教程"
2. 开始自动截图（间隔30秒）
3. 正常编写代码和调试
4. 写文章时搜索相关截图
```

### 🛠️ 项目开发记录
```
场景：开发用户管理系统
操作：
1. 按功能模块设置不同主题
   - "登录功能开发"
   - "用户列表功能"
   - "权限管理功能"
2. 切换开发任务时更换主题
3. 项目总结时按主题检索截图
```

### 🐛 问题排查记录
```
场景：调试复杂 Bug
操作：
1. 设置主题为"登录异常排查"
2. 开启高频截图（间隔10秒）
3. 重现问题并进行调试
4. 通过截图时间轴复盘问题
```

### 📚 学习过程记录
```
场景：学习新技术框架
操作：
1. 设置主题为"Vue3 学习记录"
2. 跟随教程操作和实践
3. 通过OCR搜索特定概念截图
4. 形成个人学习档案
```

## 📁 数据存储

### 文件结构
```
用户数据目录/
├── screenshots/           # 截图文件
│   ├── 2024-01-15/       # 按日期分文件夹
│   │   ├── 09-30-15.png  # 时间戳命名
│   │   ├── 09-30-45.png
│   │   └── ...
│   └── 2024-01-16/
├── database/             # 数据库文件
│   └── screenshots.db    # SQLite 数据库
└── config.json          # 配置文件
```

### 数据库结构
```sql
-- 截图记录表
screenshots (
  id INTEGER PRIMARY KEY,
  filepath TEXT,           -- 文件路径
  timestamp INTEGER,       -- 时间戳
  theme TEXT,             -- 活动主题
  ocr_text TEXT,          -- OCR识别文本
  created_at DATETIME     -- 创建时间
)
```

### 配置文件说明
```json
{
  "captureInterval": 30,      // 截图间隔（秒）
  "retentionDays": 30,        // 保留天数
  "enableOCR": true,          // 启用OCR
  "autoCleanup": true,        // 自动清理
  "autoStart": false,         // 开机自启
  "theme": "light",           // 界面主题
  "similarity": {
    "enabled": true,          // 启用相似度检测
    "threshold": 0.9          // 相似度阈值
  }
}
```

## 🔧 技术实现

### 技术栈
- **框架**：Electron - 跨平台桌面应用开发
- **数据库**：SQLite (better-sqlite3) - 轻量级本地数据库
- **截图**：screenshot-desktop - 跨平台屏幕截图
- **图像处理**：Sharp - 高性能图像处理库
- **OCR**：系统原生 API
  - Windows：Windows.Media.Ocr
  - macOS：Vision Framework
- **界面**：HTML5 + CSS3 + JavaScript

### 核心模块

#### 截图管理器 (`src/utils/screenshot.js`)
```javascript
class ScreenshotManager {
  async captureScreen()      // 执行屏幕截图
  async detectSimilarity()   // 相似度检测
  async saveScreenshot()     // 保存截图文件
  scheduleCapture()          // 定时截图调度
}
```

#### 数据库管理器 (`src/database/manager.js`)
```javascript
class DatabaseManager {
  async saveScreenshot()     // 保存截图记录
  async searchScreenshots()  // 搜索截图
  async getByDate()          // 按日期查询
  async cleanup()            // 清理过期数据
}
```

#### OCR 管理器 (`src/ocr/manager.js`)
```javascript
class OCRManager {
  async recognizeText()      // 文字识别
  async updateDatabase()     // 更新数据库
  isSupported()              // 检查系统支持
}
```

#### 配置管理器 (`src/utils/config.js`)
```javascript
class ConfigManager {
  load()                     // 加载配置
  save()                     // 保存配置
  get(key)                   // 获取配置项
  set(key, value)            // 设置配置项
}
```

## 🚨 注意事项

### 隐私和安全
- **本地存储**：所有数据仅存储在本地，不上传到任何服务器
- **权限申请**：首次运行时需要授予屏幕录制权限
- **敏感信息**：请注意截图可能包含敏感信息，妥善保管

### 性能优化
- **相似度检测**：避免存储重复截图，节省存储空间
- **自动清理**：定期清理过期文件，保持系统性能
- **后台运行**：采用高效的定时器机制，最小化系统资源占用

### 已知限制
- **macOS 安全设置**：首次运行需要在"安全性与隐私"中允许屏幕录制
- **Windows Defender**：可能误报为潜在威胁，需要添加信任
- **OCR 准确性**：识别准确度取决于图片质量和系统 OCR 能力

## 🤝 参与贡献

我们欢迎社区贡献！以下是参与项目的方式：

### 报告问题
1. 访问 [GitHub Issues](https://github.com/samelltiger/auto-screenshot-tool/issues)
2. 搜索是否已有相似问题
3. 创建新 Issue，详细描述问题和复现步骤

### 功能建议
1. 访问 [GitHub Discussions](https://github.com/samelltiger/auto-screenshot-tool/discussions)
2. 在 Ideas 分类下发布您的建议
3. 参与社区讨论和投票

### 代码贡献
1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 开发环境搭建
```bash
# 克隆仓库
git clone https://github.com/samelltiger/auto-screenshot-tool.git
cd auto-screenshot-tool

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试（如果有）
npm test

# 代码格式化
npm run lint
```

## 📋 更新日志

### v1.0.1 (最新版本)
- ✅ 修复 Windows 构建问题
- ✅ 优化图标文件格式
- ✅ 改进 GitHub Actions 自动发布
- ✅ 简化产品名称为英文

### v1.0.0 (首个正式版本)
- 🎉 完整的自动截图功能
- 🎉 OCR 文字识别
- 🎉 主题分类管理
- 🎉 智能搜索功能
- 🎉 跨平台支持 (Windows & macOS)

详细更新历史请查看 [CHANGELOG.md](CHANGELOG.md)

## 📞 联系方式

- **GitHub**：[@samelltiger](https://github.com/samelltiger)
- **项目主页**：https://github.com/samelltiger/auto-screenshot-tool
- **问题反馈**：https://github.com/samelltiger/auto-screenshot-tool/issues
- **功能建议**：https://github.com/samelltiger/auto-screenshot-tool/discussions

｜个人微信｜公众号｜
｜<img src="https://github.com/samelltiger/auto-screenshot-tool/raw/main/src/assets/icons/qrcode_for_me.jpg" width="200" height="200">｜<img src="https://github.com/samelltiger/auto-screenshot-tool/raw/main/src/assets/icons/qrcode_for_gxh.jpg" width="200" height="200">｜


## 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源发布。

```
MIT License

Copyright (c) 2024 samelltiger

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

⭐ **如果这个项目对您有帮助，请给我们一个 Star！**

🚀 **让每一次代码提交都有迹可循，让每一篇技术文章都有图为证！**