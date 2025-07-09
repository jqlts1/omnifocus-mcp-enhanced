#!/bin/bash

# OmniFocus MCP Enhanced 发布脚本
# 用于发布到 NPM

set -e

echo "🚀 OmniFocus MCP Enhanced 发布脚本"
echo "================================="

# 检查是否已经登录 npm
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ 请先登录 NPM: npm login"
    exit 1
fi

echo "👤 当前 NPM 用户: $(npm whoami)"

# 检查参数
if [ "$1" = "check" ]; then
    echo "🔍 检查发布准备状态..."
    
    # 检查必要文件
    echo "📝 检查必要文件..."
    required_files=("package.json" "README.md" "CLAUDE.md" "cli.cjs" ".npmignore")
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            echo "  ✅ $file"
        else
            echo "  ❌ $file (缺失)"
            exit 1
        fi
    done
    
    # 检查构建产物
    echo "🔨 检查构建产物..."
    if [ -d "dist" ]; then
        echo "  ✅ dist/ 目录存在"
        if [ -f "dist/server.js" ]; then
            echo "  ✅ dist/server.js 存在"
        else
            echo "  ❌ dist/server.js 不存在，请运行 npm run build"
            exit 1
        fi
    else
        echo "  ❌ dist/ 目录不存在，请运行 npm run build"
        exit 1
    fi
    
    # 检查 package.json 信息
    echo "📦 检查 package.json..."
    PACKAGE_NAME=$(node -p "require('./package.json').name")
    PACKAGE_VERSION=$(node -p "require('./package.json').version")
    echo "  📋 包名: $PACKAGE_NAME"
    echo "  🏷️  版本: $PACKAGE_VERSION"
    
    # 检查版本是否已存在
    echo "🔍 检查版本冲突..."
    if npm view "$PACKAGE_NAME@$PACKAGE_VERSION" version > /dev/null 2>&1; then
        echo "  ⚠️  版本 $PACKAGE_VERSION 已存在于 NPM"
        echo "  💡 请更新 package.json 中的版本号"
        exit 1
    else
        echo "  ✅ 版本 $PACKAGE_VERSION 可用"
    fi
    
    # 测试打包
    echo "📦 测试打包..."
    npm pack --dry-run > /dev/null
    echo "  ✅ 打包测试通过"
    
    echo ""
    echo "✅ 所有检查通过！可以发布。"
    echo "🚀 运行 './publish.sh release' 开始发布"

elif [ "$1" = "release" ]; then
    echo "🚀 开始发布流程..."
    
    # 先运行检查
    echo "🔍 运行发布前检查..."
    ./publish.sh check
    
    PACKAGE_NAME=$(node -p "require('./package.json').name")
    PACKAGE_VERSION=$(node -p "require('./package.json').version")
    
    echo ""
    echo "📦 准备发布:"
    echo "  📋 包名: $PACKAGE_NAME"
    echo "  🏷️  版本: $PACKAGE_VERSION"
    echo ""
    
    read -p "确认发布? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 发布已取消"
        exit 1
    fi
    
    # 清理并重新构建
    echo "🔨 重新构建项目..."
    rm -rf dist/
    npm run build
    
    # 发布到 NPM
    echo "📤 发布到 NPM..."
    npm publish
    
    echo ""
    echo "🎉 发布成功！"
    echo ""
    echo "📋 用户可以通过以下方式安装:"
    echo ""
    echo "# Claude Code 一键安装"
    echo "claude mcp add omnifocus-enhanced -- npx -y $PACKAGE_NAME"
    echo ""
    echo "# 或者全局安装"
    echo "npm install -g $PACKAGE_NAME"
    echo "claude mcp add omnifocus-enhanced -- $PACKAGE_NAME"
    echo ""
    echo "🔗 NPM 包地址: https://www.npmjs.com/package/$PACKAGE_NAME"

elif [ "$1" = "version" ]; then
    if [ -z "$2" ]; then
        echo "❌ 请指定版本类型: patch, minor, major"
        echo "用法: ./publish.sh version patch"
        exit 1
    fi
    
    echo "🏷️  更新版本..."
    npm version "$2" --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    echo "✅ 版本已更新为: $NEW_VERSION"
    echo "💡 现在可以运行 './publish.sh release' 发布新版本"

else
    echo "用法:"
    echo "  ./publish.sh check           # 检查发布准备状态"
    echo "  ./publish.sh version <type>  # 更新版本 (patch/minor/major)"
    echo "  ./publish.sh release         # 发布到 NPM"
    echo ""
    echo "发布流程:"
    echo "  1. ./publish.sh check        # 检查状态"
    echo "  2. ./publish.sh version patch # 更新版本（可选）"
    echo "  3. ./publish.sh release      # 发布"
    echo ""
    echo "发布后用户安装命令:"
    echo "  claude mcp add omnifocus-enhanced -- npx -y omnifocus-mcp-enhanced"
fi