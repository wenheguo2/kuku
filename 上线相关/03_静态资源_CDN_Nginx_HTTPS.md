# 03 · 静态资源 · CDN · Nginx · HTTPS

> 本篇：把 ~450GB 内容（索引/封面/MP3）放到线上并能被小程序访问，配 Nginx 反代 API + HTTPS。
> 两套方案二选一：**方案 A = 对象存储 COS/OSS + CDN（推荐上线）**；**方案 B = 单机 Nginx 直服（内测）**。

---

## 1. 先搞懂：CDN 是什么、和服务器啥关系

- **服务器（云主机）**：跑你的程序（API）和数据库。算力+少量存储。
- **对象存储（COS/OSS）**：专门存海量文件的「网盘」，容量近乎无限，按量付费。适合放 450GB 音频/图片。
- **CDN（内容分发网络）**：把对象存储里的文件**缓存复制到全国各地的边缘节点**。用户在广州就从广州节点下、在北京就从北京节点下，**又快又不占你服务器带宽**。

一句话关系：**对象存储负责“存”，CDN 负责“快”，云服务器负责“算”。** 三者配合，不是互相替代。

小程序里静态资源地址由构建时的 `staticBaseUrl` 决定（见文档 04）：
- 方案 A：`staticBaseUrl = https://cdn.你的域名`（指向 CDN）
- 方案 B：`staticBaseUrl = https://你的域名/static`（指向服务器 Nginx）

---

## 2. 内容结构与规模（要上传/放置的东西）

本地 `项目/酷酷儿童故事/production/` 即静态根，结构：

```
production/
├── index/               # 索引 JSON（首页/搜索/目录）  ~20MB  ← 必传
│   └── generated_stories/  _search_story.json / _search_song.json / 各目录 _index.json ...
├── illustrations/       # 封面/插画（covers/generated/...）  ~4GB   ← 必传
├── audio/               # 故事/歌曲 MP3（含分段）  ~352GB
├── generated_stories/   # 按作品组织的音频与元数据  ~93GB
└── (redub_run.log 等日志/中间产物  ← 不必传)
```

- 小程序取资源的根 = `staticBaseUrl`，其下必须能访问到 `index/`、`illustrations/`、`audio/`、`generated_stories/`（URL 由 `utils/path.ts` 拼接，逐段 encodeURIComponent，支持中文目录）。
- **最稳做法：整棵 `production/` 上传/放置到静态根**（保留目录名，含中文）。日志类（`*.log`、`__pycache__`、`_dedup` 中间产物）可不传（优化见 `00 文档 P5`，上线阶段不强求）。

---

## 3. 方案 A：对象存储 COS + CDN（推荐）

以腾讯云 COS 为例（阿里云 OSS 同理，命令换 `ossutil`）。

### 3.1 建桶
1. 开通对象存储 COS，新建 **Bucket**（如 `kuku-static-1300000000`），地域选**与用户接近的国内地域**。
2. 访问权限：**公有读、私有写**（静态资源允许匿名读）。
3. 记下访问域名，形如 `https://kuku-static-1300000000.cos.ap-shanghai.myqcloud.com`。

### 3.2 配置 CLI 并批量上传
在**放着 production 的机器**（本地开发机或临时大带宽机器）执行：

```bash
# 腾讯云 coscli 初始化（填 SecretId/SecretKey/地域/桶名）
coscli config init

# 批量上传整棵 production（保留目录结构；-r 递归）。450GB 会传很久，建议在带宽好的环境跑
coscli sync ./production/ cos://kuku-static-1300000000/ -r
#            ↑本地目录        ↑桶根（这样 桶根/index、桶根/illustrations ... 一一对应）
```

- `sync` 支持断点续传/增量，中断可重跑。
- 想省空间可先只传 `index/`、`illustrations/`，音频分批传（但**上线前必须传全**，否则播放 404）。
- 阿里云：`ossutil cp -r -u ./production/ oss://你的桶/`
- **内容母本在 Windows（`d:\...\项目\酷酷儿童故事\production`）**：下载 `coscli-windows.exe`，PowerShell 里跑 `.\coscli.exe sync .\production\ cos://桶名/ -r`；或用图形工具 **COSBrowser**（腾讯云）/ **ossbrowser**（阿里云）拖拽整个 `production` 文件夹上传，支持断点续传、最省心。450GB 建议在带宽好的环境跑，预留数小时。

### 3.3 挂 CDN 加速域名
1. COS 控制台 → 域名与传输管理 → **自定义 CDN 加速域名**，填 `cdn.你的域名`（需已备案）。
2. **回源**：源站自动指向该 COS 桶。
3. **HTTPS**：给 `cdn.你的域名` 配 SSL 证书（云厂商免费证书，一键部署）。**微信小程序要求 HTTPS**。
4. **DNS**：按控制台提示，把 `cdn.你的域名` 用 CNAME 解析到 CDN 分配的地址。
5. 记下最终 `staticBaseUrl = https://cdn.你的域名`（无尾斜杠；文档 04 构建时用）。

### 3.4 CDN 缓存与压缩规则
| 文件类型 | 缓存时间 | 说明 |
|---|---|---|
| `*.mp3` `*.jpg` `*.webp` `*.png` | **30 天以上** | 内容基本不变，长缓存最优 |
| `*.json`（索引） | **不缓存 / 60 秒** | 索引会更新，避免用户读到旧索引；将来接版本号后可长缓存 |

- 在 CDN 控制台「缓存配置」按后缀设置以上规则。
- 打开 CDN 的 **智能压缩 / Gzip**（对 `.json` 文本生效，进一步省流量）。
- 确认 `.webp` 的 Content-Type 为 `image/webp`（COS 按后缀自动设置；小程序封面 `<Image webp>` 已适配，真机可解码）。

