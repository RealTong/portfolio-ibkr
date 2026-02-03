# Portfolio-IBKR

[English](./README.md)

一个基于 **Bun + Hono + React (Vite)** 的 IBKR 投资组合看板：通过 IBKR Web API 拉取账户信息 / 持仓 / 账本，并将 **净值快照** 持久化到 **SQLite** 以绘制历史曲线。

## 运行时配置（适合 Docker 开源）

为了方便开源到 GitHub（不提交个人标题、密钥文件、以及本地数据库），以下内容都支持在 **Docker 运行时** 配置：

- 页面标题（`PORTFOLIO_TITLE`）
- IBKR OAuth 配置文件路径（`IBKR_OAUTH_PATH`，运行容器时挂载 `oauth.json`）
- SQLite 文件路径（`PORTFOLIO_DB_PATH`，运行容器时挂载持久化卷）

## 环境变量

- `PORT`：服务端口（默认：`3000`）
- `PORTFOLIO_TITLE`：界面标题（默认：`IBKR Portfolio`）
- `IBKR_OAUTH_PATH`：IBKR OAuth 配置 JSON 文件路径（默认：`oauth.json`）
- `PORTFOLIO_DB_PATH`：保存净值快照的 SQLite 路径（默认：`data/ibkr-portfolio.sqlite`）
- `IBKR_ACCOUNT_ID`：可选的默认账户 ID（仅当某些接口未传 `?accountId=` 时作为兜底）

## 本地开发

### 依赖

- [Bun](https://bun.sh/)（本仓库以 Bun `1.2.x` 测试）
- IBKR Web API 权限 + OAuth 配置（见下文）

### 启动

```bash
bun install
bun run dev
```

- 前端：`http://localhost:5173`
- API 服务：`http://localhost:3000`（Vite 会把 `/api` 代理到该服务）

## IBKR OAuth 配置（`oauth.json`）

本项目使用 [`ibkr-client`](https://www.npmjs.com/package/ibkr-client)。

你需要准备一个 OAuth 配置 JSON 文件（务必不要提交到仓库）。两种方式：

- 参考 `oauth.example.json` 模板，填入你的值后保存为 `oauth.json`
- 使用 `ibkr-client` 生成：
  1. 按照上游说明获取所需的文件与字符串（过程中可能需要 `openssl`）。
  2. 执行：

     ```bash
     cd node_modules/ibkr-client
     node configure.js
     ```

  3. 将生成的 `oauth1.json` 复制到项目根目录并命名为 `oauth.json`（或通过 `IBKR_OAUTH_PATH` 指定路径）。

## Docker 部署

### 构建镜像

```bash
docker build -t portfolio-ibkr .
```

### 运行容器

挂载你的 OAuth 文件，并将 `/app/data` 持久化（用于 SQLite）：

```bash
docker run --rm -p 3000:3000 \
  -e PORTFOLIO_TITLE="My Portfolio" \
  -e IBKR_OAUTH_PATH=/app/oauth.json \
  -e PORTFOLIO_DB_PATH=/app/data/ibkr-portfolio.sqlite \
  -v "$(pwd)/oauth.json:/app/oauth.json:ro" \
  -v portfolio_ibkr_data:/app/data \
  portfolio-ibkr
```

然后访问：`http://localhost:3000`。

## 说明

- SQLite 使用 WAL 模式，因此数据库旁边会同时出现 `*.sqlite-wal` / `*.sqlite-shm` 文件。
- `oauth.json`、`.env`、`data/` 已经在 `.gitignore` 中。
- 本项目会调用交易相关 API，请谨慎保管密钥文件，并自行承担使用风险。

