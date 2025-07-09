#!/bin/bash

# OmniFocus MCP Enhanced 部署脚本
# 用于在多个 Mac 设备间部署增强版 MCP

set -e

echo "🚀 OmniFocus MCP Enhanced 部署脚本"
echo "=================================="

# 检查参数
if [ "$1" = "pack" ]; then
    echo "📦 开始打包项目..."
    
    # 确保项目已构建
    echo "🔨 构建项目..."
    npm install
    npm run build
    
    # 创建部署包
    PACKAGE_NAME="omnifocus-mcp-enhanced-$(date +%Y%m%d-%H%M%S).tar.gz"
    echo "📦 创建部署包: $PACKAGE_NAME"
    
    tar -czf "$PACKAGE_NAME" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=.DS_Store \
        --exclude="*.tar.gz" \
        --exclude=".npm" \
        .
    
    echo "✅ 部署包创建完成: $PACKAGE_NAME"
    echo ""
    echo "📋 传输到其他 Mac 的方法："
    echo "  1. 通过 iCloud: 拖拽到 iCloud Drive"
    echo "  2. 通过网盘: 上传到百度网盘/Google Drive等"
    echo "  3. 通过 scp: scp $PACKAGE_NAME user@target-mac:~/"
    echo "  4. 通过 AirDrop: 直接发送到目标 Mac"
    echo ""
    echo "🎯 在目标 Mac 上运行: ./deploy.sh install $PACKAGE_NAME"

elif [ "$1" = "install" ]; then
    if [ -z "$2" ]; then
        echo "❌ 错误: 请指定部署包文件名"
        echo "用法: ./deploy.sh install <package-file.tar.gz>"
        exit 1
    fi
    
    PACKAGE_FILE="$2"
    if [ ! -f "$PACKAGE_FILE" ]; then
        echo "❌ 错误: 部署包文件不存在: $PACKAGE_FILE"
        exit 1
    fi
    
    echo "📦 开始安装部署包: $PACKAGE_FILE"
    
    # 创建安装目录
    INSTALL_DIR="$HOME/omnifocus-mcp-enhanced"
    echo "📁 安装目录: $INSTALL_DIR"
    
    # 如果目录已存在，询问是否覆盖
    if [ -d "$INSTALL_DIR" ]; then
        echo "⚠️  目录已存在: $INSTALL_DIR"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ 安装已取消"
            exit 1
        fi
        rm -rf "$INSTALL_DIR"
    fi
    
    # 创建目录并解压
    mkdir -p "$INSTALL_DIR"
    echo "📂 解压到: $INSTALL_DIR"
    tar -xzf "$PACKAGE_FILE" -C "$INSTALL_DIR"
    
    # 进入目录并安装依赖
    cd "$INSTALL_DIR"
    echo "📥 安装依赖..."
    npm install
    
    echo "🔨 构建项目..."
    npm run build
    
    # 移除旧的 MCP（如果存在）
    echo "🗑️  移除旧的 OmniFocus MCP..."
    claude mcp remove omnifocus 2>/dev/null || true
    claude mcp remove omnifocus-enhanced 2>/dev/null || true
    
    # 添加新的 MCP
    echo "➕ 添加增强版 OmniFocus MCP..."
    claude mcp add omnifocus-enhanced -- node "$INSTALL_DIR/dist/server.js"
    
    echo ""
    echo "✅ 安装完成！"
    echo ""
    echo "📋 验证安装:"
    claude mcp list | grep omnifocus-enhanced
    echo ""
    echo "🎉 重启 Claude Code 即可使用增强版 OmniFocus MCP！"
    echo ""
    echo "📖 查看使用说明: cat $INSTALL_DIR/CLAUDE.md"

elif [ "$1" = "update" ]; then
    echo "🔄 更新本地安装..."
    INSTALL_DIR="$HOME/omnifocus-mcp-enhanced"
    
    if [ ! -d "$INSTALL_DIR" ]; then
        echo "❌ 错误: 未找到安装目录 $INSTALL_DIR"
        echo "请先使用 './deploy.sh install <package>' 安装"
        exit 1
    fi
    
    cd "$INSTALL_DIR"
    
    # 检查是否有 git 仓库
    if [ -d ".git" ]; then
        echo "🔄 从 git 更新..."
        git pull
    else
        echo "❌ 无法自动更新，请手动重新部署"
        exit 1
    fi
    
    echo "🔨 重新构建..."
    npm install
    npm run build
    
    echo "✅ 更新完成！重启 Claude Code 以使用最新版本。"

else
    echo "用法:"
    echo "  ./deploy.sh pack                    # 打包当前项目"
    echo "  ./deploy.sh install <package.tar.gz> # 在新 Mac 上安装"
    echo "  ./deploy.sh update                  # 更新已安装的版本"
    echo ""
    echo "例子:"
    echo "  # 在开发机上打包"
    echo "  ./deploy.sh pack"
    echo ""
    echo "  # 在目标机上安装"
    echo "  ./deploy.sh install omnifocus-mcp-enhanced-20250105-1430.tar.gz"
fi