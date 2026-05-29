# 持久化图片记录（防止支付返回后记录丢失）

## 背景 (Context)
在移动端，用户点击"去付款"后，Stripe 支付页面会在新的浏览器标签页或 WebView 中打开，支付完成返回时，部分浏览器（尤其是 iOS Safari 和微信内置浏览器）会**重新加载页面**，导致 React 内存状态（`useState`）全部清空，生成的图片记录消失。

## 根本原因
所有状态（`historyImages`, `resultImageUrl`, `appState` 等）都存储在 React 的内存中（`useState`），页面重新加载时全部丢失。

## 解决方案：SessionStorage 持久化

使用 `sessionStorage` 在浏览器本地临时存储关键状态。
- **为什么用 sessionStorage 而非 localStorage**：`sessionStorage` 在用户关闭标签页时自动清除，不会留下垃圾数据；同时在同一标签页内跳转返回后依然有效，完全符合我们的需求。
- **需要持久化的状态**：
  - `historyImages`（图片记录列表，包含 URL 和标签）
  - `resultImageUrl`（当前展示的结果图片 URL）
  - `selectedIndex`（当前选中的历史记录索引）
  - `lastResourcePath`（用于重新生成）
  - `imageRatio`（用于重新生成）
  - `headScale`（放大倍数滑块状态）
  - `appState`（当前的应用状态，用于恢复到 "done" 页面）

## 实施细节

### 写入时机（Save）
在每次状态发生变化时，将关键状态写入 sessionStorage：
- 在 `processImage` 成功后写入。
- 在每次 `generateWithScale` 成功后写入。
- 在 `handleReset` 时清除 sessionStorage。

### 读取时机（Restore）
在 `Index` 组件挂载时（`useEffect([], [])` 的初始化 effect），从 sessionStorage 读取数据并恢复状态。

### 注意事项
- `historyImages` 中第一张原图（`originalPreviewRef`）的 URL 可能是 `blob://`（本地对象 URL），这类 URL 在页面刷新后会失效。需要在存储时只保留 AI 生成的结果图（非 blob URL 的图片），或者将原图也作为第一张历史记录的 URL 存储（因为原图也有可能是 OSS 上的真实 URL）。 **实际上**，当前代码中原图的 URL 是 `URL.createObjectURL()` 生成的，刷新后会失效。解决方案是：在恢复时，如果某张图片的 URL 是 blob 开头的，就跳过或用占位符替换。

## 需要修改的文件
- `src/pages/Index.tsx`：添加 sessionStorage 的读取（初始化）和写入（状态更新时）逻辑

## 验证方式
1. 上传图片并生成大头效果。
2. 点击"下载图片" → 支付弹窗出现后，点击"去付款"跳转到 Stripe。
3. 关闭 Stripe 页面，返回到应用页面（此时页面会重新加载）。
4. 应能看到之前生成的图片记录依然存在，应用处于 "done" 状态。