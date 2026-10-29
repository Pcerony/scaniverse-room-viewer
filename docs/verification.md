# 第一版验证记录

## 日语版与公开发布更新

2026-10-29：按用户要求移除标题区、扫描日期和左下状态标签，交互、无障碍标签与错误提示改为日语。新增真实字节下载进度数字和解析/准备阶段。10 个 Node 测试通过；日语桌面、手机双指及四种尺寸、失败重试回归通过。在限速网络下实测进度由 6% 连续推进至 90%，再经过 92%、94%、97% 到 100%，并截图验证。

用户已授权公开模型与网页。新增 GitHub Pages Actions 发布工作流；仓库为 `https://github.com/Pcerony/scaniverse-room-viewer`，发布目标为 `https://pcerony.github.io/scaniverse-room-viewer/`。以下为首次本地版的历史验证记录，其中“没有执行公网部署”仅描述该次验证时的状态。

日期：2026-10-29。验证对象为本地实际 Scaniverse OBJ、MTL 和派生 4096 像素纹理。

## 已验证

- `npm test`：6 个 Node 测试通过，包含真实 OBJ 的地面校准、安全起点、前方可行走区域和持续移动碰撞。
- `npm run build`：构建成功。Three.js 核心分块约 504.51 kB，Vite 提示超过 500 kB 的体积建议，不影响构建。
- Playwright 桌面回归：25 项断言通过。实际 WebGL 渲染 355722 个三角形，中心采样 2184 种 RGB 颜色，GL 错误为 0。高度切换实际改变相机 Y；8 个移动按键均实际移动相机。拖动、锁定鼠标、Esc、总览旋转/缩放、位置恢复、重置、失焦停止、折叠面板和全屏均通过。正常导航无控制台或页面错误。
- Playwright 手机回归：通过 CDP 派发真实触摸事件，验证摇杆移动与第二根手指转头同时生效、取消触摸停止、预设点击和总览触摸旋转。
- 布局与画布：390×844、320×568、844×390、1440×900 控件未越界或相互重叠，均有非空纹理像素。中心 32×32 采样分别有 481、666、795、457 种 RGB 颜色。
- 异常恢复：阻断纹理/OBJ 请求后显示明确错误，禁用场景控件，解除阻断后点击重试恢复。全屏/鼠标锁定缺失时提供回退。模式切换清除仍按住的输入。
- 真实 WebGL 上下文丢失：在 OBJ 请求尚未完成时通过 `WEBGL_lose_context` 中断渲染，迟到的模型加载不再覆盖错误，导航保持禁用，刷新恢复。
- 生产构建通过独立 HTTP 预览，模型、纹理、高度按钮和模式切换正常；无开发诊断对象，无页面或控制台错误。
- 本地与局域网地址均返回 HTTP 200。没有执行公网部署。

## 证据与复现

脚本：`tests/browser-check.js`、`tests/mobile-check.js`、`tests/failure-check.js`。开发服务使用 5173 端口，通过 Playwright CLI `run-code --filename` 执行。浏览器脚本文件是函数表达式，末尾不加表达式分号，以兼容 CLI 的包装方式。

截图：`output/playwright/desktop-spawn.png`、`overview.png`、`mobile-portrait.png`、`mobile-overview.png`、`viewport-*.png`、`production-final.png`、`production-overview.png`。截图中可见原始扫描的家具、墙面、地板及其缺失区域。

## 验证边界

手机验证使用 Chromium 触控模拟，不是 iPhone 真机或 Safari 性能保证。原始扫描的破洞及纹理质量被保留，水平碰撞仅为基础约束；不是建筑测量或无障碍合规验证。预设高度仅为体验值。
