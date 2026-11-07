# dsh-opencode-routing

[English](README.md) · **简体中文** · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Русский](README.ru.md)

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

### DSH 兼容性

- **dsh >= 0.2.0-rc.1**：所有流式调用都通过公开的 `llm/stream` waterfall 路由。
- **dsh >= 0.2.2-rc.1**：额外在每一步之前用 `agent.model.select()` 对齐 Session 记录的模型选择，让持久请求头和
  assistant 来源跟随实际选择的一侧。
- 旧版会自动跳过对齐，不需要版本开关或额外配置。

## 账户池与轮替

账户顺序就是使用顺序。任何时候只有一个「当前账户」，它的密钥会被镜像到 provider 读取的那个凭据引用
（默认 `OPENCODE_API_KEY`），因此切换账户不需要改任何 provider 配置：`resolveApiKey` 是在
`llm/stream` 路由选定账户之后、每次流式请求时现取的。

- **A 用完自动用 B**：出现 `QUOTA` / `ACCOUNT_QUOTA` / 429 且官方额度确认耗尽，或出现鉴权类错误
  （`AUTH`、`INVALID_CREDENTIAL`、`MISSING_CREDENTIAL`、`ACCOUNT_SIGN_IN_REQUIRED`、`CLIENT_UPGRADE_REQUIRED`）时，
  当前账户被标记为不可用（额度用尽到窗口重置，鉴权失败 30 分钟），路由切到下一个启用账户并在**同一步重试**，
  不会把整轮对话降级。
- **单模型隔离**：只有一个模型报耗尽、池里还有额度时，只隔离这个模型（默认 30 分钟），其它模型继续走套餐。
- **整池耗尽**：才把这条路整体回退到 `fallback`（默认 DeepSeek 账户），并每 30 分钟（或 rolling 窗口重置时刻）
  用零 token 的 `GET /inference/go/v1/usage` 探测，恢复后自动回到套餐。
- **上游容量/过载**：`router.fallbackOnCapacity: true` 时，额度没耗尽但上游返回容量/过载类 429
  （`overloaded` / `at capacity` / `prefill_cap_refused` / `ttft_admission_refused`）也会回退到官方订阅；
  进入回退后的第一次探测在 `router.capacityFallbackDelayMs`（60 秒）后就开始，因为容量类拒绝通常几秒到几分钟就恢复。
  设置页有「立刻切到官方订阅 / 切回 OpenCode」，也可直接
  `POST /opencode-quota-router.json {"action":"fallback"}` / `{"action":"primary"}`。
- **半路限流不会丢步**：重试发生在同一次 `llm/stream` 调用内部，所以只有「一个 chunk 都还没吐出来」的主侧尝试会被原地改道；
  一旦已经输出第一个字，这条流就归调用方所有，失败原样抛出（不会把写了一半的回答悄悄重来一遍）—— 但**路由会跟着改**，
  于是这一步的重试落到官方订阅上，而不是再撞同一堵墙。之后的每一步靠 `agent.model.select()` 对齐到当前路由侧。
- **恢复要连续干净 10 分钟**：回退期间每 `router.recoveryProbeIntervalMs`（60 秒）探测一次，只有连续
  `router.recoverStableMs`（10 分钟）都探测成功才把流量交回套餐。中间任何一次探测失败，窗口清零重来 —— 这就是
  「上游一抖就来回横跳」的解法。探测只能证明**额度接口**能通（限流中的上游照样能通），所以窗口还要求官方状态
  不再把这个模型标为降级（`recovery.blocked = "published"` 就是在说「卡在官方状态上」）。官方 feed 自己读不到时
  就只能靠探测，窗口照常推进。
- **重置**：设置页的「重置封禁标记」清空所有「额度用尽 / 鉴权失败」标记并立刻回到账户池，不动账户与密钥。

## 官方状态（status.opencode.ai）

