# 秘蜂赢客官网模块

使用用户确认的浅色纯 HTML 原稿，来源为原官网工作区的 `static-site/dist/`。`site/` 是直接维护、提交的源码，包含首页、服务流程、客户案例、博客与 GEO 常见问题（沿用 `/services-lite/` 与 `/blog/` 路径），保留白底、青绿与黄色版式以及原有交互。

## 开发与构建

- `pnpm --filter @oneglanse/website dev`：构建并预览，访问 `http://127.0.0.1:3100`；修改源码后重新运行 `build:standalone`，再刷新。
- `pnpm dev:web`：生成官网静态副本后启动后台，侧栏“官网”入口为 `/website`。
- `pnpm turbo build --filter=@oneglanse/web...`：将 HTML、CSS、原生 JavaScript、图片与字体复制到 `out/` 和 `apps/web/public/official-site/`，再构建 Web，无需另一个 Next.js 构建。
- `pnpm --filter @oneglanse/website build:standalone`：生成根路径版本 `out/`，供独立静态服务器发布。
- `pnpm --filter @oneglanse/website test`：验证六组中英文页面的正文、翻译、站内链接、锚点、语言标记、站点地图、本地字体和两种构建路径。

中文正文在六个 `index.html` 中，英文文案在 `site/assets/i18n/`，共用样式和交互在 `site/assets/style.css`、`site/assets/main.js`。字体本地托管，许可在 `site/assets/fonts/*-OFL.txt`。正文不依赖 JavaScript 或外部字体服务才能显示。

## 多语言网址

六个中文页面保持原路径，英文对应 `/en/`、`/en/services-lite/`、`/en/case-studies/`、`/en/blog/`、`/en/whitepaper/`、`/en/blog/shanghai-local-geo/`。构建将已有英文词典写入静态 HTML，正文、标题与描述均不依赖运行时翻译。语言按钮生成可抓取的链接；英文页的站内页面导航继续使用英文路径，切换语言时保留当前锚点。

每页 canonical 指向本语言网址，并包含双向 `zh-CN`、`en` 和以中文为默认的 `x-default` hreflang。`site/sitemap.xml` 收录十二个网址；页面级结构化数据同步语言及网址，共享品牌实体仍使用原有标识。新增页面时同步维护词典与站点地图。`data-i18n` 绑定叶子元素，属性使用 `data-i18n-content`、`data-i18n-alt` 等已有约定。

生产独立发布只有 Node、没有安装依赖且关闭网络，因此构建脚本只使用 Node 内置模块。嵌入版仅为导航和资源添加 `/official-site`，SEO 元数据仍指向公网官网。

## 后台内的官网

官网静态页面公开挂载在 `/official-site`，后台 `/website` 使用同源 iframe 预览，隔离两套样式。构建只为站内页面和资源添加路径前缀，并将“监测平台”链接指向生产后台（可沿用 `NEXT_PUBLIC_TOOL_URL` 覆盖），保留原稿内容与设计。`site/` 不包含托管服务配置，生成的副本不提交 Git。

`/website` 需要登录，普通只读账户也可以访问。静态官网不提供后台或工作区数据接口。80 端口的旧站点仍独立部署，不能用本模块覆盖其 `/dashboard`、`/report` 等其他目录。

## 独立官网发布

生产 `geok.cloud` 由独立 Nginx 容器读取 `/opt/jianke-sites/public`，后台镜像里的 `/official-site` 更新不会同步该目录。`scripts/deploy-server.sh` 在 Web 健康后调用 `scripts/deploy-website.sh`，生成根路径版本并只覆盖官网拥有的文件，保留旧站其他目录。也可在服务器 `main` 与 `origin/main` 一致、工作区干净时单独运行 `bash scripts/deploy-website.sh`，无需重启后台或数据库。

覆盖前的文件和变更清单保存在 `/opt/jianke-sites/website-backups/<提交>-<时间>/`。发布后比较公网首页与构建产物，内容不同即报告失败。`DEPLOY_WEBSITE_ROOT`、`DEPLOY_WEBSITE_BACKUPS`、`DEPLOY_WEBSITE_URL` 可覆盖这三个部署位置。

