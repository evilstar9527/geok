# 觅蜂引客官网模块

使用用户确认的浅色纯 HTML 原稿，来源为原官网工作区的 `static-site/dist/`。`site/` 是直接维护、提交的源码，包含首页、轻量版服务、客户案例和 GEO 观察，保留白底、青绿与黄色版式以及原有交互。

## 开发与构建

- `pnpm --filter @oneglanse/website dev`：预览原稿，访问 `http://127.0.0.1:3100`，修改文件后刷新。
- `pnpm dev:web`：生成官网静态副本后启动后台，侧栏“官网”入口为 `/website`。
- `pnpm turbo build --filter=@oneglanse/web...`：将 HTML、CSS、原生 JavaScript、图片与字体复制到 `out/` 和 `apps/web/public/official-site/`，再构建 Web，无需另一个 Next.js 构建。
- `pnpm --filter @oneglanse/website build:standalone`：生成根路径版本 `out/`，供独立静态服务器发布。
- `pnpm --filter @oneglanse/website test`：验证四个页面的正文、翻译、站内链接、锚点、本地字体和嵌入路径。

中文正文在四个 `index.html` 中，英文文案在 `site/assets/i18n/`，共用样式和交互在 `site/assets/style.css`、`site/assets/main.js`。字体本地托管，许可在 `site/assets/fonts/*-OFL.txt`。正文不依赖 JavaScript 或外部字体服务才能显示。

## 后台内的官网

官网静态页面公开挂载在 `/official-site`，后台 `/website` 使用同源 iframe 预览，隔离两套样式。构建只为站内页面和资源添加路径前缀，并将“监测平台”链接指向生产后台（可沿用 `NEXT_PUBLIC_TOOL_URL` 覆盖），保留原稿内容与设计。`site/` 不包含托管服务配置，生成的副本不提交 Git。

`/website` 需要登录，普通只读账户也可以访问。静态官网不提供后台或工作区数据接口。80 端口的旧站点仍独立部署，不能用本模块覆盖其 `/dashboard`、`/report` 等其他目录。

## 独立官网发布

生产 `geok.cloud` 由独立 Nginx 容器读取 `/opt/jianke-sites/public`，后台镜像里的 `/official-site` 更新不会同步该目录。`scripts/deploy-server.sh` 在 Web 健康后调用 `scripts/deploy-website.sh`，生成根路径版本并只覆盖官网拥有的文件，保留旧站其他目录。也可在服务器 `main` 与 `origin/main` 一致、工作区干净时单独运行 `bash scripts/deploy-website.sh`，无需重启后台或数据库。

覆盖前的文件和变更清单保存在 `/opt/jianke-sites/website-backups/<提交>-<时间>/`。发布后比较公网首页与构建产物，内容不同即报告失败。`DEPLOY_WEBSITE_ROOT`、`DEPLOY_WEBSITE_BACKUPS`、`DEPLOY_WEBSITE_URL` 可覆盖这三个部署位置。

## 原稿边界

首页保留浅色原稿的示例卡片与“示例数据”标识，不冒充工作区实时统计，也不再构建深色版本的公开报告卡片。真实分析数据仍在后台看板与报告中。

咨询表单沿用原型行为：浏览器校验后展示演示成功状态，不发送或保存信息。客户示例、文章卡片、联系方式和备案号沿用原稿，不新增文章详情页。