OpenCode 把状态页上看到的那份判断也以 JSON 形式发出来了：`GET https://status.opencode.ai/api/status`，免鉴权，
官方自己大约每分钟刷新一次。里面有总体判断、按服务（Console、日志、推理接口、Go 套餐、按量付费、免费推理）的分行、
按模型的分行（带 **原因** 与实时速度），以及进行中与历史事件。插件在 Host 侧直接读它（缓存
`router.statusRefreshMs`，默认 60 秒），并在本地探测卡片之上再渲染一张「OpenCode 官方状态」卡片：

- **判断标签**：正常 / 降级 / 中断 / 维护，悬浮说明写的是「对你意味着什么」—— 原因是 `upstream` 时直接写
  「上游供应商在降级，不是你的密钥或额度问题，建议切官方订阅继续干活」，因为这才是一个 Degraded 徽章可执行的含义。
- **你正在用的模型**：routes 里的主模型，各自的状态、原因，以及官方测到的首字延迟与吞吐。官方没列出的模型会写
  「官方没列出这个模型」，不猜。
- **进行中的事件**：列出还开着的事件与服务，以及已经持续多久。
- **刷新官方状态**：按需重读官方 feed（同时刷新本地探测）；页面开着的时候也每 60 秒重读一次，所以徽章跟着上游走，
  而不是停在打开页面那一刻。
- **打开状态页**：悬浮解释不够用时直接跳 `status.opencode.ai`。
- **什么时候出现「切到官方订阅」**：只有整体中断，或者**你正在用的模型**本身不正常时才出现。Go 套餐整行标降级、
  而你用的模型正常时不会出现 —— 那是隔壁在抖，切过去只是白花官方额度。
- **探测全绿也不算恢复**：只要官方仍把这个模型标为降级，「连续干净 10 分钟」根本不会开始计时；悬浮提示会说明卡在
  哪一半（`recovery.blocked` 为 `probe` 或 `published`）。

这就是「我的请求在失败」和「OpenCode 说 Go 套餐因为上游供应商在降级」的区别：本地探测只知道失败了，官方 feed 知道
**为什么**，也只有后者能告诉你「切官方订阅到底有没有用」。

## 上游状态卡片

设置页这一节最上方是上游自己的状态卡片，在账户表和模型表之上：

- **一个状态标签**：正常 / 降级 (Degraded) / 回退中 / 恢复观察 / 未知。鼠标悬浮（以及下面每个模型的小标签）会用一句话
  说明这个状态是什么意思、该怎么办，例如「限流 —— 等 1–10 分钟、换池里其它账户，或切官方订阅继续干」。
- **「刷新」按钮**重读每个账户的用量并重新探测上游（`POST {"action":"status"}`）。打开页面本身只读快照、不探测。
- **每个模型一行**：归类后的错误码、本轮失败次数、HTTP 状态、是否被隔离；最近一次的原始报错原文保留在悬浮提示里。
- **恢复倒计时**：回退中会显示距离「连续干净 10 分钟」的进度条，「什么时候能切回套餐」有个具体数字；探测失败进度条归零。
- **错误码与解决办法**：可折叠的对照表，列出卡片会出现的全部错误码与对应处置 —— 限流、过载、额度、欠费、鉴权、
  未配置密钥、需重新授权、需升级客户端、模型不可用、请求被拒、上下文超长、超时、服务端错误、网络错误、内容被拦截，
  以及未归类的未知错误。

判断故意做得「粘」一点：30 分钟窗口内出现两次失败就显示降级，即使随后一次重试已经成功 —— 因为「失败一次、重试又好了」
正是这张卡片要暴露的抖动。切回套餐（自动或手动）会清掉这些标记，重新开始计数。

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
10%（便宜 90%）。真实数据里不会出现官方更便宜的情况。

表里每个模型拆成三行：**缓存命中输入 / 缓存未命中输入 / 输出**（按百万 token 折算），缓存命中那行高亮，
因为大多数请求落在这条线上。官方单价（人民币/百万 token，低谷价）：
Flash 0.02 / 1 / 4，Pro 0.15 / 4.5 / 13.5；高峰期正好翻倍。

