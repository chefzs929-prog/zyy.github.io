# 张喻嫣个人主页 — 接手与协作指南

> 给接手本项目的人（以及未来的我）看的「项目圣经」。改代码前先读对应章节，能少踩 90% 的坑。
> 本文件已涵盖原 WorkBuddy 项目记忆里的全部关键约定；`.workbuddy/` 等内部目录无需交接。

---

## 0. 这是什么

- **个人主页**：张喻嫣（zyy）的个人网站，含 3D 机器人开场、音乐唱片机、剪辑作品面板。
- **正式地址**：`https://chefzs929-prog.github.io/zyy.github.io/`
- **仓库**：`chefzs929-prog/zyy.github.io`（**Public**，用 GitHub Pages 部署）
- **技术栈**：原生 HTML/CSS/JS + three.js（精简版 `three-slim.js`）+ Supabase（访客反馈库）
- **无构建步骤**：直接写 HTML/CSS/JS，提交即部署。

---

## 1. 文件结构（必读）

| 文件/目录 | 说明 |
|---|---|
| `index.html` | 桌面版主入口 |
| `index-mobile.html` | 独立移动版（v5.0 起，竖版唱机/剪辑逻辑都不同） |
| `assets/music/` | **83MB 本地音源**（整首 mp3 + 片段 m4a） |
| `assets/covers/` | 64 张专辑封面 |
| `assets/clips/` | 18 张剪辑配图（1400×787） |
| `assets/vendor/` | three-slim.js 等本地库 |
| `assets/fonts/` | 本地可变字体 |
| `assets/fz.glb` | 3D 机器人模型（218KB） |
| `versions/` | 历史版本快照（**不入库**，本地保留即可） |
| `supabase-schema.sql` | 数据库建表脚本（可重复运行） |
| `DEPLOY-GUIDE.html` | 部署指引（图文） |

⚠ **桌面版与移动版是「完整拷贝」关系，不是共用组件。** 改任何功能都要在两份文件里各改一遍、改完互相 diff 核对。已三次踩坑：emoji 残影、气泡 `greetDismiss()`、CATS 曲库不一致。

---

## 2. ⚠⚠ 最容易翻车的两条铁律

1. **两份入口必须同步改**：桌面/移动各存一份逻辑（尤其 CATS 曲库、气泡、emoji）。漏同步线上就会出诡异 bug。
2. **`assets/` 下所有资源必须真的 commit**：GitHub Pages 只发布已提交内容，未提交 = 线上资源全 404（本地却一切正常）。自查：`git ls-files assets/<dir> | wc -l`（0 = 没入库）。**不需要 Git LFS。**

---

## 3. 本地预览

- 直接用浏览器打开 `index.html` 即可看桌面版。
- ⚠ **WorkBuddy 预览面板不放音频**：`.mp3/.m4a` 会被 404，导致「站内无音源、音频没加载」——这不是播放器 bug，用本地 http 服务或真实部署验证音源。
- 本地起服务：`python3 -m http.server`，访问 `http://127.0.0.1:8000/index.html?desktop=1`。
- 站长后台：网址加 `?admin=1`。

---

## 4. 部署流程

1. 改两份入口（`index.html` + `index-mobile.html`）
2. 把 `assets/` 整个勾上一起提交（见铁律 2）
3. **用 GitHub Desktop 图形界面** commit → Push origin（用户规则：不走命令行部署）
4. Pages 自动重新部署（约 1 分钟）
5. 验证：`curl -o /dev/null -w "%{http_code}" https://chefzs929-prog.github.io/zyy.github.io/assets/<路径>`

---

## 5. 技术约定与坑

