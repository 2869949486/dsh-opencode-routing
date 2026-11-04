# dsh-opencode-routing

[English](README.md) · [简体中文](README.zh-CN.md) · **繁體中文** · [日本語](README.ja.md) · [한국어](README.ko.md) · [Русский](README.ru.md)

一個 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）外掛，把兩個較早的外掛合併成單一套件：具備 **A→B 自動容錯切換與額度路由的 OpenCode 帳戶池**，加上**依帳戶／依模型的使用量儀表板**。兩者都位於同一個設定頁面「OpenCode 帳戶與用量」上。

- **用戶端**：一個 `settings.section`，每 60 秒刷新；帳戶可以新增、編輯、重排與探測；模型卡片帶有能力標籤；兩張表格都可拖曳平移；介面說 10 種語言（瀏覽器語言優先）。
- **宿主端**：兩個端點 —— `GET /opencode-usage.json`（用量，`?refresh=1` 強制刷新）與
  `GET|POST /opencode-quota-router.json`（池與路由；動作見下）。

## 安裝

```bash
npm i dsh-opencode-routing
```

套件自帶 `cordis.patch.yml`：它宣告 `opencode-go` / `opencode-free` 兩個 provider，以及**單一** insert（`id: opencode-router`）。`usage:` 與 `router:` 兩個子物件分別裝載各自那一半的設定（兩半都擁有自己的 `path`，因此無法共用同一個平面命名空間）。

```yaml
- insert:
    - id: opencode-router
      name: 'dsh-opencode-routing'
      config:
        usageUrl: https://opencode.ai/inference/go/v1/usage
        apiKeyRef: OPENCODE_API_KEY
        usage:
          path: /opencode-usage
          plan: go
        router:
          path: /opencode-quota-router
          routes:
            - primary: { provider: opencode-go, model: deepseek-v4.1-flash }
              fallback: { provider: deepseek-account, model: deepseek-flash }
```

頂層鍵同時套用到兩半（`usageUrl`、`apiKeyRef`、`probeIntervalMs` 等）；子物件內的鍵只覆寫該半邊。

## 帳戶池與容錯切換

池的順序就是使用順序。任一時刻只有一個帳戶是「當前」帳戶，它的金鑰會被鏡射到 provider 讀取的憑證參考（預設 `OPENCODE_API_KEY`）。因此切換帳戶不需要更改 provider 設定：`resolveApiKey` 在 `agent/request` 勾子之後、每一次串流呼叫時執行。

- **A 用盡，B 接手**：當官方額度確認用完時遇到 `QUOTA` / `ACCOUNT_QUOTA` / 429，或遇到驗證類錯誤（`AUTH`、`INVALID_CREDENTIAL`、`MISSING_CREDENTIAL`、`ACCOUNT_SIGN_IN_REQUIRED`、`CLIENT_UPGRADE_REQUIRED`），當前帳戶會被標記為不可用（直到視窗重置，驗證失敗則為 30 分鐘），路由移到下一個已啟用的帳戶並**重試同一個步驟** —— 該回合永遠不會被降級。
- **單一模型隔離**：當只有一個模型超出額度而池仍有預算時，只有該模型被隔離（預設 30 分鐘）；其他每個模型繼續使用方案。
- **整個池用盡**：只有到那時，路由才退回到它的 `fallback`（預設為 DeepSeek 帳戶），並每 30 分鐘（或在滾動視窗重置時）以零 token 的 `GET /inference/go/v1/usage` 探測一次，成功後自動回到方案。
- **重置**：設定中的「重置封鎖標記」會清除所有用盡／驗證標記並立即回到池。帳戶與金鑰不受影響。

## 使用量儀表板

官方的 `/inference/go/v1/usage` 端點只回傳四捨五入的滾動／每週／每月百分比，且**沒有依模型拆分**，而方案對每個模型分別計量（5 小時 = 月額度的 20 %，週 = 50 %，月 = 100 %）。因此頁面顯示兩組數字：

- **官方百分比**（每個帳戶一行）：直接來自 API —— 真實帳戶用量，包含其他用戶端與其他機器。
- **依模型的金額**（模型表格）：本地估算。它會重新掃描 `$DSH_HOME/sessions` 最近 40 天，只計算 provider 以 `opencode` 開頭的 `assistant/message` 事件，並按公開費率計價（包含 DeepSeek 的 2 倍尖峰時段）。其他工具的使用量沒有本地記錄。

「檢視用量」會開啟一個依帳戶的對話框，顯示三個視窗、它們的重置時間與探測結果（它只探測該帳戶，且從不切換模型）。