## 内容与交互边界

首页客户成果展示汽车、Amico 和 SCENTA 三个案例，截图源文件保存在 `site/assets/cases/`，完整显示并链接原图；汽车案例按用户指定的智推参考页补充优化后截图（`case-ev-post-highlight.svg`），与优化前截图配对展示。手机端标签横滑，证据卡片纵向排列；案例材料中的指标与截图里的单次回答须区分。产品展示区保留监测面板，公开页面不显示“示例”“示意”等标签，也不再构建深色版本的公开报告卡片。该静态面板未接入工作区数据，真实分析数据仍在后台看板与报告中。

首页在 SCENTA 标签后追加头皮护理、月子中心、SPA 三类客户案例，分别展示 3、2、5 家门店。文案与品牌配图整理自用户提供的《秘蜂赢客 客户案例》，图片保存在 `site/assets/cases/`；原文未写名称的第二家月子中心按其配图标识展示为“优艾贝”。这些卡片保留门店名称、商圈与 Logo，以 GEO 服务方向和前后对比展示关联性。头皮护理、月子中心与 SPA 分别使用用户指定的 6% → 71%、2% → 62%、5% → 77% 示例提及率，对应提升 65、60、72 个百分点。公开页面按用户要求移除“示例”“示意”、非实际监测结果及模拟回答等说明。该文案调整不构成数据验证：提及率仍来自用户指定值，问答为整理内容；有实测材料后再替换。全部正文保留在静态 HTML，中英文同步，沿用标签的键盘切换和手机横滑交互。

公开文案按 2026 年 9 月品牌母稿维护，中英文同步。麦核纹发案例为用户确认可公开名称的个案，须保留半年服务周期与结果非保证说明；口腔、孕产及餐饮部分以服务场景与服务方向呈现。

咨询弹窗提供真实客服电话、联系邮箱、办公地址和企业微信获取方式，不收集表单数据，不展示虚假的提交成功状态。`/blog/` 展示媒体报道卡片和完整 FAQ；首页、各子页的「更多」、手机导航及页脚均有博客入口。同题报道合并成一个博客卡片，进入 `/blog/shanghai-local-geo/` 的站内汇总与解读；文章末尾保留三家媒体原文链接，在新标签页打开。中英文文章分别静态生成，带正文、导读、来源、相关阅读与 `BlogPosting` 元数据。文章样式在 `assets/article.css`，词典在 `assets/i18n/shanghai-local-geo.js`。原有 FAQ 入口指向 `/blog/#faq-intro`，具体问题锚点继续有效。博客配色沿用共享主题变量，专用样式在 `assets/blog.css`。首页 Search Console 验证标记须在后续发布中保留。

首页行业品牌参考区使用 `site/assets/brands/` 中本地保存的 30 个灰白 Logo，素材来自欧博东方公开页面并按实际图像核对命名，不能从原站有错位的文件名推断。桌面端六列排列，使用三秒错峰呼吸光效与悬停高亮，手机端三列，减少动态效果偏好下关闭呼吸动画。页面不展示来源说明与链接；枫叶租车包含在此区。

## 白皮书阅读与下载

`/whitepaper/` 与 `/en/whitepaper/` 提供完整静态正文、九章目录、FAQ 和事实表；页首及页尾保留中文 Word 下载。中文正文来自已删除末尾排版说明的原文，英文正文在 `assets/i18n/whitepaper.js`，不依赖浏览器翻译。发布方与资料口径在页面可见；品牌披露的规模、履历与案例不能解释为独立验证或效果承诺。

`WebPage.mainEntity` 标记为 `Report`，构建同步阅读版本的网址、标题与语言，中文原件的下载语言保持 `zh-CN`。新增内容时同步正文、词典、站点地图与抓取测试。白皮书样式在 `assets/whitepaper.css`；缓存映射覆盖两种语言及站内报道文章，安装器仅允许从保存的 v1、v2 原始映射迁移，仍拒绝任意被修改的策略。
