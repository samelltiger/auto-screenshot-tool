#!/bin/bash

# 版本发布脚本
# 用法: ./scripts/release.sh [版本号]

set -e

# 获取版本号
VERSION=${1:-""}

if [ -z "$VERSION" ]; then
    echo "请提供版本号，例如: ./scripts/release.sh 1.0.1"
    exit 1
fi

# 验证版本号格式
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "版本号格式错误，应该为 x.y.z 格式"
    exit 1
fi

echo "🚀 准备发布版本 $VERSION"

# 检查是否有未提交的更改
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ 存在未提交的更改，请先提交所有更改"
    exit 1
fi

# 检查是否在主分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo "❌ 请在 main 或 master 分支上发布版本"
    exit 1
fi

# 更新版本号
echo "📝 更新 package.json 中的版本号"
npm version $VERSION --no-git-tag-version

# 提交版本更改
echo "💾 提交版本更新"
git add package.json
git commit -m "🔖 发布版本 $VERSION"

# 创建并推送标签
echo "🏷️ 创建并推送标签"
git tag -a "v$VERSION" -m "版本 $VERSION"
git push origin main
git push origin "v$VERSION"

echo "✅ 版本 $VERSION 发布完成！"
echo "GitHub Actions 将自动构建并发布到 GitHub Releases"
echo "查看构建状态: https://github.com/samelltiger/auto-screenshot-tool/actions"