# 综合修复：支付方式传参 + 移动端适配 + 记录持久化 + HEIC 图片支持

## 一、Stripe 后台配置指导（针对用户截图）

用户在 Stripe 后台找错了地方。截图显示的是 "Managed Payments"（托管支付/税务相关）的设置页面，而不是支付方式（Payment Methods）的设置页面。

**正确的路径是：**
1. 点击左侧导航栏底部的 **Settings（设置）** 图标（通常是一个齿轮 ⚙️）。
2. 在设置页面中，找到 **Payments（支付）** 模块。
3. 点击 **Payment methods（支付方式）**。
4. 在这个页面里，你会看到一个很长的列表，包含各种支付方式（Cards, Wallets, Bank redirects 等）。
5. 往下滚动找到 **Wallets（钱包）** 分类，里面会有 **Alipay（支付宝）** 和 **WeChat Pay（微信支付）**。
6. 点击它们旁边的 **Turn on（开启）** 按钮。

*注意：如果你在测试模式（Test mode）下，可以直接开启。如果是真实模式（Live mode），开启微信支付可能需要填写额外的审核资料。*

## 二、代码层面的支付方式传参

为了确保前端选择的支付方式能正确传递给 Stripe，我会在代码中做如下修改：
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