- CSS 注释里**不能出现 `</style>` 字面量**（会提前关闭样式表）。
- `backdrop-filter` 必须紧跟 `-webkit-backdrop-filter`（Safari 只认带前缀的）。
- Safari 给带 filter 的元素单独建合成层 → `backface-visibility` 失效，翻转卡用 `opacity/visibility` 显式切换。
- **移动端所有输入框字号 ≥16px**（Safari <16px 会放大整页）。
- **禁止引入境外 CDN**：字体在 `assets/fonts/fonts.css`，vendor 在 `assets/vendor/`。
- 断点：**1180 / 900 / 560**。面板内部列宽要用 `@container` 按容器判断，**视口断点一定错位**（例如 `.deck` 左右是 2fr/1fr）。
- 移动版覆写 CSS **要写在原始规则之后**（写在前面会被静默盖掉）。
- **新增一个页面**（分页站点）标准动作：
  1. `<section class="page page--xxx" data-pid="SEC.NN — XXX">` 插到目标位置；不需要滚动的页**不要**加 `.page__inner`。
  2. pager 里加 `<button data-go="n">`，它后面所有按钮的 `data-go` 顺延。
  3. 后面各页的 `data-pid` 编号、`.phead__idx`、HTML 注释编号一起顺延（About 页内 block 小编号是独立体系，别跟着改）。
  4. 动画写独立 IIFE，靠 `page:change` 事件 + 自己的 index 判断，只在本页 is-active 时跑 rAF，切走立即停。
  5. 改完冒烟：提取所有 `<script>` 跑 `node --check`；核对「pages 数 == pager 按钮数 == data-pid 数」。
- **微信访问硬限制**：WorkBuddy 托管网关对 UA 含 `MicroMessenger` 的请求全域名 403，改代码无效 → 只能挂 GitHub Pages。`github.io` 在 QQ 内置浏览器能开；判断某环境能否打开必须用真实 UA 复现，不能只看 GET 200。

---

## 6. 音乐面板 `#deck`（唱片机）

- 入口：点「音乐」簇 / 标签 / Enter；Esc 或右上角关闭。`z-index:70`。
- ⚠ **`CATS` 曲库两份各存一份**（桌面/移动各 62 首，22/16/24 三栏），加歌改歌必须两边一起改。
- 字段：`t/a/cover/src/pv/ext`。**音源四级降级**：`src`(整首本地 mp3) > `pv`(30秒片段本地 m4a) > `ext`(官方平台跳转) > 无。
- ⚠⚠ **不要再用网易云外链做整首**：其 302 目标是 http CDN 且一次性签名，https 站点上 Safari/微信内置浏览器直接拦成静音，只有 Chrome 静默升级能播 → 出现「curl 206/Chromium 能播」与「用户一片静音」并存。新曲一律下载到本地 `assets/music/`，不再挂远程直链。
- ⚠ 封面 `<img>` 必须加 `pointer-events:none; -webkit-user-drag:none; draggable="false"`，否则会抢走「拖封面到转盘」的手势。
- 进度条以 `audio.currentTime` 为准（RAF 自累加会漂移），`fmt()` 必须 `m:ss`。
- 禁用 `createMediaElementSource`（Web Audio 因 CDN 无 CORS 头会静音）。
- 平台跳转按钮常驻但必须卡 `mode==='none'`，否则正常放歌时转盘下也会挂出平台链接。
- 面板内 `<img>` 必须延到第一次 `open()` 才注入（隐藏容器里的图照样立刻发请求，`loading="lazy"` 拦不住）。
- 调试钩子：`__zyDeck.open()/load(i)/info()/links()/el()/dur(n)`。

---

## 7. 剪辑面板 `#clips`

- 入口：点「剪辑」簇 / `.ilabel[data-k="edit"]`；Esc 或右上角关闭。`z-index:70`。
- 两组：第一组 `.cstack` **滚动堆叠**（sticky，系数 `--cl-ph` = 舞台高 ×0.63，下限 0.46）；第二组 `.swipe` **左右滑动 + 3D 景深**。
- ⚠ **「行距」要分清**：左栏文字清单的间距，vs 卡片之间的间距（`--cl-ph` 联动卡片尺寸，卡片缩小→空档变大，观感像行距被改）。改前先问清是哪种。
- 滚轮手势（v6.5 定稿）：按「手势」锁，**间隔 >180ms 才算新手势，一次最多翻一张**；只认**正中那张卡**（`.swipe__card--cur`）才翻页，落在标题/按钮/留白 → 当普通页面滚动放过去。用 `getBoundingClientRect` 按手势算一次命中并整段复用。
- 卡片是纯图（16:9），里面不配文字；面板内不留操作说明类文案（用户明确要求删掉的「滚轮翻阅」「拖一下」别再加回来）。
- 配图 `assets/clips/`：18 张 1400×787，按固定内容区裁掉播放器黑边（`1920→x∈[174,1742]`）；截图带 B 站水印/台标，裁黑边去不掉（用户已知）。
- 移动版 `#mclips`：正片竖滚堆叠 + 片尾无限走马灯（与桌面滑动景深是两套实现）。
- 调试钩子：`__zyClips.open()/close()/goto(i)/shot(i)/state()`。

