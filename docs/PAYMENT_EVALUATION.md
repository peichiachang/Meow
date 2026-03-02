# 付費流程功能評估

## 現狀

- **DB**：`profiles` 已有 `plan`（free | paid）、`plan_expires_at`。
- **前端**：依 `plan` 決定貓咪上限（free=1、paid=5）與訊息限制（paid=不限）。
- **缺口**：沒有金流、沒有「升級」入口、沒有訂閱到期處理。

---

## 建議方案：Stripe 訂閱

| 項目 | 說明 |
|------|------|
| **金流** | Stripe Billing（訂閱）+ Checkout / Customer Portal |
| **優點** | 文件多、與 Supabase 常見搭配、可處理續訂/取消/發票、合規由 Stripe 負責 |
| **替代** | 若只做一次性買斷可考慮 Stripe One-time；台灣也可考慮綠界，但訂閱與發票整合較繁瑣 |

---

## 實作範圍概估

### 1. 後端（Supabase Edge Functions + DB）

| 項目 | 說明 | 工時粗估 |
|------|------|----------|
| **Stripe 訂閱產品** | Dashboard 建立 Price（月訂/年訂）、Product | 0.5h |
| **Create Checkout Session** | Edge Function：用 Stripe SDK 建立 `checkout.sessions.create`（mode: subscription），回傳 redirect URL | 1–2h |
| **Customer Portal** | Edge Function：建立 `billingPortal.sessions.create`，讓用戶管理訂閱/付款方式 | 1h |
| **Webhook** | Edge Function 接收 `checkout.session.completed`、`customer.subscription.updated/deleted`，更新 `profiles.plan`、`plan_expires_at`；需驗證簽章 | 2–3h |
| **DB** | 可選：`subscription_id`、`stripe_customer_id` 存 profiles 或新表，方便對帳與 webhook 更新 | 0.5h |

### 2. 前端

| 項目 | 說明 | 工時粗估 |
|------|------|----------|
| **升級入口** | 首頁或設定處「升級」按鈕，呼叫 Edge Function 取得 Checkout URL 後 `window.location.href` 跳轉 | 0.5–1h |
| **付費後回傳** | 成功/取消頁（或直接回 App），依 URL 參數顯示「訂閱成功」等訊息 | 0.5h |
| **方案狀態** | 已依 `plan` 顯示上限；可加「管理訂閱」連到 Customer Portal | 0.5h |

### 3. 營運與合規

| 項目 | 說明 |
|------|------|
| **定價** | 決定月費/年費、是否試用、幣別（TWD/USD）。 |
| **發票** | Stripe 可開收據；台灣若要電子發票需另接加值中心或手動開立。 |
| **條款** | 訂閱條款、取消政策、隱私權（若未已有）。 |

---

## 技術要點

1. **Secrets**：Stripe Secret Key、Webhook signing secret 放 Supabase Edge Function Secrets，勿進前端。
2. **Webhook 安全**：用 `stripe.webhooks.constructEvent(body, signature, secret)` 驗證，再更新 DB。
3. **RLS**：`profiles` 已有 `profiles_update_own`，Webhook 用 `service_role` 或 SECURITY DEFINER 函數更新，不經 RLS。
4. **到期**：可排程每日檢查 `plan_expires_at < NOW()` 將 `plan` 改回 `free`；或依 Stripe webhook `subscription.deleted` / `past_due` 更新。

---

## 工時與優先順序

| 階段 | 內容 | 工時（粗估） |
|------|------|--------------|
| **Phase 1** | Stripe 產品/價格、Checkout Edge Function、前端「升級」按鈕與跳轉 | 3–4h |
| **Phase 2** | Webhook Edge Function、更新 profiles、成功/取消回傳頁 | 2–3h |
| **Phase 3** | Customer Portal、管理訂閱入口、到期/降級邏輯 | 1.5–2h |

**總計約 7–10 小時**（不含 Stripe 帳號設定、定價決策、條款撰寫）。

---

## 風險與取捨

- **風險**：金流與個資需合規；Webhook 若漏處理可能導致付費狀態不同步。
- **簡化**：若先做「一次性買斷」可省訂閱與續訂邏輯，但需自訂到期規則（例如買斷 1 年後改回 free）。
- **不實作**：維持全免費，僅在 UI 顯示「升級後可多隻貓／不限訊息」當作預留，不接金流。

---

## 建議下一步

1. 確認是否真要收費與訂閱模式（月訂/年訂/買斷）。
2. 若做：建立 Stripe 帳號、產品與價格，再實作 Phase 1（Checkout + 升級按鈕）。
3. 若暫不做：可保留現有 `plan` 結構，僅在文案與按鈕上預留「升級」入口（按下去可連到說明頁或 waitlist）。
