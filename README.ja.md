# dsh-opencode-routing

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · **日本語** · [한국어](README.ko.md) · [Русский](README.ru.md)

2 つの既存プラグインを 1 つのパッケージに統合した [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）プラグインです。**A→B の自動フェイルオーバーとクォータルーティングを備えた OpenCode アカウントプール**と、**アカウント別 / モデル別の使用量ダッシュボード**を提供します。どちらも 1 つの設定ページ「OpenCode アカウントと使用量」に置かれています。

- **クライアント**: 1 つの `settings.section` を 60 秒ごとに更新します。アカウントは追加・編集・並べ替え・プローブができ、モデルカードには機能タグが付き、2 つの表はドラッグで横にスクロールできます。UI は 10 言語に対応します（ブラウザの言語が優先）。
- **ホスト**: 2 つのエンドポイント — `GET /opencode-usage.json`（使用量。`?refresh=1` で強制更新）と
  `GET|POST /opencode-quota-router.json`（プールとルーティング。アクションは後述）。

## インストール

```bash
npm i dsh-opencode-routing
```

パッケージは独自の `cordis.patch.yml` を同梱しています。`opencode-go` / `opencode-free` プロバイダーを宣言し、**単一**の insert（`id: opencode-router`）を持ちます。`usage:` と `router:` のサブオブジェクトがそれぞれの側の設定を保持します（両方とも `path` を持つため、1 つのフラットな名前空間を共有することはできません）。

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

トップレベルのキーは両方の側に適用されます（`usageUrl`、`apiKeyRef`、`probeIntervalMs` など）。サブオブジェクト内のキーはその側だけを上書きします。

## アカウントプールとフェイルオーバー

プールの順序は使用順です。常に 1 つのアカウントだけが「カレント」であり、そのキーはプロバイダーが読む認証情報参照（既定は `OPENCODE_API_KEY`）にミラーされます。したがってアカウントの切り替えにプロバイダー設定の変更は不要です。`resolveApiKey` は `agent/request` フックの後に、ストリーミング呼び出しのたびに実行されます。

- **A が枯渇したら B が引き継ぐ**: 公式の許容量が使い切られたことが確認されたうえでの `QUOTA` / `ACCOUNT_QUOTA` / 429、または認証系のエラー（`AUTH`、`INVALID_CREDENTIAL`、`MISSING_CREDENTIAL`、`ACCOUNT_SIGN_IN_REQUIRED`、`CLIENT_UPGRADE_REQUIRED`）では、カレントアカウントを使用不可としてマークし（ウィンドウのリセットまで、認証失敗の場合は 30 分間）、ルーティングを次の有効なアカウントへ移して**同じステップを再試行**します — ターンがダウングレードされることはありません。
- **単一モデルの隔離**: 1 つのモデルだけが許容量を超え、プールにはまだ予算がある場合、そのモデルだけを隔離します（既定 30 分）。他のすべてのモデルはプランをそのまま使い続けます。
- **プール全体の枯渇**: そのときに限り、ルートは `fallback`（既定は DeepSeek アカウント）へ退避し、30 分ごと（またはローリングウィンドウのリセット時）にゼロトークンの `GET /inference/go/v1/usage` プローブを行って、自動でプランに戻ります。
- **リセット**: 設定の「封禁マークのリセット」は、枯渇／認証のマークをすべてクリアし、即座にプールへ戻します。アカウントとキーはそのまま残ります。

## 使用量ダッシュボード

公式の `/inference/go/v1/usage` エンドポイントは、丸められたローリング / 週次 / 月次のパーセントだけを返し、**モデル別の内訳は返しません**。一方プランはモデルごとに個別に計量します（5 時間 = 月間許容量の 20 %、週 = 50 %、月 = 100 %）。そのためページには 2 種類の数値が並びます。

- **公式パーセント**（アカウントごとに 1 行）: API からそのまま得た実際のアカウント使用量で、他のクライアントや他のマシンも含みます。
- **モデル別の金額**（モデル表）: ローカル推定値です。`$DSH_HOME/sessions` を過去 40 日分スキャンし直し、プロバイダーが `opencode` で始まる `assistant/message` イベントだけを、公開料金（DeepSeek の 2 倍のピーク時間帯を含む）で計算します。他のツールからの使用量にはローカル記録がありません。

「使用量を表示」はアカウント別のダイアログを開き、3 つのウィンドウ、それらのリセット時刻、プローブ結果を表示します（そのアカウントだけをプローブし、モデルを切り替えることはありません）。

「キーを編集」は `GET /opencode-quota-router.json?key=<account id>` からアカウントの現在のキーを取得し、入力欄に事前入力します（ローカル専用のエンドポイントで、一覧のスナップショットはマスク値しか持ちません）。モデル名はベンダーの表記に従います（`deepseek-v4.1-flash` → `DeepSeek V4.1 Flash`）。公開ブランドマークのあるベンダーはインライン SVG で描画され、それ以外はレターバッジのままです。「次回プローブ」は実際のタイマー（既定 30 分）で、ページは毎秒再描画されるためカウントダウンします。ページを開くだけであればスナップショットを読むだけで、プローブは発生しません。

「今どちらが得か」はサブスクリプションのレバレッジから導かれます。Go は $10 で定価 $100 分の許容量（≈ ¥710）を提供するため、OpenCode は常に公式価格の 10 %、つまり 90 % 安くなります。実データが公式 API に有利になることはありません。カード隅のボタンでサンプルデータに切り替わり、そのケースがどう見えるかを確認できます。

機能の列は同じカタログエンドポイント（`/inference/go/v1/models`）から取得します。`modalities.input` と `capabilities` は text / image / video / audio / PDF、ツール呼び出し、推論、さらにコンテキスト長として描画されます。価格がゼロのモデルは「無限」と表示されます。

### ピーク / オフピークと祝日

DeepSeek のオフピーク時間帯は、北京時間の月〜金 09:00–12:00 と 14:00–18:00 以外のすべて（昼休み、夜間、週末、**法定祝日**を含む）で、価格はちょうどピーク時の半額です。OpenCode は UTC の月〜金 01–04 と 06–10 だけをピークとして扱い、**中国の法定祝日を考慮しません**（anomalyco/opencode#53071、メンテナー曰く*「Go の価格は当社独自のスケジュールに従っており、DeepSeek の祝日カレンダーには従いません。」*）。

プラグインは 2026–2031 年の中国法定祝日表を同梱しています。これが公式側に適用されるのは `holidayAware: true`（`usage.holidayAware`）が設定されているときだけです。OpenCode はそうした日もピーク料金を請求し続けるため、既定では無効です。表は `usage.js` の `HOLIDAYS` にあり、`isChinaHoliday()` を単独で呼び出すこともできます。

サブスクリプションの価格とその許容量は `usage.planPriceUsd` / `usage.planAllowanceUsd` で上書きできます。ページ上の割引はこの 2 つの数値から導かれるため、OpenCode 側のプラン変更はパッチではなく設定の編集で済みます。

## 設定 API

`GET /opencode-quota-router.json` は `{mode, reason, active, accounts[], quarantine[], routes[], lastFailure}` を返します。アカウントのキーは常にマスクされます（`hint`）。同じパスに `{action, ...}` を付けて `POST` します。

| アクション | 引数 | 効果 |
| --- | --- | --- |
| `add` | `label?`, `key` | アカウントを作成（キーは 8 文字以上）、保存してプローブ |
| `update` | `id`, `label?` / `enabled?` / `key?` | 名前の変更、無効化／有効化、キーのローテーション |
| `remove` | `id` | アカウントとそのキーを削除（常に 1 つは残ります） |
| `activate` | `id` | 今すぐそのアカウントに切り替え |
| `move` | `id`, `direction: up\|down` | 並べ替え |
| `probe` | `id?` | すべてのアカウント、または 1 つだけをプローブ |
| `reset` | — | 枯渇／認証マークをクリアしてプールに戻す |

`GET /opencode-usage.json` は `{plan, configuredPlan, detectedPlan, holidayAware, peak, usage, accounts[], activeAccount, models[], totals}` を返します。`?refresh=1` を付けると、先に最新の公式スナップショットを強制取得します。

## 言語

UI 文字列は `client.js` の `DICT` にあります。`zh`（ソース）、`zh-tw`、`en`、さらに `es` / `fr` / `de` / `pt` / `ja` / `ko` / `ru`（`scripts/merge-i18n.mjs` が翻訳ファイルからインライン化します。キーが見つからない場合は `en`、次にキー自身へフォールバックします）。`localeOf()` はブラウザ言語のプレフィックスを照合し、簡体字中国語と繁体字中国語を区別します。

## テスト

```bash
node test.mjs
```

モデルのクォータは不要です。偽の context、偽の認証情報ストア、偽の webServer、そして API キーごとに応答するローカルの使用量エンドポイントを使います。対象範囲: 複合マウント、アカウントの採用、単一モデルの隔離、キーのミラリングを伴う A→B フェイルオーバー、アカウント別プローブ、プール全体のフォールバック、リセット、設定アクションの検証、使用量ビュー（機能タグ、無制限モデル、ピーク／オフピークの計算、請求行）、単一アカウント時の縮退。

## 旧パッケージとの関係

`dsh-opencode-quota-router` と `dsh-opencode-usage-settings` はその前身であり、それらが行っていたことはすべてここに統合されています。どちらも npm で非推奨とマークされ、このパッケージを指しています。旧リポジトリは削除済みで、ここが唯一のソースです。

## コントリビュート

Issue と pull request を歓迎します — [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。PR を開く前に `node test.mjs` を実行してください。

## ライセンス

MIT — [LICENSE](LICENSE) を参照してください。
