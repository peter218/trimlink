# 京东云部署说明

这套部署适用于当前项目，结构如下：

- `frontend`: React + Vite，构建后由 Nginx 提供静态页面
- `backend`: Go + Gin
- `mysql`: 数据库
- `redis`: 缓存

公网只暴露 `80` 端口。

## 1. 服务器准备

你当前实例配置：

- 公网 IP：`117.72.151.164`
- 规格：`2 核 4GB`
- 系统盘：`60GB`

这个项目完全够用。

建议在京东云安全组 / 防火墙里放行：

- `22`：SSH
- `80`：HTTP
- `443`：HTTPS（如果后面要上域名和证书）

不建议放行：

- `3306`
- `6379`
- `8081`

## 2. 登录服务器

```bash
ssh root@117.72.151.164
```

如果你用的是非 root 用户，把下面命令里的路径按实际用户改一下。

## 3. 安装 Docker 和 Docker Compose

Ubuntu / Debian 可直接执行：

```bash
apt update
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
docker --version
docker compose version
```

如果你的系统不是 Ubuntu / Debian，先告诉我系统版本，我给你改成对应命令。

## 4. 上传项目

方式 1：直接把项目推到 Git 仓库，再在服务器拉取

```bash
apt install -y git
cd /opt
git clone <你的仓库地址> url-shortener
cd /opt/url-shortener
```

方式 2：从本地上传

```bash
scp -r "/本地项目路径/url-shortener" root@117.72.151.164:/opt/
cd /opt/url-shortener
```

## 5. 配置生产环境变量

复制模板：

```bash
cp .env.production.example .env
```

编辑：

```bash
nano .env
```

至少把这几个值改掉：

```env
MYSQL_DATABASE=shortener
MYSQL_USER=shortener
MYSQL_PASSWORD=请改成强密码
MYSQL_ROOT_PASSWORD=请改成更强的root密码
REDIS_PASSWORD=
APP_DOMAIN=117.72.151.164
```

如果你想给 Redis 也加密码，可以填：

```env
REDIS_PASSWORD=请改成redis密码
```

## 6. 启动整套服务

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

查看状态：

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
```

查看日志：

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f
```

## 7. 验证访问

浏览器打开：

```text
http://117.72.151.164
```

接口验证：

```bash
curl http://117.72.151.164/api/stats/test
```

如果服务正常，你会看到类似：

```json
{"error":"URL not found"}
```

这说明后端接口已通。

## 8. 常用运维命令

重启：

```bash
docker compose --env-file .env -f docker-compose.prod.yml restart
```

更新代码后重新构建：

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

停止：

```bash
docker compose --env-file .env -f docker-compose.prod.yml down
```

停止并删除数据库数据卷：

```bash
docker compose --env-file .env -f docker-compose.prod.yml down -v
```

注意：`down -v` 会删除 MySQL 和 Redis 数据。

## 9. 推荐下一步

当前你可以先用 IP 访问。

如果要正式对外使用，建议继续做两件事：

1. 绑定域名
2. 上 HTTPS 证书

这样短链会更可用，也更像正式产品。

如果你愿意，我下一步可以继续帮你补：

- 域名 + HTTPS 的 Nginx 配置
- 一键部署脚本
- 自动更新脚本