套餐价与额度可以覆盖：`usage.planPriceUsd`（默认 $10）与 `usage.planAllowanceUsd`（默认按 `LIMITS` 的
Flash 月额度 $100）。页面上的折扣是从这两个数推出来的 —— OpenCode 哪天改价或改额度，改配置即可，
不需要改代码。

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
| `probe` | `id?` | 探测全部账户（同时刷新状态）；带 `id` 只探测这一个 |
| `status` | — | 重新探测上游并刷新状态卡片（「刷新」按钮） |
| `reset` | — | 清空封禁标记，回到账户池 |
| `fallback` | — | 立刻切到官方订阅 |
| `primary` | — | 立刻切回 OpenCode 池 |

`GET /opencode-usage.json` 返回 `{plan, configuredPlan, detectedPlan, holidayAware, peak, usage, accounts[],
activeAccount, models[], totals}`；`?refresh=1` 先强制刷新官方快照再返回。

`GET /opencode-quota-router.json` 额外返回 `cause`、`upstream` 与 `official`：`{state, code, mode, cause, since, checkedAt,
windowMs, lastFailure, recovery, models[], recent[]}`，其中 `state` 是 `healthy` / `degraded` / `fallback` /
`recovering` / `unknown`，`code` 是 `rate_limit` / `capacity` / `quota` / `payment` / `auth` / `missing_key` /
`sign_in` / `upgrade` / `not_found` / `bad_request` / `context` / `timeout` / `server` / `network` / `filter` /
`error` / `ok`，`recovery` 是 `{active, stableSince, stableForMs, requiredMs, remainingMs, attempts, lastProbeAt,
probeIntervalMs}`。

`official` 是官方状态卡的数据：`{ok, error, errorAt, url, fetchedAt, ageMs, stale, status, since, updatedAt,
services[], active[], models[]}`。`status` 是官方总体判断（`operational` / `degraded` / `outage` /
`maintenance` / `unknown`）；`services[]` 是 `{id, status, reason, since}`（`id` 为 `inference` / `go` /
`payg` / `free`，Console 与日志不展示）；`models[]` 是每个 route 主模型的 `{model, status, reason, service,
ttftMs, tps}`；`active[]` 是仍在进行中的事件 `{id, service, status, reason, startedAt, models[]}`。读不到官方
feed 时 `ok: false` 并带 `error`，卡片显示错误，路由与本地探测不受影响。

## 多语言

界面文案在 `client.js` 的 `DICT` 里：`zh`（源）、`zh-tw`、`en`，以及 `es` / `fr` / `de` / `pt` / `ja` / `ko` / `ru`
（由 `_merge_i18n.mjs` 从翻译文件内联，缺键回退到 `en`，再回退到键名）。`localeOf()` 按浏览器语言前缀匹配，
中文区分简繁。

## 测试

```bash
node test.mjs
```

不需要任何模型额度：假 context、假凭据库、假 webServer，本地起一个 usage 端点按 API key 返回不同百分比，
覆盖组合插件挂载、账户收养、单模型隔离、A→B 切换与密钥镜像、按账户探测、整池耗尽回退、上游容量回退、
手动切换官方订阅、重置、设置动作校验、用量视图（能力标签、无限额度、峰谷换算）、单账户退化，
以及状态卡片（429 归类为限流、保留原始报错、失败计数）、官方状态半张卡（服务行、按模型行、feed 坏掉只损失新鲜度
不影响路由）与恢复窗口（一次探测不够、探测失败重来、官方仍标降级时窗口根本不开始、满窗口切回后下一个请求确实回到套餐），
还有「第一个字之后才限流」这一路（不原地重试，但这一步的重试落到官方订阅上）。

## 与旧包的关系

`dsh-opencode-quota-router` 与 `dsh-opencode-usage-settings` 是它的前身，功能已全部并入本包；
旧包在 npm 上标记为 deprecated，指向这里。它们原来的 GitHub 仓库已删除，本仓是唯一的源码位置。

## License

MIT
