# zyy 个人主页

一个纯静态的个人主页，包含 3D 机器人模型与个人介绍。桌面版与移动版各自独立，通过 UA 自动分发。

## 线上地址

- 正式站点：部署到你自己的域名后填这里
- 历史地址（WorkBuddy 托管）：https://zyy.app.workbuddy.host/ —— 该托管会因 UA 屏蔽微信访问，详见下方说明

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

WorkBuddy 的托管网关会检测 User-Agent，只要含 `MicroMessenger`（微信内置浏览器）就对整个域名返回 403 拦截页，包括所有静态资源。这是平台层面的限制，改代码无法绕过。因此站点改由 GitHub Pages / Cloudflare Pages 托管，才能在微信里直接打开。
