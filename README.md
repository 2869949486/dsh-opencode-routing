# dsh-opencode-routing

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）插件，把原先分开的两个插件合成一个：
**OpenCode 账户池 + 额度路由** 和 **用量看板** 现在装在同一个包里，设置里也只有一个页面
「OpenCode 账户与用量」。

- **客户端**：`settings.section` 槽位，60 秒自动刷新；账户池可增删改、模型表带能力标签、两张表都能按住左右拖动；界面支持 10 种语言（跟随浏览器语言）。
- **Host**：两个只读/管理接口 —— `GET /opencode-usage.json`（用量，`?refresh=1` 强制刷新）与 `GET|POST /opencode-quota-router.json`（账户池与路由，动作见下）。

## 安装

```bash
npm i dsh-opencode-routing
```

包自带 `cordis.patch.yml`：里面同时声明 `opencode-go` / `opencode-free` 两个 provider 和**一条** insert
（`id: opencode-router`）。`usage:` 与 `router:` 两个子对象分别对应看板与路由各自的配置项（两边都有 `path`，
所以必须分开写）。

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

顶层键对两半都生效（`usageUrl`、`apiKeyRef`、`probeIntervalMs` 之类），子对象里的键只覆盖自己那一半。

## 账户池与轮替

账户顺序就是使用顺序。任何时候只有一个「当前账户」，它的密钥会被镜像到 provider 读取的那个凭据引用
（默认 `OPENCODE_API_KEY`），因此切换账户不需要改任何 provider 配置：`resolveApiKey` 是在
`agent/request` 钩子之后、每次流式请求时现取的。

- **A 用完自动用 B**：出现 `QUOTA` / `ACCOUNT_QUOTA` / 429 且官方额度确认耗尽，或出现鉴权类错误
  （`AUTH`、`INVALID_CREDENTIAL`、`MISSING_CREDENTIAL`、`ACCOUNT_SIGN_IN_REQUIRED`、`CLIENT_UPGRADE_REQUIRED`）时，
  当前账户被标记为不可用（额度用尽到窗口重置，鉴权失败 30 分钟），路由切到下一个启用账户并在**同一步重试**，
  不会把整轮对话降级。
- **单模型隔离**：只有一个模型报耗尽、池里还有额度时，只隔离这个模型（默认 30 分钟），其它模型继续走套餐。
- **整池耗尽**：才把这条路整体回退到 `fallback`（默认 DeepSeek 账户），并每 30 分钟（或 rolling 窗口重置时刻）
  用零 token 的 `GET /inference/go/v1/usage` 探测，恢复后自动回到套餐。
- **重置**：设置页的「重置封禁标记」清空所有「额度用尽 / 鉴权失败」标记并立刻回到账户池，不动账户与密钥。

## 用量看板

官方 `/inference/go/v1/usage` 只给一组四舍五入的 rolling / weekly / monthly 百分比，**没有按模型明细**；
而套餐是按模型各自计额度（5 小时 = 月额度 20%、周 = 50%、月 = 100%）。所以页面有两套数：

- **官方百分比**（每个账户一行）：来自接口，是账户真实用量，别的客户端、别的机器用了也算进去。
- **按模型金额**（模型表）：本机估算 —— 回扫 `$DSH_HOME/sessions` 近 40 天的会话日志，只统计 provider 以
  `opencode` 开头的 `assistant/message`，按公开单价（含 DeepSeek 峰谷 2×）折算。别的工具用掉的额度没有本地记录。

「查看用量」按钮按账户弹窗展示三个窗口的百分比、重置时间与探测结果（只探测该账户，不切换模型）。

「编辑密钥」直接用 `GET /opencode-quota-router.json?key=<账户 id>` 取回该账户的当前密钥并预填输入框
（本机端点；列表快照始终只给掩码）。模型名按厂商习惯大写（`deepseek-v4.1-flash` → `DeepSeek V4.1 Flash`），
能取到品牌图标的厂商显示 SVG 图标，取不到的保留字母徽标。「下次探测」是真实的定时器（默认 30 分钟一次），
页面每秒重绘一次，所以会像倒计时一样走；打开页面本身只读快照，不会触发探测。