### 3.5 验证
```bash
curl -I https://cdn.你的域名/index/generated_stories/_search_song.json
# 期望：HTTP 200，Content-Type: application/json
curl -I "https://cdn.你的域名/illustrations/covers/generated/..."   # 任取一张封面，200
```
中文路径需 URL 编码测试；小程序端由 `path.ts` 自动编码，无需手工处理。

---

## 4. 方案 B：单机 Nginx 直服（内测）

### 4.1 挂数据盘并放内容
```bash
# 假设数据盘为 /dev/vdb，格式化并挂到 /opt/kuku/production
sudo mkfs.ext4 /dev/vdb
sudo mkdir -p /opt/kuku/production
sudo mount /dev/vdb /opt/kuku/production
echo '/dev/vdb /opt/kuku/production ext4 defaults 0 0' | sudo tee -a /etc/fstab   # 开机自动挂载

# 把本地 production 内容传到服务器该目录（450GB 需较久+大带宽）
# Linux/Mac/WSL：rsync 断点续传
rsync -avz --progress ./production/ root@服务器IP:/opt/kuku/production/
# Windows（内容母本在 d:\...\production，无原生 rsync）：用 WinSCP（GUI，支持断点续传）拖传，
#   或装 WSL 后用上面的 rsync；避免用 scp -r（大目录不可续传，中断得重来）
```

### 4.2 让 Nginx 服务 /static
把 `production/` 映射到 `https://你的域名/static`，与开发期一致（`staticBaseUrl=https://你的域名/static`）。Nginx 配置见 §5.3。

> 方案 B 下 `/static` 由 Nginx 直服（不经 Node），所以 Node 的 gzip 不作用于静态；需在 Nginx 开 gzip（§5.3 已含）。

---

## 5. Nginx 反向代理 API + HTTPS

无论方案 A/B，**API 都由 Nginx 443 反代到本机 3000**。

### 5.1 让后端信任反代（拿到真实客户端 IP，供限流）
后端 `main.ts` 会读 `TRUST_PROXY`。**回到 `/opt/kuku/server/.env` 补一行**，然后 `pm2 restart kuku-api`：
```ini
TRUST_PROXY=1
```

### 5.2 申请 HTTPS 证书（certbot）
先把 `api.你的域名`（方案 B 再加主域名）DNS 解析到服务器 IP，且 80 端口可访问：
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.你的域名           # 方案B：-d api.你的域名 -d 你的域名
# 按提示填邮箱、同意条款，选择自动 302→HTTPS。证书自动续期由 certbot 定时任务处理
sudo certbot renew --dry-run                    # 验证自动续期可用
```

### 5.3 Nginx 站点配置
新建 `/etc/nginx/sites-available/kuku.conf`（certbot 会自动补 443/证书段，这里给出反代与静态的核心）：

```nginx
# ---- API：反代到本机 NestJS:3000 ----
server {
    server_name api.你的域名;

    client_max_body_size 2m;         # 后端限制请求体 1mb，留余量
    # gzip 由 NestJS(compression) 负责，这里透传即可

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
    listen 80;   # certbot 会追加 443 ssl 段并把 80 跳转到 443
}

# ---- 方案 B 才需要：静态资源 /static ----
server {
    server_name 你的域名;

    # gzip 压缩索引 JSON（静态不经 Node，需在此开启）
    gzip on;
    gzip_types application/json text/plain application/javascript text/css;
    gzip_min_length 1024;

    location /static/ {
        alias /opt/kuku/production/;      # /static/index/... → /opt/kuku/production/index/...
        expires 30d;                      # 图片/音频长缓存
        add_header Cache-Control "public";
        location ~* \.json$ { expires 60s; }   # 索引短缓存
        # 小程序渲染层跨源加载图片需要（否则 Image 可能空白）
        add_header Cross-Origin-Resource-Policy cross-origin;
    }
    listen 80;
}
```

启用并重载：
```bash
sudo ln -s /etc/nginx/sites-available/kuku.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> 方案 A 不需要 `/static` 那段（静态全在 CDN）。只保留 API 反代 server 块即可。

### 5.4 验证 HTTPS API
```bash
curl https://api.你的域名/api/v1/health      # 期望 code:0, db:true
```

---

## 6. 域名与 ICP 备案（务必先行）

- 中国大陆云服务器/域名**必须完成 ICP 备案**后才能公网提供服务（含 `api.` 与 `cdn.` 子域）。
- 备案在云厂商备案系统办理，周期通常 1–3 周，**请最先启动**。个体工商户主体的注册与备案全流程见 `md/21`。
- 微信小程序要求所有网络域名为 **HTTPS**，且需在小程序后台配「服务器域名」白名单（文档 04 §2）。

---

## 7. 本阶段验收 ✅

- [ ] 方案 A：`production/` 已全量上传 COS；`cdn.你的域名` CDN+HTTPS 生效；`curl -I` 取索引/封面/一个 mp3 均 200
- [ ] 方案 B：数据盘已挂载并写入 fstab；`production/` 已 rsync 到位；`https://你的域名/static/...` 可取到文件
- [ ] `.env` 已补 `TRUST_PROXY=1` 并 `pm2 restart`
- [ ] `certbot` 证书签发成功、`renew --dry-run` 通过
- [ ] `curl https://api.你的域名/api/v1/health` 返回 `code:0` 且 `db:true`
- [ ] ICP 备案已通过

---

_下一篇：`04_小程序发布与验收回滚.md`_
