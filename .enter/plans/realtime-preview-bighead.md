# 修复：移动端记录持久化 + 支付弹窗适配 + 生成失败问题排查

## 一、上传/生成失败原因分析

**数据：**
- `upload_failed` 埋点：过去 7 天 **0 次** → 上传本身没有失败
- `generation_failed` 埋点：今天（05/29）**3 次** → AI 生成步骤失败

**根因 1：Canvas 编码类型错误（移动端图片上传失败的核心 Bug）**
在 `prepareImageFile` 函数中，进行裁切时调用了 `canvas.toBlob(blob, file.type)`。
- 如果用户从 iOS 相机上传 **HEIC/HEIF 格式**的图片，`file.type` 会是 `image/heic`。
- 大多数浏览器的 Canvas API **不支持** 将图像编码成 HEIC 格式，`canvas.toBlob()` 会返回 `null`。
- 虽然代码有 `null` 的回退逻辑，但回退到的是原始 HEIC 文件，而 `useResourceUpload.ts` 中的文件类型校验不允许 HEIC 文件，导致最终上传失败。
- **修复**：将 `canvas.toBlob()` 的格式固定为 `image/jpeg`，覆盖 `file.type`，同时将生成的文件后缀名改为 `.jpg`。

**根因 2：AI 生成的 Safety Filter**
3 次 `generation_failed` 是 AI 模型的安全过滤器拦截了某些图片（例如多人合影、某些姿势或场景）。这不是代码 Bug，是模型层面的限制，属于偶发情况。

## 二、移动端支付弹窗适配

当前支付确认弹窗（Bottom Sheet）未考虑移动端底部安全区（iOS Home Indicator 区域），导致在新款 iPhone 上按钮可能被遮挡。
- **修复**：在弹窗底部添加 `pb-safe`（`padding-bottom: env(safe-area-inset-bottom)`）的 safe area padding。
- 同时确保弹窗的遮罩 `backdrop` 和圆角样式符合移动端习惯。

## 三、SessionStorage 持久化（防止支付返回后记录丢失）

**需要持久化的数据：**
- `historyImages`（历史记录，仅保存非 blob:// 的 URL）
- `resultImageUrl`（当前展示的生成图 URL）
- `selectedIndex`（当前选中的历史记录）
- `lastResourcePath`（用于重新生成）
- `imageRatio`（比例参数）
- `headScale`（放大倍数）
- `appState`（仅持久化 "done" 状态）

**时机：**
- 写入：`generateWithScale` 成功后写入
- 读取：组件挂载时（`useEffect([], [])` 初始化）
- 清除：`handleReset` 时清除

## 需要修改的文件
- `src/pages/Index.tsx`：
  - 添加 SessionStorage 读取/写入/清除逻辑
  - 支付弹窗底部添加安全区 padding
- `src/pages/Index.tsx` 的 `prepareImageFile` 函数：
  - 将 `canvas.toBlob()` 固定使用 `image/jpeg` 格式

## 验证方式
1. 在 iOS 设备上用相机拍照上传 → 应能正常处理 HEIC 图片
2. 生成图片后点击下载 → 支付弹窗在 iPhone 底部显示正常，按钮不被遮挡
3. 点击"去付款"后关闭 Stripe 页面返回 → 之前的生成记录应仍然可见