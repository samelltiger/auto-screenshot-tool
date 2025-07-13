# 更新日志

所有值得注意的项目更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且该项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增
- GitHub Actions 自动发布配置
- 多平台打包支持（Windows、macOS、Linux）
- 自动版本管理脚本

## [1.0.0] - 2024-01-XX

### 新增
- 🖼️ 自动定时截图功能
- ⏰ 可自定义截图间隔（5秒-1小时）
- 🎯 主题标记和分类管理
- 🔍 智能图片相似度检测
- 📝 OCR文字识别（可选）
- 🗂️ 图片浏览和搜索功能
- 📥 图片下载和复制功能
- ⚙️ 丰富的配置选项
- 🔄 开机自启支持
- 🌓 深色模式支持
- 📱 系统托盘集成
- 💾 自动文件清理
- 📊 存储空间统计

### 技术特性
- Electron 应用框架
- 跨平台支持（Windows、macOS）
- 本地数据存储（JSON）
- 图片处理（Sharp）
- 现代化界面设计

### 系统要求
- Windows 10+ / macOS 10.13+
- 2GB RAM 推荐
- 500MB 可用磁盘空间

---

## 发布说明

### 如何获取更新
1. 从 [GitHub Releases](https://github.com/samelltiger/auto-screenshot-tool/releases) 下载最新版本
2. 选择适合您操作系统的安装包：
   - Windows: `.exe` 或 `.msi`
   - macOS: `.zip`

### 数据迁移
- 应用更新不会影响现有截图数据
- 配置文件会自动迁移到新版本
- 建议在更新前备份重要截图

### 已知问题
- macOS 首次运行可能需要在"安全性与隐私"中允许应用运行
- Windows Defender 可能误报，请添加信任

### 反馈和支持
- 问题报告: [GitHub Issues](https://github.com/samelltiger/auto-screenshot-tool/issues)
- 功能请求: [GitHub Discussions](https://github.com/samelltiger/auto-screenshot-tool/discussions)
- 使用指南: [README.md](README.md)