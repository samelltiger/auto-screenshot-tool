# 构建和发布指南

本文档介绍如何构建和发布自动截图工具。

## 🏗️ 本地构建

### 环境要求

- Node.js 16+
- npm 或 yarn
- Git

### 安装依赖

```bash
npm install
```

### 开发运行

```bash
npm run dev
```

### 本地构建

```bash
# 构建当前平台
npm run build

# 构建所有平台
npm run build:all

# 仅打包不分发
npm run pack
```

### 平台特定构建

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 🚀 自动发布

### 方式一：标签触发（推荐）

1. 更新版本号并推送标签：

```bash
# 使用脚本（推荐）
./scripts/release.sh 1.0.1

# 或手动操作
npm version 1.0.1
git push origin main
git push origin v1.0.1
```

2. GitHub Actions 会自动构建并发布到 Releases

### 方式二：手动触发

1. 访问 GitHub Actions 页面
2. 选择 "Build and Release" 工作流
3. 点击 "Run workflow"
4. 输入版本号并运行

## 📦 构建产物

### Windows
- `*.exe` - NSIS 安装程序
- `*.msi` - MSI 安装包（如果配置）
- `*.zip` - 便携版本

### macOS
- `*.dmg` - 磁盘映像文件
- `*.zip` - 压缩包版本

### Linux
- `*.AppImage` - 便携应用镜像
- `*.deb` - Debian/Ubuntu 包
- `*.rpm` - RedHat/CentOS 包
- `*.tar.gz` - 压缩包版本

## 🔧 配置说明

### 图标文件

需要在 `build/` 目录下放置以下图标文件：

- `icon.ico` - Windows 图标 (256x256)
- `icon.icns` - macOS 图标
- `icon.png` - Linux 图标 (512x512)

### 代码签名

#### macOS
1. 配置 Apple Developer 证书
2. 设置环境变量：
   ```bash
   export CSC_LINK="path/to/certificate.p12"
   export CSC_KEY_PASSWORD="certificate_password"
   ```

#### Windows
1. 配置代码签名证书
2. 设置环境变量：
   ```bash
   export WIN_CSC_LINK="path/to/certificate.p12"
   export WIN_CSC_KEY_PASSWORD="certificate_password"
   ```

### GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

- `GITHUB_TOKEN` - 自动生成，用于发布 Release
- `CSC_LINK` - macOS 签名证书（可选）
- `CSC_KEY_PASSWORD` - 证书密码（可选）
- `WIN_CSC_LINK` - Windows 签名证书（可选）
- `WIN_CSC_KEY_PASSWORD` - Windows 证书密码（可选）

## 🐛 故障排除

### 构建失败

1. **依赖安装失败**
   ```bash
   # 清理缓存
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **原生模块编译失败**
   ```bash
   # 重新编译原生模块
   npm rebuild
   ```

3. **权限问题（Linux/macOS）**
   ```bash
   # 给脚本添加执行权限
   chmod +x scripts/release.sh
   ```

### 发布失败

1. **GitHub Token 权限不足**
   - 确保 GITHUB_TOKEN 有 `contents:write` 权限

2. **标签已存在**
   ```bash
   # 删除本地和远程标签
   git tag -d v1.0.0
   git push --delete origin v1.0.0
   ```

3. **文件过大**
   - 检查 `files` 配置，排除不必要的文件
   - 使用 `.gitignore` 和 electron-builder 的 ignore 规则

## 📊 构建优化

### 减小包体积

1. 排除开发依赖：
   ```json
   "files": [
     "!**/node_modules/*/{test,__tests__,tests}",
     "!**/node_modules/*.d.ts"
   ]
   ```

2. 压缩资源文件：
   ```json
   "compression": "maximum"
   ```

### 提高构建速度

1. 使用缓存：
   ```yaml
   - uses: actions/cache@v3
     with:
       path: ~/.npm
       key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
   ```

2. 并行构建：
   - 多平台构建使用 matrix 策略
   - 避免不必要的步骤

## 🔄 版本管理

### 语义化版本

- `MAJOR.MINOR.PATCH` 格式
- `MAJOR`：破坏性更改
- `MINOR`：新功能，向后兼容
- `PATCH`：错误修复

### 发布频率

- 主版本：重大功能更新
- 次版本：新功能、优化
- 补丁版本：错误修复、安全更新

## 📝 发布检查清单

发布前请确认：

- [ ] 代码已通过测试
- [ ] 更新了 CHANGELOG.md
- [ ] 版本号符合语义化版本规范
- [ ] 所有更改已提交并推送
- [ ] 本地测试构建成功
- [ ] 图标和资源文件完整
- [ ] 文档已更新