# 综合修复：支付方式传参 + 移动端适配 + 记录持久化 + HEIC 图片支持

## 一、Stripe 后台配置指导（针对用户截图）

用户在 Stripe 后台遇到了“设置您的结账流程”页面，提示需要更新代码。
**解答**：
这个页面是 Stripe 在教你如何修改代码来启用新的支付方式管理功能。**你不需要在这个页面上做任何选择或点击**。
你只需要知道：Stripe 要求在创建 Checkout Session 的代码中，不要写死 `payment_method_types`，而是让 Stripe 后台来接管（Managed Payments）。

**我会负责修改代码**：
我会在后端的 Edge Function 中，按照 Stripe 的要求，去掉旧的 `payment_method_types` 参数，并确保 Stripe 的 API 版本足够新。这样，只要你在 Stripe 后台（Settings -> Payment methods）里把支付宝（Alipay）的开关打开，它就会自动出现在支付页面上。

## 二、上传/生成失败根因（iOS HEIC 图片）

在 `prepareImageFile` 中，`canvas.toBlob(blob, file.type)` 使用了原始文件类型。iOS 相机拍摄的图片是 HEIC，浏览器不支持将 Canvas 编码成 HEIC，导致 `toBlob` 返回 `null`，进而回退到原始 HEIC 文件，最终被文件类型校验拒绝。
**修复**：固定使用 `image/jpeg` 格式，并将文件名后缀改为 `.jpg`。

## 三、移动端支付弹窗适配

在支付弹窗底部添加 iOS 安全区 padding（`env(safe-area-inset-bottom)`），防止按钮被 iPhone Home Indicator 遮挡。

## 四、SessionStorage 持久化（防止支付返回后记录丢失）

- 组件挂载时从 sessionStorage 读取并恢复 `historyImages`, `resultImageUrl`, `selectedIndex`, `lastResourcePath`, `imageRatio`, `headScale`, `appState`。
- 每次生成成功后写入 sessionStorage。
- `handleReset` 时清除 sessionStorage。
- 过滤掉 `blob://` 开头的 URL（刷新后失效）。

## 需要修改的文件
1. `supabase/functions/create-checkout-session/index.ts`：确保代码符合 Stripe Managed Payments 的要求（不硬编码 payment_method_types）。
2. `src/pages/Index.tsx`：
   - `prepareImageFile`：canvas.toBlob 固定 `image/jpeg`
   - 添加 sessionStorage 持久化逻辑
   - 支付弹窗添加安全区 padding

## 验证方式
- iOS 相机拍照上传 → 不再报错
- 生成图片后点击下载跳转支付 → 返回后记录依然存在