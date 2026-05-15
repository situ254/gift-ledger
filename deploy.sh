#!/bin/bash
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 人情记账系统部署脚本 ===${NC}"
echo -e "${YELLOW}自动化部署到GitHub和GHCR${NC}\n"

# 检查必要命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: 需要 $1 命令，但未找到${NC}"
        exit 1
    fi
}

echo -e "${GREEN}[1/8] 检查环境...${NC}"
check_command "docker"
check_command "git"
check_command "curl"

# 配置
REPO_URL="https://github.com/situ254/gift-ledger.git"
IMAGE_NAME="ghcr.io/situ254/gift-ledger"
DEFAULT_TAG="latest"
GITHUB_USER="situ254"

# 读取GitHub Token
GITHUB_TOKEN=""
if [ -f ".github_token" ]; then
    GITHUB_TOKEN=$(cat .github_token | tr -d '\n')
    echo -e "${YELLOW}使用本地存储的GitHub Token${NC}"
elif [ ! -z "$GITHUB_TOKEN_ENV" ]; then
    GITHUB_TOKEN="$GITHUB_TOKEN_ENV"
    echo -e "${YELLOW}使用环境变量中的GitHub Token${NC}"
else
    echo -e "${YELLOW}请输入GitHub Personal Access Token:${NC}"
    echo -e "${BLUE}(需要有repo和packages权限)${NC}"
    read -s GITHUB_TOKEN
    echo ""
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${RED}错误: 必须提供GitHub Token${NC}"
        exit 1
    fi
    
    # 询问是否保存Token
    echo -e "${YELLOW}是否保存Token到本地文件？(y/N)${NC}"
    read -r save_token
    if [[ "$save_token" =~ ^[Yy]$ ]]; then
        echo $GITHUB_TOKEN > .github_token
        chmod 600 .github_token
        echo -e "${GREEN}Token已保存到 .github_token${NC}"
    fi
fi

# 验证Token
echo -e "${GREEN}[2/8] 验证GitHub Token...${NC}"
if ! curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep -q '"login"'; then
    echo -e "${RED}错误: GitHub Token无效${NC}"
    exit 1
fi

# 获取当前分支和提交信息
echo -e "${GREEN}[3/8] 获取仓库状态...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
LATEST_COMMIT=$(git log -1 --oneline)
COMMIT_HASH=$(git rev-parse --short HEAD)

echo -e "${YELLOW}当前分支: ${CURRENT_BRANCH}${NC}"
echo -e "${YELLOW}最新提交: ${LATEST_COMMIT}${NC}"

# 询问镜像标签
echo -e "${YELLOW}请输入Docker镜像标签 (默认: ${DEFAULT_TAG}):${NC}"
read -r IMAGE_TAG
IMAGE_TAG=${IMAGE_TAG:-$DEFAULT_TAG}

# 确认部署
echo -e "${RED}══════════════════════════════════════════════════${NC}"
echo -e "${RED}确认部署信息:${NC}"
echo -e "${YELLOW}仓库: ${REPO_URL}${NC}"
echo -e "${YELLOW}镜像: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
echo -e "${YELLOW}分支: ${CURRENT_BRANCH}${NC}"
echo -e "${YELLOW}提交: ${LATEST_COMMIT}${NC}"
echo -e "${RED}══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}是否继续部署？(y/N)${NC}"
read -r confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}部署取消${NC}"
    exit 0
fi

# 运行构建脚本
echo -e "${GREEN}[4/8] 运行构建脚本...${NC}"
if [ ! -f "build.sh" ]; then
    echo -e "${RED}错误: 未找到build.sh脚本${NC}"
    exit 1
fi

./build.sh --tag=$IMAGE_TAG

FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

# 登录到GitHub Container Registry
echo -e "${GREEN}[5/8] 登录到GitHub Container Registry...${NC}"
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USER --password-stdin

# 推送镜像到GHCR
echo -e "${GREEN}[6/8] 推送镜像到GHCR...${NC}"
docker push $FULL_IMAGE_NAME

# 配置Git远程仓库（使用Token）
echo -e "${GREEN}[7/8] 配置Git远程仓库...${NC}"
GIT_REMOTE_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/situ254/gift-ledger.git"

# 检查是否有未提交的更改
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${YELLOW}检测到未提交的更改${NC}"
    echo -e "${YELLOW}请输入提交消息:${NC}"
    read -r commit_msg
    
    if [ -z "$commit_msg" ]; then
        commit_msg="自动化部署更新 $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    
    git add .
    git commit -m "$commit_msg"
fi

# 推送代码到GitHub
echo -e "${YELLOW}推送代码到GitHub...${NC}"
git remote set-url origin $GIT_REMOTE_URL
git push origin $CURRENT_BRANCH
git remote set-url origin $REPO_URL

# 清理敏感信息
echo -e "${GREEN}[8/8] 清理和验证...${NC}"
docker logout ghcr.io

# 显示部署结果
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}部署总结:${NC}"
echo -e "  ✅ 镜像构建: ${FULL_IMAGE_NAME}"
echo -e "  ✅ 推送到: GHCR (ghcr.io/situ254/gift-ledger)"
echo -e "  ✅ 代码推送: GitHub (${CURRENT_BRANCH}分支)"
echo -e "  ✅ 提交哈希: ${COMMIT_HASH}"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo -e "  1. 验证镜像: docker pull ${FULL_IMAGE_NAME}"
echo -e "  2. 运行容器: docker run -p 9205:9205 ${FULL_IMAGE_NAME}"
echo -e "  3. 访问应用: http://localhost:9205"
echo ""
echo -e "${GREEN}部署时间: $(date)${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"