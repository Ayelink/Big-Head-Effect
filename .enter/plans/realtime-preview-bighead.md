# 添加付费下载链路 (Stripe / 支付宝 / 微信支付)

## 背景 (Context)
用户希望在用户点击“下载”生成的图片前，加入一道付费墙（Payment Wall）。
目前价格暂定为 0，后续用户会自行计算并修改真实价格。
支付方式需要支持 Stripe（信用卡）、支付宝（Alipay）以及微信支付（WeChat Pay）。

## 架构设计 (Architecture)
我们将使用 **Stripe** 作为统一的支付网关。
**关于支付宝和微信支付的露出：**
Stripe 的 Checkout 页面是动态的。只要你在你的 Stripe Dashboard（后台）中开启了 Alipay 和 WeChat Pay 的支付方式，当用户跳转到 Stripe 的支付页面时，Stripe 会自动根据用户的地理位置和设备，展示信用卡、支付宝和微信支付的选项。
*注意：微信支付在 Stripe 中通常需要额外的域名验证和企业资质审核，请确保在 Stripe 后台已正确配置并激活。*

整体业务链路如下：
1. **点击下载**：用户点击“下载”按钮。
2. **创建订单**：前端调用 Enter Cloud (Supabase) 的 Edge Function (`create-checkout-session`)。
3. **跳转支付**：获取到 Stripe Checkout URL 后，将用户重定向到 Stripe 托管的支付页面（在此页面用户可以选择信用卡、支付宝或微信支付）。
4. **支付完成回调**：支付成功后，Stripe 会将用户重定向回我们的 H5 页面，并在 URL 中附带成功状态（例如 `?success=true&session_id=xxx`）。
5. **执行下载**：前端检测到支付成功的状态后，自动触发之前写好的“一键保存到相册/下载”逻辑。

## 实施步骤 (Implementation Steps)

### 第一阶段：连接 Stripe (执行阶段的第一步)
- 退出 Plan Mode 后，我将调用系统的 `stripe_enable` 工具。
- 这会向你发送一个配置卡片，你需要输入你的 Stripe Secret Key。
- 系统会自动为你部署处理支付的后端函数 (`create-checkout-session`)。

### 第二阶段：前端改造 (`src/pages/Index.tsx`)
1. **修改下载按钮逻辑**：
   - 拦截原有的直接下载逻辑。
   - 替换为调用 `supabase.functions.invoke('create-checkout-session', { ... })`。
   - 传入一个占位的 `priceId`（价格为 0 的商品 ID，你需要提前在 Stripe 后台创建一个价格为 0 或任意测试价格的商品，并把 Price ID 填入）。
2. **处理支付回调**：
   - 在 `Index.tsx` 中添加 `useEffect` 监听 URL 参数。
   - 如果检测到 `?success=true`，则展示“支付成功”提示，并自动触发图片的真实下载逻辑。
   - 如果检测到 `?canceled=true`，则提示“支付已取消”。

## 需要修改的文件
- `src/pages/Index.tsx`: 引入 Supabase 客户端，修改下载按钮的 `onClick` 事件，增加 URL 参数监听逻辑。

## 验证方式
- 点击下载按钮，页面应跳转至 Stripe Checkout 测试页面。
- 完成测试支付后，页面重定向回应用，并自动触发图片下载。