「編輯金鑰」會從 `GET /opencode-quota-router.json?key=<account id>` 取得帳戶目前的金鑰並預先填入輸入框（這是僅限本地的端點；清單快照只會帶遮罩值）。模型名稱依廠商的大小寫呈現（`deepseek-v4.1-flash` → `DeepSeek V4.1 Flash`）；有公開品牌標誌的廠商會渲染成內嵌 SVG，其餘則保留字母徽章。「下次探測」是真正的計時器（預設 30 分鐘），頁面每秒重新渲染，因此會倒數；開啟頁面只會讀取快照，永遠不會觸發探測。

「現在用哪個更划算」由訂閱槓桿推導而來：Go 以 $10 換取定價 $100 的額度（≈ ¥710），所以 OpenCode 的價格永遠是官方價格的 10 % —— 便宜 90 %。真實資料永遠不會偏向官方 API。

能力欄位來自同一個目錄端點（`/inference/go/v1/models`）：`modalities.input` 與 `capabilities` 會渲染成 text / image / video / audio / PDF、工具呼叫、推理，以及上下文長度。零定價的模型顯示「無限」。

### 尖峰／離峰與假日

DeepSeek 的離峰視窗是北京時間週一至週五 09:00–12:00 與 14:00–18:00 之外的所有時間（含午休、夜間、週末與**法定假日**），價格正好是尖峰的一半。OpenCode 只把 UTC 週一至週五 01–04 與 06–10 視為尖峰，並**忽略中國法定假日**（anomalyco/opencode#53071，維護者：*「Go 的定價遵循我們自己的排程，而不是 DeepSeek 的假日行事曆。」*）。

外掛內建 2026–2031 年的中國法定假日表。只有在設定 `holidayAware: true`（`usage.holidayAware`）時才會套用到官方那一邊；預設為關閉，因為 OpenCode 在那些日子仍按尖峰計費。該表位於 `usage.js` 中的 `HOLIDAYS`，而 `isChinaHoliday()` 可以單獨呼叫。

訂閱價格與其額度可用 `usage.planPriceUsd` / `usage.planAllowanceUsd` 覆寫；頁面上的折扣由這兩個數字推導而來，因此 OpenCode 變更方案只是改設定，而不是打補丁。

## 設定 API

`GET /opencode-quota-router.json` 回傳 `{mode, reason, active, accounts[], quarantine[], routes[], lastFailure}`；帳戶金鑰一律遮罩（`hint`）。對同一路徑 `POST` 並帶 `{action, ...}`：

| 動作 | 參數 | 效果 |
| --- | --- | --- |
| `add` | `label?`, `key` | 建立帳戶（金鑰 ≥ 8 字元）、儲存並探測 |
| `update` | `id`, `label?` / `enabled?` / `key?` | 重新命名、停用／啟用、輪換金鑰 |
| `remove` | `id` | 刪除帳戶及其金鑰（永遠保留一個） |
| `activate` | `id` | 立即切換到它 |
| `move` | `id`, `direction: up\|down` | 重新排序 |
| `probe` | `id?` | 探測所有帳戶，或只探測一個 |
| `reset` | — | 清除用盡／驗證標記並回到池 |

`GET /opencode-usage.json` 回傳 `{plan, configuredPlan, detectedPlan, holidayAware, peak, usage, accounts[], activeAccount, models[], totals}`；`?refresh=1` 會先強制取得最新的官方快照。

## 語言

介面字串位於 `client.js` 的 `DICT` 中：`zh`（來源）、`zh-tw`、`en`，加上 `es` / `fr` / `de` / `pt` / `ja` / `ko` / `ru`（由 `scripts/merge-i18n.mjs` 從翻譯檔內嵌；缺少的鍵會退回 `en`，再退回該鍵本身）。`localeOf()` 會比對瀏覽器語言前綴，並區分簡體與繁體中文。

## 測試

```bash
node test.mjs
```

不需要模型額度：偽造的 context、偽造的憑證儲存、偽造的 webServer，以及一個依 API 金鑰回應的本地用量端點。涵蓋範圍：複合掛載、帳戶採用、單一模型隔離、A→B 容錯切換與金鑰鏡射、依帳戶探測、整池回退、重置、設定動作驗證、用量檢視（能力標籤、無限模型、尖峰／離峰計算、計費列）以及單一帳戶降級。

## 與舊套件的關係

`dsh-opencode-quota-router` 與 `dsh-opencode-usage-settings` 是它的前身；它們所做的一切都合併到這裡。兩者在 npm 上都標記為已棄用並指向這個套件。它們原本的 GitHub 儲存庫已刪除，本倉是唯一的原始碼位置。

## 貢獻

Issue 與 pull request 都歡迎 —— 參見 [CONTRIBUTING.md](CONTRIBUTING.md)。開 PR 前請先執行 `node test.mjs`。

## 授權

MIT —— 參見 [LICENSE](LICENSE)。
