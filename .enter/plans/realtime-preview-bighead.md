# 综合修复：支付方式传参 + 移动端适配 + 记录持久化 + HEIC 图片支持

## 一、Stripe 后台配置指导（针对用户截图）

用户在 Stripe 后台遇到了“选择您的结账”页面，不知道选哪个。
**解答**：请选择第二个选项 **“预构建结账流程” (Pre-built checkout flow)**。
- 我们的代码使用的是 `stripe.checkout.sessions.create`，这正是调用 Stripe 托管的预构建结账页面。
- 选择这个选项后，你就可以进入设置页面，开启 Alipay（支付宝）和 WeChat Pay（微信支付）了。

## 二、支付方式选择不生效的根因

**当前问题**：弹窗中点击"支付宝"，跳转到 Stripe 后只显示信用卡。
**根因**：我们的支付方式选择是纯 UI 展示，没有将用户的选择传给后端。Stripe 的 `create-checkout-session` 函数未指定 `payment_method_types`，Stripe 默认只展示信用卡。

**修复方案**：
- 前端将选中的支付方式（`card` / `alipay` / `wechat_pay`）传入 Edge Function。
- Edge Function 在创建 Checkout Session 时加入 `payment_method_types` 参数。
- 支付宝对应：`['alipay']`；微信支付：`['wechat_pay']`；信用卡：`['card']`

## 三、上传/生成失败根因（iOS HEIC 图片）

在 `prepareImageFile` 中，`canvas.toBlob(blob, file.type)` 使用了原始文件类型。iOS 相机拍摄的图片是 HEIC，浏览器不支持将 Canvas 编码成 HEIC，导致 `toBlob` 返回 `null`，进而回退到原始 HEIC 文件，最终被文件类型校验拒绝。
**修复**：固定使用 `image/jpeg` 格式，并将文件名后缀改为 `.jpg`。

## 四、移动端支付弹窗适配

在支付弹窗底部添加 iOS 安全区 padding（`env(safe-area-inset-bottom)`），防止按钮被 iPhone Home Indicator 遮挡。

## 五、SessionStorage 持久化（防止支付返回后记录丢失）

- 组件挂载时从 sessionStorage 读取并恢复 `historyImages`, `resultImageUrl`, `selectedIndex`, `lastResourcePath`, `imageRatio`, `headScale`, `appState`。
- 每次生成成功后写入 sessionStorage。
- `handleReset` 时清除 sessionStorage。
- 过滤掉 `blob://` 开头的 URL（刷新后失效）。

## 需要修改的文件
1. `supabase/functions/create-checkout-session/index.ts`：接受并传入 `paymentMethodType`
2. `src/pages/Index.tsx`：
   - `handleConfirmPayment`：传入 `selectedPaymentMethod`
   - `prepareImageFile`：canvas.toBlob 固定 `image/jpeg`
   - 添加 sessionStorage 持久化逻辑
   - 支付弹窗添加安全区 padding

## 验证方式
- 选择支付宝后点"去付款"→ Stripe 页面应直接进入支付宝付款界面（需先在 Stripe 后台开启）
- iOS 相机拍照上传 → 不再报错
- 生成图片后点击下载跳转支付 → 返回后记录依然存在