「此刻用哪个更划算」按套餐杠杆算：Go 付 $10 拿到 $100 官方价额度（≈¥710），所以走 OpenCode 恒为官方价的
10%（便宜 90%）。真实数据里不会出现官方更便宜，卡片右下角的按钮可以切到示例数据，看那种情况长什么样。

模型表的「能力」列来自同一个模型目录接口（`/inference/go/v1/models`）的
`modalities.input` 与 `capabilities`，标出 文本 / 图像 / 视频 / 音频 / PDF、工具调用、推理，以及上下文长度；
价格为 0 的模型显示「无限」。

### 峰谷与节假日

官方 API 的空闲时段是北京周一至周五 09:00–12:00、14:00–18:00 之外（含午休、夜间、周末、**法定节假日**），
价格正好是峰价一半。OpenCode 只照 UTC 周一至周五 01–04、06–10 两个窗口算峰，**不认中国法定节假日**
（anomalyco/opencode#53071 维护者原话：*"Go pricing follows our own schedule, not DeepSeek's holiday calendar."*）。

插件里带 2026–2031 的中国法定节假日表，只有把 `holidayAware: true` 写进配置（`usage.holidayAware`）才会计入
官方侧折算；默认关闭，因为 OpenCode 侧照旧按峰计费。表在 `usage.js` 的 `HOLIDAYS`，`isChinaHoliday()`
可单独调用。

## 设置接口

`GET /opencode-quota-router.json` 返回 `{mode, reason, active, accounts[], quarantine[], routes[], lastFailure}`，
账户里的密钥永远是掩码（`hint`）。`POST` 同一路径，body `{action, ...}`：

| action | 参数 | 作用 |
| --- | --- | --- |
| `add` | `label?`, `key` | 新建账户（密钥≥8 字符），写入凭据库并探测 |
| `update` | `id`, `label?` / `enabled?` / `key?` | 改名、停用/启用、换密钥 |
| `remove` | `id` | 删除账户并清掉它的密钥（至少留一个） |
| `activate` | `id` | 立刻切到该账户 |
| `move` | `id`, `direction: up\|down` | 调整顺序 |
| `probe` | `id?` | 探测全部账户；带 `id` 只探测这一个 |
| `reset` | — | 清空封禁标记，回到账户池 |

`GET /opencode-usage.json` 返回 `{plan, configuredPlan, detectedPlan, holidayAware, peak, usage, accounts[],
activeAccount, models[], totals}`；`?refresh=1` 先强制刷新官方快照再返回。

## 多语言

界面文案在 `client.js` 的 `DICT` 里：`zh`（源）、`zh-tw`、`en`，以及 `es` / `fr` / `de` / `pt` / `ja` / `ko` / `ru`
（由 `_merge_i18n.mjs` 从翻译文件内联，缺键回退到 `en`，再回退到键名）。`localeOf()` 按浏览器语言前缀匹配，
中文区分简繁。

## 测试

```bash
node test.mjs
```

不需要任何模型额度：假 context、假凭据库、假 webServer，本地起一个 usage 端点按 API key 返回不同百分比，
覆盖组合插件挂载、账户收养、单模型隔离、A→B 切换与密钥镜像、按账户探测、整池耗尽回退、重置、设置动作校验、
用量视图（能力标签、无限额度、峰谷换算）与单账户退化。

## 与旧包的关系

`dsh-opencode-quota-router` 与 `dsh-opencode-usage-settings` 是它的前身，功能已全部并入本包；
旧包在 npm 上标记为 deprecated，指向这里。仓库分别是
[`2869949486/dsh-opencode-routing`](https://github.com/2869949486/dsh-opencode-routing)（当前）、
[`dsh-opencode-quota-router`](https://github.com/2869949486/dsh-opencode-quota-router)、
[`dsh-opencode-usage`](https://github.com/2869949486/dsh-opencode-usage)。

## License

MIT
