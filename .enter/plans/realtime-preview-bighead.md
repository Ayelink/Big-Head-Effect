# 综合修复：支付方式传参 + 移动端适配 + 记录持久化 + HEIC 图片支持 + 支付开关

## 一、新增：支付功能开关 (Feature Toggle)

为了让你能随时开启或关闭支付墙，我会在 `src/pages/Index.tsx` 中添加一个简单的开关变量 `ENABLE_PAYMENT`。
- 当 `ENABLE_PAYMENT = true` 时：点击下载会弹出支付窗口，走 Stripe 流程。
- 当 `ENABLE_PAYMENT = false` 时：点击下载会直接触发浏览器下载图片到本地（或相册），跳过支付。

## 二、Stripe 后台配置指导（针对用户截图）

用户在 Stripe 后台找错了地方。截图显示的是 "Managed Payments"（托管支付/税务相关）的设置页面，而不是支付方式（Payment Methods）的设置页面。

**正确的路径是：**
1. 点击左侧导航栏底部的 **Settings（设置）** 图标（通常是一个齿轮 ⚙️）。
2. 在设置页面中，找到 **Payments（支付）** 模块。
3. 点击 **Payment methods（支付方式）**。
4. 在这个页面里，你会看到一个很长的列表，包含各种支付方式（Cards, Wallets, Bank redirects 等）。
5. 往下滚动找到 **Wallets（钱包）** 分类，里面会有 **Alipay（支付宝）** 和 **WeChat Pay（微信支付）**。
6. 点击它们旁边的 **Turn on（开启）** 按钮。

*注意：如果你在测试模式（Test mode）下，可以直接开启。如果是真实模式（Live mode），开启微信支付可能需要填写额外的审核资料。*

## 三、代码层面的支付方式传参与 UI 简化

根据你的反馈，微信支付跳转有问题，且你希望考虑把所有支付方式从结算页面去掉。
**修改方案：**
1. **前端 UI 简化**：从 Payment Sheet 中移除选择支付方式（信用卡/支付宝/微信）的按钮。只保留订单金额和“去付款”按钮。
2. **Edge Function 简化**：不再从前端接收 `paymentMethodType`，也不再向 Stripe 传递 `payment_method_types`。
   - **为什么这样做更好？** 当不传递 `payment_method_types` 时，Stripe Checkout 会自动根据你在 Stripe Dashboard 中开启的支付方式（如支付宝、微信、信用卡等）来展示选项。这样你只需要在 Stripe 后台管理支付方式，前端完全不需要改代码。
3. **按钮文案优化**：将英文的 "Redirecting to payment..." 改为更短的 "Loading..."，防止按钮文字过长换行。

## 四、上传/生成失败根因（iOS HEIC 图片）

在 `prepareImageFile` 中，`canvas.toBlob(blob, file.type)` 使用了原始文件类型。iOS 相机拍摄的图片是 HEIC，浏览器不支持将 Canvas 编码成 HEIC，导致 `toBlob` 返回 `null`，进而回退到原始 HEIC 文件，最终被文件类型校验拒绝。
**修复**：固定使用 `image/jpeg` 格式，并将文件名后缀改为 `.jpg`。

## 五、移动端支付弹窗适配

在支付弹窗底部添加 iOS 安全区 padding（`env(safe-area-inset-bottom)`），防止按钮被 iPhone Home Indicator 遮挡。

## 六、SessionStorage 持久化（防止支付返回后记录丢失）

- 组件挂载时从 sessionStorage 读取并恢复 `historyImages`, `resultImageUrl`, `selectedIndex`, `lastResourcePath`, `imageRatio`, `headScale`, `appState`。
- 每次生成成功后写入 sessionStorage。
- `handleReset` 时清除 sessionStorage。
- 过滤掉 `blob://` 开头的 URL（刷新后失效）。

## 需要修改的文件
1. `src/lib/i18n.ts`：修改 `paymentRedirecting` 英文文案为 "Loading..."。
2. `supabase/functions/create-checkout-session/index.ts`：移除 `paymentMethodType` 逻辑，让 Stripe 自动接管支付方式。
3. `src/pages/Index.tsx`：
   - 添加 `ENABLE_PAYMENT` 常量开关
   - 修改 `handleDownload` 逻辑，根据开关决定是直接下载还是弹支付窗
   - 移除 `selectedPaymentMethod` 状态和相关的 UI 渲染
   - `prepareImageFile`：canvas.toBlob 固定 `image/jpeg`
   - 添加 sessionStorage 持久化逻辑
   - 支付弹窗添加安全区 padding

## 验证方式
- 修改 `ENABLE_PAYMENT = false`，点击下载直接保存图片。
- 修改 `ENABLE_PAYMENT = true`，点击下载弹出支付窗口，点击“去付款”后，Stripe 页面会自动展示你在后台开启的所有支付方式。