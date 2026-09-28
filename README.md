# 沿边慢行 · 丹东到东兴

面向一人、四驱车、十月出发的 G331 × G219 沿边自驾路书。

**直接访问：https://hongshao2026.github.io/Around-China/**

这是公开的静态网站，访问不需要 GitHub 或 ChatGPT 账号。

## 可以做什么

- 首页是完整路书总览大表，一次列出全部当前行程；按路段筛选、搜索，点击天数返回当天地图与详情。
- 总表包含日期、起终点、里程、驾驶时长、上下午安排、游玩、住宿区域与预算、当天提醒，支持打印当前表或保存为 PDF。
- 点击每日行程和地图住宿点，查看起终点、估算里程、驾驶时长、上下午安排、游玩建议与住宿区域。
- 调整出发日期、增加休整日，或将支持拆分的长驾驶日分成两天。
- 选择冬季绕行方案，联动更新地图、日历和预算。
- 调整油耗、能源价格、食宿等预算假设，下载当前逐日行程 CSV。
- 设置保存在当前浏览器的本地存储中；不同设备不会自动同步。

## 文件与维护

- `dist/`：完整网站，可直接通过静态 HTTP 服务运行，无需构建。
- `dist/data.js`：每日行程、地点、备选路线与参考来源。
- `dist/engine.js`：日期、拆分、绕行及预算计算。
- `dist/app.js`、`dist/styles.css`、`dist/index.html`：交互、样式与页面。
- `verify.mjs`：路线连续性、日期、预算等自动校验。
- `qa-roadbook.mjs`：完整路书的浏览器交互、移动端、打印、无障碍与地图失败检查。
- `.github/workflows/pages.yml`：更新 `main` 后先校验，再自动发布 `dist/` 到 GitHub Pages。

本地预览（在仓库目录执行）：

```sh
python -m http.server 4173 --directory dist
```

然后打开 http://localhost:4173/ 。运行数据校验：

```sh
node verify.mjs
```

可选浏览器验证：先启动本地静态服务，再安装测试依赖并运行（Node.js 22）：

```sh
npm install --no-save --package-lock=false playwright @axe-core/playwright
npx playwright install chromium
```

将环境变量 `ROADBOOK_URL` 设为预览地址（例如 `http://localhost:4173/`），然后运行 `node qa-roadbook.mjs`。默认测试地址为 `http://127.0.0.1:4174/`，输出在忽略提交的 `qa-output/` 中。

完整 CSV 始终导出全部当前行程，不受表格筛选影响；打印只包含当前显示的行程。新增休整、拆分和绕行都会同步更新表格。未分配机动天数不虚构为每日行程。

## 数据边界

地图是城镇与途经点连线示意，不是逐路段导航。里程、驾驶时长和费用为规划估算；住宿为落脚区域建议，没有预订酒店。路线、天气、边境手续、加油和住宿营业情况需要在出发前及每天途中核实。网页不提供实时路况，也不保证冬季道路持续开放。页面内保留了参考来源。

## 第三方资源

Leaflet、OpenStreetMap 和照片的说明见 [第三方资源说明](dist/THIRD_PARTY.md)。Leaflet 保留上游许可证，照片保留摄影者署名。