---

## 8. 3D 机器人

- ⚠ **不要动 `assets/fz.glb`**（用户否决删动画/重编码），只在 JS 侧优化。
- `assets/vendor/three-slim.js` 是 rollup tree-shaking 产物（612KB / 149.7KB gz）。
- 页面用新的 `THREE.*` 符号**必须加进 entry.js 重打包**。
- ⚠ 死重待删（用户未拍板）：旧 `three.module.min.js` + `assets/vendor/jsm/` + `workbuddy-cloud-sdk.global.js`，约 700KB。

---

## 9. 数据库 Supabase

- 项目 ref `ixvqxtfzesostrthmygx`（新加坡节点）。**公开 key**：`sb_publishable_B4XFIxP-DG0hzOq_49R8ZA_ebFgeC7m`（可公开，映射 anon）。
- 建表脚本 `supabase-schema.sql`（可重复运行）：`feedbacks{name,rating,comment,profession,device,created_at}` / `recos{kind,content,created_at}` / `admin_secret`(md5)。
- RLS 只开 INSERT + SECURITY DEFINER 口令读函数（`read_feedbacks`/`read_recos`）。**反馈表不能设 owner_id**（匿名插入会失败）。
- POST 必须带 `Prefer: return=minimal`。
- ⚠ **两套库两套口令**：线上旧站 v5.9 连旧 WorkBuddy 云库（13 条反馈），本地 v6.x 连 Supabase。排查「口令不正确」先问在哪测的。
- `sb_secret_` 绕 RLS，**绝不能进前端**。

---

## 10. 反馈邮件自动化（可选）

- 原自动化「主页访客反馈新增提醒」每 6 小时跑，基线 `.workbuddy/feedback-watch/state.json`。
- 走 **QQ 邮箱 MCP** 通道（`skip_confirmation=true`），Agent 邮箱返回 `not_bound` 时不可用。

---

## 11. 待办 / 遗留项（接手人可能要处理，均未拍板）

- [ ] 旧 three 死重（约 700KB）删否
- [ ] 切换唱片箱分类 chip 后滚动位置不重置（`renderCrate()` 末尾 `crateEl.scrollTop=0`）
- [ ] 页面无 og / 微信分享 meta
- [ ] clips 截图带 B 站水印 / 电视台台标
- [ ] 旧 WorkBuddy 云库里 13 条反馈是否导出
- [ ] 剪辑第二组「到头夹住」还是「循环」（用户提过循环但未实装）

---

## 12. 不需要交接的文件（WorkBuddy 内部状态）

这些目录/文件已被 `.gitignore` 排除，**不要提交、也无需交给协作者**：
- `.workbuddy/`（本项目记忆，本指南已提炼其全部内容）
- `.diag/`（诊断缓存）
- `.wbapp_*.genie`（本地发布状态，含 appId）
- `versions/`（历史版本快照，本地保留）

> 若接手人也要用 WorkBuddy 维护，可额外把 `.workbuddy/memory/` 目录复制给对方（不含任何密钥，仅项目约定）。

---

## 13. 给协作者的约定

- **先读本文档再动手**，尤其第 2 节两条铁律。
- 改动前在两份入口文件里都改、互相 diff。
- commit 信息参考历史风格（「做了什么 + 影响」），例如「清理死重」「上线指引对齐现状」。
- 部署走 GitHub Desktop，不要命令行强推。
- 遇到「未拍板」项，先列出来让项目 owner 决定，不要自作主张删/改。
