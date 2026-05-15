#!/bin/bash
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 人情记账系统构建脚本 ===${NC}"
echo -e "${YELLOW}版本: 1.0.0${NC}"
echo -e "${YELLOW}仓库: https://github.com/situ254/gift-ledger${NC}\n"

# 检查必要命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: 需要 $1 命令，但未找到${NC}"
        exit 1
    fi
}

echo -e "${GREEN}[1/6] 检查环境...${NC}"
check_command "docker"
check_command "npm"
check_command "node"

# 参数处理
IMAGE_NAME="ghcr.io/situ254/gift-ledger"
IMAGE_TAG=${1:-"latest"}
BUILD_FRONTEND=true
SKIP_TESTS=false

# 解析参数
for arg in "$@"; do
    case $arg in
        --no-frontend-build)
            BUILD_FRONTEND=false
            ;;
        --skip-tests)
            SKIP_TESTS=true
            ;;
        --tag=*)
            IMAGE_TAG="${arg#*=}"
            ;;
        --help)
            echo "用法: ./build.sh [标签] [选项]"
            echo ""
            echo "参数:"
            echo "  标签               Docker镜像标签 (默认: latest)"
            echo ""
            echo "选项:"
            echo "  --no-frontend-build  跳过前端构建"
            echo "  --skip-tests         跳过测试"
            echo "  --tag=<标签>         指定镜像标签"
            echo "  --help               显示帮助信息"
            exit 0
            ;;
    esac
done

FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

# 前端构建
if [ "$BUILD_FRONTEND" = true ]; then
    echo -e "${GREEN}[2/6] 构建前端应用...${NC}"
    
    cd frontend
    
    # 检查node_modules
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}安装前端依赖...${NC}"
        npm ci
    fi
    
    echo -e "${YELLOW}运行前端构建...${NC}"
    npm run build
    
    cd ..
    
    # 清理旧的public目录
    echo -e "${YELLOW}复制前端文件到后端...${NC}"
    rm -rf backend/public
    mkdir -p backend/public
    cp -r frontend/dist/* backend/public/
    
    echo -e "${GREEN}前端构建完成！${NC}"
else
    echo -e "${YELLOW}[2/6] 跳过前端构建${NC}"
fi

# 运行测试（如果启用）
if [ "$SKIP_TESTS" = false ]; then
    echo -e "${GREEN}[3/6] 运行测试...${NC}"
    
    # 检查是否有测试
    if [ -f "backend/package.json" ]; then
        cd backend
        if grep -q "\"test\"" package.json; then
            echo -e "${YELLOW}运行后端测试...${NC}"
            npm test || {
                echo -e "${RED}测试失败！继续构建？[y/N]${NC}"
                read -r response
                if [[ ! "$response" =~ ^[Yy]$ ]]; then
                    exit 1
                fi
            }
        else
            echo -e "${YELLOW}未找到后端测试脚本${NC}"
        fi
        cd ..
    else
        echo -e "${YELLOW}未找到package.json，跳过测试${NC}"
    fi
else
    echo -e "${YELLOW}[3/6] 跳过测试${NC}"
fi

# Docker构建
echo -e "${GREEN}[4/6] 构建Docker镜像...${NC}"
echo -e "${YELLOW}镜像: ${FULL_IMAGE_NAME}${NC}"

cd backend

# 使用优化的Dockerfile
if [ -f "Dockerfile.optimized" ]; then
    echo -e "${YELLOW}使用优化版Dockerfile...${NC}"
    cp Dockerfile.optimized Dockerfile.tmp
    docker build -f Dockerfile.tmp -t ${FULL_IMAGE_NAME} .
    rm Dockerfile.tmp
else
    docker build -t ${FULL_IMAGE_NAME} .
fi

cd ..

echo -e "${GREEN}[5/6] 验证镜像...${NC}"
echo -e "${YELLOW}镜像信息:${NC}"
docker images | grep ${IMAGE_NAME} | head -5

# 显示镜像大小
IMAGE_ID=$(docker images -q ${FULL_IMAGE_NAME})
if [ ! -z "$IMAGE_ID" ]; then
    SIZE=$(docker inspect ${IMAGE_ID} --format='{{.Size}}')
    HUMAN_SIZE=$(numfmt --to=iec-i --suffix=B ${SIZE})
    echo -e "${YELLOW}镜像大小: ${HUMAN_SIZE}${NC}"
fi

echo -e "${GREEN}[6/6] 构建完成！${NC}"
echo -e "${YELLOW}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}镜像名称: ${FULL_IMAGE_NAME}${NC}"
echo -e "${GREEN}构建时间: $(date)${NC}"
echo -e "${YELLOW}══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}使用说明:${NC}"
echo -e "  1. 运行容器: docker run -p 9205:9205 ${FULL_IMAGE_NAME}"
echo -e "  2. 推送到仓库: docker push ${FULL_IMAGE_NAME}"
echo -e "  3. 查看运行状态: docker ps | grep gift-ledger"
echo ""
echo -e "${GREEN}所有步骤完成！${NC}"