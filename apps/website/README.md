# 秘蜂赢客官网模块

`site/` 是提交到 Git 的 HTML、CSS、原生 JavaScript、图片与本地字体源码。保持白底、青绿与黄色的官网视觉，构建产物不提交。

## 开发与构建

- `pnpm --filter @oneglanse/website dev`：构建独立官网并在 `http://127.0.0.1:3100` 预览；修改源码后另行运行 `build:standalone`，再刷新浏览器。
- `pnpm --filter @oneglanse/website build:standalone`：生成根路径版本 `out/`。
- `pnpm dev:web`：生成嵌入版本后启动后台，侧栏“官网”入口为 `/website`。
- `pnpm turbo build --filter=@oneglanse/web...`：生成 `out/` 和 `apps/web/public/official-site/`，再构建 Web。
- `pnpm --filter @oneglanse/website test`：构建并检查页面、翻译、站内链接和锚点、元数据、示例标识、本地资源，以及发布时的备份与目录保护。

中文正文在各路径的 `index.html` 中；对应英文文案在 `site/assets/i18n/`，由 `body[data-page]` 选择字典。`data-i18n` 只绑定叶子元素，属性翻译使用 `data-i18n-content`、`data-i18n-alt` 等标记。新增或修改正文时同步维护对应字典。共用样式与交互位于 `site/assets/style.css` 和 `site/assets/main.js`，字体许可在 `site/assets/fonts/*-OFL.txt`。

构建递归发现页面，生成中文根路径和 `/en/` 英文静态页面，并生成 canonical、互相对应的 hreflang、OG/Twitter 分享元信息及 `sitemap.xml`。分享图为 `site/assets/social-preview.png`，可编辑原图为同名 SVG。语言切换使用普通链接，不依赖浏览器存储或运行时文本替换。生产独立发布环境只有 Node，没有 `node_modules` 且关闭网络，因此构建脚本须只依赖 Node 内置模块。

## 页面与内容

- `/`：首页，优先展示麦核纹发案例摘要，再提供三个 Mock 场景和其他行业材料入口。
- `/case-studies/`：案例导航与指标说明。
- `/case-studies/maihe/`：麦核纹发半年案例、已知口径、待核对项和归因边界。
- `/case-studies/scenarios/`：头皮护理、月子中心、女性 SPA 的 10 家门店演示；保留 `#scalp-care`、`#maternity`、`#spa` 锚点，模拟问答用原生 details 折叠。
- `/case-studies/industry-references/`：汽车、Amico、SCENTA 原有材料与截图，保留键盘切换标签、手机横滑和原图链接。
- `/services/scalp-care/`、`/services/spa/`、`/services/beauty/`：各品类的典型问题、所需材料、交付内容和评估方式。
- `/services-lite/`：服务流程；`/blog/`：完整 GEO FAQ，沿用原网址。

上述 10 页各有对应英文网址，共 20 个静态页面。正文和语言导航不依赖 JavaScript，行业标签通过 JavaScript 渐进增强。

麦核纹发沿用用户确认可公开的名称与案例汇总，保留半年周期和结果非保证说明；不补造起止月份、样本量、原始财务记录或独立 AI 归因结果。

门店演示名称、商圈及 Logo 整理自用户提供的《秘蜂赢客 客户案例》；第二家月子中心按配图标识为“优艾贝”。图片在 `site/assets/cases/`。头皮护理、月子中心、SPA 沿用用户指定的 6% → 71%、2% → 62%、5% → 77%，明确标注 Mock、非实测及模拟回答。每组假设 100 条有效回答，仅解释计算方式，没有实际采样记录。获得实测材料后，应同步补齐平台、时间、题集、分母与引用证据。

汽车材料中的优化后图片 `case-ev-post-highlight.svg` 沿用用户指定的参考页。行业材料的单次截图与汇总指标须分开解读，尚缺的统计口径明确标为待复核。产品展示同样保留示例数据标识，真实工作区监测在后台看板与报告中。

品牌文案按 2026 年 9 月母稿维护。咨询弹窗保留真实电话、邮箱、地址与企业微信获取方式，并提供包含门店资料提纲的邮件草稿链接；邮件由用户发送，不收集表单或显示虚假成功状态。首页 Search Console 验证标记须保留。

行业品牌参考区保留 `site/assets/brands/` 中的 30 个本地 Logo，素材来自欧博东方公开页面并按实际图像核对命名。沿用呼吸光效、悬停高亮及减少动态效果适配，不将品牌参考表述为客户成果。

## 后台嵌入与独立发布

后台 `/website` 使用同源 iframe 预览 `/official-site`；需要登录，普通只读账户也可访问。构建为浏览器站内导航和资源添加路径前缀，canonical、hreflang、结构化数据仍指向公网官网。“监测平台”链接默认指向生产后台，可通过 `NEXT_PUBLIC_TOOL_URL` 覆盖。静态官网不暴露工作区数据接口。

生产 `geok.cloud` 由独立 Nginx 读取 `/opt/jianke-sites/public`，后台镜像中的嵌入副本不会自动更新该目录。`scripts/deploy-server.sh` 在 Web 健康后调用 `scripts/deploy-website.sh`，生成根路径版本并只覆盖官网拥有的文件，保留旧站其他目录（包括 `/dashboard`、`/report`）。服务器 `main` 与 `origin/main` 一致、工作区干净时也可单独运行 `bash scripts/deploy-website.sh`，无需重启后台或数据库。

覆盖前备份和变更清单保存在 `/opt/jianke-sites/website-backups/<提交>-<时间>/`。发布后比较公网首页与构建产物，不同即报告失败。`DEPLOY_WEBSITE_ROOT`、`DEPLOY_WEBSITE_BACKUPS`、`DEPLOY_WEBSITE_URL` 可覆盖对应位置。
