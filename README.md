# zyy 个人主页

一个纯静态的个人主页，包含 3D 机器人模型与个人介绍。桌面版与移动版各自独立，通过 UA 自动分发。

## 线上地址

- 当前站点：`https://<你的用户名>.github.io/`（GitHub Pages，开启后生效）
- 历史地址（WorkBuddy 托管）：`https://zyy.app.workbuddy.host/` —— 该托管会因 UA 屏蔽微信访问，见下方说明
- 完整上线步骤见 `DEPLOY-GUIDE.html`

## 反馈与分享的数据存储

反馈表单与「双击卡片分享」原本接在 WorkBuddy 云端数据库上。因该服务的 API 域名对微信 UA
返回 403、且不放行外部域名的跨域请求，现改用 **Supabase Postgres**：

- 前端用原生 `fetch` 直调 Supabase 的 REST 接口，**不引入任何 SDK**（首屏零额外负担）
- 安全模型在数据库层：行级安全**只开放 INSERT**，没有 SELECT / UPDATE / DELETE 策略
  —— 任何客户端读不到、改不了、删不了
- 站长读取必须走 `read_feedbacks(pass)` / `read_recos(pass)` 这两个 `SECURITY DEFINER` 函数，
  口令以 md5 哈希存在 `admin_secret` 表中，校验失败直接抛错
- 写在网页里的只有 **publishable key**，它按设计就是公开的，且本身不具备任何读权限；
  真正能绕过权限的 `sb_secret_` 密钥永远不进本仓库

## 文件结构

| 文件 | 说明 |
|---|---|
| `index.html` | 桌面版入口。检测到窄屏 / 移动 UA 时自动跳转到 `index-mobile.html`；带 `?desktop=1` 可强制留在桌面版（记住 30 天） |
| `index-mobile.html` | 移动版入口。两者是完整拷贝关系，**改内容必须两边同步** |
| `assets/fonts/` | Archivo 与 JetBrains Mono 的自托管可变字体（各一份 woff2） |
| `assets/vendor/` | three.js、canvas-confetti、WorkBuddy 云端 SDK 的本地副本 |
| `assets/fz.glb` | 3D 机器人模型 |
| `versions/` | 历次改版快照（不随站点部署） |

## 为什么没有任何外部 CDN

字体和两个脚本原先挂在 Google Fonts 与 jsDelivr 上。国内网络下 Google Fonts 不可达且是阻塞渲染的样式表，会导致首屏长时间白屏。现已全部下载到本地，两个入口文件对外部零依赖。

## 关于微信访问

WorkBuddy 的托管网关会检测 User-Agent，只要含 `MicroMessenger`（微信内置浏览器）就对整个域名返回 403
拦截页，包括所有静态资源 —— 实测 iOS 与安卓微信 UA 都一样，去掉 `MicroMessenger` 三个字即恢复 200。
这是平台层面的限制，改代码、加版本号、清缓存都无法绕过，因此站点改由 GitHub Pages 托管。

另需注意微信维护着一份域名黑名单，`github.io` 这类共享域名有被牵连的可能（命中后微信提示
「已停止访问该网页」，请求根本不会发出，所以服务器端测不出来）。遇到这种情况绑定自有域名即可解决 ——
微信拦的是域名，自有域名不在名单内。
