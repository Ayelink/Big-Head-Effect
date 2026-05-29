# 优化支付流程：按钮反馈 + 支付确认弹窗

## 背景 (Context)
用户要求优化付费下载的交互体验，分两个层面：
1. **按钮视觉反馈**：点击"下载"按钮后，立即将按钮文本更新为"正在跳转支付..."，让用户知道操作已触发。
2. **支付确认弹窗（Payment Sheet）**：在后端创建完 Stripe 支付链接后，**不要**立即跳转，而是先弹出一个支付确认弹窗。弹窗中展示订单信息，用户确认并选择支付方式后，再点击"付款"按钮跳转到外部链接（Stripe 支付页面）。

## 交互流程

1. 用户点击"下载"按钮
2. 按钮文本立即变为"正在跳转支付..." + 按钮禁用
3. 后端返回 Stripe 支付链接（约 1-2 秒）
4. 弹出支付确认弹窗（Bottom Sheet / Modal），内容包含：
   - 标题：确认支付
   - 商品信息：大头特效图 x1
   - 价格：$0.50 USD
   - 支付方式选择（信用卡 / 支付宝 / 微信支付）
   - 一个主按钮："去付款"
   - 一个次按钮："取消"
5. 用户点击"去付款" → `window.open(stripeUrl, '_blank')` 打开外部支付链接
6. 用户点击"取消" → 关闭弹窗，按钮恢复正常

## 实施细节

### 状态管理
- 新增 `paymentUrl` state：存储从后端拿到的 Stripe 支付链接
- 新增 `showPaymentSheet` state：控制弹窗显示/隐藏

### handleDownload 逻辑重构
```
1. setIsPaymentLoading(true)，按钮文本变为"正在跳转支付..."
2. 调用 create-checkout-session Edge Function
3. 拿到 url 后：setPaymentUrl(url), setShowPaymentSheet(true)
4. setIsPaymentLoading(false)，按钮文本恢复
```

### 支付确认弹窗（PaymentSheet 组件）
使用 Shadcn 的 `Sheet` 或自定义的 `Dialog/Drawer` 组件实现。
- 支持以下支付方式图标展示（仅展示，实际支付由 Stripe 决定）：
  - 信用卡（Credit Card）
  - 支付宝（Alipay）
  - 微信支付（WeChat Pay）

## 需要修改的文件
- `src/pages/Index.tsx`：重构 `handleDownload`，增加 PaymentSheet 组件渲染

## 验证方式
- 点击下载按钮 → 按钮立即变为"正在跳转支付..."
- 1-2 秒后弹出支付确认弹窗，展示正确的商品和价格信息
- 点击"去付款"→ 新标签页打开 Stripe 支付页面
- 点击"取消"→ 弹窗关闭，按钮恢复正常