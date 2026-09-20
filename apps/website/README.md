# 见客官网模块

从现有见客官网的 Next.js 源码迁入，保留首页、轻量版服务、客户案例和 GEO 观察，以及语言切换、移动导航、咨询弹窗和公开报告卡片。

## 开发与构建

- `pnpm --filter @oneglanse/website dev`：单独开发官网，访问 `http://127.0.0.1:3100`。
- `pnpm dev:web`：先构建官网，再启动后台；侧栏“官网”入口为 `/website`。
- `pnpm turbo build --filter=@oneglanse/web...`：自动构建官网并将静态输出复制到 `apps/web/public/official-site/`，再构建 Web。两个 Web Dockerfile 都使用此流程。
- `pnpm --filter @oneglanse/website build:standalone`：生成根路径版本的 `out/`，供独立静态服务器发布。
- `pnpm --filter @oneglanse/website test`：检查公开报告解析和统计口径。

`app/` 定义四个页面，`components/` 保存交互组件，`content/` 保存中英文内容，`app/globals.css` 保存原官网样式。生成的 `out/` 和 Web 中的副本不提交 Git。

## 后台内的官网

官网静态页面公开挂载在 `/official-site`，后台 `/website` 使用同源 iframe 预览，隔离官网与后台样式。页面、图片和导航均带统一前缀，支持直接打开子页面。官网内“监测平台”链接指向当前生产后台，可通过 `NEXT_PUBLIC_TOOL_URL` 在构建时覆盖。

`/website` 需要登录，普通只读账户也可以访问。`/official-site` 仅包含官网公开内容，不提供后台或工作区数据接口。现有 80 端口站点是独立部署，修改该站点需单独发布根路径导出，不能覆盖其中的 `/dashboard`、`/report` 等其他站点目录。

## 数据与原稿边界

首页卡片沿用 `lib/public-report.mjs`：构建时读取麦核纹发的指定公开报告，以报告记录计算提及率；报告不可用、格式变化或统计不一致时构建失败，不使用模拟数据。它是报告快照，不是实时统计。

咨询表单沿用原稿，只执行浏览器校验并展示成功界面，尚未接入提交接口。其余客户评价、博客文章、电话和备案号沿用原稿，包括示例或占位内容；文章详情不在本模块范围内。
