# 优化支付流程：加载修复 + 按钮反馈 + 支付确认弹窗

## 背景 (Context)

**1. 支付跳转加载慢的根因：**
当前 `create-checkout-session` Edge Function 会顺序执行两次 Stripe API 调用：
1. `stripe.prices.list({ product: productId })` — 通过 Product ID 查询对应的 Price ID
2. `stripe.checkout.sessions.create(...)` — 创建支付会话

两次网络请求叠加，加上 Edge Function 的冷启动，导致整个过程需要 3-5 秒甚至更长。我们已经在创建商品时拿到了 `price_1TcMimEi2590jr7sdOmiIPRQ`，可以直接使用，完全不需要第一步的查询。

**2. 按钮没有视觉反馈：**
点击后按钮文本没有立即变化（即使有 isPaymentLoading，但文本还是用了 `t(locale, "uploading")` 而不是明确的"正在跳转支付..."）

**3. 交互流程优化（用户需求）：**
加载完成后不直接跳转，而是先弹出支付确认弹窗，用户确认后再跳转。

## 修复方案

### Step 1：优化 Edge Function（减少一次 Stripe API 调用）
修改 `supabase/functions/create-checkout-session/index.ts`：
- 接受 `priceId` 参数代替 `productId`
- 直接用 `priceId` 创建 Checkout Session，去掉 `prices.list()` 调用

### Step 2：前端优化（`src/pages/Index.tsx`）

**按钮文本反馈：**
- Loading 时文本改为 "正在跳转支付..."
- 添加 i18n key（中文：正在跳转支付... / 英文：Redirecting to payment...）

**新增支付确认弹窗（PaymentSheet）：**
- 使用原生 fixed 定位实现 Bottom Sheet（不依赖 Shadcn Dialog，保持设计一致性）
- 弹窗内容：
  - 标题：确认支付
  - 商品：大头特效图 x1
  - 价格：$0.50 USD
  - 支付方式展示区域（Stripe / 支付宝 / 微信支付 图标 + 文字）
  - 主按钮："去付款" → `window.open(paymentUrl, '_blank')`
  - 次按钮："取消" → 关闭弹窗

**新增状态：**
- `paymentUrl: string` — 存储 Stripe 支付链接
- `showPaymentSheet: boolean` — 控制弹窗显示

**重构 handleDownload 逻辑：**
1. `setIsPaymentLoading(true)` — 按钮立即变为"正在跳转支付..."
2. 调用 Edge Function（传 `priceId`）
3. 拿到 URL 后：`setPaymentUrl(url)`, `setShowPaymentSheet(true)`, `setIsPaymentLoading(false)`

## 需要修改的文件
- `supabase/functions/create-checkout-session/index.ts`：接受 `priceId`，去掉 `prices.list()` 调用
- `src/lib/i18n.ts`：添加"正在跳转支付..." 的 i18n key
- `src/pages/Index.tsx`：重构 `handleDownload`，增加 PaymentSheet 组件

## 验证方式
- 点击下载 → 按钮文本立即变为"正在跳转支付..."（不超过 0.1 秒）
- 1-2 秒后弹出支付确认弹窗
- 点击"去付款" → 新标签页打开 Stripe 支付页面
- 点击"取消" → 弹窗关闭，按钮恢复