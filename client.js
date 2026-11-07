window.__ModuleLoader__.load({
  id: 'dsh-opencode-routing',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const USAGE_API = '/opencode-usage.json';
    const ROUTER_API = '/opencode-quota-router.json';

    /**
     * UI strings. `zh` is the source; every other locale is a translation of the
     * same keys. Missing keys fall back to `en`, then to the key itself, so a
     * half-finished translation never breaks the page.
     */
    const DICT = {
      zh: {
        title: 'OpenCode 账户与用量',
        refresh: '刷新',
        refreshing: '刷新中…',
        updatedAt: '更新于 {time}',
        loadError: '读取失败：{message}',
        routerTitle: '额度路由',
        modePrimary: '正常路由',
        modeFallback: '已回退到官方订阅',
        modeReason: '原因：{reason}',
        forceFallback: '立刻切到官方订阅',
        forcePrimary: '切回 OpenCode',
        forceFallbackHint: 'OpenCode 上游故障时可手动切到 DeepSeek 官方 API；会消耗官方额度。',
        activeAccount: '当前账户',
        nextProbe: '下次探测',
        probeAll: '立即探测',
        resetMarks: '重置封禁标记',
        resetHint: '清空所有“额度用尽 / 鉴权失败”的标记，并让路由立刻回到 OpenCode 账户池；不改账户，也不改密钥。',
        routerMissing: '未检测到额度路由，账户池只读。',
        accountsTitle: '账户池',
        accountsOrder: '按顺序使用：前面的账户用完才用后面的。',
        addAccount: '添加账户',
        labelPlaceholder: '备注（可选，例如 小号 A）',
        keyPlaceholder: 'oc_sk_…',
        addAndProbe: '添加并探测',
        save: '保存',
        cancel: '取消',
        setActive: '设为当前',
        disable: '停用',
        enable: '启用',
        editKey: '编辑密钥',
        remove: '删除',
        viewUsage: '查看用量',
        keyUpdated: '密钥已更新',
        accountAdded: '账户已添加并探测',
        shortKey: '密钥不完整：至少 8 个字符',
        keepOne: '至少保留一个账户',
        notConfigured: '未配置',
        readonly: '只读',
        newKeyFor: '新密钥写入 {ref}',
        noAccounts: '还没有账户。填一个密钥就能开始。',
        statusReady: '可用',
        statusExhausted: '额度用尽',
        statusAuth: '鉴权失败',
        statusDisabled: '已停用',
        statusMissing: '未配置密钥',
        statusError: '读取失败',
        statusActive: '当前使用',
        statusSpare: '备用',
        statusCurrent: '当前',
        colIndex: '#',
        colAccount: '账户',
        colKey: '密钥',
        colRolling: '5 小时',
        colWeekly: '本周',
        colMonthly: '本月',
        colStatus: '状态',
        colActions: '操作',
        colModel: '模型',
        colCaps: '能力',
        colRequests: '请求',
        colTokens: '输入 / 输出 tokens',
        colRemaining: '本月剩余',
        colMonthlyUsed: '本月用量',
        colWeeklyUsed: '本周用量',
        modelsTitle: '按模型（本机估算）',
        capsText: '纯文本',
        capsImage: '图像',
        capsVideo: '视频',
        capsAudio: '音频',
        capsPdf: 'PDF',
        capsTools: '工具',
        capsReasoning: '推理',
        capsUnknown: '未声明',
        free: '免费',
        unlimited: '无限',
        none: '—',
        dialogTitle: '{label} 的用量',
        dialogNote: '官方接口只给这三个窗口的百分比，没有按模型的明细；按模型的金额只能是本机估算。',
        dialogProbe: '重新探测',
        close: '关闭',
        probedAt: '探测于 {time}',
        resetsAt: '重置于 {time}',
        usageError: '错误：{message}',
        peakTitle: '此刻用哪个更划算',
        peakPlan: '你为 OpenCode 的 {plan} 套餐付 ¥{price} /月（${usd}），额度给到 ¥{allowance}（${allowanceUsd}）的官方价用量。额度按官方价扣，等于打 {discount} 折——同一笔请求走 OpenCode 你只付官方价的 {percent}%。',
        peakNow: '走官方直连照官方价付现。此刻 OpenCode 是{goPeak}，官方是{officialPeak}{holiday}。',
        peakGoPeak: '峰段（额度烧 2 倍）',
        peakGoOff: '谷段',
        peakOfficialPeak: '峰段（价格 2 倍）',
        peakOfficialOff: '谷段',
        peakAtPeak: '高峰期',
        peakOffPeak: '低谷期',
        kindCacheRead: '缓存命中输入',
        kindInput: '缓存未命中输入',
        kindOutput: '输出',
        peakHoliday: '——今天是中国法定节假日，官方整天算谷，OpenCode 照算峰',
        colKind: '计费项',
        peakExhausted: '但本月额度已经用尽，只能走官方。',
        peakGoPay: 'OpenCode',
        peakOfficialPay: 'DeepSeek 官方',
        colOpenCode: 'OpenCode',
        colOfficial: 'DeepSeek 官方',
        peakVerdict: '结论',
        clockTitle: '此刻的峰谷',
        clockPeak: '高峰期',
        clockOff: '低谷期',
        clockFlip: '还剩 {hours} 小时到{next}',
        clockHoliday: '今天是中国法定节假日，官方 API 全天按低谷计',
        colRollingQuota: '5 小时额度',
        capHintText: '纯文本：只吃文字、只出文字。',
        capHintImage: '图像输入：能看截图、图表和 UI 稿（JPEG/PNG/GIF/WebP）。',
        capHintVideo: '视频输入：能直接读 mp4 等视频文件并描述画面内容。',
        capHintAudio: '音频输入：能直接读音频文件。',
        capHintPdf: 'PDF 输入：能直接读 PDF 文档，不用先转成文本。',
        capHintTools: '工具调用：模型可以调用 harness 提供的函数——读文件、跑命令、搜网页、写代码——再按返回结果继续干活。',
        capHintReasoning: '推理：回答前先自己思考一段，难题更稳，但更慢、更费 token。',
        backToTop: '回到顶部',
        subscribe: '订阅 OpenCode',
        copyKey: '复制',
        copied: '已复制',
        peakGoCheaper: '走 OpenCode 便宜 {percent}%',
        verdictGo: '走 OpenCode 便宜 {percent}%',
        verdictOfficial: '走官方直连便宜 {percent}%',
        verdictExhausted: '本月额度已用尽，只能走官方直连',
        peakFootnote: '按每 100 万输出 tokens 折算（编码账单主要来自输出），汇率 ¥{fx}/$。峰谷只影响额度烧多快，不改变结论：额度内走 OpenCode 始终比官方直连便宜；例外是额度用尽，或某个模型的额度先见底。',
        footerOfficial: '上面「官方 5 小时 / 本周 / 本月」百分比来自 OpenCode 接口，是账户真实用量，别的客户端或别的机器用了也会算进去。',
        footerLocal: '按模型的金额是本机估算：只统计这个 harness 的会话日志，用来拆开看模型分布；其它工具的调用没有本地记录。',
        footerPeakRule: '金额按离峰价估算，DeepSeek 模型峰时按 2 倍；免费模型不计费。',
        statusTitle: '上游状态',
        statusRefresh: '刷新状态',
        statusRefreshing: '刷新中…',
        statusRefreshHint: '立即探测一次 OpenCode 上游：读账户额度、更新健康状态；回退期间还会推进恢复观察窗口。',
        statusSince: '持续',
        statusChecked: '最近探测',
        statusStableWindow: '稳定窗口',
        statusWindowLeft: '还需 {remaining}',
        statusWindowDone: '已稳定 {stableFor}',
        statusStateHealthy: '正常',
        statusStateDegraded: '降级 (Degraded)',
        statusStateFallback: '走官方订阅',
        statusStateRecovering: '恢复观察中',
        statusStateUnknown: '未知',
        statusHintHealthy: 'OpenCode 上游正常：最近的请求都成功了，流量走 OpenCode 账户池。',
        statusHintRateLimit: '上游限流：OpenCode Go 对当前账户返回 429 / 速率限制，这个窗口内的新请求会被直接拒掉（flash 最常中招）。建议切换为官方订阅继续跑，限流一般几分钟到十几分钟自愈。',
        statusHintCapacity: '上游过载：OpenCode 的推理单元排满了（at capacity / prefill_cap_refused / ttft_admission_refused），额度没耗尽但此刻不接新活。建议切换为官方订阅，别让 provider 反复重试白等。',
        statusHintQuota: '额度用尽：当前账户的 5 小时 / 本周 / 本月窗口打满了。建议切换为官方订阅，或等窗口重置后自动恢复。',
        statusHintAuth: '鉴权失败：OpenCode 账户的密钥被拒（401/403）。建议先在下面的账户卡里更新密钥；急着干活就切官方订阅。',
        statusHintError: '上游返回了非限流类错误（网络或服务端故障）。刷新一次看是否偶发；连续出现就切官方订阅。',
        statusHintFallback: '当前走 DeepSeek 官方订阅，任务用官方额度继续，不会中断。OpenCode 恢复并连续稳定 {stable} 分钟后会自动切回。',
        statusHintRecovering: 'OpenCode 已经能探通了，正在观察稳定性：还需 {remaining}。期间新请求继续走官方订阅，避免刚切回又被限流打断。',
        statusHintManual: '你在设置里手动切到了官方订阅。OpenCode 恢复并稳定 {stable} 分钟后会自动切回，也可以点「切回 OpenCode」立刻返回。',
        statusHintUnknown: '还没有请求样本：发一次对话，或点「刷新状态」拿到真实状态。',
        statusBlockedPublished: '官方状态仍把这个模型标为降级，所以观察窗口没有开始 —— 探测能过不代表推理能过，避免刚切回又被限流。',
        statusBlockedProbe: '最近一次探测还没通过，观察窗口在重新计时。',
        statusFails: '本轮失败 {count} 次',
        statusNoFails: '本轮无失败',
        statusQuarantined: '单模型封禁至 {time}',
        statusSwitchOfficial: '切到官方订阅',
        statusModelsTitle: '按模型',
        codeOk: '正常',
        codeRateLimit: '限流',
        codeCapacity: '过载',
        codeQuota: '额度用尽',
        codeAuth: '鉴权失败',
        codeError: '错误',
        codeUnknown: '未知',
        errRateLimit: '限流 (429)',
        errRateLimitHint: '含义：请求速率超限，OpenCode 对并发/频率限流，flash 最容易撞。解决：等 1–10 分钟窗口自动恢复；或换池里其它账户；或点「切到官方订阅」继续干活。',
        errCapacity: '上游过载 (503/529)',
        errCapacityHint: '含义：推理单元排满（at capacity / prefill_cap_refused / ttft_admission_refused），额度还在但不接新活。解决：切官方订阅立刻恢复；或等 1–2 分钟重试并降并发。',
        errQuota: '额度用尽',
        errQuotaHint: '含义：账户 5 小时 / 周 / 月窗口打满。解决：等窗口重置（卡片有倒计时）、换账户、切官方订阅，或升级套餐。',
        errPayment: '欠费 (402)',
        errPaymentHint: '含义：账户欠费或被锁。解决：去 opencode.ai/console 查账单充值；急着干活先切官方订阅。',
        errAuth: '鉴权失败 (401/403)',
        errAuthHint: '含义：密钥被拒（过期、被重置、复制不全）。解决：账户卡「编辑密钥」重填 → 点「立即探测」验证；仍失败就换 key 或切官方订阅。',
        errMissingKey: '未配置密钥',
        errMissingKeyHint: '含义：这个账户没有可用 key，凭据服务里也查不到。解决：在账户卡里填 key，或删掉这个账户。',
        errSignIn: '需要重新授权',
        errSignInHint: '含义：账户需要在 OpenCode 控制台重新登录授权。解决：重新登录并生成新 key，填进账户卡。',
        errUpgrade: '需升级客户端',
        errUpgradeHint: '含义：provider / 插件版本太旧，上游已不接受该客户端。解决：升级 dsh-opencode-routing（或 provider 适配层）后重启 harness。',
        errNotFound: '模型不可用 (404)',
        errNotFoundHint: '含义：模型名在当前套餐或端点不存在 / 已下线。解决：核对 cordis.patch.yml 里 routes 的模型名；或先切官方订阅。',
        errBadRequest: '请求被拒 (400/422)',
        errBadRequestHint: '含义：参数不合法（图片格式、工具 schema、字段超长等）。解决：去掉可疑附件或工具重试、换模型试；切官方订阅兜底。',
        errContext: '上下文超长',
        errContextHint: '含义：输入加历史超过模型上下文窗口。解决：压缩或新开会话、换上下文更大的模型、切官方订阅。',
        errTimeout: '超时 (408/504)',
        errTimeoutHint: '含义：上游或网络在超时内没响应。解决：直接重试；检查 Clash/代理是否抖动；持续超时就切官方订阅。',
        errServer: '服务端错误 (5xx)',
        errServerHint: '含义：OpenCode 侧故障。解决：等 1–2 分钟重试；连续出现就切官方订阅，别把时间耗在重试上。',
        errNetwork: '网络错误',
        errNetworkHint: '含义：连接被重置 / DNS 失败 / 代理断了（ECONNRESET、ENOTFOUND、EAI_AGAIN、socket hang up）。解决：查 Clash 与 DNS 后重试；代理不稳就切官方订阅。',
        errFilter: '内容被拦截',
        errFilterHint: '含义：请求或回复触发上游内容审查。解决：改提示词措辞、去掉敏感附件，或换模型 / 切官方订阅。',
        errGeneric: '未知错误',
        errGenericHint: '含义：没归类到的上游错误。解决：看保留的原文，先刷新状态重试；持续出现就切官方订阅。',
        errRaw: '原文：{message}',
        errAdvice: '解决办法',
        errTable: '错误码与解决办法',
        officialTitle: 'OpenCode 官方状态',
        officialRefresh: '刷新官方状态',
        officialRefreshHint: '重新读一次 status.opencode.ai（OpenCode 自己大约每分钟更新一次），同时刷新本地探测结果。',
        officialSource: 'status.opencode.ai · 更新于 {time}',
        officialStale: '数据已过期，{age}更新',
        officialUnavailable: '拿不到官方状态：{error}',
        officialOpenStatus: '打开状态页',
        officialStatusOperational: '正常',
        officialStatusDegraded: '降级',
        officialStatusOutage: '中断',
        officialStatusMaintenance: '维护',
        officialStatusUnknown: '未知',
        officialHintOperational: 'OpenCode 官方状态正常：Go 套餐与推理接口都在正常工作，套餐可以照常用。',
        officialHintPartial: '官方整体在降级，但你正在用的模型目前是正常的 —— 先别切，继续跑；卡住了再切官方订阅。',
        officialHintUpstream: '上游供应商在降级 —— 不是你的密钥或额度问题，OpenCode 自己也这么标。建议点「切到官方订阅」继续干活，等官方恢复。',
        officialHintCapacity: '官方标注容量不足：推理单元排满，额度没耗尽但此刻不接新活。建议切官方订阅，别让 provider 反复空转重试。',
        officialHintRateLimit: '官方标注限流：新请求会被直接拒掉。建议切官方订阅继续干活，一般几分钟到十几分钟自愈。',
        officialHintOutage: '官方标注中断：这个服务整体不可用。立刻切官方订阅，否则任务会卡在重试上。',
        officialHintMaintenance: '官方正在维护：这是计划内的，等维护结束即恢复。急活先切官方订阅。',
        officialHintUnknown: '官方没有给出可识别的原因，点「打开状态页」看事件详情。',
        officialModelsTitle: '你正在用的模型',
        officialModelMissing: '官方没列出这个模型',
        officialSpeed: '首字 {ttft} ms · {tps} tok/s',
        officialIncidentsTitle: '进行中的事件',
        officialNoIncidents: '当前没有进行中的事件',
        officialIncident: '已持续 {age}',
        officialReason: '原因：{reason}',
        officialReasonUpstream: '上游供应商',
        officialReasonNone: '无',
        officialReasonCapacity: '容量不足',
        officialReasonRateLimit: '限流',
        officialReasonOther: '其它',
        officialServiceGo: 'Go 套餐',
        officialServiceInference: '推理接口',
        officialServicePayg: '按量付费',
        officialServiceFree: '免费推理',
        routeNow: '当前路由',
        routeOpencode: 'OpenCode 账户池',
        routeOfficial: 'DeepSeek 官方订阅',
        routeOpencodeHint: '请求走 OpenCode（{account}），不花官方订阅额度。',
        routeOfficialHint: '请求直连 DeepSeek 官方 API，按官方订阅额度计费；OpenCode 恢复并稳定后会自动切回。',
        statusLocalTitle: '本地上游探测',
        statusCheckedAt: '本地探测于 {time}',
        officialChip: '官方 {status}',
        statusSwitchWhy: '切到官方订阅可以立刻绕过 OpenCode 这一层；它恢复并稳定后会自动切回。',
        switchNoticeTitle: '已切到 DeepSeek 官方订阅，任务继续执行。',
        switchNoticeBack: '已切回 OpenCode 路由，任务继续执行。',
        switchNoticeTime: '{time} 切换',
        switchNoticeClose: '关闭',
      },
      en: {
        title: 'OpenCode accounts & usage',
        refresh: 'Refresh',
        refreshing: 'Refreshing…',
        updatedAt: 'Updated {time}',
        loadError: 'Could not load: {message}',
        routerTitle: 'Quota routing',
        modePrimary: 'Routing normally',
        modeFallback: 'Fell back to the official subscription',
        modeReason: 'Reason: {reason}',
        forceFallback: 'Switch to the official subscription now',
        forcePrimary: 'Switch back to OpenCode',
        forceFallbackHint: 'Switches to the DeepSeek official API while OpenCode is failing; this consumes official credits.',
        activeAccount: 'Active account',
        nextProbe: 'Next probe',
        probeAll: 'Probe now',
        resetMarks: 'Clear blocked marks',
        resetHint: 'Clears every "out of allowance / auth failed" mark and sends routing straight back to the OpenCode pool. Accounts and keys are untouched.',
        routerMissing: 'No quota router detected — the account pool is read-only.',
        accountsTitle: 'Account pool',
        accountsOrder: 'Used in order: the next account only takes over once the one above runs dry.',
        addAccount: 'Add an account',
        labelPlaceholder: 'Label (optional, e.g. alt A)',
        keyPlaceholder: 'oc_sk_…',
        addAndProbe: 'Add and probe',
        save: 'Save',
        cancel: 'Cancel',
        setActive: 'Make active',
        disable: 'Disable',
        enable: 'Enable',
        editKey: 'Edit key',
        remove: 'Delete',
        viewUsage: 'View usage',
        keyUpdated: 'Key updated',
        accountAdded: 'Account added and probed',
        shortKey: 'Key looks incomplete: at least 8 characters',
        keepOne: 'Keep at least one account',
        notConfigured: 'Not set',
        readonly: 'read-only',
        newKeyFor: 'New key is stored in {ref}',
        noAccounts: 'No accounts yet. Add a key to begin.',
        statusReady: 'Ready',
        statusExhausted: 'Out of allowance',
        statusAuth: 'Auth failed',
        statusDisabled: 'Disabled',
        statusMissing: 'No key',
        statusError: 'Probe failed',
        statusActive: 'In use',
        statusSpare: 'Spare',
        statusCurrent: 'current',
        colIndex: '#',
        colAccount: 'Account',
        colKey: 'Key',
        colRolling: '5 hours',
        colWeekly: 'This week',
        colMonthly: 'This month',
        colStatus: 'Status',
        colActions: 'Actions',
        colModel: 'Model',
        colCaps: 'Modality',
        colRequests: 'Requests',
        colTokens: 'Input / output tokens',
        colRemaining: 'Left this month',
        colMonthlyUsed: 'Used this month',
        colWeeklyUsed: 'Used this week',
        modelsTitle: 'Per model (local estimate)',
        capsText: 'text',
        capsImage: 'image',
        capsVideo: 'video',
        capsAudio: 'audio',
        capsPdf: 'PDF',
        capsTools: 'tools',
        capsReasoning: 'reasoning',
        capsUnknown: 'undeclared',
        free: 'free',
        unlimited: 'unlimited',
        none: '—',
        dialogTitle: 'Usage for {label}',
        dialogNote: 'The official endpoint only reports these three windows; it has no per-model breakdown. Per-model money can only be a local estimate.',
        dialogProbe: 'Probe again',
        close: 'Close',
        probedAt: 'Probed {time}',
        resetsAt: 'Resets {time}',
        usageError: 'Error: {message}',
        peakTitle: 'Which route is cheaper right now',
        peakPlan: 'You pay ¥{price}/month (${usd}) for OpenCode {plan} and the plan meters ¥{allowance} (${allowanceUsd}) of usage at official prices — a {discount}× discount, so the same request costs you {percent}% of the official price when it goes through OpenCode.',
        peakNow: 'The official route bills list price directly. Right now OpenCode is {goPeak} and the official API is {officialPeak}{holiday}.',
        peakGoPeak: 'at peak (allowance burns twice as fast)',
        peakGoOff: 'off-peak',
        peakOfficialPeak: 'at peak (price doubles)',
        peakOfficialOff: 'off-peak',
        peakAtPeak: 'peak',
        peakOffPeak: 'off-peak',
        kindCacheRead: 'cached input',
        colKind: 'billing line',
        kindInput: 'uncached input',
        kindOutput: 'output',
        peakHoliday: ' — today is a Chinese public holiday, so the official API charges off-peak all day while OpenCode still charges peak',
        peakExhausted: ' But this month’s allowance is already spent, so only the official route is left.',
        peakGoPay: 'OpenCode',
        peakOfficialPay: 'DeepSeek official',
        colOpenCode: 'OpenCode',
        colOfficial: 'DeepSeek official',
        peakVerdict: 'Verdict',
        clockTitle: 'Peak / off-peak right now',
        clockPeak: 'peak',
        clockOff: 'off-peak',
        clockFlip: '{hours} h until {next}',
        clockHoliday: 'Chinese public holiday today, so the official API bills off-peak all day',
        colRollingQuota: '5-hour allowance',
        capHintText: 'Text only: plain text in, plain text out.',
        capHintImage: 'Image input: understands screenshots, charts and UI mockups (JPEG/PNG/GIF/WebP).',
        capHintVideo: 'Video input: reads video files such as mp4 and can describe what happens in them.',
        capHintAudio: 'Audio input: reads audio files directly.',
        capHintPdf: 'PDF input: reads PDF documents without converting them to text first.',
        capHintTools: 'Tool calling: the model can call the functions the harness exposes (read files, run commands, search the web, write code) and act on the results.',
        capHintReasoning: 'Reasoning: the model thinks before answering; better on hard tasks, but slower and it burns more tokens.',
        backToTop: 'Back to top',
        subscribe: 'Subscribe to OpenCode',
        copyKey: 'Copy',
        copied: 'Copied',
        peakGoCheaper: 'OpenCode is {percent}% cheaper',
        verdictGo: 'OpenCode is {percent}% cheaper',
        verdictOfficial: 'Official API is {percent}% cheaper',
        verdictExhausted: 'This month’s allowance is used up, so only the official API is left',
        peakFootnote: 'Per 1M output tokens (output dominates a coding bill), at ¥{fx}/$. Peak hours only change how fast the allowance burns, not the verdict: on allowance, OpenCode stays cheaper than the official API; the exceptions are a spent allowance or a model whose individual cap runs out first.',
        footerOfficial: 'The official 5-hour / weekly / monthly percentages come from OpenCode’s API and describe the whole account — usage from other clients or machines counts too.',
        footerLocal: 'Per-model money is a local estimate: it only counts this harness’s session log, which is what makes the model split visible; calls from other tools leave no local record.',
        footerPeakRule: 'Money is estimated at off-peak prices, doubled during DeepSeek peak hours; free models are not billed.',
        statusTitle: 'Upstream status',
        statusRefresh: 'Refresh status',
        statusRefreshing: 'Refreshing…',
        statusRefreshHint: 'Probe OpenCode right now: re-read account usage and update the health state; during a fallback it also advances the recovery window.',
        statusSince: 'Since',
        statusChecked: 'Last probe',
        statusStableWindow: 'Stability window',
        statusWindowLeft: '{remaining} left',
        statusWindowDone: 'stable for {stableFor}',
        statusStateHealthy: 'Healthy',
        statusStateDegraded: 'Degraded',
        statusStateFallback: 'On the official subscription',
        statusStateRecovering: 'Recovering',
        statusStateUnknown: 'Unknown',
        statusHintHealthy: 'OpenCode upstream is healthy: recent requests succeeded and traffic goes through the OpenCode account pool.',
        statusHintRateLimit: 'Upstream rate limit: OpenCode Go is answering 429 / rate limited for this account, so new requests in this window are refused (flash hits it most). Switching to the official subscription keeps the task running; these limits usually clear within minutes.',
        statusHintCapacity: 'Upstream overloaded: OpenCode’s serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused). The allowance is intact, but nothing new is accepted right now. Switch to the official subscription instead of letting the provider retry into a full cell.',
        statusHintQuota: 'Out of allowance: the current account’s 5-hour / weekly / monthly window is maxed out. Switch to the official subscription, or wait for the window to reset.',
        statusHintAuth: 'Authentication failed: OpenCode rejected this account’s key (401/403). Update the key in the account card below, or switch to the official subscription if the task cannot wait.',
        statusHintError: 'The upstream returned a non-quota error (network or server fault). Refresh once to see whether it was transient; if it repeats, switch to the official subscription.',
        statusHintFallback: 'Requests currently go to the DeepSeek official subscription, so the task keeps running on official credits. After OpenCode stays clean for {stable} minutes it switches back automatically.',
        statusHintRecovering: 'OpenCode answers probes again; the router is watching stability: {remaining} left. New requests stay on the official subscription meanwhile, so a half-recovered upstream cannot interrupt them.',
        statusHintManual: 'You switched to the official subscription by hand. It returns automatically once OpenCode stays clean for {stable} minutes, or click “Switch back to OpenCode”.',
        statusHintUnknown: 'No request samples yet: send one message, or press “Refresh status” to read the real state.',
        statusBlockedPublished: 'OpenCode still publishes this model as degraded, so the window has not started — a readable probe is not proof that inference works, and switching back into a rate limit is worse than waiting.',
        statusBlockedProbe: 'The last probe failed; the stability window restarted.',
        statusFails: '{count} failure(s) this round',
        statusNoFails: 'no failures this round',
        statusQuarantined: 'model blocked until {time}',
        statusSwitchOfficial: 'Switch to the official subscription',
        statusModelsTitle: 'By model',
        codeOk: 'OK',
        codeRateLimit: 'rate limited',
        codeCapacity: 'overloaded',
        codeQuota: 'out of allowance',
        codeAuth: 'auth failed',
        codeError: 'error',
        codeUnknown: 'unknown',
        errRateLimit: 'Rate limited (429)',
        errRateLimitHint: 'Meaning: the request rate is over the limit — OpenCode throttles concurrency/frequency and flash hits it most. Fix: wait 1–10 minutes for the window to clear; or use another account in the pool; or click “Switch to the official subscription” and keep working.',
        errCapacity: 'Upstream overloaded (503/529)',
        errCapacityHint: 'Meaning: the serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused); allowance is intact but nothing new is accepted. Fix: switch to the official subscription; or retry in 1–2 minutes with less concurrency.',
        errQuota: 'Out of allowance',
        errQuotaHint: 'Meaning: the 5-hour / weekly / monthly window is maxed out. Fix: wait for the reset (the card shows a countdown), use another account, switch to the official subscription, or upgrade the plan.',
        errPayment: 'Payment required (402)',
        errPaymentHint: 'Meaning: the account is in arrears or locked. Fix: check billing at opencode.ai/console; switch to the official subscription if the task cannot wait.',
        errAuth: 'Auth failed (401/403)',
        errAuthHint: 'Meaning: the key was rejected (expired, reset, or truncated). Fix: re-enter it with “Edit key”, then press “Probe now” to verify; if it still fails, use another key or the official subscription.',
        errMissingKey: 'No key',
        errMissingKeyHint: 'Meaning: this account has no usable key, and the credential store has none either. Fix: paste a key into the account card, or delete the account.',
        errSignIn: 'Sign-in required',
        errSignInHint: 'Meaning: the account has to sign in again on the OpenCode console. Fix: sign in, generate a fresh key and paste it into the account card.',
        errUpgrade: 'Client upgrade required',
        errUpgradeHint: 'Meaning: the provider/plugin version is too old and the upstream no longer accepts it. Fix: upgrade dsh-opencode-routing (or the provider adapter) and restart the harness.',
        errNotFound: 'Model unavailable (404)',
        errNotFoundHint: 'Meaning: the model name does not exist on this plan or endpoint, or it was retired. Fix: check the model names under routes in cordis.patch.yml; or switch to the official subscription.',
        errBadRequest: 'Request rejected (400/422)',
        errBadRequestHint: 'Meaning: invalid parameters (image format, tool schema, oversized field). Fix: drop the suspicious attachment or tool and retry, try another model; the official subscription as a safety net.',
        errContext: 'Context too long',
        errContextHint: 'Meaning: input plus history exceed the model’s context window. Fix: compact or start a new chat, use a model with a larger window, or switch to the official subscription.',
        errTimeout: 'Timed out (408/504)',
        errTimeoutHint: 'Meaning: the upstream or the network did not answer in time. Fix: retry; check whether Clash/proxy is flapping; switch to the official subscription if it persists.',
        errServer: 'Server error (5xx)',
        errServerHint: 'Meaning: a fault on OpenCode’s side. Fix: retry in 1–2 minutes; if it keeps happening, switch to the official subscription instead of burning time on retries.',
        errNetwork: 'Network error',
        errNetworkHint: 'Meaning: connection reset, DNS failure or a broken proxy (ECONNRESET, ENOTFOUND, EAI_AGAIN, socket hang up). Fix: check Clash and DNS, retry; switch to the official subscription while the proxy is unstable.',
        errFilter: 'Blocked by content filter',
        errFilterHint: 'Meaning: the request or the reply tripped the upstream content filter. Fix: rephrase the prompt, drop the sensitive attachment, or use another model / the official subscription.',
        errGeneric: 'Unknown error',
        errGenericHint: 'Meaning: an upstream error outside the buckets above. Fix: read the kept raw message, refresh the status and retry; switch to the official subscription if it repeats.',
        errRaw: 'Raw: {message}',
        errAdvice: 'What to do',
        errTable: 'Error codes and fixes',
        officialTitle: 'OpenCode status',
        officialRefresh: 'Refresh status',
        officialRefreshHint: 'Re-reads status.opencode.ai (OpenCode refreshes it about once a minute) together with the local probe result.',
        officialSource: 'status.opencode.ai · updated {time}',
        officialStale: 'Stale reading (updated {age})',
        officialUnavailable: 'Could not read the published status: {error}',
        officialOpenStatus: 'Open the status page',
        officialStatusOperational: 'Operational',
        officialStatusDegraded: 'Degraded',
        officialStatusOutage: 'Outage',
        officialStatusMaintenance: 'Maintenance',
        officialStatusUnknown: 'Unknown',
        officialHintOperational: 'OpenCode reports everything operational: the Go plan and the inference gateway are fine, keep using the plan.',
        officialHintPartial: 'OpenCode has an overall degradation, but the model you are using is fine right now — keep going, and only switch to the official subscription if it actually stalls.',
        officialHintUpstream: 'The upstream provider is degraded — not your key and not your allowance, OpenCode says so itself. Switch to the official subscription and keep working until it clears.',
        officialHintCapacity: 'OpenCode reports it is at capacity: the allowance is intact but the serving cells are full. Switch to the official subscription instead of retrying in a loop.',
        officialHintRateLimit: 'OpenCode reports rate limiting: new requests are being refused. Switch to the official subscription; it usually clears within minutes.',
        officialHintOutage: 'OpenCode reports an outage: this service is down. Switch to the official subscription now or the turn will sit in retries.',
        officialHintMaintenance: 'OpenCode is in planned maintenance; it comes back when the window closes. Switch to the official subscription if you need to keep going.',
        officialHintUnknown: 'OpenCode did not give a reason this card understands — open the status page for the incident.',
        officialModelsTitle: 'Models you are using',
        officialModelMissing: 'not listed by OpenCode',
        officialSpeed: '{ttft} ms first token · {tps} tok/s',
        officialIncidentsTitle: 'Open incidents',
        officialNoIncidents: 'No open incidents',
        officialIncident: 'open {age}',
        officialReason: 'reason: {reason}',
        officialReasonUpstream: 'upstream provider',
        officialReasonNone: 'none',
        officialReasonCapacity: 'capacity',
        officialReasonRateLimit: 'rate limit',
        officialReasonOther: 'other',
        officialServiceGo: 'Go plan',
        officialServiceInference: 'Inference API',
        officialServicePayg: 'Pay-as-you-go',
        officialServiceFree: 'Free inference',
        routeNow: 'Current route',
        routeOpencode: 'the OpenCode pool',
        routeOfficial: 'the DeepSeek subscription',
        routeOpencodeHint: 'Requests run through OpenCode ({account}) and spend no subscription allowance.',
        routeOfficialHint: 'Requests go straight to the DeepSeek API and spend subscription allowance; the router moves back once OpenCode is stable again.',
        statusLocalTitle: 'Local probe',
        statusCheckedAt: 'local probe {time}',
        officialChip: 'official {status}',
        statusSwitchWhy: 'Switching to the published subscription steps around OpenCode entirely; it moves back once OpenCode is stable again.',
        switchNoticeTitle: 'Switched to the DeepSeek subscription; the task keeps running.',
        switchNoticeBack: 'Back on the OpenCode route; the task keeps running.',
        switchNoticeTime: 'switched {time}',
        switchNoticeClose: 'Dismiss',
      },
      'zh-tw': {
        title: 'OpenCode 帳號與用量',
        refresh: '重新整理',
        refreshing: '重新整理中…',
        updatedAt: '更新於 {time}',
        loadError: '讀取失敗：{message}',
        routerTitle: '額度路由',
        modePrimary: '正常路由',
        modeFallback: '已回退到官方訂閱',
        modeReason: '原因：{reason}',
        activeAccount: '目前帳號',
        nextProbe: '下次探測',
        probeAll: '立即探測',
        resetMarks: '重設封鎖標記',
        resetHint: '清空所有「額度用盡／驗證失敗」標記，並讓路由立刻回到 OpenCode 帳號池；不會改動帳號與金鑰。',
        routerMissing: '未偵測到額度路由，帳號池為唯讀。',
        accountsTitle: '帳號池',
        accountsOrder: '依序使用：前面的帳號用完才會用後面的。',
        addAccount: '新增帳號',
        labelPlaceholder: '備註（可選，例如 小號 A）',
        keyPlaceholder: 'oc_sk_…',
        addAndProbe: '新增並探測',
        save: '儲存',
        cancel: '取消',
        setActive: '設為目前',
        disable: '停用',
        enable: '啟用',
        editKey: '編輯金鑰',
        remove: '刪除',
        viewUsage: '查看用量',
        keyUpdated: '金鑰已更新',
        accountAdded: '帳號已新增並探測',
        shortKey: '金鑰不完整：至少 8 個字元',
        keepOne: '至少保留一個帳號',
        notConfigured: '未設定',
        readonly: '唯讀',
        newKeyFor: '新金鑰寫入 {ref}',
        noAccounts: '還沒有帳號。填入金鑰即可開始。',
        statusReady: '可用',
        statusExhausted: '額度用盡',
        statusAuth: '驗證失敗',
        statusDisabled: '已停用',
        statusMissing: '未設定金鑰',
        statusError: '讀取失敗',
        statusActive: '目前使用',
        statusSpare: '備用',
        statusCurrent: '目前',
        colIndex: '#',
        colAccount: '帳號',
        colKey: '金鑰',
        colRolling: '5 小時',
        colWeekly: '本週',
        colMonthly: '本月',
        colStatus: '狀態',
        colActions: '操作',
        colModel: '模型',
        colCaps: '能力',
        colRequests: '請求',
        colTokens: '輸入 / 輸出 tokens',
        colRemaining: '本月剩餘',
        colMonthlyUsed: '本月用量',
        colWeeklyUsed: '本週用量',
        modelsTitle: '依模型（本機估算）',
        capsText: '純文字',
        capsImage: '圖像',
        capsVideo: '影片',
        capsAudio: '音訊',
        capsPdf: 'PDF',
        capsTools: '工具',
        capsReasoning: '推理',
        capsUnknown: '未宣告',
        free: '免費',
        unlimited: '無限',
        none: '—',
        dialogTitle: '{label} 的用量',
        dialogNote: '官方介面只提供這三個窗口的百分比，沒有依模型拆分的明細；依模型的金額只能是本機估算。',
        dialogProbe: '重新探測',
        close: '關閉',
        probedAt: '探測於 {time}',
        resetsAt: '重置於 {time}',
        usageError: '錯誤：{message}',
        peakTitle: '此刻用哪個更划算',
        peakPlan: '你為 OpenCode 的 {plan} 方案付 ¥{price}／月（${usd}），額度給到 ¥{allowance}（${allowanceUsd}）的官方價用量。額度依官方價扣，等於打 {discount} 折——同一筆請求走 OpenCode 你只付官方價的 {percent}%。',
        peakNow: '走官方直連照官方價付現。此刻 OpenCode 是{goPeak}，官方是{officialPeak}{holiday}。',
        peakGoPeak: '峰段（額度消耗 2 倍）',
        peakGoOff: '谷段',
        peakOfficialPeak: '峰段（價格 2 倍）',
        peakOfficialOff: '谷段',
        peakAtPeak: '高峰期',
        peakOffPeak: '低谷期',
        kindCacheRead: '緩存命中輸入',
        colKind: '計費項',
        kindInput: '緩存未命中輸入',
        kindOutput: '輸出',
        peakHoliday: '——今天是中國法定假日，官方整天算谷，OpenCode 照算峰',
        peakExhausted: '但本月額度已用盡，只能走官方。',
        peakGoPay: 'OpenCode',
        peakOfficialPay: 'DeepSeek 官方',
        colOpenCode: 'OpenCode',
        colOfficial: 'DeepSeek 官方',
        peakVerdict: '結論',
        clockTitle: '此刻的峰谷',
        clockPeak: '高峰期',
        clockOff: '低谷期',
        clockFlip: '還剩 {hours} 小時到{next}',
        clockHoliday: '今天是中國法定節假日，官方 API 全天按低谷計',
        colRollingQuota: '5 小時額度',
        capHintText: '純文字：只吃文字、只出文字。',
        capHintImage: '圖像輸入：能看截圖、圖表和 UI 稿（JPEG/PNG/GIF/WebP）。',
        capHintVideo: '影片輸入：能直接讀 mp4 等影片檔並描述畫面內容。',
        capHintAudio: '音訊輸入：能直接讀音訊檔。',
        capHintPdf: 'PDF 輸入：能直接讀 PDF 文件，不用先轉成文字。',
        capHintTools: '工具調用：模型可以調用 harness 提供的函式——讀檔、跑指令、搜網頁、寫程式——再依回傳結果繼續做事。',
        capHintReasoning: '推理：回答前先自己想一段，難題更穩，但更慢、更耗 token。',
        backToTop: '回到頂端',
        subscribe: '訂閱 OpenCode',
        copyKey: '複製',
        copied: '已複製',
        peakGoCheaper: '走 OpenCode 便宜 {percent}%',
        verdictGo: '走 OpenCode 便宜 {percent}%',
        verdictOfficial: '走官方直連便宜 {percent}%',
        verdictExhausted: '本月額度已用盡，只能走官方直連',
        peakFootnote: '依每 100 萬輸出 tokens 折算（編碼帳單主要來自輸出），匯率 ¥{fx}/$。峰谷只影響額度消耗速度，不改變結論：額度內走 OpenCode 始終比官方直連便宜；例外是額度用盡，或某個模型的額度先用完。',
        footerOfficial: '上面「官方 5 小時／本週／本月」百分比來自 OpenCode 介面，是帳號真實用量，其他用戶端或機器用掉的也會算進去。',
        footerLocal: '依模型的金額是本機估算：只統計這個 harness 的工作階段日誌，用來拆開看模型分布；其他工具的呼叫沒有本機記錄。',
        footerPeakRule: '金額依離峰價估算，DeepSeek 模型峰時按 2 倍；免費模型不計費。',
        statusTitle: '上游狀態',
        statusRefresh: '重新整理狀態',
        statusRefreshing: '重新整理中…',
        statusRefreshHint: '立刻探測一次 OpenCode 上游：讀取帳號額度、更新健康狀態；回退期間還會推進恢復觀察視窗。',
        statusSince: '持續',
        statusChecked: '最近探測',
        statusStableWindow: '穩定視窗',
        statusWindowLeft: '還需 {remaining}',
        statusWindowDone: '已穩定 {stableFor}',
        statusStateHealthy: '正常',
        statusStateDegraded: '降級 (Degraded)',
        statusStateFallback: '走官方訂閱',
        statusStateRecovering: '恢復觀察中',
        statusStateUnknown: '未知',
        statusHintHealthy: 'OpenCode 上游正常：最近的請求都成功了，流量走 OpenCode 帳號池。',
        statusHintRateLimit: '上游限流：OpenCode Go 對目前帳號回傳 429／速率限制，這個視窗內的新請求會被直接拒絕（flash 最常遇到）。建議切換為官方訂閱繼續跑，限流通常幾分鐘到十幾分鐘就會自癒。',
        statusHintCapacity: '上游過載：OpenCode 的推理單元排滿了（at capacity / prefill_cap_refused / ttft_admission_refused），額度沒耗盡但此刻不接新工作。建議切換為官方訂閱，別讓 provider 反覆重試白等。',
        statusHintQuota: '額度用盡：目前帳號的 5 小時／本週／本月視窗打滿了。建議切換為官方訂閱，或等視窗重置後自動恢復。',
        statusHintAuth: '驗證失敗：OpenCode 拒絕了此帳號的金鑰（401/403）。建議先在下面的帳號卡更新金鑰；急著做事就切官方訂閱。',
        statusHintError: '上游回傳了非限流類錯誤（網路或伺服器故障）。重新整理一次看是否偶發；連續出現就切官方訂閱。',
        statusHintFallback: '目前走 DeepSeek 官方訂閱，任務用官方額度繼續，不會中斷。OpenCode 恢復並連續穩定 {stable} 分鐘後會自動切回。',
        statusHintRecovering: 'OpenCode 已經能探通了，正在觀察穩定性：還需 {remaining}。期間新請求繼續走官方訂閱，避免剛切回又被限流打斷。',
        statusHintManual: '你在設定裡手動切到了官方訂閱。OpenCode 恢復並穩定 {stable} 分鐘後會自動切回，也可以點「切回 OpenCode」立刻返回。',
        statusHintUnknown: '還沒有請求樣本：送出一則對話，或點「重新整理狀態」取得真實狀態。',
        statusBlockedPublished: '官方狀態仍把這個模型標為降級，所以觀察視窗沒有開始 —— 探測能過不代表推理能過，避免剛切回又被限流。',
        statusBlockedProbe: '最近一次探測還沒通過，觀察視窗在重新計時。',
        statusFails: '本輪失敗 {count} 次',
        statusNoFails: '本輪無失敗',
        statusQuarantined: '單一模型封鎖至 {time}',
        statusSwitchOfficial: '切到官方訂閱',
        statusModelsTitle: '按模型',
        codeOk: '正常',
        codeRateLimit: '限流',
        codeCapacity: '過載',
        codeQuota: '額度用盡',
        codeAuth: '驗證失敗',
        codeError: '錯誤',
        codeUnknown: '未知',
        errRateLimit: '限流 (429)',
        errRateLimitHint: '含義：請求速率超限，OpenCode 對併發／頻率限流，flash 最容易遇到。解決：等 1–10 分鐘視窗自動恢復；或換池裡其它帳號；或點「切到官方訂閱」繼續做事。',
        errCapacity: '上游過載 (503/529)',
        errCapacityHint: '含義：推理單元排滿（at capacity / prefill_cap_refused / ttft_admission_refused），額度還在但不接新工作。解決：切官方訂閱立刻恢復；或等 1–2 分鐘重試並降低併發。',
        errQuota: '額度用盡',
        errQuotaHint: '含義：帳號 5 小時／本週／本月視窗打滿。解決：等視窗重置（卡片有倒數）、換帳號、切官方訂閱，或升級方案。',
        errPayment: '欠費 (402)',
        errPaymentHint: '含義：帳號欠費或被鎖。解決：到 opencode.ai/console 查帳單並儲值；急著做事先切官方訂閱。',
        errAuth: '驗證失敗 (401/403)',
        errAuthHint: '含義：金鑰被拒（過期、被重置、複製不全）。解決：帳號卡「編輯金鑰」重填 → 點「立即探測」驗證；仍失敗就換 key 或切官方訂閱。',
        errMissingKey: '未設定金鑰',
        errMissingKeyHint: '含義：這個帳號沒有可用 key，憑證服務裡也查不到。解決：在帳號卡填入 key，或刪掉這個帳號。',
        errSignIn: '需要重新授權',
        errSignInHint: '含義：帳號需要在 OpenCode 主控台重新登入授權。解決：重新登入並產生新 key，填進帳號卡。',
        errUpgrade: '需升級用戶端',
        errUpgradeHint: '含義：provider／外掛版本太舊，上游已不接受該用戶端。解決：升級 dsh-opencode-routing（或 provider 適配層）後重啟 harness。',
        errNotFound: '模型不可用 (404)',
        errNotFoundHint: '含義：模型名稱在目前方案或端點不存在／已下線。解決：核對 cordis.patch.yml 裡 routes 的模型名稱；或先切官方訂閱。',
        errBadRequest: '請求被拒 (400/422)',
        errBadRequestHint: '含義：參數不合法（圖片格式、工具 schema、欄位超長等）。解決：移除可疑附件或工具重試、換模型試；切官方訂閱保底。',
        errContext: '上下文過長',
        errContextHint: '含義：輸入加歷史超過模型上下文視窗。解決：壓縮或新開對話、換上下文更大的模型、切官方訂閱。',
        errTimeout: '逾時 (408/504)',
        errTimeoutHint: '含義：上游或網路在逾時內沒回應。解決：直接重試；檢查 Clash／代理是否抖動；持續逾時就切官方訂閱。',
        errServer: '伺服器錯誤 (5xx)',
        errServerHint: '含義：OpenCode 端故障。解決：等 1–2 分鐘重試；連續出現就切官方訂閱，別把時間耗在重試上。',
        errNetwork: '網路錯誤',
        errNetworkHint: '含義：連線被重置／DNS 失敗／代理斷了（ECONNRESET、ENOTFOUND、EAI_AGAIN、socket hang up）。解決：查 Clash 與 DNS 後重試；代理不穩就切官方訂閱。',
        errFilter: '內容被攔截',
        errFilterHint: '含義：請求或回覆觸發上游內容審查。解決：改提示詞措辭、移除敏感附件，或換模型／切官方訂閱。',
        errGeneric: '未知錯誤',
        errGenericHint: '含義：沒歸類到的上游錯誤。解決：看保留的原文，先重新整理狀態重試；持續出現就切官方訂閱。',
        errRaw: '原文：{message}',
        errAdvice: '解決辦法',
        errTable: '錯誤碼與解決辦法',
        officialTitle: 'OpenCode 官方狀態',
        officialRefresh: '重新整理官方狀態',
        officialRefreshHint: '重新讀一次 status.opencode.ai（OpenCode 自己大約每分鐘更新一次），同時重新整理本地探測結果。',
        officialSource: 'status.opencode.ai · 更新於 {time}',
        officialStale: '資料已過期，{age}更新',
        officialUnavailable: '拿不到官方狀態：{error}',
        officialOpenStatus: '開啟狀態頁',
        officialStatusOperational: '正常',
        officialStatusDegraded: '降級',
        officialStatusOutage: '中斷',
        officialStatusMaintenance: '維護',
        officialStatusUnknown: '未知',
        officialHintOperational: 'OpenCode 官方狀態正常：Go 套餐與推理介面都在正常工作，套餐可以照常用。',
        officialHintPartial: '官方整體在降級，但你正在用的模型目前是正常的 —— 先別切，繼續跑；卡住了再切官方訂閱。',
        officialHintUpstream: '上游供應商在降級 —— 不是你的金鑰或額度問題，OpenCode 自己也這樣標。建議點「切到官方訂閱」繼續做事，等官方恢復。',
        officialHintCapacity: '官方標示容量不足：推理單元排滿，額度沒耗盡但此刻不接新活。建議切官方訂閱，別讓 provider 反覆空轉重試。',
        officialHintRateLimit: '官方標示限流：新請求會被直接拒掉。建議切官方訂閱繼續做事，一般幾分鐘到十幾分鐘自癒。',
        officialHintOutage: '官方標示中斷：這個服務整體不可用。立刻切官方訂閱，否則任務會卡在重試上。',
        officialHintMaintenance: '官方正在維護：這是計畫內的，等維護結束即恢復。急件先切官方訂閱。',
        officialHintUnknown: '官方沒有給出可辨識的原因，點「開啟狀態頁」看事件詳情。',
        officialModelsTitle: '你正在用的模型',
        officialModelMissing: '官方沒列出這個模型',
        officialSpeed: '首字 {ttft} ms · {tps} tok/s',
        officialIncidentsTitle: '進行中的事件',
        officialNoIncidents: '目前沒有進行中的事件',
        officialIncident: '已持續 {age}',
        officialReason: '原因：{reason}',
        officialReasonUpstream: '上游供應商',
        officialReasonNone: '無',
        officialReasonCapacity: '容量不足',
        officialReasonRateLimit: '限流',
        officialReasonOther: '其它',
        officialServiceGo: 'Go 套餐',
        officialServiceInference: '推理介面',
        officialServicePayg: '按量付費',
        officialServiceFree: '免費推理',
        routeNow: '目前路由',
        routeOpencode: 'OpenCode 帳號池',
        routeOfficial: 'DeepSeek 官方訂閱',
        routeOpencodeHint: '請求走 OpenCode（{account}），不花官方訂閱額度。',
        routeOfficialHint: '請求直連 DeepSeek 官方 API，按官方訂閱額度計費；OpenCode 恢復並穩定後會自動切回。',
        statusLocalTitle: '本地上游探測',
        statusCheckedAt: '本地探測於 {time}',
        officialChip: '官方 {status}',
        statusSwitchWhy: '切到官方訂閱可以立刻繞過 OpenCode 這一層；它恢復並穩定後會自動切回。',
        switchNoticeTitle: '已切到 DeepSeek 官方訂閱，任務繼續執行。',
        switchNoticeBack: '已切回 OpenCode 路由，任務繼續執行。',
        switchNoticeTime: '{time} 切換',
        switchNoticeClose: '關閉',
      },
    };


/* @@EXTRA_LOCALES_BEGIN@@ */
    Object.assign(DICT, {
  "de": {
    "title": "OpenCode: Konten und Nutzung",
    "refresh": "Aktualisieren",
    "refreshing": "Wird aktualisiert…",
    "updatedAt": "Aktualisiert {time}",
    "loadError": "Laden fehlgeschlagen: {message}",
    "routerTitle": "Kontingent-Routing",
    "modePrimary": "Normales Routing",
    "modeFallback": "Auf offizielles Abo zurückgefallen",
    "modeReason": "Grund: {reason}",
    "activeAccount": "Aktives Konto",
    "nextProbe": "Nächste Prüfung",
    "probeAll": "Jetzt prüfen",
    "resetMarks": "Sperrmarken löschen",
    "resetHint": "Löscht alle Marken „Kontingent aufgebraucht / Anmeldung fehlgeschlagen“ und schickt das Routing sofort in den OpenCode-Kontenpool zurück. Konten und Schlüssel bleiben unverändert.",
    "routerMissing": "Kein Kontingent-Router gefunden – der Kontenpool ist schreibgeschützt.",
    "accountsTitle": "Kontenpool",
    "accountsOrder": "Wird der Reihe nach genutzt: Das nächste Konto übernimmt erst, wenn das davor leer ist.",
    "addAccount": "Konto hinzufügen",
    "labelPlaceholder": "Bezeichnung (optional, z. B. Zweitkonto A)",
    "keyPlaceholder": "oc_sk_…",
    "addAndProbe": "Hinzufügen und prüfen",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "setActive": "Als aktiv setzen",
    "disable": "Deaktivieren",
    "enable": "Aktivieren",
    "editKey": "Schlüssel ändern",
    "remove": "Löschen",
    "viewUsage": "Nutzung ansehen",
    "keyUpdated": "Schlüssel aktualisiert",
    "accountAdded": "Konto hinzugefügt und geprüft",
    "shortKey": "Schlüssel unvollständig: mindestens 8 Zeichen",
    "keepOne": "Mindestens ein Konto behalten",
    "notConfigured": "Nicht gesetzt",
    "readonly": "schreibgeschützt",
    "newKeyFor": "Neuer Schlüssel wird in {ref} gespeichert",
    "noAccounts": "Noch keine Konten. Schlüssel eintragen und loslegen.",
    "statusReady": "Bereit",
    "statusExhausted": "Kontingent aufgebraucht",
    "statusAuth": "Anmeldung fehlgeschlagen",
    "statusDisabled": "Deaktiviert",
    "statusMissing": "Kein Schlüssel",
    "statusError": "Prüfung fehlgeschlagen",
    "statusActive": "In Nutzung",
    "statusSpare": "Reserve",
    "statusCurrent": "aktuell",
    "colIndex": "#",
    "colAccount": "Konto",
    "colKey": "Schlüssel",
    "colRolling": "5 Stunden",
    "colWeekly": "Diese Woche",
    "colMonthly": "Dieser Monat",
    "colStatus": "Status",
    "colActions": "Aktionen",
    "colModel": "Modell",
    "colCaps": "Modalität",
    "colRequests": "Anfragen",
    "colTokens": "Tokens Eingabe / Ausgabe",
    "colRemaining": "Rest diesen Monat",
    "colMonthlyUsed": "Verbrauch im Monat",
    "colWeeklyUsed": "Verbrauch in der Woche",
    "modelsTitle": "Pro Modell (lokale Schätzung)",
    "capsText": "Text",
    "capsImage": "Bild",
    "capsVideo": "Video",
    "capsAudio": "Audio",
    "capsPdf": "PDF",
    "capsTools": "Tools",
    "capsReasoning": "Reasoning",
    "capsUnknown": "nicht angegeben",
    "free": "kostenlos",
    "unlimited": "unbegrenzt",
    "none": "—",
    "dialogTitle": "Nutzung von {label}",
    "dialogNote": "Die offizielle Schnittstelle meldet nur diese drei Zeitfenster, ohne Aufschlüsselung pro Modell; Beträge pro Modell können nur eine lokale Schätzung sein.",
    "dialogProbe": "Erneut prüfen",
    "close": "Schließen",
    "probedAt": "Geprüft {time}",
    "resetsAt": "Zurückgesetzt {time}",
    "usageError": "Fehler: {message}",
    "peakTitle": "Welcher Weg gerade günstiger ist",
    "peakPlan": "Du zahlst ¥{price}/Monat (${usd}) für OpenCode {plan}, und der Tarif gibt ¥{allowance} (${allowanceUsd}) Nutzung zu offiziellen Preisen frei – ein Rabatt von {discount}×, dieselbe Anfrage kostet über OpenCode also nur {percent}% des offiziellen Preises.",
    "peakNow": "Der offizielle Weg rechnet direkt zum Listenpreis ab. Aktuell ist OpenCode {goPeak} und die offizielle API {officialPeak}{holiday}.",
    "peakGoPeak": "in der Hauptzeit (Kontingent verbraucht sich doppelt so schnell)",
    "peakGoOff": "in der Nebenzeit",
    "peakOfficialPeak": "in der Hauptzeit (Preis verdoppelt)",
    "peakOfficialOff": "in der Nebenzeit",
    "peakAtPeak": "Hauptzeit",
    "peakOffPeak": "Nebenzeit",
    "peakHoliday": " – heute ist ein chinesischer gesetzlicher Feiertag: Die offizielle API rechnet den ganzen Tag Nebenzeit ab, OpenCode weiter Hauptzeit",
    "peakExhausted": " Das Kontingent für diesen Monat ist aber schon aufgebraucht, es bleibt nur der offizielle Weg.",
    "peakGoPay": "OpenCode",
    "peakOfficialPay": "DeepSeek offiziell",
    "peakVerdict": "Fazit",
    "peakGoCheaper": "OpenCode ist {percent}% günstiger",
    "peakFootnote": "Gerechnet pro 1 Mio. Ausgabe-Tokens (bei einer Coding-Rechnung dominiert die Ausgabe), bei ¥{fx} je $. Haupt- und Nebenzeit ändern nur, wie schnell das Kontingent verbraucht wird, nicht das Fazit: Innerhalb des Kontingents bleibt OpenCode günstiger als die offizielle API; Ausnahmen sind ein aufgebrauchtes Kontingent oder ein Modell, dessen eigenes Limit zuerst endet.",
    "footerOfficial": "Die offiziellen Prozente für 5 Stunden / Woche / Monat kommen von der OpenCode-API und beschreiben das ganze Konto – Nutzung über andere Clients oder Rechner zählt mit.",
    "footerLocal": "Beträge pro Modell sind eine lokale Schätzung: Sie zählen nur das Sitzungsprotokoll dieses Harness, und genau das macht die Verteilung pro Modell sichtbar; Aufrufe anderer Tools hinterlassen lokal keine Spur.",
    "footerPeakRule": "Beträge sind zum Nebenzeit-Preis geschätzt, bei DeepSeek-Modellen zur Hauptzeit doppelt; kostenlose Modelle werden nicht berechnet.",
    "kindCacheRead": "zwischengespeicherte Eingabe",
    "kindInput": "nicht zwischengespeicherte Eingabe",
    "kindOutput": "Ausgabe",
    "colKind": "Posten",
    "verdictGo": "Über OpenCode {percent}% günstiger",
    "verdictOfficial": "Über die offizielle API {percent}% günstiger",
    "verdictExhausted": "Monatskontingent aufgebraucht – nur die offizielle API bleibt",
    "colOpenCode": "OpenCode",
    "colOfficial": "DeepSeek offiziell",
    "clockTitle": "Haupt- und Nebenzeit gerade jetzt",
    "clockPeak": "Hauptzeit",
    "clockOff": "Nebenzeit",
    "clockFlip": "noch {hours} Std. bis {next}",
    "clockHoliday": "Heute ist chinesischer gesetzlicher Feiertag, deshalb rechnet die offizielle API den ganzen Tag Nebenzeit ab",
    "colRollingQuota": "5-Stunden-Kontingent",
    "capHintText": "Nur Text: reiner Text rein, reiner Text raus.",
    "capHintImage": "Bildeingabe: versteht Screenshots, Diagramme und UI-Mockups (JPEG/PNG/GIF/WebP).",
    "capHintVideo": "Videoeingabe: liest Videodateien wie mp4 und beschreibt, was darin passiert.",
    "capHintAudio": "Audioeingabe: liest Audiodateien direkt.",
    "capHintPdf": "PDF-Eingabe: liest PDF-Dokumente, ohne sie vorher in Text umzuwandeln.",
    "capHintTools": "Tool-Aufruf: Das Modell kann die Funktionen aufrufen, die das Harness bereitstellt (Dateien lesen, Befehle ausführen, im Web suchen, Code schreiben), und mit den Ergebnissen arbeiten.",
    "capHintReasoning": "Reasoning: Das Modell denkt vor der Antwort nach; besser bei schwierigen Aufgaben, dafür langsamer und mit mehr Tokenverbrauch.",
    "backToTop": "Nach oben",
    "subscribe": "OpenCode abonnieren",
    "copyKey": "Kopieren",
    "copied": "Kopiert",
    "routeNow": "Aktuelle Route",
    "routeOpencode": "der OpenCode-Kontenpool",
    "routeOfficial": "das DeepSeek-Abo",
    "routeOpencodeHint": "Anfragen laufen über OpenCode ({account}) und verbrauchen kein Abo-Kontingent.",
    "routeOfficialHint": "Anfragen gehen direkt an die DeepSeek-API und verbrauchen Abo-Kontingent; sobald OpenCode stabil ist, wird zurückgeschaltet.",
    "statusLocalTitle": "Lokale Prüfung",
    "statusCheckedAt": "lokale Prüfung {time}",
    "officialChip": "offiziell {status}",
    "statusSwitchWhy": "Der Wechsel zum Abo umgeht OpenCode vollständig; sobald OpenCode stabil ist, wird zurückgeschaltet.",
    "switchNoticeTitle": "Auf das DeepSeek-Abo gewechselt; die Aufgabe läuft weiter.",
    "switchNoticeBack": "Zurück auf der OpenCode-Route; die Aufgabe läuft weiter.",
    "switchNoticeTime": "gewechselt {time}",
    "switchNoticeClose": "Schließen",
    "forceFallback": "Switch to the official subscription now",
    "forcePrimary": "Switch back to OpenCode",
    "forceFallbackHint": "Switches to the DeepSeek official API while OpenCode is failing; this consumes official credits.",
    "statusTitle": "Upstream status",
    "statusRefresh": "Refresh status",
    "statusRefreshing": "Refreshing…",
    "statusRefreshHint": "Probe OpenCode right now: re-read account usage and update the health state; during a fallback it also advances the recovery window.",
    "statusSince": "Since",
    "statusChecked": "Last probe",
    "statusStableWindow": "Stability window",
    "statusWindowLeft": "{remaining} left",
    "statusWindowDone": "stable for {stableFor}",
    "statusStateHealthy": "Healthy",
    "statusStateDegraded": "Degraded",
    "statusStateFallback": "On the official subscription",
    "statusStateRecovering": "Recovering",
    "statusStateUnknown": "Unknown",
    "statusHintHealthy": "OpenCode upstream is healthy: recent requests succeeded and traffic goes through the OpenCode account pool.",
    "statusHintRateLimit": "Upstream rate limit: OpenCode Go is answering 429 / rate limited for this account, so new requests in this window are refused (flash hits it most). Switching to the official subscription keeps the task running; these limits usually clear within minutes.",
    "statusHintCapacity": "Upstream overloaded: OpenCode’s serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused). The allowance is intact, but nothing new is accepted right now. Switch to the official subscription instead of letting the provider retry into a full cell.",
    "statusHintQuota": "Out of allowance: the current account’s 5-hour / weekly / monthly window is maxed out. Switch to the official subscription, or wait for the window to reset.",
    "statusHintAuth": "Authentication failed: OpenCode rejected this account’s key (401/403). Update the key in the account card below, or switch to the official subscription if the task cannot wait.",
    "statusHintError": "The upstream returned a non-quota error (network or server fault). Refresh once to see whether it was transient; if it repeats, switch to the official subscription.",
    "statusHintFallback": "Requests currently go to the DeepSeek official subscription, so the task keeps running on official credits. After OpenCode stays clean for {stable} minutes it switches back automatically.",
    "statusHintRecovering": "OpenCode answers probes again; the router is watching stability: {remaining} left. New requests stay on the official subscription meanwhile, so a half-recovered upstream cannot interrupt them.",
    "statusHintManual": "You switched to the official subscription by hand. It returns automatically once OpenCode stays clean for {stable} minutes, or click “Switch back to OpenCode”.",
    "statusHintUnknown": "No request samples yet: send one message, or press “Refresh status” to read the real state.",
    "statusBlockedPublished": "OpenCode still publishes this model as degraded, so the window has not started — a readable probe is not proof that inference works, and switching back into a rate limit is worse than waiting.",
    "statusBlockedProbe": "The last probe failed; the stability window restarted.",
    "statusFails": "{count} failure(s) this round",
    "statusNoFails": "no failures this round",
    "statusQuarantined": "model blocked until {time}",
    "statusSwitchOfficial": "Switch to the official subscription",
    "statusModelsTitle": "By model",
    "codeOk": "OK",
    "codeRateLimit": "rate limited",
    "codeCapacity": "overloaded",
    "codeQuota": "out of allowance",
    "codeAuth": "auth failed",
    "codeError": "error",
    "codeUnknown": "unknown",
    "errRateLimit": "Rate limited (429)",
    "errRateLimitHint": "Meaning: the request rate is over the limit — OpenCode throttles concurrency/frequency and flash hits it most. Fix: wait 1–10 minutes for the window to clear; or use another account in the pool; or click “Switch to the official subscription” and keep working.",
    "errCapacity": "Upstream overloaded (503/529)",
    "errCapacityHint": "Meaning: the serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused); allowance is intact but nothing new is accepted. Fix: switch to the official subscription; or retry in 1–2 minutes with less concurrency.",
    "errQuota": "Out of allowance",
    "errQuotaHint": "Meaning: the 5-hour / weekly / monthly window is maxed out. Fix: wait for the reset (the card shows a countdown), use another account, switch to the official subscription, or upgrade the plan.",
    "errPayment": "Payment required (402)",
    "errPaymentHint": "Meaning: the account is in arrears or locked. Fix: check billing at opencode.ai/console; switch to the official subscription if the task cannot wait.",
    "errAuth": "Auth failed (401/403)",
    "errAuthHint": "Meaning: the key was rejected (expired, reset, or truncated). Fix: re-enter it with “Edit key”, then press “Probe now” to verify; if it still fails, use another key or the official subscription.",
    "errMissingKey": "No key",
    "errMissingKeyHint": "Meaning: this account has no usable key, and the credential store has none either. Fix: paste a key into the account card, or delete the account.",
    "errSignIn": "Sign-in required",
    "errSignInHint": "Meaning: the account has to sign in again on the OpenCode console. Fix: sign in, generate a fresh key and paste it into the account card.",
    "errUpgrade": "Client upgrade required",
    "errUpgradeHint": "Meaning: the provider/plugin version is too old and the upstream no longer accepts it. Fix: upgrade dsh-opencode-routing (or the provider adapter) and restart the harness.",
    "errNotFound": "Model unavailable (404)",
    "errNotFoundHint": "Meaning: the model name does not exist on this plan or endpoint, or it was retired. Fix: check the model names under routes in cordis.patch.yml; or switch to the official subscription.",
    "errBadRequest": "Request rejected (400/422)",
    "errBadRequestHint": "Meaning: invalid parameters (image format, tool schema, oversized field). Fix: drop the suspicious attachment or tool and retry, try another model; the official subscription as a safety net.",
    "errContext": "Context too long",
    "errContextHint": "Meaning: input plus history exceed the model’s context window. Fix: compact or start a new chat, use a model with a larger window, or switch to the official subscription.",
    "errTimeout": "Timed out (408/504)",
    "errTimeoutHint": "Meaning: the upstream or the network did not answer in time. Fix: retry; check whether Clash/proxy is flapping; switch to the official subscription if it persists.",
    "errServer": "Server error (5xx)",
    "errServerHint": "Meaning: a fault on OpenCode’s side. Fix: retry in 1–2 minutes; if it keeps happening, switch to the official subscription instead of burning time on retries.",
    "errNetwork": "Network error",
    "errNetworkHint": "Meaning: connection reset, DNS failure or a broken proxy (ECONNRESET, ENOTFOUND, EAI_AGAIN, socket hang up). Fix: check Clash and DNS, retry; switch to the official subscription while the proxy is unstable.",
    "errFilter": "Blocked by content filter",
    "errFilterHint": "Meaning: the request or the reply tripped the upstream content filter. Fix: rephrase the prompt, drop the sensitive attachment, or use another model / the official subscription.",
    "errGeneric": "Unknown error",
    "errGenericHint": "Meaning: an upstream error outside the buckets above. Fix: read the kept raw message, refresh the status and retry; switch to the official subscription if it repeats.",
    "errRaw": "Raw: {message}",
    "errAdvice": "What to do",
    "errTable": "Error codes and fixes",
    "officialTitle": "OpenCode status",
    "officialRefresh": "Refresh status",
    "officialRefreshHint": "Re-reads status.opencode.ai (OpenCode refreshes it about once a minute) together with the local probe result.",
    "officialSource": "status.opencode.ai · updated {time}",
    "officialStale": "Stale reading (updated {age})",
    "officialUnavailable": "Could not read the published status: {error}",
    "officialOpenStatus": "Open the status page",
    "officialStatusOperational": "Operational",
    "officialStatusDegraded": "Degraded",
    "officialStatusOutage": "Outage",
    "officialStatusMaintenance": "Maintenance",
    "officialStatusUnknown": "Unknown",
    "officialHintOperational": "OpenCode reports everything operational: the Go plan and the inference gateway are fine, keep using the plan.",
    "officialHintPartial": "OpenCode has an overall degradation, but the model you are using is fine right now — keep going, and only switch to the official subscription if it actually stalls.",
    "officialHintUpstream": "The upstream provider is degraded — not your key and not your allowance, OpenCode says so itself. Switch to the official subscription and keep working until it clears.",
    "officialHintCapacity": "OpenCode reports it is at capacity: the allowance is intact but the serving cells are full. Switch to the official subscription instead of retrying in a loop.",
    "officialHintRateLimit": "OpenCode reports rate limiting: new requests are being refused. Switch to the official subscription; it usually clears within minutes.",
    "officialHintOutage": "OpenCode reports an outage: this service is down. Switch to the official subscription now or the turn will sit in retries.",
    "officialHintMaintenance": "OpenCode is in planned maintenance; it comes back when the window closes. Switch to the official subscription if you need to keep going.",
    "officialHintUnknown": "OpenCode did not give a reason this card understands — open the status page for the incident.",
    "officialModelsTitle": "Models you are using",
    "officialModelMissing": "not listed by OpenCode",
    "officialSpeed": "{ttft} ms first token · {tps} tok/s",
    "officialIncidentsTitle": "Open incidents",
    "officialNoIncidents": "No open incidents",
    "officialIncident": "open {age}",
    "officialReason": "reason: {reason}",
    "officialReasonUpstream": "upstream provider",
    "officialReasonNone": "none",
    "officialReasonCapacity": "capacity",
    "officialReasonRateLimit": "rate limit",
    "officialReasonOther": "other",
    "officialServiceGo": "Go plan",
    "officialServiceInference": "Inference API",
    "officialServicePayg": "Pay-as-you-go",
    "officialServiceFree": "Free inference",
  },
  "es": {
    "title": "Cuentas y uso de OpenCode",
    "refresh": "Actualizar",
    "refreshing": "Actualizando…",
    "updatedAt": "Actualizado {time}",
    "loadError": "Error al leer: {message}",
    "routerTitle": "Enrutado por cuota",
    "modePrimary": "Enrutado normal",
    "modeFallback": "Se recurrió a la suscripción oficial",
    "modeReason": "Motivo: {reason}",
    "activeAccount": "Cuenta activa",
    "nextProbe": "Próximo sondeo",
    "probeAll": "Sondear ahora",
    "resetMarks": "Borrar marcas de bloqueo",
    "resetHint": "Borra todas las marcas de «cuota agotada / fallo de autenticación» y devuelve el enrutado al grupo de cuentas de OpenCode al instante. No cambia cuentas ni claves.",
    "routerMissing": "No se detectó el enrutador de cuota; el grupo de cuentas es de solo lectura.",
    "accountsTitle": "Grupo de cuentas",
    "accountsOrder": "Se usan en orden: la siguiente cuenta entra solo cuando la anterior se queda sin cuota.",
    "addAccount": "Añadir cuenta",
    "labelPlaceholder": "Etiqueta (opcional, p. ej. alterna A)",
    "keyPlaceholder": "oc_sk_…",
    "addAndProbe": "Añadir y sondear",
    "save": "Guardar",
    "cancel": "Cancelar",
    "setActive": "Usar esta",
    "disable": "Desactivar",
    "enable": "Activar",
    "editKey": "Cambiar clave",
    "remove": "Eliminar",
    "viewUsage": "Ver uso",
    "keyUpdated": "Clave actualizada",
    "accountAdded": "Cuenta añadida y sondeada",
    "shortKey": "La clave parece incompleta: mínimo 8 caracteres",
    "keepOne": "Conserva al menos una cuenta",
    "notConfigured": "Sin configurar",
    "readonly": "solo lectura",
    "newKeyFor": "La clave nueva se guarda en {ref}",
    "noAccounts": "Aún no hay cuentas. Añade una clave para empezar.",
    "statusReady": "Disponible",
    "statusExhausted": "Cuota agotada",
    "statusAuth": "Fallo de autenticación",
    "statusDisabled": "Desactivada",
    "statusMissing": "Sin clave",
    "statusError": "Fallo de sondeo",
    "statusActive": "En uso",
    "statusSpare": "Reserva",
    "statusCurrent": "actual",
    "colIndex": "#",
    "colAccount": "Cuenta",
    "colKey": "Clave",
    "colRolling": "5 horas",
    "colWeekly": "Esta semana",
    "colMonthly": "Este mes",
    "colStatus": "Estado",
    "colActions": "Acciones",
    "colModel": "Modelo",
    "colCaps": "Modalidad",
    "colRequests": "Peticiones",
    "colTokens": "Tokens de entrada / salida",
    "colRemaining": "Restante del mes",
    "colMonthlyUsed": "Uso del mes",
    "colWeeklyUsed": "Uso de la semana",
    "modelsTitle": "Por modelo (estimación local)",
    "capsText": "texto",
    "capsImage": "imagen",
    "capsVideo": "video",
    "capsAudio": "audio",
    "capsPdf": "PDF",
    "capsTools": "herramientas",
    "capsReasoning": "razonamiento",
    "capsUnknown": "sin declarar",
    "free": "gratis",
    "unlimited": "ilimitado",
    "none": "—",
    "dialogTitle": "Uso de {label}",
    "dialogNote": "La API oficial solo informa estos tres periodos y no desglosa por modelo; el importe por modelo solo puede ser una estimación local.",
    "dialogProbe": "Sondear de nuevo",
    "close": "Cerrar",
    "probedAt": "Sondeado {time}",
    "resetsAt": "Se reinicia {time}",
    "usageError": "Error: {message}",
    "peakTitle": "Qué conviene más ahora mismo",
    "peakPlan": "Pagas ¥{price} al mes (${usd}) por el plan {plan} de OpenCode, y el plan te da ¥{allowance} (${allowanceUsd}) de consumo a precio oficial: un descuento de {discount}×, así que la misma petición te cuesta el {percent}% del precio oficial si va por OpenCode.",
    "peakNow": "La ruta oficial cobra el precio de lista directo. Ahora mismo OpenCode está {goPeak} y la API oficial está {officialPeak}{holiday}.",
    "peakGoPeak": "en hora pico (la cuota se consume al doble)",
    "peakGoOff": "fuera de hora pico",
    "peakOfficialPeak": "en hora pico (el precio se duplica)",
    "peakOfficialOff": "fuera de hora pico",
    "peakAtPeak": "hora pico",
    "peakOffPeak": "hora valle",
    "peakHoliday": " — hoy es festivo oficial en China: la API oficial cobra tarifa valle todo el día, mientras que OpenCode sigue cobrando pico",
    "peakExhausted": " Pero la cuota de este mes ya está agotada, así que solo queda la ruta oficial.",
    "peakGoPay": "OpenCode",
    "peakOfficialPay": "DeepSeek oficial",
    "peakVerdict": "Conclusión",
    "peakGoCheaper": "OpenCode sale {percent}% más barato",
    "peakFootnote": "Calculado por millón de tokens de salida (en una factura de código manda la salida), a ¥{fx} por dólar. Las horas pico solo cambian la rapidez con que se consume la cuota, no la conclusión: dentro de la cuota, OpenCode siempre sale más barato que la API oficial; las excepciones son que la cuota se agote o que el límite de un modelo concreto se acabe antes.",
    "footerOfficial": "Los porcentajes oficiales de 5 horas / semana / mes vienen de la API de OpenCode y describen la cuenta completa: el uso desde otros clientes u otras máquinas también cuenta.",
    "footerLocal": "El importe por modelo es una estimación local: solo cuenta el registro de sesiones de este harness, que es lo que permite ver el reparto por modelo; las llamadas de otras herramientas no dejan rastro local.",
    "footerPeakRule": "El importe se estima a tarifa valle, duplicada en hora pico para los modelos DeepSeek; los modelos gratuitos no se facturan.",
    "kindCacheRead": "entrada en caché",
    "kindInput": "entrada sin caché",
    "kindOutput": "salida",
    "colKind": "Concepto",
    "verdictGo": "Con OpenCode un {percent}% más barato",
    "verdictOfficial": "Con la API oficial un {percent}% más barato",
    "verdictExhausted": "Cuota mensual agotada: solo queda la API oficial",
    "colOpenCode": "OpenCode",
    "colOfficial": "DeepSeek oficial",
    "clockTitle": "Hora pico / valle ahora mismo",
    "clockPeak": "pico",
    "clockOff": "valle",
    "clockFlip": "{next} en {hours} h",
    "clockHoliday": "Hoy es festivo oficial en China, así que la API oficial cobra tarifa valle todo el día",
    "colRollingQuota": "Cuota de 5 horas",
    "capHintText": "Solo texto: entra texto plano, sale texto plano.",
    "capHintImage": "Entrada de imagen: entiende capturas, gráficos y maquetas de interfaz (JPEG/PNG/GIF/WebP).",
    "capHintVideo": "Entrada de vídeo: lee archivos de vídeo como mp4 y describe lo que ocurre en ellos.",
    "capHintAudio": "Entrada de audio: lee archivos de audio directamente.",
    "capHintPdf": "Entrada de PDF: lee documentos PDF sin convertirlos antes a texto.",
    "capHintTools": "Llamada a herramientas: el modelo puede llamar a las funciones que expone el harness (leer archivos, ejecutar comandos, buscar en la web, escribir código) y actuar con el resultado.",
    "capHintReasoning": "Razonamiento: el modelo piensa antes de responder; va mejor en tareas difíciles, pero es más lento y gasta más tokens.",
    "backToTop": "Volver arriba",
    "subscribe": "Suscribirse a OpenCode",
    "copyKey": "Copiar",
    "copied": "Copiado",
    "routeNow": "Ruta actual",
    "routeOpencode": "el pool de cuentas de OpenCode",
    "routeOfficial": "la suscripción de DeepSeek",
    "routeOpencodeHint": "Las peticiones van por OpenCode ({account}) y no gastan cuota de la suscripción.",
    "routeOfficialHint": "Las peticiones van directas a la API de DeepSeek y gastan cuota de la suscripción; el router vuelve cuando OpenCode esté estable.",
    "statusLocalTitle": "Sonda local",
    "statusCheckedAt": "sonda local {time}",
    "officialChip": "oficial {status}",
    "statusSwitchWhy": "Cambiar a la suscripción rodea OpenCode por completo; el router vuelve cuando OpenCode esté estable.",
    "switchNoticeTitle": "Cambiado a la suscripción de DeepSeek; la tarea sigue.",
    "switchNoticeBack": "De vuelta en la ruta de OpenCode; la tarea sigue.",
    "switchNoticeTime": "cambiado {time}",
    "switchNoticeClose": "Cerrar",
    "forceFallback": "Switch to the official subscription now",
    "forcePrimary": "Switch back to OpenCode",
    "forceFallbackHint": "Switches to the DeepSeek official API while OpenCode is failing; this consumes official credits.",
    "statusTitle": "Upstream status",
    "statusRefresh": "Refresh status",
    "statusRefreshing": "Refreshing…",
    "statusRefreshHint": "Probe OpenCode right now: re-read account usage and update the health state; during a fallback it also advances the recovery window.",
    "statusSince": "Since",
    "statusChecked": "Last probe",
    "statusStableWindow": "Stability window",
    "statusWindowLeft": "{remaining} left",
    "statusWindowDone": "stable for {stableFor}",
    "statusStateHealthy": "Healthy",
    "statusStateDegraded": "Degraded",
    "statusStateFallback": "On the official subscription",
    "statusStateRecovering": "Recovering",
    "statusStateUnknown": "Unknown",
    "statusHintHealthy": "OpenCode upstream is healthy: recent requests succeeded and traffic goes through the OpenCode account pool.",
    "statusHintRateLimit": "Upstream rate limit: OpenCode Go is answering 429 / rate limited for this account, so new requests in this window are refused (flash hits it most). Switching to the official subscription keeps the task running; these limits usually clear within minutes.",
    "statusHintCapacity": "Upstream overloaded: OpenCode’s serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused). The allowance is intact, but nothing new is accepted right now. Switch to the official subscription instead of letting the provider retry into a full cell.",
    "statusHintQuota": "Out of allowance: the current account’s 5-hour / weekly / monthly window is maxed out. Switch to the official subscription, or wait for the window to reset.",
    "statusHintAuth": "Authentication failed: OpenCode rejected this account’s key (401/403). Update the key in the account card below, or switch to the official subscription if the task cannot wait.",
    "statusHintError": "The upstream returned a non-quota error (network or server fault). Refresh once to see whether it was transient; if it repeats, switch to the official subscription.",
    "statusHintFallback": "Requests currently go to the DeepSeek official subscription, so the task keeps running on official credits. After OpenCode stays clean for {stable} minutes it switches back automatically.",
    "statusHintRecovering": "OpenCode answers probes again; the router is watching stability: {remaining} left. New requests stay on the official subscription meanwhile, so a half-recovered upstream cannot interrupt them.",
    "statusHintManual": "You switched to the official subscription by hand. It returns automatically once OpenCode stays clean for {stable} minutes, or click “Switch back to OpenCode”.",
    "statusHintUnknown": "No request samples yet: send one message, or press “Refresh status” to read the real state.",
    "statusBlockedPublished": "OpenCode still publishes this model as degraded, so the window has not started — a readable probe is not proof that inference works, and switching back into a rate limit is worse than waiting.",
    "statusBlockedProbe": "The last probe failed; the stability window restarted.",
    "statusFails": "{count} failure(s) this round",
    "statusNoFails": "no failures this round",
    "statusQuarantined": "model blocked until {time}",
    "statusSwitchOfficial": "Switch to the official subscription",
    "statusModelsTitle": "By model",
    "codeOk": "OK",
    "codeRateLimit": "rate limited",
    "codeCapacity": "overloaded",
    "codeQuota": "out of allowance",
    "codeAuth": "auth failed",
    "codeError": "error",
    "codeUnknown": "unknown",
    "errRateLimit": "Rate limited (429)",
    "errRateLimitHint": "Meaning: the request rate is over the limit — OpenCode throttles concurrency/frequency and flash hits it most. Fix: wait 1–10 minutes for the window to clear; or use another account in the pool; or click “Switch to the official subscription” and keep working.",
    "errCapacity": "Upstream overloaded (503/529)",
    "errCapacityHint": "Meaning: the serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused); allowance is intact but nothing new is accepted. Fix: switch to the official subscription; or retry in 1–2 minutes with less concurrency.",
    "errQuota": "Out of allowance",
    "errQuotaHint": "Meaning: the 5-hour / weekly / monthly window is maxed out. Fix: wait for the reset (the card shows a countdown), use another account, switch to the official subscription, or upgrade the plan.",
    "errPayment": "Payment required (402)",
    "errPaymentHint": "Meaning: the account is in arrears or locked. Fix: check billing at opencode.ai/console; switch to the official subscription if the task cannot wait.",
    "errAuth": "Auth failed (401/403)",
    "errAuthHint": "Meaning: the key was rejected (expired, reset, or truncated). Fix: re-enter it with “Edit key”, then press “Probe now” to verify; if it still fails, use another key or the official subscription.",
    "errMissingKey": "No key",
    "errMissingKeyHint": "Meaning: this account has no usable key, and the credential store has none either. Fix: paste a key into the account card, or delete the account.",
    "errSignIn": "Sign-in required",
    "errSignInHint": "Meaning: the account has to sign in again on the OpenCode console. Fix: sign in, generate a fresh key and paste it into the account card.",
    "errUpgrade": "Client upgrade required",
    "errUpgradeHint": "Meaning: the provider/plugin version is too old and the upstream no longer accepts it. Fix: upgrade dsh-opencode-routing (or the provider adapter) and restart the harness.",
    "errNotFound": "Model unavailable (404)",
    "errNotFoundHint": "Meaning: the model name does not exist on this plan or endpoint, or it was retired. Fix: check the model names under routes in cordis.patch.yml; or switch to the official subscription.",
    "errBadRequest": "Request rejected (400/422)",
    "errBadRequestHint": "Meaning: invalid parameters (image format, tool schema, oversized field). Fix: drop the suspicious attachment or tool and retry, try another model; the official subscription as a safety net.",
    "errContext": "Context too long",
    "errContextHint": "Meaning: input plus history exceed the model’s context window. Fix: compact or start a new chat, use a model with a larger window, or switch to the official subscription.",
    "errTimeout": "Timed out (408/504)",
    "errTimeoutHint": "Meaning: the upstream or the network did not answer in time. Fix: retry; check whether Clash/proxy is flapping; switch to the official subscription if it persists.",
    "errServer": "Server error (5xx)",
    "errServerHint": "Meaning: a fault on OpenCode’s side. Fix: retry in 1–2 minutes; if it keeps happening, switch to the official subscription instead of burning time on retries.",
    "errNetwork": "Network error",
    "errNetworkHint": "Meaning: connection reset, DNS failure or a broken proxy (ECONNRESET, ENOTFOUND, EAI_AGAIN, socket hang up). Fix: check Clash and DNS, retry; switch to the official subscription while the proxy is unstable.",
    "errFilter": "Blocked by content filter",
    "errFilterHint": "Meaning: the request or the reply tripped the upstream content filter. Fix: rephrase the prompt, drop the sensitive attachment, or use another model / the official subscription.",
    "errGeneric": "Unknown error",
    "errGenericHint": "Meaning: an upstream error outside the buckets above. Fix: read the kept raw message, refresh the status and retry; switch to the official subscription if it repeats.",
    "errRaw": "Raw: {message}",
    "errAdvice": "What to do",
    "errTable": "Error codes and fixes",
    "officialTitle": "OpenCode status",
    "officialRefresh": "Refresh status",
    "officialRefreshHint": "Re-reads status.opencode.ai (OpenCode refreshes it about once a minute) together with the local probe result.",
    "officialSource": "status.opencode.ai · updated {time}",
    "officialStale": "Stale reading (updated {age})",
    "officialUnavailable": "Could not read the published status: {error}",
    "officialOpenStatus": "Open the status page",
    "officialStatusOperational": "Operational",
    "officialStatusDegraded": "Degraded",
    "officialStatusOutage": "Outage",
    "officialStatusMaintenance": "Maintenance",
    "officialStatusUnknown": "Unknown",
    "officialHintOperational": "OpenCode reports everything operational: the Go plan and the inference gateway are fine, keep using the plan.",
    "officialHintPartial": "OpenCode has an overall degradation, but the model you are using is fine right now — keep going, and only switch to the official subscription if it actually stalls.",
    "officialHintUpstream": "The upstream provider is degraded — not your key and not your allowance, OpenCode says so itself. Switch to the official subscription and keep working until it clears.",
    "officialHintCapacity": "OpenCode reports it is at capacity: the allowance is intact but the serving cells are full. Switch to the official subscription instead of retrying in a loop.",
    "officialHintRateLimit": "OpenCode reports rate limiting: new requests are being refused. Switch to the official subscription; it usually clears within minutes.",
    "officialHintOutage": "OpenCode reports an outage: this service is down. Switch to the official subscription now or the turn will sit in retries.",
    "officialHintMaintenance": "OpenCode is in planned maintenance; it comes back when the window closes. Switch to the official subscription if you need to keep going.",
    "officialHintUnknown": "OpenCode did not give a reason this card understands — open the status page for the incident.",
    "officialModelsTitle": "Models you are using",
    "officialModelMissing": "not listed by OpenCode",
    "officialSpeed": "{ttft} ms first token · {tps} tok/s",
    "officialIncidentsTitle": "Open incidents",
    "officialNoIncidents": "No open incidents",
    "officialIncident": "open {age}",
    "officialReason": "reason: {reason}",
    "officialReasonUpstream": "upstream provider",
    "officialReasonNone": "none",
    "officialReasonCapacity": "capacity",
    "officialReasonRateLimit": "rate limit",
    "officialReasonOther": "other",
    "officialServiceGo": "Go plan",
    "officialServiceInference": "Inference API",
    "officialServicePayg": "Pay-as-you-go",
    "officialServiceFree": "Free inference",
  },
  "fr": {
    "title": "Comptes et usage OpenCode",
    "refresh": "Actualiser",
    "refreshing": "Actualisation…",
    "updatedAt": "Mis à jour {time}",
    "loadError": "Échec de lecture : {message}",
    "routerTitle": "Routage par quota",
    "modePrimary": "Routage normal",
    "modeFallback": "Repli sur l’abonnement officiel",
    "modeReason": "Motif : {reason}",
    "activeAccount": "Compte actif",
    "nextProbe": "Prochaine sonde",
    "probeAll": "Sonder maintenant",
    "resetMarks": "Effacer les marques de blocage",
    "resetHint": "Efface toutes les marques « quota épuisé / échec d’authentification » et renvoie aussitôt le routage vers le pool de comptes OpenCode. Les comptes et les clés ne sont pas modifiés.",
    "routerMissing": "Aucun routeur de quota détecté : le pool de comptes est en lecture seule.",
    "accountsTitle": "Pool de comptes",
    "accountsOrder": "Utilisés dans l’ordre : le compte suivant ne prend le relais qu’une fois le précédent à sec.",
    "addAccount": "Ajouter un compte",
    "labelPlaceholder": "Libellé (facultatif, ex. alt A)",
    "keyPlaceholder": "oc_sk_…",
    "addAndProbe": "Ajouter et sonder",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "setActive": "Définir comme actif",
    "disable": "Désactiver",
    "enable": "Activer",
    "editKey": "Changer la clé",
    "remove": "Supprimer",
    "viewUsage": "Voir l’usage",
    "keyUpdated": "Clé mise à jour",
    "accountAdded": "Compte ajouté et sondé",
    "shortKey": "Clé incomplète : 8 caractères minimum",
    "keepOne": "Gardez au moins un compte",
    "notConfigured": "Non défini",
    "readonly": "lecture seule",
    "newKeyFor": "La nouvelle clé est écrite dans {ref}",
    "noAccounts": "Aucun compte pour l’instant. Ajoutez une clé pour commencer.",
    "statusReady": "Disponible",
    "statusExhausted": "Quota épuisé",
    "statusAuth": "Échec d’authentification",
    "statusDisabled": "Désactivé",
    "statusMissing": "Sans clé",
    "statusError": "Échec de la sonde",
    "statusActive": "Utilisé",
    "statusSpare": "Secours",
    "statusCurrent": "actuel",
    "colIndex": "#",
    "colAccount": "Compte",
    "colKey": "Clé",
    "colRolling": "5 heures",
    "colWeekly": "Cette semaine",
    "colMonthly": "Ce mois",
    "colStatus": "État",
    "colActions": "Actions",
    "colModel": "Modèle",
    "colCaps": "Modalité",
    "colRequests": "Requêtes",
    "colTokens": "Tokens entrée / sortie",
    "colRemaining": "Reste ce mois",
    "colMonthlyUsed": "Usage du mois",
    "colWeeklyUsed": "Usage de la semaine",
    "modelsTitle": "Par modèle (estimation locale)",
    "capsText": "texte",
    "capsImage": "image",
    "capsVideo": "vidéo",
    "capsAudio": "audio",
    "capsPdf": "PDF",
    "capsTools": "outils",
    "capsReasoning": "raisonnement",
    "capsUnknown": "non déclaré",
    "free": "gratuit",
    "unlimited": "illimité",
    "none": "—",
    "dialogTitle": "Usage de {label}",
    "dialogNote": "L’API officielle ne renvoie que ces trois fenêtres, sans détail par modèle ; le montant par modèle ne peut être qu’une estimation locale.",
    "dialogProbe": "Sonder à nouveau",
    "close": "Fermer",
    "probedAt": "Sondé {time}",
    "resetsAt": "Réinitialisation {time}",
    "usageError": "Erreur : {message}",
    "peakTitle": "La route la moins chère maintenant",
    "peakPlan": "Vous payez ¥{price}/mois (${usd}) pour le forfait OpenCode {plan}, et le forfait vous ouvre ¥{allowance} (${allowanceUsd}) d’usage au prix officiel — soit un rabais de {discount}× : la même requête ne vous coûte que {percent}% du prix officiel en passant par OpenCode.",
    "peakNow": "La route officielle facture le prix catalogue. En ce moment OpenCode est {goPeak} et l’API officielle est {officialPeak}{holiday}.",
    "peakGoPeak": "en heures pleines (le quota se consomme deux fois plus vite)",
    "peakGoOff": "en heures creuses",
    "peakOfficialPeak": "en heures pleines (le prix double)",
    "peakOfficialOff": "en heures creuses",
    "peakAtPeak": "heures pleines",
    "peakOffPeak": "heures creuses",
    "peakHoliday": " — aujourd’hui est un jour férié officiel en Chine : l’API officielle facture en heures creuses toute la journée, alors qu’OpenCode reste en heures pleines",
    "peakExhausted": " Mais le quota de ce mois est déjà épuisé : il ne reste que la route officielle.",
    "peakGoPay": "OpenCode",
    "peakOfficialPay": "DeepSeek officiel",
    "peakVerdict": "Verdict",
    "peakGoCheaper": "OpenCode coûte {percent}% de moins",
    "peakFootnote": "Pour 1 M de tokens en sortie (la sortie domine une facture de code), au taux de ¥{fx} pour 1 $. Les heures pleines ne changent que la vitesse à laquelle le quota se consomme, pas la conclusion : tant qu’il reste du quota, OpenCode reste moins cher que l’API officielle ; les exceptions sont un quota épuisé ou un modèle dont le plafond tombe en premier.",
    "footerOfficial": "Les pourcentages officiels 5 heures / semaine / mois viennent de l’API OpenCode et décrivent le compte entier : l’usage d’autres clients ou d’autres machines compte aussi.",
    "footerLocal": "Le montant par modèle est une estimation locale : seuls les journaux de session de ce harness sont comptés, ce qui permet de voir la répartition par modèle ; les appels des autres outils ne laissent aucune trace locale.",
    "footerPeakRule": "Le montant est estimé au tarif heures creuses, doublé en heures pleines pour les modèles DeepSeek ; les modèles gratuits ne sont pas facturés.",
    "kindCacheRead": "entrée en cache",
    "kindInput": "entrée hors cache",
    "kindOutput": "sortie",
    "colKind": "Poste",
    "verdictGo": "{percent}% moins cher via OpenCode",
    "verdictOfficial": "{percent}% moins cher via l’API officielle",
    "verdictExhausted": "Quota mensuel épuisé — il ne reste que l’API officielle",
    "colOpenCode": "OpenCode",
    "colOfficial": "DeepSeek officiel",
    "clockTitle": "Heures pleines / creuses en ce moment",
    "clockPeak": "heures pleines",
    "clockOff": "heures creuses",
    "clockFlip": "{next} dans {hours} h",
    "clockHoliday": "Jour férié officiel en Chine aujourd’hui : l’API officielle facture en heures creuses toute la journée",
    "colRollingQuota": "Quota de 5 heures",
    "capHintText": "Texte seul : du texte simple en entrée, du texte simple en sortie.",
    "capHintImage": "Entrée image : comprend les captures d’écran, les graphiques et les maquettes d’interface (JPEG/PNG/GIF/WebP).",
    "capHintVideo": "Entrée vidéo : lit les fichiers vidéo comme mp4 et décrit ce qui s’y passe.",
    "capHintAudio": "Entrée audio : lit directement les fichiers audio.",
    "capHintPdf": "Entrée PDF : lit les documents PDF sans les convertir d’abord en texte.",
    "capHintTools": "Appel d’outils : le modèle peut appeler les fonctions exposées par le harness (lire des fichiers, lancer des commandes, chercher sur le web, écrire du code) et exploiter les résultats.",
    "capHintReasoning": "Raisonnement : le modèle réfléchit avant de répondre ; plus fort sur les tâches difficiles, mais plus lent et plus gourmand en tokens.",
    "backToTop": "Retour en haut",
    "subscribe": "S’abonner à OpenCode",
    "copyKey": "Copier",
    "copied": "Copié",
    "routeNow": "Route actuelle",
    "routeOpencode": "le pool de comptes OpenCode",
    "routeOfficial": "l'abonnement DeepSeek",
    "routeOpencodeHint": "Les requêtes passent par OpenCode ({account}) et ne consomment pas le quota de l'abonnement.",
    "routeOfficialHint": "Les requêtes vont directement à l'API DeepSeek et consomment le quota de l'abonnement ; le routeur revient dès qu'OpenCode est stable.",
    "statusLocalTitle": "Sonde locale",
    "statusCheckedAt": "sonde locale {time}",
    "officialChip": "officiel {status}",
    "statusSwitchWhy": "Basculer sur l'abonnement contourne entièrement OpenCode ; le routeur revient dès qu'OpenCode est stable.",
    "switchNoticeTitle": "Basculé sur l'abonnement DeepSeek ; la tâche continue.",
    "switchNoticeBack": "De retour sur la route OpenCode ; la tâche continue.",
    "switchNoticeTime": "basculé {time}",
    "switchNoticeClose": "Fermer",
    "forceFallback": "Switch to the official subscription now",
    "forcePrimary": "Switch back to OpenCode",
    "forceFallbackHint": "Switches to the DeepSeek official API while OpenCode is failing; this consumes official credits.",
    "statusTitle": "Upstream status",
    "statusRefresh": "Refresh status",
    "statusRefreshing": "Refreshing…",
    "statusRefreshHint": "Probe OpenCode right now: re-read account usage and update the health state; during a fallback it also advances the recovery window.",
    "statusSince": "Since",
    "statusChecked": "Last probe",
    "statusStableWindow": "Stability window",
    "statusWindowLeft": "{remaining} left",
    "statusWindowDone": "stable for {stableFor}",
    "statusStateHealthy": "Healthy",
    "statusStateDegraded": "Degraded",
    "statusStateFallback": "On the official subscription",
    "statusStateRecovering": "Recovering",
    "statusStateUnknown": "Unknown",
    "statusHintHealthy": "OpenCode upstream is healthy: recent requests succeeded and traffic goes through the OpenCode account pool.",
    "statusHintRateLimit": "Upstream rate limit: OpenCode Go is answering 429 / rate limited for this account, so new requests in this window are refused (flash hits it most). Switching to the official subscription keeps the task running; these limits usually clear within minutes.",
    "statusHintCapacity": "Upstream overloaded: OpenCode’s serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused). The allowance is intact, but nothing new is accepted right now. Switch to the official subscription instead of letting the provider retry into a full cell.",
    "statusHintQuota": "Out of allowance: the current account’s 5-hour / weekly / monthly window is maxed out. Switch to the official subscription, or wait for the window to reset.",
    "statusHintAuth": "Authentication failed: OpenCode rejected this account’s key (401/403). Update the key in the account card below, or switch to the official subscription if the task cannot wait.",
    "statusHintError": "The upstream returned a non-quota error (network or server fault). Refresh once to see whether it was transient; if it repeats, switch to the official subscription.",
    "statusHintFallback": "Requests currently go to the DeepSeek official subscription, so the task keeps running on official credits. After OpenCode stays clean for {stable} minutes it switches back automatically.",
    "statusHintRecovering": "OpenCode answers probes again; the router is watching stability: {remaining} left. New requests stay on the official subscription meanwhile, so a half-recovered upstream cannot interrupt them.",
    "statusHintManual": "You switched to the official subscription by hand. It returns automatically once OpenCode stays clean for {stable} minutes, or click “Switch back to OpenCode”.",
    "statusHintUnknown": "No request samples yet: send one message, or press “Refresh status” to read the real state.",
    "statusBlockedPublished": "OpenCode still publishes this model as degraded, so the window has not started — a readable probe is not proof that inference works, and switching back into a rate limit is worse than waiting.",
    "statusBlockedProbe": "The last probe failed; the stability window restarted.",
    "statusFails": "{count} failure(s) this round",
    "statusNoFails": "no failures this round",
    "statusQuarantined": "model blocked until {time}",
    "statusSwitchOfficial": "Switch to the official subscription",
    "statusModelsTitle": "By model",
    "codeOk": "OK",
    "codeRateLimit": "rate limited",
    "codeCapacity": "overloaded",
    "codeQuota": "out of allowance",
    "codeAuth": "auth failed",
    "codeError": "error",
    "codeUnknown": "unknown",
    "errRateLimit": "Rate limited (429)",
    "errRateLimitHint": "Meaning: the request rate is over the limit — OpenCode throttles concurrency/frequency and flash hits it most. Fix: wait 1–10 minutes for the window to clear; or use another account in the pool; or click “Switch to the official subscription” and keep working.",
    "errCapacity": "Upstream overloaded (503/529)",
    "errCapacityHint": "Meaning: the serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused); allowance is intact but nothing new is accepted. Fix: switch to the official subscription; or retry in 1–2 minutes with less concurrency.",
    "errQuota": "Out of allowance",
    "errQuotaHint": "Meaning: the 5-hour / weekly / monthly window is maxed out. Fix: wait for the reset (the card shows a countdown), use another account, switch to the official subscription, or upgrade the plan.",
    "errPayment": "Payment required (402)",
    "errPaymentHint": "Meaning: the account is in arrears or locked. Fix: check billing at opencode.ai/console; switch to the official subscription if the task cannot wait.",
    "errAuth": "Auth failed (401/403)",
    "errAuthHint": "Meaning: the key was rejected (expired, reset, or truncated). Fix: re-enter it with “Edit key”, then press “Probe now” to verify; if it still fails, use another key or the official subscription.",
    "errMissingKey": "No key",
    "errMissingKeyHint": "Meaning: this account has no usable key, and the credential store has none either. Fix: paste a key into the account card, or delete the account.",
    "errSignIn": "Sign-in required",
    "errSignInHint": "Meaning: the account has to sign in again on the OpenCode console. Fix: sign in, generate a fresh key and paste it into the account card.",
    "errUpgrade": "Client upgrade required",
    "errUpgradeHint": "Meaning: the provider/plugin version is too old and the upstream no longer accepts it. Fix: upgrade dsh-opencode-routing (or the provider adapter) and restart the harness.",
    "errNotFound": "Model unavailable (404)",
    "errNotFoundHint": "Meaning: the model name does not exist on this plan or endpoint, or it was retired. Fix: check the model names under routes in cordis.patch.yml; or switch to the official subscription.",
    "errBadRequest": "Request rejected (400/422)",
    "errBadRequestHint": "Meaning: invalid parameters (image format, tool schema, oversized field). Fix: drop the suspicious attachment or tool and retry, try another model; the official subscription as a safety net.",
    "errContext": "Context too long",
    "errContextHint": "Meaning: input plus history exceed the model’s context window. Fix: compact or start a new chat, use a model with a larger window, or switch to the official subscription.",
    "errTimeout": "Timed out (408/504)",
    "errTimeoutHint": "Meaning: the upstream or the network did not answer in time. Fix: retry; check whether Clash/proxy is flapping; switch to the official subscription if it persists.",
    "errServer": "Server error (5xx)",
    "errServerHint": "Meaning: a fault on OpenCode’s side. Fix: retry in 1–2 minutes; if it keeps happening, switch to the official subscription instead of burning time on retries.",
    "errNetwork": "Network error",
    "errNetworkHint": "Meaning: connection reset, DNS failure or a broken proxy (ECONNRESET, ENOTFOUND, EAI_AGAIN, socket hang up). Fix: check Clash and DNS, retry; switch to the official subscription while the proxy is unstable.",
    "errFilter": "Blocked by content filter",
    "errFilterHint": "Meaning: the request or the reply tripped the upstream content filter. Fix: rephrase the prompt, drop the sensitive attachment, or use another model / the official subscription.",
    "errGeneric": "Unknown error",
    "errGenericHint": "Meaning: an upstream error outside the buckets above. Fix: read the kept raw message, refresh the status and retry; switch to the official subscription if it repeats.",
    "errRaw": "Raw: {message}",
    "errAdvice": "What to do",
    "errTable": "Error codes and fixes",
    "officialTitle": "OpenCode status",
    "officialRefresh": "Refresh status",
    "officialRefreshHint": "Re-reads status.opencode.ai (OpenCode refreshes it about once a minute) together with the local probe result.",
    "officialSource": "status.opencode.ai · updated {time}",
    "officialStale": "Stale reading (updated {age})",
    "officialUnavailable": "Could not read the published status: {error}",
    "officialOpenStatus": "Open the status page",
    "officialStatusOperational": "Operational",
    "officialStatusDegraded": "Degraded",
    "officialStatusOutage": "Outage",
    "officialStatusMaintenance": "Maintenance",
    "officialStatusUnknown": "Unknown",
    "officialHintOperational": "OpenCode reports everything operational: the Go plan and the inference gateway are fine, keep using the plan.",
    "officialHintPartial": "OpenCode has an overall degradation, but the model you are using is fine right now — keep going, and only switch to the official subscription if it actually stalls.",
    "officialHintUpstream": "The upstream provider is degraded — not your key and not your allowance, OpenCode says so itself. Switch to the official subscription and keep working until it clears.",
    "officialHintCapacity": "OpenCode reports it is at capacity: the allowance is intact but the serving cells are full. Switch to the official subscription instead of retrying in a loop.",
    "officialHintRateLimit": "OpenCode reports rate limiting: new requests are being refused. Switch to the official subscription; it usually clears within minutes.",
    "officialHintOutage": "OpenCode reports an outage: this service is down. Switch to the official subscription now or the turn will sit in retries.",
    "officialHintMaintenance": "OpenCode is in planned maintenance; it comes back when the window closes. Switch to the official subscription if you need to keep going.",
    "officialHintUnknown": "OpenCode did not give a reason this card understands — open the status page for the incident.",
    "officialModelsTitle": "Models you are using",
    "officialModelMissing": "not listed by OpenCode",
    "officialSpeed": "{ttft} ms first token · {tps} tok/s",
    "officialIncidentsTitle": "Open incidents",
    "officialNoIncidents": "No open incidents",
    "officialIncident": "open {age}",
    "officialReason": "reason: {reason}",
    "officialReasonUpstream": "upstream provider",
    "officialReasonNone": "none",
    "officialReasonCapacity": "capacity",
    "officialReasonRateLimit": "rate limit",
    "officialReasonOther": "other",
    "officialServiceGo": "Go plan",
    "officialServiceInference": "Inference API",
    "officialServicePayg": "Pay-as-you-go",
    "officialServiceFree": "Free inference",
  },
  "ja": {
    "title": "OpenCode アカウントと使用量",
    "refresh": "更新",
    "refreshing": "更新中…",
    "updatedAt": "{time} に更新",
    "loadError": "読み込みに失敗しました: {message}",
    "routerTitle": "クォータルーティング",
    "modePrimary": "通常ルーティング",
    "modeFallback": "公式サブスクへフォールバック済み",
    "modeReason": "理由: {reason}",
    "activeAccount": "現在のアカウント",
    "nextProbe": "次回の確認",
    "probeAll": "今すぐ確認",
    "resetMarks": "ブロック記録をリセット",
    "resetHint": "「クォータ切れ / 認証失敗」の記録をすべて消し、ルーティングをすぐに OpenCode のアカウントプールへ戻します。アカウントもキーも変更しません。",
    "routerMissing": "クォータルーティングが見つかりません。アカウントプールは読み取り専用です。",
    "accountsTitle": "アカウントプール",
    "accountsOrder": "上から順に使用します。前のアカウントを使い切ってから次に切り替わります。",
    "addAccount": "アカウントを追加",
    "labelPlaceholder": "ラベル（任意、例: サブ A）",
    "keyPlaceholder": "oc_sk_…",
    "addAndProbe": "追加して確認",
    "save": "保存",
    "cancel": "キャンセル",
    "setActive": "現在のアカウントにする",
    "disable": "無効化",
    "enable": "有効化",
    "editKey": "キーを変更",
    "remove": "削除",
    "viewUsage": "使用量を見る",
    "keyUpdated": "キーを更新しました",
    "accountAdded": "アカウントを追加して確認しました",
    "shortKey": "キーが不完全です: 8 文字以上必要です",
    "keepOne": "アカウントは 1 つ以上必要です",
    "notConfigured": "未設定",
    "readonly": "読み取り専用",
    "newKeyFor": "新しいキーの保存先: {ref}",
    "noAccounts": "アカウントがまだありません。キーを 1 つ入れれば始められます。",
    "statusReady": "利用可能",
    "statusExhausted": "クォータ切れ",
    "statusAuth": "認証失敗",
    "statusDisabled": "無効",
    "statusMissing": "キー未設定",
    "statusError": "読み込み失敗",
    "statusActive": "使用中",
    "statusSpare": "予備",
    "statusCurrent": "現在",
    "colIndex": "#",
    "colAccount": "アカウント",
    "colKey": "キー",
    "colRolling": "5 時間",
    "colWeekly": "今週",
    "colMonthly": "今月",
    "colStatus": "状態",
    "colActions": "操作",
    "colModel": "モデル",
    "colCaps": "モダリティ",
    "colRequests": "リクエスト",
    "colTokens": "入力 / 出力トークン",
    "colRemaining": "今月の残り",
    "colMonthlyUsed": "今月の使用量",
    "colWeeklyUsed": "今週の使用量",
    "modelsTitle": "モデル別（ローカル推定）",
    "capsText": "テキスト",
    "capsImage": "画像",
    "capsVideo": "動画",
    "capsAudio": "音声",
    "capsPdf": "PDF",
    "capsTools": "ツール",
    "capsReasoning": "推論",
    "capsUnknown": "未申告",
    "free": "無料",
    "unlimited": "無制限",
    "none": "—",
    "dialogTitle": "{label} の使用量",
    "dialogNote": "公式 API が返すのはこの 3 つの期間の割合だけで、モデル別の内訳はありません。モデル別の金額はローカル推定にすぎません。",
    "dialogProbe": "再確認",
    "close": "閉じる",
    "probedAt": "{time} に確認",
    "resetsAt": "{time} にリセット",
    "usageError": "エラー: {message}",
    "peakTitle": "いまはどちらが得か",
    "peakPlan": "OpenCode の {plan} プランに月 ¥{price}（${usd}）を支払うと、公式価格換算で ¥{allowance}（${allowanceUsd}）分のクォータが付きます。クォータは公式価格で差し引かれるので実質 {discount} 割の支払い、つまり同じリクエストを OpenCode 経由にすると公式価格の {percent}% で済みます。",
    "peakNow": "公式に直結すると公式価格での支払いになります。いま OpenCode は{goPeak}、公式は{officialPeak}{holiday}。",
    "peakGoPeak": "ピーク時間（クォータ消費 2 倍）",
    "peakGoOff": "オフピーク",
    "peakOfficialPeak": "ピーク時間（価格 2 倍）",
    "peakOfficialOff": "オフピーク",
    "peakAtPeak": "ピーク",
    "peakOffPeak": "オフピーク",
    "peakHoliday": " — 今日は中国の祝日なので、一日中オフピーク、OpenCode はピークのままです",
    "peakExhausted": "ただし今月のクォータはすでに使い切っているため、公式を使うしかありません。",
    "peakGoPay": "OpenCode",
    "peakOfficialPay": "DeepSeek 公式",
    "peakVerdict": "結論",
    "peakGoCheaper": "OpenCode のほうが {percent}% 安い",
    "peakFootnote": "出力 100 万トークンあたりに換算（コーディングの請求はほとんどが出力由来）、レートは ¥{fx}/$。ピークとオフピークはクォータの減る速さに影響するだけで、結論は変わりません。クォータの範囲内なら OpenCode 経由のほうが公式直結より常に安く、例外はクォータを使い切った場合と、特定モデルの上限に先に達した場合です。",
    "footerOfficial": "上の「公式 5 時間 / 今週 / 今月」の割合は OpenCode の API が返す実際のアカウント使用量で、他のクライアントや別のマシンからの利用も含まれます。",
    "footerLocal": "モデル別の金額はローカル推定です。この harness のセッションログだけを集計してモデル別の内訳を出すもので、他のツールからの呼び出しはローカルに記録されません。",
    "footerPeakRule": "金額はオフピーク価格で見積もり、DeepSeek モデルはピーク時に 2 倍で計算します。無料モデルは課金されません。",
    "kindCacheRead": "キャッシュ済み入力",
    "kindInput": "未キャッシュ入力",
    "kindOutput": "出力",
    "colKind": "課金項目",
    "verdictGo": "OpenCode 経由が {percent}% 安い",
    "verdictOfficial": "公式 API 経由が {percent}% 安い",
    "verdictExhausted": "今月の枠を使い切ったため公式 API のみ",
    "colOpenCode": "OpenCode",
    "colOfficial": "DeepSeek 公式",
    "clockTitle": "現在のピーク / オフピーク",
    "clockPeak": "ピーク",
    "clockOff": "オフピーク",
    "clockFlip": "{next}まであと {hours} 時間",
    "clockHoliday": "今日は中国の祝日なので、公式 API は一日中オフピークの料金になります",
    "colRollingQuota": "5 時間の枠",
    "capHintText": "テキストのみ: プレーンテキストを入力し、プレーンテキストを返します。",
    "capHintImage": "画像入力: スクリーンショット、グラフ、UI モックアップを理解します（JPEG/PNG/GIF/WebP）。",
    "capHintVideo": "動画入力: mp4 などの動画ファイルを読み、中で何が起きているかを説明できます。",
    "capHintAudio": "音声入力: 音声ファイルをそのまま読み取ります。",
    "capHintPdf": "PDF 入力: PDF 文書をテキストに変換せずにそのまま読み取ります。",
    "capHintTools": "ツール呼び出し: harness が公開している関数（ファイル読み取り、コマンド実行、Web 検索、コード記述）を呼び出し、その結果を使って動けます。",
    "capHintReasoning": "推論: 答える前に考えるため難しいタスクに強い反面、遅く、トークンも多く消費します。",
    "backToTop": "トップへ戻る",
    "subscribe": "OpenCode を購読する",
    "copyKey": "コピー",
    "copied": "コピーしました",
    "routeNow": "現在のルート",
    "routeOpencode": "OpenCode のアカウントプール",
    "routeOfficial": "DeepSeek 公式サブスク",
    "routeOpencodeHint": "リクエストは OpenCode（{account}）経由で、公式サブスクの枠を消費しません。",
    "routeOfficialHint": "リクエストは DeepSeek 公式 API に直接送られ、公式サブスクの枠を消費します。OpenCode が安定すると自動で戻ります。",
    "statusLocalTitle": "ローカル疎通確認",
    "statusCheckedAt": "ローカル確認 {time}",
    "officialChip": "公式 {status}",
    "statusSwitchWhy": "公式サブスクに切り替えると OpenCode を完全に迂回できます。OpenCode が安定すると自動で戻ります。",
    "switchNoticeTitle": "DeepSeek 公式サブスクに切り替えました。タスクは継続します。",
    "switchNoticeBack": "OpenCode ルートに戻しました。タスクは継続します。",
    "switchNoticeTime": "{time} に切り替え",
    "switchNoticeClose": "閉じる",
    "forceFallback": "Switch to the official subscription now",
    "forcePrimary": "Switch back to OpenCode",
    "forceFallbackHint": "Switches to the DeepSeek official API while OpenCode is failing; this consumes official credits.",
    "statusTitle": "Upstream status",
    "statusRefresh": "Refresh status",
    "statusRefreshing": "Refreshing…",
    "statusRefreshHint": "Probe OpenCode right now: re-read account usage and update the health state; during a fallback it also advances the recovery window.",
    "statusSince": "Since",
    "statusChecked": "Last probe",
    "statusStableWindow": "Stability window",
    "statusWindowLeft": "{remaining} left",
    "statusWindowDone": "stable for {stableFor}",
    "statusStateHealthy": "Healthy",
    "statusStateDegraded": "Degraded",
    "statusStateFallback": "On the official subscription",
    "statusStateRecovering": "Recovering",
    "statusStateUnknown": "Unknown",
    "statusHintHealthy": "OpenCode upstream is healthy: recent requests succeeded and traffic goes through the OpenCode account pool.",
    "statusHintRateLimit": "Upstream rate limit: OpenCode Go is answering 429 / rate limited for this account, so new requests in this window are refused (flash hits it most). Switching to the official subscription keeps the task running; these limits usually clear within minutes.",
    "statusHintCapacity": "Upstream overloaded: OpenCode’s serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused). The allowance is intact, but nothing new is accepted right now. Switch to the official subscription instead of letting the provider retry into a full cell.",
    "statusHintQuota": "Out of allowance: the current account’s 5-hour / weekly / monthly window is maxed out. Switch to the official subscription, or wait for the window to reset.",
    "statusHintAuth": "Authentication failed: OpenCode rejected this account’s key (401/403). Update the key in the account card below, or switch to the official subscription if the task cannot wait.",
    "statusHintError": "The upstream returned a non-quota error (network or server fault). Refresh once to see whether it was transient; if it repeats, switch to the official subscription.",
    "statusHintFallback": "Requests currently go to the DeepSeek official subscription, so the task keeps running on official credits. After OpenCode stays clean for {stable} minutes it switches back automatically.",
    "statusHintRecovering": "OpenCode answers probes again; the router is watching stability: {remaining} left. New requests stay on the official subscription meanwhile, so a half-recovered upstream cannot interrupt them.",
    "statusHintManual": "You switched to the official subscription by hand. It returns automatically once OpenCode stays clean for {stable} minutes, or click “Switch back to OpenCode”.",
    "statusHintUnknown": "No request samples yet: send one message, or press “Refresh status” to read the real state.",
    "statusBlockedPublished": "OpenCode still publishes this model as degraded, so the window has not started — a readable probe is not proof that inference works, and switching back into a rate limit is worse than waiting.",
    "statusBlockedProbe": "The last probe failed; the stability window restarted.",
    "statusFails": "{count} failure(s) this round",
    "statusNoFails": "no failures this round",
    "statusQuarantined": "model blocked until {time}",
    "statusSwitchOfficial": "Switch to the official subscription",
    "statusModelsTitle": "By model",
    "codeOk": "OK",
    "codeRateLimit": "rate limited",
    "codeCapacity": "overloaded",
    "codeQuota": "out of allowance",
    "codeAuth": "auth failed",
    "codeError": "error",
    "codeUnknown": "unknown",
    "errRateLimit": "Rate limited (429)",
    "errRateLimitHint": "Meaning: the request rate is over the limit — OpenCode throttles concurrency/frequency and flash hits it most. Fix: wait 1–10 minutes for the window to clear; or use another account in the pool; or click “Switch to the official subscription” and keep working.",
    "errCapacity": "Upstream overloaded (503/529)",
    "errCapacityHint": "Meaning: the serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused); allowance is intact but nothing new is accepted. Fix: switch to the official subscription; or retry in 1–2 minutes with less concurrency.",
    "errQuota": "Out of allowance",
    "errQuotaHint": "Meaning: the 5-hour / weekly / monthly window is maxed out. Fix: wait for the reset (the card shows a countdown), use another account, switch to the official subscription, or upgrade the plan.",
    "errPayment": "Payment required (402)",
    "errPaymentHint": "Meaning: the account is in arrears or locked. Fix: check billing at opencode.ai/console; switch to the official subscription if the task cannot wait.",
    "errAuth": "Auth failed (401/403)",
    "errAuthHint": "Meaning: the key was rejected (expired, reset, or truncated). Fix: re-enter it with “Edit key”, then press “Probe now” to verify; if it still fails, use another key or the official subscription.",
    "errMissingKey": "No key",
    "errMissingKeyHint": "Meaning: this account has no usable key, and the credential store has none either. Fix: paste a key into the account card, or delete the account.",
    "errSignIn": "Sign-in required",
    "errSignInHint": "Meaning: the account has to sign in again on the OpenCode console. Fix: sign in, generate a fresh key and paste it into the account card.",
    "errUpgrade": "Client upgrade required",
    "errUpgradeHint": "Meaning: the provider/plugin version is too old and the upstream no longer accepts it. Fix: upgrade dsh-opencode-routing (or the provider adapter) and restart the harness.",
    "errNotFound": "Model unavailable (404)",
    "errNotFoundHint": "Meaning: the model name does not exist on this plan or endpoint, or it was retired. Fix: check the model names under routes in cordis.patch.yml; or switch to the official subscription.",
    "errBadRequest": "Request rejected (400/422)",
    "errBadRequestHint": "Meaning: invalid parameters (image format, tool schema, oversized field). Fix: drop the suspicious attachment or tool and retry, try another model; the official subscription as a safety net.",
    "errContext": "Context too long",
    "errContextHint": "Meaning: input plus history exceed the model’s context window. Fix: compact or start a new chat, use a model with a larger window, or switch to the official subscription.",
    "errTimeout": "Timed out (408/504)",
    "errTimeoutHint": "Meaning: the upstream or the network did not answer in time. Fix: retry; check whether Clash/proxy is flapping; switch to the official subscription if it persists.",
    "errServer": "Server error (5xx)",
    "errServerHint": "Meaning: a fault on OpenCode’s side. Fix: retry in 1–2 minutes; if it keeps happening, switch to the official subscription instead of burning time on retries.",
    "errNetwork": "Network error",
    "errNetworkHint": "Meaning: connection reset, DNS failure or a broken proxy (ECONNRESET, ENOTFOUND, EAI_AGAIN, socket hang up). Fix: check Clash and DNS, retry; switch to the official subscription while the proxy is unstable.",
    "errFilter": "Blocked by content filter",
    "errFilterHint": "Meaning: the request or the reply tripped the upstream content filter. Fix: rephrase the prompt, drop the sensitive attachment, or use another model / the official subscription.",
    "errGeneric": "Unknown error",
    "errGenericHint": "Meaning: an upstream error outside the buckets above. Fix: read the kept raw message, refresh the status and retry; switch to the official subscription if it repeats.",
    "errRaw": "Raw: {message}",
    "errAdvice": "What to do",
    "errTable": "Error codes and fixes",
    "officialTitle": "OpenCode status",
    "officialRefresh": "Refresh status",
    "officialRefreshHint": "Re-reads status.opencode.ai (OpenCode refreshes it about once a minute) together with the local probe result.",
    "officialSource": "status.opencode.ai · updated {time}",
    "officialStale": "Stale reading (updated {age})",
    "officialUnavailable": "Could not read the published status: {error}",
    "officialOpenStatus": "Open the status page",
    "officialStatusOperational": "Operational",
    "officialStatusDegraded": "Degraded",
    "officialStatusOutage": "Outage",
    "officialStatusMaintenance": "Maintenance",
    "officialStatusUnknown": "Unknown",
    "officialHintOperational": "OpenCode reports everything operational: the Go plan and the inference gateway are fine, keep using the plan.",
    "officialHintPartial": "OpenCode has an overall degradation, but the model you are using is fine right now — keep going, and only switch to the official subscription if it actually stalls.",
    "officialHintUpstream": "The upstream provider is degraded — not your key and not your allowance, OpenCode says so itself. Switch to the official subscription and keep working until it clears.",
    "officialHintCapacity": "OpenCode reports it is at capacity: the allowance is intact but the serving cells are full. Switch to the official subscription instead of retrying in a loop.",
    "officialHintRateLimit": "OpenCode reports rate limiting: new requests are being refused. Switch to the official subscription; it usually clears within minutes.",
    "officialHintOutage": "OpenCode reports an outage: this service is down. Switch to the official subscription now or the turn will sit in retries.",
    "officialHintMaintenance": "OpenCode is in planned maintenance; it comes back when the window closes. Switch to the official subscription if you need to keep going.",
    "officialHintUnknown": "OpenCode did not give a reason this card understands — open the status page for the incident.",
    "officialModelsTitle": "Models you are using",
    "officialModelMissing": "not listed by OpenCode",
    "officialSpeed": "{ttft} ms first token · {tps} tok/s",
    "officialIncidentsTitle": "Open incidents",
    "officialNoIncidents": "No open incidents",
    "officialIncident": "open {age}",
    "officialReason": "reason: {reason}",
    "officialReasonUpstream": "upstream provider",
    "officialReasonNone": "none",
    "officialReasonCapacity": "capacity",
    "officialReasonRateLimit": "rate limit",
    "officialReasonOther": "other",
    "officialServiceGo": "Go plan",
    "officialServiceInference": "Inference API",
    "officialServicePayg": "Pay-as-you-go",
    "officialServiceFree": "Free inference",
  },
  "ko": {
    "title": "OpenCode 계정 및 사용량",
    "refresh": "새로고침",
    "refreshing": "새로고침 중…",
    "updatedAt": "{time}에 업데이트",
    "loadError": "불러오지 못했습니다: {message}",
    "routerTitle": "할당량 라우팅",
    "modePrimary": "정상 라우팅",
    "modeFallback": "공식 구독으로 폴백됨",
    "modeReason": "이유: {reason}",
    "activeAccount": "현재 계정",
    "nextProbe": "다음 점검",
    "probeAll": "지금 점검",
    "resetMarks": "차단 표시 초기화",
    "resetHint": "\"할당량 소진 / 인증 실패\" 표시를 모두 지우고 라우팅을 즉시 OpenCode 계정 풀로 되돌립니다. 계정과 키는 그대로 둡니다.",
    "routerMissing": "할당량 라우팅을 찾지 못했습니다. 계정 풀은 읽기 전용입니다.",
    "accountsTitle": "계정 풀",
    "accountsOrder": "순서대로 사용합니다. 앞 계정을 다 쓴 뒤에야 다음 계정으로 넘어갑니다.",
    "addAccount": "계정 추가",
    "labelPlaceholder": "라벨(선택, 예: 부계정 A)",
    "keyPlaceholder": "oc_sk_…",
    "addAndProbe": "추가 후 점검",
    "save": "저장",
    "cancel": "취소",
    "setActive": "현재 계정으로 설정",
    "disable": "사용 안 함",
    "enable": "사용",
    "editKey": "키 변경",
    "remove": "삭제",
    "viewUsage": "사용량 보기",
    "keyUpdated": "키를 업데이트했습니다",
    "accountAdded": "계정을 추가하고 점검했습니다",
    "shortKey": "키가 불완전합니다: 8자 이상 필요",
    "keepOne": "계정을 하나 이상 남겨야 합니다",
    "notConfigured": "설정 안 됨",
    "readonly": "읽기 전용",
    "newKeyFor": "새 키 저장 위치: {ref}",
    "noAccounts": "아직 계정이 없습니다. 키를 하나 넣으면 시작할 수 있습니다.",
    "statusReady": "사용 가능",
    "statusExhausted": "할당량 소진",
    "statusAuth": "인증 실패",
    "statusDisabled": "사용 안 함",
    "statusMissing": "키 없음",
    "statusError": "읽기 실패",
    "statusActive": "사용 중",
    "statusSpare": "예비",
    "statusCurrent": "현재",
    "colIndex": "#",
    "colAccount": "계정",
    "colKey": "키",
    "colRolling": "5시간",
    "colWeekly": "이번 주",
    "colMonthly": "이번 달",
    "colStatus": "상태",
    "colActions": "작업",
    "colModel": "모델",
    "colCaps": "모달리티",
    "colRequests": "요청",
    "colTokens": "입력 / 출력 토큰",
    "colRemaining": "이번 달 잔여",
    "colMonthlyUsed": "이번 달 사용량",
    "colWeeklyUsed": "이번 주 사용량",
    "modelsTitle": "모델별(로컬 추정)",
    "capsText": "텍스트",
    "capsImage": "이미지",
    "capsVideo": "영상",
    "capsAudio": "오디오",
    "capsPdf": "PDF",
    "capsTools": "도구",
    "capsReasoning": "추론",
    "capsUnknown": "미선언",
    "free": "무료",
    "unlimited": "무제한",
    "none": "—",
    "dialogTitle": "{label} 사용량",
    "dialogNote": "공식 API는 이 세 구간의 비율만 주고 모델별 내역은 없습니다. 모델별 금액은 로컬 추정치일 뿐입니다.",
    "dialogProbe": "다시 점검",
    "close": "닫기",
    "probedAt": "{time}에 점검",
    "resetsAt": "{time}에 초기화",
    "usageError": "오류: {message}",
    "peakTitle": "지금 어느 쪽이 더 저렴한가",
    "peakPlan": "OpenCode {plan} 플랜에 월 ¥{price}(${usd})를 내면 공식 가격 기준 ¥{allowance}(${allowanceUsd})만큼의 할당량이 주어집니다. 할당량은 공식 가격으로 차감되므로 실질 부담은 {discount}할, 즉 같은 요청을 OpenCode로 보내면 공식 가격의 {percent}%만 내면 됩니다.",
    "peakNow": "공식에 직결하면 공식 가격으로 결제됩니다. 지금 OpenCode는 {goPeak}, 공식은 {officialPeak}{holiday}.",
    "peakGoPeak": "피크 시간(할당량 2배 소모)",
    "peakGoOff": "비피크",
    "peakOfficialPeak": "피크 시간(가격 2배)",
    "peakOfficialOff": "비피크",
    "peakAtPeak": "피크",
    "peakOffPeak": "비피크",
    "peakHoliday": " — 오늘은 중국 공휴일이라 하루 종일 비피크, OpenCode는 피크 그대로입니다",
    "peakExhausted": "다만 이번 달 할당량을 이미 다 썼으므로 공식만 쓸 수 있습니다.",
    "peakGoPay": "OpenCode",
    "peakOfficialPay": "DeepSeek 공식",
    "peakVerdict": "결론",
    "peakGoCheaper": "OpenCode가 {percent}% 더 저렴",
    "peakFootnote": "출력 100만 토큰 기준 환산(코딩 요금은 대부분 출력에서 발생), 환율 ¥{fx}/$. 피크·비피크는 할당량이 줄어드는 속도에만 영향을 주고 결론은 바뀌지 않습니다. 할당량 안에서는 OpenCode 경유가 공식 직결보다 항상 저렴하며, 예외는 할당량을 다 쓴 경우와 특정 모델 한도가 먼저 바닥나는 경우입니다.",
    "footerOfficial": "위의 \"공식 5시간 / 이번 주 / 이번 달\" 비율은 OpenCode API가 주는 실제 계정 사용량이며, 다른 클라이언트나 다른 기기에서 쓴 양도 포함됩니다.",
    "footerLocal": "모델별 금액은 로컬 추정치입니다. 이 harness의 세션 로그만 집계해 모델별 분포를 보여 주는 것이며, 다른 도구의 호출은 로컬에 기록되지 않습니다.",
    "footerPeakRule": "금액은 비피크 가격으로 추정하고, DeepSeek 모델은 피크 시간에 2배로 계산합니다. 무료 모델은 과금되지 않습니다.",
    "kindCacheRead": "캐시된 입력",
    "kindInput": "캐시되지 않은 입력",
    "kindOutput": "출력",
    "colKind": "과금 항목",
    "verdictGo": "OpenCode 경유가 {percent}% 저렴",
    "verdictOfficial": "공식 API 경유가 {percent}% 저렴",
    "verdictExhausted": "이번 달 한도를 모두 사용해 공식 API만 가능",
    "colOpenCode": "OpenCode",
    "colOfficial": "DeepSeek 공식",
    "clockTitle": "지금 피크 / 비피크",
    "clockPeak": "피크",
    "clockOff": "비피크",
    "clockFlip": "{next}까지 {hours}시간 남음",
    "clockHoliday": "오늘은 중국 공휴일이라 공식 API는 하루 종일 비피크 요금으로 계산됩니다",
    "colRollingQuota": "5시간 할당량",
    "capHintText": "텍스트 전용: 일반 텍스트를 넣으면 일반 텍스트로 답합니다.",
    "capHintImage": "이미지 입력: 스크린샷, 차트, UI 목업을 이해합니다(JPEG/PNG/GIF/WebP).",
    "capHintVideo": "영상 입력: mp4 같은 동영상 파일을 읽고 그 안에서 무슨 일이 일어나는지 설명합니다.",
    "capHintAudio": "오디오 입력: 오디오 파일을 그대로 읽습니다.",
    "capHintPdf": "PDF 입력: PDF 문서를 텍스트로 변환하지 않고 바로 읽습니다.",
    "capHintTools": "도구 호출: 모델이 harness가 노출하는 함수(파일 읽기, 명령 실행, 웹 검색, 코드 작성)를 호출하고 그 결과로 작업할 수 있습니다.",
    "capHintReasoning": "추론: 답하기 전에 생각하므로 어려운 작업에 강하지만 느리고 토큰을 더 씁니다.",
    "backToTop": "맨 위로",
    "subscribe": "OpenCode 구독하기",
    "copyKey": "복사",
    "copied": "복사됨",
    "routeNow": "현재 라우트",
    "routeOpencode": "OpenCode 계정 풀",
    "routeOfficial": "DeepSeek 공식 구독",
    "routeOpencodeHint": "요청은 OpenCode({account})를 거치며 공식 구독 한도를 쓰지 않습니다.",
    "routeOfficialHint": "요청은 DeepSeek 공식 API로 직접 가며 공식 구독 한도를 씁니다. OpenCode가 안정되면 자동으로 되돌아갑니다.",
    "statusLocalTitle": "로컬 점검",
    "statusCheckedAt": "로컬 점검 {time}",
    "officialChip": "공식 {status}",
    "statusSwitchWhy": "공식 구독으로 전환하면 OpenCode를 완전히 우회합니다. OpenCode가 안정되면 자동으로 되돌아갑니다.",
    "switchNoticeTitle": "DeepSeek 공식 구독으로 전환했습니다. 작업은 계속됩니다.",
    "switchNoticeBack": "OpenCode 라우트로 되돌렸습니다. 작업은 계속됩니다.",
    "switchNoticeTime": "{time} 전환",
    "switchNoticeClose": "닫기",
    "forceFallback": "Switch to the official subscription now",
    "forcePrimary": "Switch back to OpenCode",
    "forceFallbackHint": "Switches to the DeepSeek official API while OpenCode is failing; this consumes official credits.",
    "statusTitle": "Upstream status",
    "statusRefresh": "Refresh status",
    "statusRefreshing": "Refreshing…",
    "statusRefreshHint": "Probe OpenCode right now: re-read account usage and update the health state; during a fallback it also advances the recovery window.",
    "statusSince": "Since",
    "statusChecked": "Last probe",
    "statusStableWindow": "Stability window",
    "statusWindowLeft": "{remaining} left",
    "statusWindowDone": "stable for {stableFor}",
    "statusStateHealthy": "Healthy",
    "statusStateDegraded": "Degraded",
    "statusStateFallback": "On the official subscription",
    "statusStateRecovering": "Recovering",
    "statusStateUnknown": "Unknown",
    "statusHintHealthy": "OpenCode upstream is healthy: recent requests succeeded and traffic goes through the OpenCode account pool.",
    "statusHintRateLimit": "Upstream rate limit: OpenCode Go is answering 429 / rate limited for this account, so new requests in this window are refused (flash hits it most). Switching to the official subscription keeps the task running; these limits usually clear within minutes.",
    "statusHintCapacity": "Upstream overloaded: OpenCode’s serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused). The allowance is intact, but nothing new is accepted right now. Switch to the official subscription instead of letting the provider retry into a full cell.",
    "statusHintQuota": "Out of allowance: the current account’s 5-hour / weekly / monthly window is maxed out. Switch to the official subscription, or wait for the window to reset.",
    "statusHintAuth": "Authentication failed: OpenCode rejected this account’s key (401/403). Update the key in the account card below, or switch to the official subscription if the task cannot wait.",
    "statusHintError": "The upstream returned a non-quota error (network or server fault). Refresh once to see whether it was transient; if it repeats, switch to the official subscription.",
    "statusHintFallback": "Requests currently go to the DeepSeek official subscription, so the task keeps running on official credits. After OpenCode stays clean for {stable} minutes it switches back automatically.",
    "statusHintRecovering": "OpenCode answers probes again; the router is watching stability: {remaining} left. New requests stay on the official subscription meanwhile, so a half-recovered upstream cannot interrupt them.",
    "statusHintManual": "You switched to the official subscription by hand. It returns automatically once OpenCode stays clean for {stable} minutes, or click “Switch back to OpenCode”.",
    "statusHintUnknown": "No request samples yet: send one message, or press “Refresh status” to read the real state.",
    "statusBlockedPublished": "OpenCode still publishes this model as degraded, so the window has not started — a readable probe is not proof that inference works, and switching back into a rate limit is worse than waiting.",
    "statusBlockedProbe": "The last probe failed; the stability window restarted.",
    "statusFails": "{count} failure(s) this round",
    "statusNoFails": "no failures this round",
    "statusQuarantined": "model blocked until {time}",
    "statusSwitchOfficial": "Switch to the official subscription",
    "statusModelsTitle": "By model",
    "codeOk": "OK",
    "codeRateLimit": "rate limited",
    "codeCapacity": "overloaded",
    "codeQuota": "out of allowance",
    "codeAuth": "auth failed",
    "codeError": "error",
    "codeUnknown": "unknown",
    "errRateLimit": "Rate limited (429)",
    "errRateLimitHint": "Meaning: the request rate is over the limit — OpenCode throttles concurrency/frequency and flash hits it most. Fix: wait 1–10 minutes for the window to clear; or use another account in the pool; or click “Switch to the official subscription” and keep working.",
    "errCapacity": "Upstream overloaded (503/529)",
    "errCapacityHint": "Meaning: the serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused); allowance is intact but nothing new is accepted. Fix: switch to the official subscription; or retry in 1–2 minutes with less concurrency.",
    "errQuota": "Out of allowance",
    "errQuotaHint": "Meaning: the 5-hour / weekly / monthly window is maxed out. Fix: wait for the reset (the card shows a countdown), use another account, switch to the official subscription, or upgrade the plan.",
    "errPayment": "Payment required (402)",
    "errPaymentHint": "Meaning: the account is in arrears or locked. Fix: check billing at opencode.ai/console; switch to the official subscription if the task cannot wait.",
    "errAuth": "Auth failed (401/403)",
    "errAuthHint": "Meaning: the key was rejected (expired, reset, or truncated). Fix: re-enter it with “Edit key”, then press “Probe now” to verify; if it still fails, use another key or the official subscription.",
    "errMissingKey": "No key",
    "errMissingKeyHint": "Meaning: this account has no usable key, and the credential store has none either. Fix: paste a key into the account card, or delete the account.",
    "errSignIn": "Sign-in required",
    "errSignInHint": "Meaning: the account has to sign in again on the OpenCode console. Fix: sign in, generate a fresh key and paste it into the account card.",
    "errUpgrade": "Client upgrade required",
    "errUpgradeHint": "Meaning: the provider/plugin version is too old and the upstream no longer accepts it. Fix: upgrade dsh-opencode-routing (or the provider adapter) and restart the harness.",
    "errNotFound": "Model unavailable (404)",
    "errNotFoundHint": "Meaning: the model name does not exist on this plan or endpoint, or it was retired. Fix: check the model names under routes in cordis.patch.yml; or switch to the official subscription.",
    "errBadRequest": "Request rejected (400/422)",
    "errBadRequestHint": "Meaning: invalid parameters (image format, tool schema, oversized field). Fix: drop the suspicious attachment or tool and retry, try another model; the official subscription as a safety net.",
    "errContext": "Context too long",
    "errContextHint": "Meaning: input plus history exceed the model’s context window. Fix: compact or start a new chat, use a model with a larger window, or switch to the official subscription.",
    "errTimeout": "Timed out (408/504)",
    "errTimeoutHint": "Meaning: the upstream or the network did not answer in time. Fix: retry; check whether Clash/proxy is flapping; switch to the official subscription if it persists.",
    "errServer": "Server error (5xx)",
    "errServerHint": "Meaning: a fault on OpenCode’s side. Fix: retry in 1–2 minutes; if it keeps happening, switch to the official subscription instead of burning time on retries.",
    "errNetwork": "Network error",
    "errNetworkHint": "Meaning: connection reset, DNS failure or a broken proxy (ECONNRESET, ENOTFOUND, EAI_AGAIN, socket hang up). Fix: check Clash and DNS, retry; switch to the official subscription while the proxy is unstable.",
    "errFilter": "Blocked by content filter",
    "errFilterHint": "Meaning: the request or the reply tripped the upstream content filter. Fix: rephrase the prompt, drop the sensitive attachment, or use another model / the official subscription.",
    "errGeneric": "Unknown error",
    "errGenericHint": "Meaning: an upstream error outside the buckets above. Fix: read the kept raw message, refresh the status and retry; switch to the official subscription if it repeats.",
    "errRaw": "Raw: {message}",
    "errAdvice": "What to do",
    "errTable": "Error codes and fixes",
    "officialTitle": "OpenCode status",
    "officialRefresh": "Refresh status",
    "officialRefreshHint": "Re-reads status.opencode.ai (OpenCode refreshes it about once a minute) together with the local probe result.",
    "officialSource": "status.opencode.ai · updated {time}",
    "officialStale": "Stale reading (updated {age})",
    "officialUnavailable": "Could not read the published status: {error}",
    "officialOpenStatus": "Open the status page",
    "officialStatusOperational": "Operational",
    "officialStatusDegraded": "Degraded",
    "officialStatusOutage": "Outage",
    "officialStatusMaintenance": "Maintenance",
    "officialStatusUnknown": "Unknown",
    "officialHintOperational": "OpenCode reports everything operational: the Go plan and the inference gateway are fine, keep using the plan.",
    "officialHintPartial": "OpenCode has an overall degradation, but the model you are using is fine right now — keep going, and only switch to the official subscription if it actually stalls.",
    "officialHintUpstream": "The upstream provider is degraded — not your key and not your allowance, OpenCode says so itself. Switch to the official subscription and keep working until it clears.",
    "officialHintCapacity": "OpenCode reports it is at capacity: the allowance is intact but the serving cells are full. Switch to the official subscription instead of retrying in a loop.",
    "officialHintRateLimit": "OpenCode reports rate limiting: new requests are being refused. Switch to the official subscription; it usually clears within minutes.",
    "officialHintOutage": "OpenCode reports an outage: this service is down. Switch to the official subscription now or the turn will sit in retries.",
    "officialHintMaintenance": "OpenCode is in planned maintenance; it comes back when the window closes. Switch to the official subscription if you need to keep going.",
    "officialHintUnknown": "OpenCode did not give a reason this card understands — open the status page for the incident.",
    "officialModelsTitle": "Models you are using",
    "officialModelMissing": "not listed by OpenCode",
    "officialSpeed": "{ttft} ms first token · {tps} tok/s",
    "officialIncidentsTitle": "Open incidents",
    "officialNoIncidents": "No open incidents",
    "officialIncident": "open {age}",
    "officialReason": "reason: {reason}",
    "officialReasonUpstream": "upstream provider",
    "officialReasonNone": "none",
    "officialReasonCapacity": "capacity",
    "officialReasonRateLimit": "rate limit",
    "officialReasonOther": "other",
    "officialServiceGo": "Go plan",
    "officialServiceInference": "Inference API",
    "officialServicePayg": "Pay-as-you-go",
    "officialServiceFree": "Free inference",
  },
  "pt": {
    "title": "Contas e uso do OpenCode",
    "refresh": "Atualizar",
    "refreshing": "Atualizando…",
    "updatedAt": "Atualizado {time}",
    "loadError": "Falha ao ler: {message}",
    "routerTitle": "Roteamento por cota",
    "modePrimary": "Roteamento normal",
    "modeFallback": "Voltou para a assinatura oficial",
    "modeReason": "Motivo: {reason}",
    "activeAccount": "Conta ativa",
    "nextProbe": "Próxima sondagem",
    "probeAll": "Sondar agora",
    "resetMarks": "Limpar marcas de bloqueio",
    "resetHint": "Apaga todas as marcas de “cota esgotada / falha de autenticação” e devolve o roteamento na hora para o pool de contas do OpenCode. Não mexe em contas nem em chaves.",
    "routerMissing": "Nenhum roteador de cota encontrado — o pool de contas está em somente leitura.",
    "accountsTitle": "Pool de contas",
    "accountsOrder": "Usadas em ordem: a próxima conta só entra quando a de cima seca.",
    "addAccount": "Adicionar conta",
    "labelPlaceholder": "Rótulo (opcional, ex. alternativa A)",
    "keyPlaceholder": "oc_sk_…",
    "addAndProbe": "Adicionar e sondar",
    "save": "Salvar",
    "cancel": "Cancelar",
    "setActive": "Tornar ativa",
    "disable": "Desativar",
    "enable": "Ativar",
    "editKey": "Trocar chave",
    "remove": "Excluir",
    "viewUsage": "Ver uso",
    "keyUpdated": "Chave atualizada",
    "accountAdded": "Conta adicionada e sondada",
    "shortKey": "Chave incompleta: mínimo de 8 caracteres",
    "keepOne": "Mantenha pelo menos uma conta",
    "notConfigured": "Não definido",
    "readonly": "somente leitura",
    "newKeyFor": "A nova chave é gravada em {ref}",
    "noAccounts": "Nenhuma conta ainda. Adicione uma chave para começar.",
    "statusReady": "Disponível",
    "statusExhausted": "Cota esgotada",
    "statusAuth": "Falha de autenticação",
    "statusDisabled": "Desativada",
    "statusMissing": "Sem chave",
    "statusError": "Falha na sondagem",
    "statusActive": "Em uso",
    "statusSpare": "Reserva",
    "statusCurrent": "atual",
    "colIndex": "#",
    "colAccount": "Conta",
    "colKey": "Chave",
    "colRolling": "5 horas",
    "colWeekly": "Esta semana",
    "colMonthly": "Este mês",
    "colStatus": "Status",
    "colActions": "Ações",
    "colModel": "Modelo",
    "colCaps": "Modalidade",
    "colRequests": "Requisições",
    "colTokens": "Tokens de entrada / saída",
    "colRemaining": "Restante no mês",
    "colMonthlyUsed": "Uso no mês",
    "colWeeklyUsed": "Uso na semana",
    "modelsTitle": "Por modelo (estimativa local)",
    "capsText": "texto",
    "capsImage": "imagem",
    "capsVideo": "vídeo",
    "capsAudio": "áudio",
    "capsPdf": "PDF",
    "capsTools": "ferramentas",
    "capsReasoning": "raciocínio",
    "capsUnknown": "não declarado",
    "free": "grátis",
    "unlimited": "ilimitado",
    "none": "—",
    "dialogTitle": "Uso de {label}",
    "dialogNote": "A API oficial só informa estas três janelas, sem detalhe por modelo; o valor por modelo só pode ser uma estimativa local.",
    "dialogProbe": "Sondar de novo",
    "close": "Fechar",
    "probedAt": "Sondado {time}",
    "resetsAt": "Reinicia {time}",
    "usageError": "Erro: {message}",
    "peakTitle": "Qual rota compensa agora",
    "peakPlan": "Você paga ¥{price}/mês (${usd}) pelo plano {plan} do OpenCode, e o plano libera ¥{allowance} (${allowanceUsd}) de uso a preço oficial — um desconto de {discount}×, então a mesma requisição custa {percent}% do preço oficial passando pelo OpenCode.",
    "peakNow": "A rota oficial cobra o preço de tabela direto. Agora o OpenCode está {goPeak} e a API oficial está {officialPeak}{holiday}.",
    "peakGoPeak": "no horário de pico (a cota queima 2× mais rápido)",
    "peakGoOff": "fora do pico",
    "peakOfficialPeak": "no horário de pico (o preço dobra)",
    "peakOfficialOff": "fora do pico",
    "peakAtPeak": "pico",
    "peakOffPeak": "fora do pico",
    "peakHoliday": " — hoje é feriado nacional na China: a API oficial cobra fora do pico o dia inteiro, enquanto o OpenCode continua cobrando pico",
    "peakExhausted": " Mas a cota deste mês já acabou, então só resta a rota oficial.",
    "peakGoPay": "OpenCode",
    "peakOfficialPay": "DeepSeek oficial",
    "peakVerdict": "Veredito",
    "peakGoCheaper": "O OpenCode sai {percent}% mais barato",
    "peakFootnote": "Cálculo por 1 M de tokens de saída (numa fatura de código a saída domina), a ¥{fx} por dólar. O pico só muda a velocidade com que a cota queima, não a conclusão: dentro da cota, o OpenCode continua mais barato que a API oficial; as exceções são a cota esgotada ou um modelo cujo limite próprio acaba antes.",
    "footerOfficial": "As porcentagens oficiais de 5 horas / semana / mês vêm da API do OpenCode e descrevem a conta inteira: uso de outros clientes ou de outras máquinas também entra na conta.",
    "footerLocal": "O valor por modelo é uma estimativa local: conta só o log de sessões deste harness, que é o que permite ver a divisão por modelo; chamadas de outras ferramentas não deixam registro local.",
    "footerPeakRule": "O valor é estimado a preço fora do pico, dobrado no horário de pico para os modelos DeepSeek; modelos gratuitos não são cobrados.",
    "kindCacheRead": "entrada em cache",
    "kindInput": "entrada sem cache",
    "kindOutput": "saída",
    "colKind": "Item",
    "verdictGo": "{percent}% mais barato via OpenCode",
    "verdictOfficial": "{percent}% mais barato via API oficial",
    "verdictExhausted": "Cota mensal esgotada — resta apenas a API oficial",
    "colOpenCode": "OpenCode",
    "colOfficial": "DeepSeek oficial",
    "clockTitle": "Pico / fora do pico agora",
    "clockPeak": "pico",
    "clockOff": "fora do pico",
    "clockFlip": "{next} em {hours} h",
    "clockHoliday": "Hoje é feriado nacional na China, então a API oficial cobra fora do pico o dia inteiro",
    "colRollingQuota": "Cota de 5 horas",
    "capHintText": "Só texto: entra texto puro, sai texto puro.",
    "capHintImage": "Entrada de imagem: entende capturas de tela, gráficos e mockups de interface (JPEG/PNG/GIF/WebP).",
    "capHintVideo": "Entrada de vídeo: lê arquivos de vídeo como mp4 e descreve o que acontece neles.",
    "capHintAudio": "Entrada de áudio: lê arquivos de áudio diretamente.",
    "capHintPdf": "Entrada de PDF: lê documentos PDF sem convertê-los antes para texto.",
    "capHintTools": "Chamada de ferramentas: o modelo pode chamar as funções que o harness expõe (ler arquivos, rodar comandos, buscar na web, escrever código) e agir com o resultado.",
    "capHintReasoning": "Raciocínio: o modelo pensa antes de responder; vai melhor em tarefas difíceis, mas é mais lento e gasta mais tokens.",
    "backToTop": "Voltar ao topo",
    "subscribe": "Assinar o OpenCode",
    "copyKey": "Copiar",
    "copied": "Copiado",
    "routeNow": "Rota atual",
    "routeOpencode": "o pool de contas do OpenCode",
    "routeOfficial": "a assinatura DeepSeek",
    "routeOpencodeHint": "As requisições passam pelo OpenCode ({account}) e não gastam cota da assinatura.",
    "routeOfficialHint": "As requisições vão direto para a API da DeepSeek e gastam cota da assinatura; o roteador volta quando o OpenCode estiver estável.",
    "statusLocalTitle": "Sonda local",
    "statusCheckedAt": "sonda local {time}",
    "officialChip": "oficial {status}",
    "statusSwitchWhy": "Trocar para a assinatura contorna o OpenCode por completo; o roteador volta quando o OpenCode estiver estável.",
    "switchNoticeTitle": "Alterado para a assinatura DeepSeek; a tarefa continua.",
    "switchNoticeBack": "De volta à rota OpenCode; a tarefa continua.",
    "switchNoticeTime": "alterado {time}",
    "switchNoticeClose": "Fechar",
    "forceFallback": "Switch to the official subscription now",
    "forcePrimary": "Switch back to OpenCode",
    "forceFallbackHint": "Switches to the DeepSeek official API while OpenCode is failing; this consumes official credits.",
    "statusTitle": "Upstream status",
    "statusRefresh": "Refresh status",
    "statusRefreshing": "Refreshing…",
    "statusRefreshHint": "Probe OpenCode right now: re-read account usage and update the health state; during a fallback it also advances the recovery window.",
    "statusSince": "Since",
    "statusChecked": "Last probe",
    "statusStableWindow": "Stability window",
    "statusWindowLeft": "{remaining} left",
    "statusWindowDone": "stable for {stableFor}",
    "statusStateHealthy": "Healthy",
    "statusStateDegraded": "Degraded",
    "statusStateFallback": "On the official subscription",
    "statusStateRecovering": "Recovering",
    "statusStateUnknown": "Unknown",
    "statusHintHealthy": "OpenCode upstream is healthy: recent requests succeeded and traffic goes through the OpenCode account pool.",
    "statusHintRateLimit": "Upstream rate limit: OpenCode Go is answering 429 / rate limited for this account, so new requests in this window are refused (flash hits it most). Switching to the official subscription keeps the task running; these limits usually clear within minutes.",
    "statusHintCapacity": "Upstream overloaded: OpenCode’s serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused). The allowance is intact, but nothing new is accepted right now. Switch to the official subscription instead of letting the provider retry into a full cell.",
    "statusHintQuota": "Out of allowance: the current account’s 5-hour / weekly / monthly window is maxed out. Switch to the official subscription, or wait for the window to reset.",
    "statusHintAuth": "Authentication failed: OpenCode rejected this account’s key (401/403). Update the key in the account card below, or switch to the official subscription if the task cannot wait.",
    "statusHintError": "The upstream returned a non-quota error (network or server fault). Refresh once to see whether it was transient; if it repeats, switch to the official subscription.",
    "statusHintFallback": "Requests currently go to the DeepSeek official subscription, so the task keeps running on official credits. After OpenCode stays clean for {stable} minutes it switches back automatically.",
    "statusHintRecovering": "OpenCode answers probes again; the router is watching stability: {remaining} left. New requests stay on the official subscription meanwhile, so a half-recovered upstream cannot interrupt them.",
    "statusHintManual": "You switched to the official subscription by hand. It returns automatically once OpenCode stays clean for {stable} minutes, or click “Switch back to OpenCode”.",
    "statusHintUnknown": "No request samples yet: send one message, or press “Refresh status” to read the real state.",
    "statusBlockedPublished": "OpenCode still publishes this model as degraded, so the window has not started — a readable probe is not proof that inference works, and switching back into a rate limit is worse than waiting.",
    "statusBlockedProbe": "The last probe failed; the stability window restarted.",
    "statusFails": "{count} failure(s) this round",
    "statusNoFails": "no failures this round",
    "statusQuarantined": "model blocked until {time}",
    "statusSwitchOfficial": "Switch to the official subscription",
    "statusModelsTitle": "By model",
    "codeOk": "OK",
    "codeRateLimit": "rate limited",
    "codeCapacity": "overloaded",
    "codeQuota": "out of allowance",
    "codeAuth": "auth failed",
    "codeError": "error",
    "codeUnknown": "unknown",
    "errRateLimit": "Rate limited (429)",
    "errRateLimitHint": "Meaning: the request rate is over the limit — OpenCode throttles concurrency/frequency and flash hits it most. Fix: wait 1–10 minutes for the window to clear; or use another account in the pool; or click “Switch to the official subscription” and keep working.",
    "errCapacity": "Upstream overloaded (503/529)",
    "errCapacityHint": "Meaning: the serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused); allowance is intact but nothing new is accepted. Fix: switch to the official subscription; or retry in 1–2 minutes with less concurrency.",
    "errQuota": "Out of allowance",
    "errQuotaHint": "Meaning: the 5-hour / weekly / monthly window is maxed out. Fix: wait for the reset (the card shows a countdown), use another account, switch to the official subscription, or upgrade the plan.",
    "errPayment": "Payment required (402)",
    "errPaymentHint": "Meaning: the account is in arrears or locked. Fix: check billing at opencode.ai/console; switch to the official subscription if the task cannot wait.",
    "errAuth": "Auth failed (401/403)",
    "errAuthHint": "Meaning: the key was rejected (expired, reset, or truncated). Fix: re-enter it with “Edit key”, then press “Probe now” to verify; if it still fails, use another key or the official subscription.",
    "errMissingKey": "No key",
    "errMissingKeyHint": "Meaning: this account has no usable key, and the credential store has none either. Fix: paste a key into the account card, or delete the account.",
    "errSignIn": "Sign-in required",
    "errSignInHint": "Meaning: the account has to sign in again on the OpenCode console. Fix: sign in, generate a fresh key and paste it into the account card.",
    "errUpgrade": "Client upgrade required",
    "errUpgradeHint": "Meaning: the provider/plugin version is too old and the upstream no longer accepts it. Fix: upgrade dsh-opencode-routing (or the provider adapter) and restart the harness.",
    "errNotFound": "Model unavailable (404)",
    "errNotFoundHint": "Meaning: the model name does not exist on this plan or endpoint, or it was retired. Fix: check the model names under routes in cordis.patch.yml; or switch to the official subscription.",
    "errBadRequest": "Request rejected (400/422)",
    "errBadRequestHint": "Meaning: invalid parameters (image format, tool schema, oversized field). Fix: drop the suspicious attachment or tool and retry, try another model; the official subscription as a safety net.",
    "errContext": "Context too long",
    "errContextHint": "Meaning: input plus history exceed the model’s context window. Fix: compact or start a new chat, use a model with a larger window, or switch to the official subscription.",
    "errTimeout": "Timed out (408/504)",
    "errTimeoutHint": "Meaning: the upstream or the network did not answer in time. Fix: retry; check whether Clash/proxy is flapping; switch to the official subscription if it persists.",
    "errServer": "Server error (5xx)",
    "errServerHint": "Meaning: a fault on OpenCode’s side. Fix: retry in 1–2 minutes; if it keeps happening, switch to the official subscription instead of burning time on retries.",
    "errNetwork": "Network error",
    "errNetworkHint": "Meaning: connection reset, DNS failure or a broken proxy (ECONNRESET, ENOTFOUND, EAI_AGAIN, socket hang up). Fix: check Clash and DNS, retry; switch to the official subscription while the proxy is unstable.",
    "errFilter": "Blocked by content filter",
    "errFilterHint": "Meaning: the request or the reply tripped the upstream content filter. Fix: rephrase the prompt, drop the sensitive attachment, or use another model / the official subscription.",
    "errGeneric": "Unknown error",
    "errGenericHint": "Meaning: an upstream error outside the buckets above. Fix: read the kept raw message, refresh the status and retry; switch to the official subscription if it repeats.",
    "errRaw": "Raw: {message}",
    "errAdvice": "What to do",
    "errTable": "Error codes and fixes",
    "officialTitle": "OpenCode status",
    "officialRefresh": "Refresh status",
    "officialRefreshHint": "Re-reads status.opencode.ai (OpenCode refreshes it about once a minute) together with the local probe result.",
    "officialSource": "status.opencode.ai · updated {time}",
    "officialStale": "Stale reading (updated {age})",
    "officialUnavailable": "Could not read the published status: {error}",
    "officialOpenStatus": "Open the status page",
    "officialStatusOperational": "Operational",
    "officialStatusDegraded": "Degraded",
    "officialStatusOutage": "Outage",
    "officialStatusMaintenance": "Maintenance",
    "officialStatusUnknown": "Unknown",
    "officialHintOperational": "OpenCode reports everything operational: the Go plan and the inference gateway are fine, keep using the plan.",
    "officialHintPartial": "OpenCode has an overall degradation, but the model you are using is fine right now — keep going, and only switch to the official subscription if it actually stalls.",
    "officialHintUpstream": "The upstream provider is degraded — not your key and not your allowance, OpenCode says so itself. Switch to the official subscription and keep working until it clears.",
    "officialHintCapacity": "OpenCode reports it is at capacity: the allowance is intact but the serving cells are full. Switch to the official subscription instead of retrying in a loop.",
    "officialHintRateLimit": "OpenCode reports rate limiting: new requests are being refused. Switch to the official subscription; it usually clears within minutes.",
    "officialHintOutage": "OpenCode reports an outage: this service is down. Switch to the official subscription now or the turn will sit in retries.",
    "officialHintMaintenance": "OpenCode is in planned maintenance; it comes back when the window closes. Switch to the official subscription if you need to keep going.",
    "officialHintUnknown": "OpenCode did not give a reason this card understands — open the status page for the incident.",
    "officialModelsTitle": "Models you are using",
    "officialModelMissing": "not listed by OpenCode",
    "officialSpeed": "{ttft} ms first token · {tps} tok/s",
    "officialIncidentsTitle": "Open incidents",
    "officialNoIncidents": "No open incidents",
    "officialIncident": "open {age}",
    "officialReason": "reason: {reason}",
    "officialReasonUpstream": "upstream provider",
    "officialReasonNone": "none",
    "officialReasonCapacity": "capacity",
    "officialReasonRateLimit": "rate limit",
    "officialReasonOther": "other",
    "officialServiceGo": "Go plan",
    "officialServiceInference": "Inference API",
    "officialServicePayg": "Pay-as-you-go",
    "officialServiceFree": "Free inference",
  },
  "ru": {
    "title": "Аккаунты и использование OpenCode",
    "refresh": "Обновить",
    "refreshing": "Обновление…",
    "updatedAt": "Обновлено {time}",
    "loadError": "Не удалось загрузить: {message}",
    "routerTitle": "Маршрутизация квот",
    "modePrimary": "Обычная маршрутизация",
    "modeFallback": "Переключено на официальную подписку",
    "modeReason": "Причина: {reason}",
    "activeAccount": "Активный аккаунт",
    "nextProbe": "Следующая проверка",
    "probeAll": "Проверить сейчас",
    "resetMarks": "Сбросить отметки блокировки",
    "resetHint": "Снимает все отметки «квота исчерпана / ошибка авторизации» и сразу возвращает маршрутизацию в пул аккаунтов OpenCode. Аккаунты и ключи не меняются.",
    "routerMissing": "Маршрутизация квот не обнаружена — пул аккаунтов доступен только для чтения.",
    "accountsTitle": "Пул аккаунтов",
    "accountsOrder": "Используются по порядку: следующий аккаунт подключается, только когда исчерпан предыдущий.",
    "addAccount": "Добавить аккаунт",
    "labelPlaceholder": "Метка (необязательно, напр. доп. A)",
    "keyPlaceholder": "oc_sk_…",
    "addAndProbe": "Добавить и проверить",
    "save": "Сохранить",
    "cancel": "Отмена",
    "setActive": "Сделать активным",
    "disable": "Отключить",
    "enable": "Включить",
    "editKey": "Сменить ключ",
    "remove": "Удалить",
    "viewUsage": "Показать расход",
    "keyUpdated": "Ключ обновлён",
    "accountAdded": "Аккаунт добавлен и проверен",
    "shortKey": "Ключ неполный: нужно минимум 8 символов",
    "keepOne": "Нужен хотя бы один аккаунт",
    "notConfigured": "Не задан",
    "readonly": "только чтение",
    "newKeyFor": "Новый ключ сохранён в {ref}",
    "noAccounts": "Аккаунтов пока нет. Введите ключ, чтобы начать.",
    "statusReady": "Готов",
    "statusExhausted": "Квота исчерпана",
    "statusAuth": "Ошибка авторизации",
    "statusDisabled": "Отключён",
    "statusMissing": "Нет ключа",
    "statusError": "Ошибка чтения",
    "statusActive": "Используется",
    "statusSpare": "Резервный",
    "statusCurrent": "текущий",
    "colIndex": "#",
    "colAccount": "Аккаунт",
    "colKey": "Ключ",
    "colRolling": "5 часов",
    "colWeekly": "Неделя",
    "colMonthly": "Месяц",
    "colStatus": "Статус",
    "colActions": "Действия",
    "colModel": "Модель",
    "colCaps": "Модальность",
    "colRequests": "Запросы",
    "colTokens": "Токены: вход / выход",
    "colRemaining": "Остаток за месяц",
    "colMonthlyUsed": "Расход за месяц",
    "colWeeklyUsed": "Расход за неделю",
    "modelsTitle": "По моделям (локальная оценка)",
    "capsText": "текст",
    "capsImage": "изображения",
    "capsVideo": "видео",
    "capsAudio": "аудио",
    "capsPdf": "PDF",
    "capsTools": "инструменты",
    "capsReasoning": "рассуждения",
    "capsUnknown": "не указано",
    "free": "бесплатно",
    "unlimited": "без лимита",
    "none": "—",
    "dialogTitle": "Расход: {label}",
    "dialogNote": "Официальный API отдаёт только проценты по этим трём окнам — разбивки по моделям у него нет. Суммы по моделям могут быть только локальной оценкой.",
    "dialogProbe": "Проверить снова",
    "close": "Закрыть",
    "probedAt": "Проверено {time}",
    "resetsAt": "Сброс {time}",
    "usageError": "Ошибка: {message}",
    "peakTitle": "Что сейчас выгоднее",
    "peakPlan": "Вы платите ¥{price} в месяц (${usd}) за тариф {plan} в OpenCode, а квота покрывает ¥{allowance} (${allowanceUsd}) по официальным ценам. Списание идёт по прайсу, то есть {discount} из 10 от цены — тот же запрос через OpenCode обходится вам в {percent}% официальной цены.",
    "peakNow": "Прямой доступ к официальному API тарифицируется по прайсу. Сейчас OpenCode — {goPeak}, официальный API — {officialPeak}{holiday}.",
    "peakGoPeak": "пик (квота расходуется вдвое быстрее)",
    "peakGoOff": "не пик",
    "peakOfficialPeak": "пик (цена вдвое выше)",
    "peakOfficialOff": "не пик",
    "peakAtPeak": "пик",
    "peakOffPeak": "не пик",
    "peakHoliday": "; из-за государственного праздника в Китае он весь день считается вне пика, а OpenCode — по-прежнему в пике",
    "peakExhausted": "Но квота за этот месяц уже израсходована, так что остаётся только официальный API.",
    "peakGoPay": "OpenCode",
    "peakOfficialPay": "Официальный DeepSeek",
    "peakVerdict": "Итог",
    "peakGoCheaper": "OpenCode дешевле на {percent}%",
    "peakFootnote": "В расчёте на 1 млн выходных токенов (в счёте за код преобладает выход), курс ¥{fx}/$. Пик влияет только на скорость расхода квоты и не меняет вывод: в пределах квоты OpenCode всегда дешевле прямого официального API; исключения — исчерпанная квота или лимит отдельной модели, который закончится раньше.",
    "footerOfficial": "Проценты «официально 5 часов / неделя / месяц» выше приходят из API OpenCode и отражают реальный расход аккаунта — включая другие клиенты и другие машины.",
    "footerLocal": "Суммы по моделям — локальная оценка: учитывается только журнал сессий этого harness, поэтому разбивка по моделям и видна; вызовы из других инструментов локально не записываются.",
    "footerPeakRule": "Суммы считаются по ценам вне пика, для моделей DeepSeek в часы пика применяется коэффициент 2. Бесплатные модели не тарифицируются.",
    "kindCacheRead": "вход из кеша",
    "kindInput": "вход без кеша",
    "kindOutput": "выход",
    "colKind": "Статья",
    "verdictGo": "Через OpenCode дешевле на {percent}%",
    "verdictOfficial": "Через официальный API дешевле на {percent}%",
    "verdictExhausted": "Месячная квота исчерпана — остаётся только официальный API",
    "colOpenCode": "OpenCode",
    "colOfficial": "Официальный DeepSeek",
    "clockTitle": "Пик или не пик прямо сейчас",
    "clockPeak": "пик",
    "clockOff": "не пик",
    "clockFlip": "{next} через {hours} ч",
    "clockHoliday": "Сегодня государственный праздник в Китае, поэтому официальный API весь день считает по цене вне пика",
    "colRollingQuota": "Квота на 5 часов",
    "capHintText": "Только текст: на входе обычный текст, на выходе обычный текст.",
    "capHintImage": "Ввод изображений: понимает скриншоты, графики и макеты интерфейса (JPEG/PNG/GIF/WebP).",
    "capHintVideo": "Ввод видео: читает видеофайлы вроде mp4 и описывает, что в них происходит.",
    "capHintAudio": "Ввод аудио: читает аудиофайлы напрямую.",
    "capHintPdf": "Ввод PDF: читает PDF-документы, не переводя их сначала в текст.",
    "capHintTools": "Вызов инструментов: модель может вызывать функции, которые предоставляет harness (читать файлы, выполнять команды, искать в интернете, писать код), и действовать по результатам.",
    "capHintReasoning": "Рассуждение: модель думает перед ответом; лучше справляется со сложными задачами, но отвечает медленнее и тратит больше токенов.",
    "backToTop": "Наверх",
    "subscribe": "Оформить подписку на OpenCode",
    "copyKey": "Копировать",
    "copied": "Скопировано",
    "routeNow": "Текущий маршрут",
    "routeOpencode": "пул аккаунтов OpenCode",
    "routeOfficial": "подписка DeepSeek",
    "routeOpencodeHint": "Запросы идут через OpenCode ({account}) и не расходуют лимит подписки.",
    "routeOfficialHint": "Запросы идут напрямую в API DeepSeek и расходуют лимит подписки; роутер вернётся, когда OpenCode стабилизируется.",
    "statusLocalTitle": "Локальная проверка",
    "statusCheckedAt": "локальная проверка {time}",
    "officialChip": "официально {status}",
    "statusSwitchWhy": "Переключение на подписку полностью обходит OpenCode; роутер вернётся, когда OpenCode стабилизируется.",
    "switchNoticeTitle": "Переключено на подписку DeepSeek; задача продолжается.",
    "switchNoticeBack": "Снова на маршруте OpenCode; задача продолжается.",
    "switchNoticeTime": "переключено {time}",
    "switchNoticeClose": "Закрыть",
    "forceFallback": "Switch to the official subscription now",
    "forcePrimary": "Switch back to OpenCode",
    "forceFallbackHint": "Switches to the DeepSeek official API while OpenCode is failing; this consumes official credits.",
    "statusTitle": "Upstream status",
    "statusRefresh": "Refresh status",
    "statusRefreshing": "Refreshing…",
    "statusRefreshHint": "Probe OpenCode right now: re-read account usage and update the health state; during a fallback it also advances the recovery window.",
    "statusSince": "Since",
    "statusChecked": "Last probe",
    "statusStableWindow": "Stability window",
    "statusWindowLeft": "{remaining} left",
    "statusWindowDone": "stable for {stableFor}",
    "statusStateHealthy": "Healthy",
    "statusStateDegraded": "Degraded",
    "statusStateFallback": "On the official subscription",
    "statusStateRecovering": "Recovering",
    "statusStateUnknown": "Unknown",
    "statusHintHealthy": "OpenCode upstream is healthy: recent requests succeeded and traffic goes through the OpenCode account pool.",
    "statusHintRateLimit": "Upstream rate limit: OpenCode Go is answering 429 / rate limited for this account, so new requests in this window are refused (flash hits it most). Switching to the official subscription keeps the task running; these limits usually clear within minutes.",
    "statusHintCapacity": "Upstream overloaded: OpenCode’s serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused). The allowance is intact, but nothing new is accepted right now. Switch to the official subscription instead of letting the provider retry into a full cell.",
    "statusHintQuota": "Out of allowance: the current account’s 5-hour / weekly / monthly window is maxed out. Switch to the official subscription, or wait for the window to reset.",
    "statusHintAuth": "Authentication failed: OpenCode rejected this account’s key (401/403). Update the key in the account card below, or switch to the official subscription if the task cannot wait.",
    "statusHintError": "The upstream returned a non-quota error (network or server fault). Refresh once to see whether it was transient; if it repeats, switch to the official subscription.",
    "statusHintFallback": "Requests currently go to the DeepSeek official subscription, so the task keeps running on official credits. After OpenCode stays clean for {stable} minutes it switches back automatically.",
    "statusHintRecovering": "OpenCode answers probes again; the router is watching stability: {remaining} left. New requests stay on the official subscription meanwhile, so a half-recovered upstream cannot interrupt them.",
    "statusHintManual": "You switched to the official subscription by hand. It returns automatically once OpenCode stays clean for {stable} minutes, or click “Switch back to OpenCode”.",
    "statusHintUnknown": "No request samples yet: send one message, or press “Refresh status” to read the real state.",
    "statusBlockedPublished": "OpenCode still publishes this model as degraded, so the window has not started — a readable probe is not proof that inference works, and switching back into a rate limit is worse than waiting.",
    "statusBlockedProbe": "The last probe failed; the stability window restarted.",
    "statusFails": "{count} failure(s) this round",
    "statusNoFails": "no failures this round",
    "statusQuarantined": "model blocked until {time}",
    "statusSwitchOfficial": "Switch to the official subscription",
    "statusModelsTitle": "By model",
    "codeOk": "OK",
    "codeRateLimit": "rate limited",
    "codeCapacity": "overloaded",
    "codeQuota": "out of allowance",
    "codeAuth": "auth failed",
    "codeError": "error",
    "codeUnknown": "unknown",
    "errRateLimit": "Rate limited (429)",
    "errRateLimitHint": "Meaning: the request rate is over the limit — OpenCode throttles concurrency/frequency and flash hits it most. Fix: wait 1–10 minutes for the window to clear; or use another account in the pool; or click “Switch to the official subscription” and keep working.",
    "errCapacity": "Upstream overloaded (503/529)",
    "errCapacityHint": "Meaning: the serving cells are full (at capacity / prefill_cap_refused / ttft_admission_refused); allowance is intact but nothing new is accepted. Fix: switch to the official subscription; or retry in 1–2 minutes with less concurrency.",
    "errQuota": "Out of allowance",
    "errQuotaHint": "Meaning: the 5-hour / weekly / monthly window is maxed out. Fix: wait for the reset (the card shows a countdown), use another account, switch to the official subscription, or upgrade the plan.",
    "errPayment": "Payment required (402)",
    "errPaymentHint": "Meaning: the account is in arrears or locked. Fix: check billing at opencode.ai/console; switch to the official subscription if the task cannot wait.",
    "errAuth": "Auth failed (401/403)",
    "errAuthHint": "Meaning: the key was rejected (expired, reset, or truncated). Fix: re-enter it with “Edit key”, then press “Probe now” to verify; if it still fails, use another key or the official subscription.",
    "errMissingKey": "No key",
    "errMissingKeyHint": "Meaning: this account has no usable key, and the credential store has none either. Fix: paste a key into the account card, or delete the account.",
    "errSignIn": "Sign-in required",
    "errSignInHint": "Meaning: the account has to sign in again on the OpenCode console. Fix: sign in, generate a fresh key and paste it into the account card.",
    "errUpgrade": "Client upgrade required",
    "errUpgradeHint": "Meaning: the provider/plugin version is too old and the upstream no longer accepts it. Fix: upgrade dsh-opencode-routing (or the provider adapter) and restart the harness.",
    "errNotFound": "Model unavailable (404)",
    "errNotFoundHint": "Meaning: the model name does not exist on this plan or endpoint, or it was retired. Fix: check the model names under routes in cordis.patch.yml; or switch to the official subscription.",
    "errBadRequest": "Request rejected (400/422)",
    "errBadRequestHint": "Meaning: invalid parameters (image format, tool schema, oversized field). Fix: drop the suspicious attachment or tool and retry, try another model; the official subscription as a safety net.",
    "errContext": "Context too long",
    "errContextHint": "Meaning: input plus history exceed the model’s context window. Fix: compact or start a new chat, use a model with a larger window, or switch to the official subscription.",
    "errTimeout": "Timed out (408/504)",
    "errTimeoutHint": "Meaning: the upstream or the network did not answer in time. Fix: retry; check whether Clash/proxy is flapping; switch to the official subscription if it persists.",
    "errServer": "Server error (5xx)",
    "errServerHint": "Meaning: a fault on OpenCode’s side. Fix: retry in 1–2 minutes; if it keeps happening, switch to the official subscription instead of burning time on retries.",
    "errNetwork": "Network error",
    "errNetworkHint": "Meaning: connection reset, DNS failure or a broken proxy (ECONNRESET, ENOTFOUND, EAI_AGAIN, socket hang up). Fix: check Clash and DNS, retry; switch to the official subscription while the proxy is unstable.",
    "errFilter": "Blocked by content filter",
    "errFilterHint": "Meaning: the request or the reply tripped the upstream content filter. Fix: rephrase the prompt, drop the sensitive attachment, or use another model / the official subscription.",
    "errGeneric": "Unknown error",
    "errGenericHint": "Meaning: an upstream error outside the buckets above. Fix: read the kept raw message, refresh the status and retry; switch to the official subscription if it repeats.",
    "errRaw": "Raw: {message}",
    "errAdvice": "What to do",
    "errTable": "Error codes and fixes",
    "officialTitle": "OpenCode status",
    "officialRefresh": "Refresh status",
    "officialRefreshHint": "Re-reads status.opencode.ai (OpenCode refreshes it about once a minute) together with the local probe result.",
    "officialSource": "status.opencode.ai · updated {time}",
    "officialStale": "Stale reading (updated {age})",
    "officialUnavailable": "Could not read the published status: {error}",
    "officialOpenStatus": "Open the status page",
    "officialStatusOperational": "Operational",
    "officialStatusDegraded": "Degraded",
    "officialStatusOutage": "Outage",
    "officialStatusMaintenance": "Maintenance",
    "officialStatusUnknown": "Unknown",
    "officialHintOperational": "OpenCode reports everything operational: the Go plan and the inference gateway are fine, keep using the plan.",
    "officialHintPartial": "OpenCode has an overall degradation, but the model you are using is fine right now — keep going, and only switch to the official subscription if it actually stalls.",
    "officialHintUpstream": "The upstream provider is degraded — not your key and not your allowance, OpenCode says so itself. Switch to the official subscription and keep working until it clears.",
    "officialHintCapacity": "OpenCode reports it is at capacity: the allowance is intact but the serving cells are full. Switch to the official subscription instead of retrying in a loop.",
    "officialHintRateLimit": "OpenCode reports rate limiting: new requests are being refused. Switch to the official subscription; it usually clears within minutes.",
    "officialHintOutage": "OpenCode reports an outage: this service is down. Switch to the official subscription now or the turn will sit in retries.",
    "officialHintMaintenance": "OpenCode is in planned maintenance; it comes back when the window closes. Switch to the official subscription if you need to keep going.",
    "officialHintUnknown": "OpenCode did not give a reason this card understands — open the status page for the incident.",
    "officialModelsTitle": "Models you are using",
    "officialModelMissing": "not listed by OpenCode",
    "officialSpeed": "{ttft} ms first token · {tps} tok/s",
    "officialIncidentsTitle": "Open incidents",
    "officialNoIncidents": "No open incidents",
    "officialIncident": "open {age}",
    "officialReason": "reason: {reason}",
    "officialReasonUpstream": "upstream provider",
    "officialReasonNone": "none",
    "officialReasonCapacity": "capacity",
    "officialReasonRateLimit": "rate limit",
    "officialReasonOther": "other",
    "officialServiceGo": "Go plan",
    "officialServiceInference": "Inference API",
    "officialServicePayg": "Pay-as-you-go",
    "officialServiceFree": "Free inference",
  },
    });
    /* @@EXTRA_LOCALES_END@@ */

    const localeOf = (tag) => {
      const value = String(tag || '').toLowerCase();
      if (value.startsWith('zh')) return /tw|hk|mo|hant/.test(value) ? 'zh-tw' : 'zh';
      for (const key of Object.keys(DICT)) if (key !== 'zh' && key !== 'zh-tw' && value.startsWith(key.split('-')[0])) return key;
      return 'en';
    };
    const LANG = localeOf(typeof navigator === 'undefined' ? '' : navigator.language);
    const dict = DICT[LANG] ?? DICT.en;
    const t = (key, vars) => {
      const template = dict[key] ?? DICT.en[key] ?? key;
      if (vars === undefined) return template;
      return template.replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])));
    };

    // The router stores machine reasons ("allowance recovered"); both the
    // settings page and the floating switch notice say what actually happened
    // instead of echoing the enum, so the mapping lives at module scope.
    const reasonText = (reason) => {
      const raw = String(reason ?? '');
      const zh = LANG === 'zh' || LANG === 'zh-tw';
      const pick = (zhText, enText) => (zh ? zhText : enText);
      const rules = [
        [/^allowance recovered/i, pick('额度已恢复，已切回 OpenCode 账户池', 'allowance recovered, back on the OpenCode pool')],
        [/^reset in Settings/i, pick('在设置里重置了封禁标记', 'marks were reset in Settings')],
        [/^selected in Settings/i, pick('在设置里手动设为当前账户', 'selected by hand in Settings')],
        [/^first account added/i, pick('首个账户已启用', 'the first account was enabled')],
        [/^initial$/i, pick('初始状态', 'initial')],
        [/^loaded$/i, pick('从状态文件恢复', 'restored from the state file')],
        [/^failover: (\S+) unavailable/i, pick('上一个账户不可用，已自动换下一个', 'the previous account went unavailable, switched to the next one')],
        [/^account failover after (\w+)/i, pick('鉴权失败（$1），已换下一个账户', 'authentication failed ($1), switched to the next account')],
        [/^quota failover from (\S+)/i, pick('$1 额度用尽，已换下一个账户', '$1 ran out of allowance, switched to the next account')],
        [/^every OpenCode account is out of allowance/i, pick('所有账户额度都用完了，暂时走官方直连', 'every account is out of allowance, using the official API for now')],
        [/^OpenCode authentication failed \((\w+)\)/i, pick('OpenCode 鉴权失败（$1），暂时走官方直连', 'OpenCode authentication failed ($1), using the official API for now')],
        [/^OpenCode quota window exhausted/i, pick('本窗口额度用尽，暂时走官方直连', 'this allowance window is used up, using the official API for now')],
        [/^OpenCode quota exhausted/i, pick('额度用尽，暂时走官方直连', 'out of allowance, using the official API for now')],
        [/^OpenCode upstream capacity\/overload/i, pick('OpenCode 上游容量不足/过载，暂时走官方直连', 'OpenCode upstream capacity/overload, using the official API for now')],
        [/^manual fallback in Settings/i, pick('在设置里手动切到官方直连', 'switched to the official API manually in Settings')],
        [/^manual primary in Settings/i, pick('在设置里手动切回 OpenCode', 'switched back to OpenCode manually in Settings')],
        [/^capacity probe/i, pick('自动探测后切回 OpenCode（若仍失败会再次回退）', 'probed and returned to OpenCode (falls back again if it still fails)')],
        [/^stable for (.+)$/i, pick('上游连续稳定 $1，已自动切回 OpenCode', 'upstream stayed clean for $1, switched back to OpenCode')],
        [/^probe failed/i, pick('探测失败，恢复观察窗口重新计时', 'the probe failed, the recovery window restarted')],
        [/^active account (\S+) removed/i, pick('当前账户被删除，已自动换下一个', 'the active account was deleted, switched to the next one')],
        [/^auth \((.+)\)/i, pick('鉴权失败：$1', 'authentication failed: $1')],
      ];
      for (const [pattern, text] of rules) {
        if (pattern.test(raw)) return raw.replace(pattern, text);
      }
      return raw;
    };
    // Wall clock for a notice that has to be checkable ("what time did it flip").
    const stamp = (ms) => (ms ? new Date(ms).toLocaleTimeString() : t('none'));

    const money = (value) => {
      if (value === undefined || value === null) return t('none');
      if (value === 'free') return t('free');
      if (value === Infinity) return t('unlimited');
      return value < 1 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
    };
    const tokens = (n) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
    const yuan = (value) => {
      if (value === undefined || value === null) return t('none');
      return value >= 1 ? `¥${value.toFixed(2)}` : `¥${value.toFixed(3)}`;
    };
    const percentText = (used, limit, free) => {
      if (free) return t('unlimited');
      if (limit === undefined || limit === null) return t('none');
      if (limit === Infinity || limit === 'free') return t('unlimited');
      if (!limit) return t('none');
      const ratio = (used / limit) * 100;
      return `${ratio < 10 ? ratio.toFixed(1) : ratio.toFixed(0)}%`;
    };
    const official = (window) => {
      const value = window && typeof window.percent === 'number' ? window.percent : null;
      if (value === null) return t('none');
      const color = value >= 100 ? '#d9534f' : value >= 80 ? '#e0a030' : 'inherit';
      return h('span', { style: { color } }, `${value < 10 ? value.toFixed(1) : Math.round(value)}%`);
    };
    const clock = (ms) => (ms ? new Date(ms).toLocaleString() : t('none'));
    const when = (ms) => {
      if (!ms) return t('none');
      const delta = ms - Date.now();
      if (delta <= 0) return LANG === 'zh' || LANG === 'zh-tw' ? '已到期' : 'expired';
      const minutes = Math.floor(delta / 60000);
      const seconds = Math.floor((delta % 60000) / 1000);
      const relative = LANG === 'zh' || LANG === 'zh-tw'
        ? minutes < 60
          ? `${minutes} 分 ${String(seconds).padStart(2, '0')} 秒后`
          : `${Math.round(minutes / 60)} 小时后`
        : new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return relative;
    };
    /** The other direction: `when` counts down, this says how long ago. */
    const ago = (ms) => {
      if (!ms) return t('none');
      const delta = Math.max(0, Date.now() - ms);
      const zh = LANG === 'zh' || LANG === 'zh-tw';
      if (delta < 45_000) return zh ? '刚刚' : 'just now';
      const minutes = Math.floor(delta / 60000);
      if (minutes < 60) return zh ? `${minutes} 分钟前` : `${minutes} min ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return zh ? `${hours} 小时前` : `${hours} h ago`;
      return clock(ms);
    };

    // The dialog floats over the page, so it cannot inherit a translucent surface:
    // it needs a solid fill and an explicit text colour. Which palette it gets is
    // decided by the harness itself — read the painted page background, so the
    // dialog follows whatever the appearance setting (light / dark / system) chose.
    const rgbOf = (value) => {
      const match = /rgba?\(([^)]+)\)/.exec(String(value ?? ''));
      if (match === null) return null;
      const parts = match[1].split(/[,/\s]+/).filter((part) => part.length > 0).map(Number);
      if (parts.length < 3 || parts.slice(0, 3).some((part) => !Number.isFinite(part))) return null;
      return parts.slice(0, 3);
    };
    const luminance = (value) => {
      const rgb = rgbOf(value);
      if (rgb === null) return null;
      const [r, g, b] = rgb.map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const pageIsDark = () => {
      try {
        const body = document.body;
        const root = document.documentElement;
        const probe = luminance(body === null ? '' : getComputedStyle(body).backgroundColor)
          ?? luminance(root === null ? '' : getComputedStyle(root).backgroundColor);
        if (probe !== null) return probe < 0.35;
      } catch {
        // Fall through to the media query when the DOM is not readable.
      }
      return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    const theme = () => (pageIsDark()
      ? { panel: '#202124', text: '#e8eaed', line: 'rgba(255,255,255,.16)', scrim: 'rgba(0,0,0,.55)' }
      : { panel: '#f7f7f8', text: '#1a1a1a', line: 'rgba(0,0,0,.12)', scrim: 'rgba(0,0,0,.38)' });

    // Model ids read badly in a table ("deepseek-v4.1-flash"); the page shows the
    // vendor casing plus spaces instead.
    const MODEL_CASE = [
      [/^deepseek/i, 'DeepSeek'], [/^glm/i, 'GLM'], [/^gpt/i, 'GPT'], [/^claude/i, 'Claude'],
      [/^grok/i, 'Grok'], [/^qwen/i, 'Qwen'], [/^kimi/i, 'Kimi'], [/^minimax/i, 'MiniMax'],
      [/^mimo/i, 'MiMo'], [/^longcat/i, 'LongCat'], [/^hunyuan/i, 'Hunyuan'], [/^hy\d/i, 'Hunyuan'],
      [/^muse/i, 'Muse'],
    ];
    const prettyModel = (id) => {
      const text = String(id ?? '');
      let head = '';
      let rest = text;
      for (const [pattern, name] of MODEL_CASE) {
        if (!pattern.test(text)) continue;
        head = name;
        rest = text.replace(pattern, '');
        break;
      }
      const tail = rest
        .replace(/[-_]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      return [head, tail].filter(Boolean).join(' ');
    };

    const btn = {
      padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(127,127,127,.45)',
      background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: 12,
      lineHeight: 1.6, whiteSpace: 'nowrap',
    };
    const input = {
      padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(127,127,127,.45)',
      background: 'transparent', color: 'inherit', font: 'inherit', fontSize: 13,
    };
    const cell = (content, extra) =>
      h('td', { style: { padding: '5px 10px', borderBottom: '1px solid rgba(127,127,127,.22)', whiteSpace: 'nowrap', ...extra } }, content);
    const th = (title) =>
      h('th', {
        key: title,
        style: {
          textAlign: 'left', padding: '6px 10px', fontWeight: 600, whiteSpace: 'nowrap',
          borderBottom: '1px solid rgba(127,127,127,.3)', position: 'sticky', top: 0,
          background: 'var(--dsh-surface, rgba(127,127,127,.08))', backdropFilter: 'blur(4px)',
        },
      }, title);

    // Horizontal drag-to-scroll for wide tables: press anywhere in the pane and
    // drag. A press that starts on a control is left alone, so buttons and inputs
    // keep working inside the scroller.
    const draggable = () => ({
      onMouseDown: (event) => {
        if (event.button !== 0) return;
        const tag = event.target && event.target.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'A') return;
        const pane = event.currentTarget;
        if (pane.scrollWidth <= pane.clientWidth + 1) return;
        const startX = event.clientX;
        const startLeft = pane.scrollLeft;
        const move = (moveEvent) => {
          pane.scrollLeft = startLeft - (moveEvent.clientX - startX);
        };
        const stop = () => {
          pane.style.cursor = 'grab';
          pane.style.userSelect = '';
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', stop);
        };
        pane.style.cursor = 'grabbing';
        pane.style.userSelect = 'none';
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
      },
    });

    const STATUS = () => ({
      ready: [t('statusReady'), '#3c9d5d'],
      exhausted: [t('statusExhausted'), '#e0a030'],
      auth: [t('statusAuth'), '#d9534f'],
      disabled: [t('statusDisabled'), 'rgba(127,127,127,.8)'],
      missing: [t('statusMissing'), '#d9534f'],
    });

    const capabilityTags = (row) => {
      const inputs = Array.isArray(row.inputs) && row.inputs.length > 0 ? row.inputs : ['text'];
      const hintOf = {
        text: 'capHintText', image: 'capHintImage', video: 'capHintVideo',
        audio: 'capHintAudio', pdf: 'capHintPdf',
      };
      const tags = inputs.map((kind) => ({
        key: kind,
        label: {
          text: t('capsText'), image: t('capsImage'), video: t('capsVideo'),
          audio: t('capsAudio'), pdf: t('capsPdf'),
        }[kind] ?? kind,
        hint: t(hintOf[kind] ?? 'capHintText'),
      }));
      if (row.tools === true) tags.push({ key: 'tools', label: t('capsTools'), hint: t('capHintTools') });
      if (row.reasoning === true) tags.push({ key: 'reasoning', label: t('capsReasoning'), hint: t('capHintReasoning') });
      return tags;
    };

    function WindowBar({ window, label }) {
      const value = typeof window?.percent === 'number' ? window.percent : null;
      const width = value === null ? 0 : Math.max(2, Math.min(100, value));
      const color = value === null ? 'rgba(127,127,127,.4)' : value >= 100 ? '#d9534f' : value >= 80 ? '#e0a030' : '#3c9d5d';
      return h('div', { style: { marginBottom: 10 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 } },
          h('span', null, label),
          h('span', { style: { fontWeight: 600, color: value !== null && value >= 80 ? color : 'inherit' } },
            value === null ? t('none') : `${value < 10 ? value.toFixed(1) : Math.round(value)}%`),
        ),
        h('div', { style: { height: 6, borderRadius: 999, background: 'rgba(127,127,127,.2)', overflow: 'hidden' } },
          h('div', { style: { width: `${width}%`, height: '100%', background: color, borderRadius: 999 } }),
        ),
        window?.resetsAt
          ? h('div', { style: { fontSize: 11, opacity: .55, marginTop: 3 } }, t('resetsAt', { time: new Date(window.resetsAt).toLocaleString() }))
          : null,
      );
    }

    function UsageDialog({ account, busy, onProbe, onClose }) {
      if (!account) return null;
      const skin = theme();
      return h('div', {
        style: {
          position: 'fixed', inset: 0, background: skin.scrim, zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        },
        onMouseDown: (event) => { if (event.target === event.currentTarget) onClose(); },
      },
        h('div', {
          style: {
            minWidth: 380, maxWidth: 520, width: '100%', padding: '16px 18px', borderRadius: 10,
            background: skin.panel, color: skin.text, opacity: 1,
            border: `1px solid ${skin.line}`, boxShadow: '0 18px 48px rgba(0,0,0,.45)',
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
            h('div', { style: { fontWeight: 600, fontSize: 14 } }, t('dialogTitle', { label: account.label })),
            account.active ? h('span', {
              style: { fontSize: 11, padding: '1px 6px', borderRadius: 999, border: '1px solid rgba(60,157,93,.6)', color: '#3c9d5d' },
            }, t('statusCurrent')) : null,
            h('span', { style: { flex: 1 } }),
            h('button', { type: 'button', className: 'ocr-btn', style: btn, onClick: onClose }, t('close')),
          ),
          h('div', { style: { fontSize: 12, opacity: .6, marginBottom: 12 } },
            account.hint ? h('span', { style: { fontFamily: 'ui-monospace, Consolas, monospace' } }, account.hint) : t('notConfigured')),
          h(WindowBar, { window: account.usage?.rolling, label: t('colRolling') }),
          h(WindowBar, { window: account.usage?.weekly, label: t('colWeekly') }),
          h(WindowBar, { window: account.usage?.monthly, label: t('colMonthly') }),
          account.usageError ? h('div', { style: { color: '#d9534f', fontSize: 12, marginBottom: 8 } }, t('usageError', { message: account.usageError })) : null,
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 } },
            account.checkedAt ? h('span', { style: { fontSize: 11, opacity: .55 } }, t('probedAt', { time: clock(account.checkedAt) })) : null,
            h('span', { style: { flex: 1 } }),
            h('button', { type: 'button', className: 'ocr-btn', style: btn, disabled: busy, onClick: onProbe }, t('dialogProbe')),
          ),
          h('div', { style: { fontSize: 11, opacity: .55, marginTop: 12, lineHeight: 1.6 } }, t('dialogNote')),
        ),
      );
    }

    function UsageSection() {
      const [state, setState] = React.useState({ phase: 'loading', usage: null, router: null, error: null });
      const [notice, setNotice] = React.useState(null);
      const [actionError, setActionError] = React.useState(null);
      const [draft, setDraft] = React.useState({ label: '', key: '' });
      const [editing, setEditing] = React.useState(null);
      const [keyDraft, setKeyDraft] = React.useState('');
      const [inspecting, setInspecting] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [showTop, setShowTop] = React.useState(false);
      const scroller = React.useRef(null);
      // The settings pane scrolls, not the window, so the listener is attached in
      // the capture phase and remembers whichever element actually scrolled.
      React.useEffect(() => {
        const onScroll = (event) => {
          const target = event.target;
          if (target && target !== document && typeof target.scrollTop === 'number') {
            scroller.current = target;
            setShowTop(target.scrollTop > 320);
            return;
          }
          setShowTop((window.scrollY ?? document.documentElement.scrollTop ?? 0) > 320);
        };
        document.addEventListener('scroll', onScroll, true);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
          document.removeEventListener('scroll', onScroll, true);
          window.removeEventListener('scroll', onScroll);
        };
      }, []);
      const toTop = () => {
        const pane = scroller.current;
        if (pane && typeof pane.scrollTo === 'function') pane.scrollTo({ top: 0, behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      // Re-render every second so the "next probe" line counts down instead of
      // freezing at whatever it said when the page opened.
      const [, setTick] = React.useState(0);
      React.useEffect(() => {
        const timer = setInterval(() => setTick((value) => value + 1), 1000);
        return () => clearInterval(timer);
      }, []);

      // Appearance can change while the page is open (light / dark / follow system),
      // and the shell does not re-render plugin code on its own: watch the two
      // signals that carry the change and force a repaint.
      React.useEffect(() => {
        const bump = () => setTick((value) => value + 1);
        const media = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-color-scheme: dark)')
          : null;
        media?.addEventListener?.('change', bump);
        let observer;
        try {
          observer = new MutationObserver(bump);
          observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style', 'data-theme', 'data-color-mode', 'data-appearance'],
          });
          if (document.body !== null) {
            observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
          }
        } catch {
          observer = undefined;
        }
        return () => {
          media?.removeEventListener?.('change', bump);
          observer?.disconnect();
        };
      }, []);

      const load = React.useCallback(async (force) => {
        try {
          const [usageResponse, routerResponse] = await Promise.all([
            fetch(`${USAGE_API}${force ? '?refresh=1' : ''}`, { headers: { accept: 'application/json' } }),
            fetch(ROUTER_API, { headers: { accept: 'application/json' } }).catch(() => null),
          ]);
          if (!usageResponse.ok) throw new Error(`HTTP ${usageResponse.status}`);
          const usage = await usageResponse.json();
          let router = null;
          if (routerResponse && routerResponse.ok) {
            try { router = await routerResponse.json(); } catch { router = null; }
          }
          setState({ phase: 'ready', usage, router, error: null });
        } catch (error) {
          setState((previous) => ({ ...previous, phase: 'error', error: String(error?.message ?? error) }));
        }
      }, []);

      const act = React.useCallback(async (payload) => {
        setBusy(true);
        setActionError(null);
        setNotice(null);
        try {
          const response = await fetch(ROUTER_API, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify(payload),
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
          await load(true);
          return true;
        } catch (error) {
          setActionError(String(error?.message ?? error));
          return false;
        } finally {
          setBusy(false);
        }
      }, [load]);

      // Editing a key starts from the stored value, so the input is pre-filled.
      const revealKey = React.useCallback(async (id) => {
        try {
          const response = await fetch(`${ROUTER_API}?key=${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
          if (typeof body?.key === 'string') setKeyDraft(body.key);
        } catch (error) {
          setActionError(String(error?.message ?? error));
        }
      }, []);

      React.useEffect(() => {
        let alive = true;
        const run = (force) => {
          if (!alive) return;
          void load(force);
        };
        run(false);
        const timer = setInterval(() => run(false), 60000);
        return () => {
          alive = false;
          clearInterval(timer);
        };
      }, [load]);

      const data = state.usage;
      const router = state.router;
      const statusText = STATUS();
      const chinese = LANG === 'zh' || LANG === 'zh-tw';

      // A vendor badge per model family: the mark and the tint both come from the
      // family, so a card's gradient matches its avatar.
      const LOGOS = {
        deepseek: 'M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45',
        claude: 'm4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z',
        grok: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
        qwen: 'M23.919 14.545 20.817 9.17l1.47-2.544a.56.56 0 0 0 0-.566l-1.633-2.83a.57.57 0 0 0-.49-.283h-6.207L12.487.402a.57.57 0 0 0-.49-.284H8.732a.56.56 0 0 0-.49.284L5.139 5.775h-2.94a.56.56 0 0 0-.49.284L.077 8.887a.56.56 0 0 0 0 .567L3.18 14.83l-1.47 2.545a.56.56 0 0 0 0 .566l1.634 2.83a.57.57 0 0 0 .49.283h6.205l1.47 2.545a.57.57 0 0 0 .49.284h3.266a.57.57 0 0 0 .49-.284l3.104-5.375h2.94a.57.57 0 0 0 .49-.283l1.634-2.828a.55.55 0 0 0-.004-.568M8.733.686l1.634 2.828-1.634 2.828H21.8L20.164 9.17H7.425L5.63 6.06Zm1.306 19.801-6.205-.002 1.634-2.83h3.265L2.201 6.344h3.267q3.182 5.517 6.367 11.032zm10.124-5.66L18.53 12l-6.532 11.315-1.634-2.83c2.129-3.673 4.25-7.351 6.373-11.028h3.592l3.102 5.374z',
        kimi: 'M21.765.351C22.998.351 24 1.353 24 2.586S22.998 4.82 21.765 4.82h-1.974c-.15 0-.26-.12-.26-.26V2.586A2.237 2.237 0 0 1 21.765.35M9.41 13.388l8.447-8.377c.16-.16.07-.471-.14-.471h-4.55s-.1.02-.14.06l-9.099 9.029c-.14.14-.35.02-.35-.21V4.81c0-.15-.1-.27-.221-.27H.22c-.12 0-.22.12-.22.27v18.57c0 .15.1.27.22.27h3.137c.12 0 .22-.12.22-.27v-3.79c0-.08.03-.16.08-.21l2.826-2.796c.07-.07.16-.08.241-.03l7.546 5.551a8.9 8.9 0 0 0 4.018 1.493c.12.01.23-.11.23-.27V19.76c0-.14-.08-.25-.19-.26a5.8 5.8 0 0 1-2.355-.942l-6.533-4.73c-.14-.09-.15-.32-.03-.441',
        minimax: 'M11.43 3.92a.86.86 0 1 0-1.718 0v14.236a1.999 1.999 0 0 1-3.997 0V9.022a.86.86 0 1 0-1.718 0v3.87a1.999 1.999 0 0 1-3.997 0V11.49a.57.57 0 0 1 1.139 0v1.404a.86.86 0 0 0 1.719 0V9.022a1.999 1.999 0 0 1 3.997 0v9.134a.86.86 0 0 0 1.719 0V3.92a1.998 1.998 0 1 1 3.996 0v11.788a.57.57 0 1 1-1.139 0zm10.572 3.105a2 2 0 0 0-1.999 1.997v7.63a.86.86 0 0 1-1.718 0V3.923a1.999 1.999 0 0 0-3.997 0v16.16a.86.86 0 0 1-1.719 0V18.08a.57.57 0 1 0-1.138 0v2a1.998 1.998 0 0 0 3.996 0V3.92a.86.86 0 0 1 1.719 0v12.73a1.999 1.999 0 0 0 3.996 0V9.023a.86.86 0 1 1 1.72 0v6.686a.57.57 0 0 0 1.138 0V9.022a2 2 0 0 0-1.998-1.997',
        mimo: 'M12 0C8.016 0 4.756.255 2.493 2.516.23 4.776 0 8.033 0 12.012c0 3.98.23 7.235 2.494 9.497C4.757 23.77 8.017 24 12 24c3.983 0 7.243-.23 9.506-2.491C23.77 19.247 24 15.99 24 12.012c0-3.984-.233-7.243-2.502-9.504C19.234.252 15.978 0 12 0zM4.906 7.405h5.624c1.47 0 3.007.068 3.764.827.746.746.827 2.233.83 3.676v4.54a.15.15 0 0 1-.152.147h-1.947a.15.15 0 0 1-.152-.148V11.83c-.002-.806-.048-1.634-.464-2.051-.358-.36-1.026-.441-1.72-.458H7.158a.15.15 0 0 0-.151.147v6.98a.15.15 0 0 1-.152.148H4.906a.15.15 0 0 1-.15-.148V7.554a.15.15 0 0 1 .15-.149zm12.131 0h1.949a.15.15 0 0 1 .15.15v8.892a.15.15 0 0 1-.15.148h-1.949a.15.15 0 0 1-.151-.148V7.554a.15.15 0 0 1 .151-.149zM8.92 10.948h2.046c.083 0 .15.066.15.147v5.352a.15.15 0 0 1-.15.148H8.92a.15.15 0 0 1-.152-.148v-5.352a.15.15 0 0 1 .152-.147Z',
      };

      const VENDORS = [
        [/^deepseek/i, { mark: 'DS', name: 'DeepSeek', color: '#4d6bfe', logo: 'deepseek' }],
        [/^glm/i, { mark: 'GLM', name: 'Zhipu', color: '#3b6cf6' }],
        [/^gpt/i, { mark: 'GPT', name: 'OpenAI', color: '#10a37f' }],
        [/^claude/i, { mark: 'C', name: 'Anthropic', color: '#d97757', logo: 'claude' }],
        [/^grok/i, { mark: 'X', name: 'xAI', color: '#64748b', logo: 'grok' }],
        [/^qwen/i, { mark: 'Q', name: 'Qwen', color: '#615ced', logo: 'qwen' }],
        [/^kimi/i, { mark: 'K', name: 'Moonshot', color: '#8b5cf6', logo: 'kimi' }],
        [/^minimax/i, { mark: 'MM', name: 'MiniMax', color: '#ff6b00', logo: 'minimax' }],
        [/^mimo/i, { mark: 'Mi', name: 'MiMo', color: '#ff6900', logo: 'mimo' }],
        [/^longcat/i, { mark: 'LC', name: 'LongCat', color: '#f59e0b' }],
        [/^hy\d/i, { mark: 'H', name: 'Hunyuan', color: '#0057ff' }],
        [/^muse/i, { mark: 'M', name: 'Muse', color: '#a855f7' }],
        [/free$/i, { mark: '∞', name: 'Free', color: '#3c9d5d' }],
      ];
      const vendorOf = (model) => {
        const hit = VENDORS.find(([pattern]) => pattern.test(model));
        const vendor = hit ? { ...hit[1] } : { mark: String(model).slice(0, 2).toUpperCase(), name: model, color: '#6b7280' };
        if (vendor.logo && LOGOS[vendor.logo]) vendor.path = LOGOS[vendor.logo];
        return vendor;
      };

      const CAP_ICON = {
        text: '📝', image: '🖼️', video: '🎬', audio: '🎵', pdf: '📄',
        tools: '🛠️', reasoning: '🧠',
      };
      const capIcon = (key) => CAP_ICON[key] ?? '•';

      const routerAccounts = new Map((router?.accounts ?? []).map((account) => [account.id, account]));
      const usageAccounts = data?.accounts ?? [];
      const accountIds = router?.accounts?.length
        ? router.accounts.map((account) => account.id)
        : usageAccounts.map((account) => account.id);
      const accountList = accountIds.map((id) => {
        const fromRouter = routerAccounts.get(id);
        const fromUsage = usageAccounts.find((account) => account.id === id);
        return {
          id,
          label: fromRouter?.label ?? fromUsage?.label ?? id,
          hint: fromRouter?.hint ?? fromUsage?.hint ?? null,
          keyRef: fromRouter?.keyRef,
          active: fromRouter?.active ?? fromUsage?.active ?? false,
          enabled: fromRouter?.enabled ?? fromUsage?.enabled ?? true,
          status: fromRouter?.status ?? null,
          exhaustedUntil: fromRouter?.exhaustedUntil ?? null,
          usage: fromRouter?.usage ?? fromUsage?.usage ?? null,
          usageError: fromUsage?.usageError ?? null,
          checkedAt: fromRouter?.checkedAt ?? fromUsage?.checkedAt ?? null,
          configured: fromRouter?.configured ?? fromUsage?.configured ?? false,
        };
      });

      // Layout primitives: every block is a card with its own padding and gap, so
      // buttons never sit flush against each other or against the table edges.
      const card = (...children) => h('div', {
        style: {
          padding: '14px 16px', border: '1px solid rgba(127,127,127,.25)', borderRadius: 10,
          background: 'var(--dsh-surface, rgba(127,127,127,.04))',
          display: 'flex', flexDirection: 'column', gap: 12,
        },
      }, ...children);

      const cardHead = (text, extra) => h('div', {
        style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
      },
        h('span', { style: { fontWeight: 600, fontSize: 13 } }, text),
        extra ?? null,
      );

      // The status card carries two authorities side by side, so a section is a
      // column with its own small head rather than a card nested in a card.
      const section = (...children) => h('div', {
        style: { display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 360px', minWidth: 0 },
      }, ...children);
      const sectionHead = (text, extra) => h('div', {
        style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
      },
        h('span', { style: { fontWeight: 600, fontSize: 12.5, opacity: .9 } }, text),
        extra ?? null,
      );

      const stat = (label, value) => h('div', {
        style: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 96 },
      },
        h('span', { style: { fontSize: 11, opacity: .55 } }, label),
        h('span', { style: { fontSize: 13, fontWeight: 500 } }, value),
      );

      const tools = (...children) => h('div', {
        style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
      }, ...children);

      const pill = (text, color) => h('span', {
        style: {
          fontSize: 11, padding: '1px 8px', borderRadius: 999,
          border: `1px solid ${color}99`, color,
        },
      }, text);

      const accountCards = accountList.map((account, index) => {
        const [text, color] = statusText[account.status] ?? [
          account.usageError ? t('statusError') : account.enabled === false ? t('statusDisabled') : account.active ? t('statusActive') : t('statusSpare'),
          account.usageError ? '#d9534f' : 'inherit',
        ];
        return h('div', {
          key: account.id,
          style: {
            display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px', borderRadius: 10,
            border: `1px solid ${account.active ? 'rgba(60,157,93,.45)' : 'rgba(127,127,127,.22)'}`,
            background: account.active ? 'rgba(60,157,93,.06)' : 'rgba(127,127,127,.03)',
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
            h('span', { style: { opacity: .45, fontSize: 11 } }, `#${index + 1}`),
            h('span', { style: { fontWeight: 600, fontSize: 13 } }, account.label),
            account.active ? pill(t('statusCurrent'), '#3c9d5d') : null,
            h('span', {
              style: { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, opacity: account.hint ? .65 : .45 },
            }, account.hint ?? t('notConfigured')),
            h('span', { style: { flex: 1 } }),
            h('span', { style: { color, fontSize: 12 } },
              text,
              account.exhaustedUntil ? ` · ${clock(account.exhaustedUntil)}` : ''),
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 } },
            stat(t('colRolling'), official(account.usage?.rolling)),
            stat(t('colWeekly'), official(account.usage?.weekly)),
            stat(t('colMonthly'), official(account.usage?.monthly)),
          ),
          router
            ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 2 } },
                h('button', { type: 'button', className: 'ocr-btn', style: btn, onClick: () => setInspecting(account.id) }, t('viewUsage')),
                h('button', { type: 'button', className: 'ocr-btn', style: btn, disabled: busy || account.active, onClick: () => void act({ action: 'activate', id: account.id }) }, t('setActive')),
                h('button', { type: 'button', className: 'ocr-btn', style: btn, disabled: busy, onClick: () => void act({ action: 'update', id: account.id, enabled: !account.enabled }) }, account.enabled ? t('disable') : t('enable')),
                h('button', { type: 'button', className: 'ocr-btn', style: btn, disabled: busy, onClick: () => { void act({ action: 'move', id: account.id, direction: 'up' }); } }, '↑'),
                h('button', { type: 'button', className: 'ocr-btn', style: btn, disabled: busy, onClick: () => { void act({ action: 'move', id: account.id, direction: 'down' }); } }, '↓'),
                h('button', {
                  type: 'button', className: 'ocr-btn', style: btn, disabled: busy,
                  onClick: () => {
                    if (editing === account.id) {
                      setEditing(null);
                      setKeyDraft('');
                      return;
                    }
                    setEditing(account.id);
                    setKeyDraft('');
                    void revealKey(account.id);
                  },
                }, t('editKey')),
                h('button', {
                  type: 'button', className: 'ocr-btn', style: { ...btn, color: '#d9534f' }, disabled: busy,
                  onClick: () => {
                    if (accountList.length <= 1) {
                      setActionError(t('keepOne'));
                      return;
                    }
                    void act({ action: 'remove', id: account.id });
                  },
                }, t('remove')),
              )
            : h('span', { style: { opacity: .5, fontSize: 12 } }, t('readonly')),
          editing === account.id
            ? h('div', {
                style: {
                  display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
                  paddingTop: 10, borderTop: '1px solid rgba(127,127,127,.18)',
                },
              },
                h('input', {
                  style: { ...input, minWidth: 340, fontFamily: 'ui-monospace, Consolas, monospace' },
                  type: 'text', spellCheck: false, placeholder: 'oc_sk_…', value: keyDraft,
                  onChange: (event) => setKeyDraft(event.target.value),
                }),
                h('button', {
                  type: 'button', className: 'ocr-btn', style: btn, disabled: keyDraft.length === 0,
                  onClick: async () => {
                    try {
                      await navigator.clipboard.writeText(keyDraft);
                      setNotice(t('copied'));
                    } catch (error) {
                      setActionError(String(error?.message ?? error));
                    }
                  },
                }, t('copyKey')),
                h('button', {
                  type: 'button', className: 'ocr-btn', style: btn, disabled: busy || keyDraft.trim().length < 8,
                  onClick: async () => {
                    const ok = await act({ action: 'update', id: account.id, key: keyDraft.trim() });
                    if (ok) {
                      setEditing(null);
                      setKeyDraft('');
                      setNotice(t('keyUpdated'));
                    }
                  },
                }, t('save')),
                h('button', { type: 'button', className: 'ocr-btn', style: btn, onClick: () => { setEditing(null); setKeyDraft(''); } }, t('cancel')),
              )
            : null,
        );
      });

      const addAccount = async () => {
        if (draft.key.trim().length < 8) {
          setActionError(t('shortKey'));
          return;
        }
        const ok = await act({ action: 'add', label: draft.label.trim(), key: draft.key.trim() });
        if (ok) {
          setDraft({ label: '', key: '' });
          setNotice(t('accountAdded'));
        }
      };

      const modelCards = (data?.models ?? []).map((row) => {
        const vendor = vendorOf(row.model);
        const chips = capabilityTags(row);
        return h('div', {
          key: row.model,
          style: {
            display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', borderRadius: 10,
            border: `1px solid ${vendor.color}3d`,
            background: `linear-gradient(135deg, ${vendor.color}2e, ${vendor.color}0f 55%, rgba(127,127,127,.03))`,
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
            h('span', {
              style: {
                width: 30, height: 30, borderRadius: '50%', flex: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${vendor.color}26`, border: `1px solid ${vendor.color}80`,
                color: vendor.color, fontSize: 11, fontWeight: 700,
              },
            },
              vendor.path
                ? h('svg', { viewBox: '0 0 24 24', width: 17, height: 17, role: 'img', 'aria-label': vendor.name },
                    h('path', { d: vendor.path, fill: vendor.color }),
                  )
                : vendor.mark,
            ),
            h('span', { style: { fontWeight: 600, fontSize: 13 } }, prettyModel(row.model)),
            row.free ? pill(t('unlimited'), '#3c9d5d') : null,
          ),
          chips.length > 0
            ? h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                chips.map((chip) => h('span', {
                  key: chip.key,
                  title: chip.hint,
                  style: {
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 999, fontSize: 11, cursor: 'help',
                    border: `1px solid ${vendor.color}59`, background: `${vendor.color}14`, color: 'inherit',
                  },
                }, h('span', null, capIcon(chip.key)), h('span', null, chip.label))),
              )
            : null,
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 12 } },
            stat(t('colRemaining'), row.free ? t('unlimited') : money(row.remaining)),
            stat(t('colMonthlyUsed'), row.free ? t('unlimited') : `${money(row.monthly)} / ${money(row.limit)}`),
            stat(t('colWeeklyUsed'), row.free ? t('unlimited') : money(row.weekly)),
            stat(t('colRollingQuota'), percentText(row.rolling, row.rollingLimit, row.free)),
            stat(t('colRequests'), String(row.requests)),
          ),
        );
      });

      const peak = data?.peak;
      const quotaSpent = typeof data?.usage?.monthly?.percent === 'number' ? data.usage.monthly.percent : null;
      const exhausted = quotaSpent !== null && quotaSpent >= 100;
      const shown = peak;
      const allGo = shown ? shown.models.every((row) => row.cheaper === 'go') : false;
      const saving = shown && shown.models.length > 0
        ? Math.round(Math.max(...shown.models.map((row) => (row.cheaper === 'go' ? (1 - row.ratio) * 100 : (row.ratio - 1) * 100))))
        : 0;
      const verdict = exhausted
        ? t('verdictExhausted')
        : allGo ? t('verdictGo', { percent: saving }) : t('verdictOfficial', { percent: saving });
      const verdictColor = exhausted ? '#e0a030' : allGo ? '#3c9d5d' : '#e0a030';
      const priceCell = (price, peakFlag, winner) => h('span', {
        style: winner
          ? { fontWeight: 600, color: '#3c9d5d', background: 'rgba(60,157,93,.12)', padding: '1px 6px', borderRadius: 4 }
          : undefined,
      }, yuan(price));

      // Both sides run the same wall-clock windows but keep different holiday
      // calendars, so the page reports them separately with a countdown.
      const clockInfo = data?.clock ?? null;
      const periodOf = (side) => (side?.peak ? t('clockPeak') : t('clockOff'));
      const withPeriod = (label, side) => {
        if (!side) return label;
        const period = periodOf(side);
        // Full-width brackets read correctly in Chinese, but look odd in Latin text.
        return /^zh/i.test(LANG) ? `${label}（${period}）` : `${label} (${period})`;
      };
      const clockLine = (label, side) => h('div', {
        style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, flexWrap: 'wrap' },
      },
        h('span', { style: { minWidth: 96, opacity: .75 } }, label),
        side ? pill(periodOf(side), side.peak ? '#e0a030' : '#3c9d5d') : h('span', { style: { opacity: .5 } }, t('none')),
        side && typeof side.hours === 'number'
          ? h('span', { style: { opacity: .65 } }, t('clockFlip', {
              hours: side.hours.toFixed(1),
              next: side.peak ? t('clockOff') : t('clockPeak'),
            }))
          : null,
      );

      const inspectingAccount = accountList.find((account) => account.id === inspecting) ?? null;

      // ---- Upstream status --------------------------------------------------
      // Every bucket the host can produce, with the fix that belongs to it. The
      // card shows the current one; the details block lists the whole table so
      // an unfamiliar code can be looked up without leaving Settings.
      const CODES = [
        { code: 'ok', label: 'codeOk', hint: 'statusHintHealthy' },
        { code: 'rate_limit', label: 'errRateLimit', hint: 'errRateLimitHint' },
        { code: 'capacity', label: 'errCapacity', hint: 'errCapacityHint' },
        { code: 'quota', label: 'errQuota', hint: 'errQuotaHint' },
        { code: 'payment', label: 'errPayment', hint: 'errPaymentHint' },
        { code: 'auth', label: 'errAuth', hint: 'errAuthHint' },
        { code: 'missing_key', label: 'errMissingKey', hint: 'errMissingKeyHint' },
        { code: 'sign_in', label: 'errSignIn', hint: 'errSignInHint' },
        { code: 'upgrade', label: 'errUpgrade', hint: 'errUpgradeHint' },
        { code: 'not_found', label: 'errNotFound', hint: 'errNotFoundHint' },
        { code: 'bad_request', label: 'errBadRequest', hint: 'errBadRequestHint' },
        { code: 'context', label: 'errContext', hint: 'errContextHint' },
        { code: 'timeout', label: 'errTimeout', hint: 'errTimeoutHint' },
        { code: 'server', label: 'errServer', hint: 'errServerHint' },
        { code: 'network', label: 'errNetwork', hint: 'errNetworkHint' },
        { code: 'filter', label: 'errFilter', hint: 'errFilterHint' },
        { code: 'error', label: 'errGeneric', hint: 'errGenericHint' },
      ];
      const codeColor = (code) => (code === 'ok' ? '#3c9d5d'
        : code === 'quota' || code === 'payment' || code === 'auth' || code === 'missing_key' || code === 'sign_in' ? '#d9534f'
          : code === 'not_found' || code === 'upgrade' ? '#8a63d2'
            : code === 'capacity' || code === 'rate_limit' ? '#e0a030'
              : '#c4713a');
      const codeMeta = (code) => {
        const hit = CODES.find((entry) => entry.code === code) ?? CODES[CODES.length - 1];
        return { code, label: t(hit.label), hint: t(hit.hint) };
      };
      // Compact "how long is left" for the recovery countdown, in the page's
      // language, without the "in ..." phrasing `when()` produces.
      const left = (ms) => {
        if (!ms || ms <= 0) return t('none');
        const total = Math.ceil(ms / 1000);
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        return chinese ? `${minutes} 分 ${String(seconds).padStart(2, '0')} 秒` : `${minutes}m ${String(seconds).padStart(2, '0')}s`;
      };
      const upstream = router?.upstream ?? null;
      const upstreamMeta = (() => {
        if (!upstream) return null;
        const minutes = (ms) => Math.max(1, Math.round((ms ?? 0) / 60000));
        const stable = minutes(upstream.recovery?.requiredMs);
        const windowMin = minutes(upstream.windowMs);
        const states = {
          healthy: [t('statusStateHealthy'), '#3c9d5d'],
          degraded: [t('statusStateDegraded'), '#e0a030'],
          fallback: [t('statusStateFallback'), '#4d6bfe'],
          recovering: [t('statusStateRecovering'), '#4d6bfe'],
          unknown: [t('statusStateUnknown'), '#8a8f98'],
        };
        const [label, color] = states[upstream.state] ?? states.unknown;
        const fallbackModel = upstream.models?.[0]?.fallback?.model ?? '';
        let hint;
        if (upstream.state === 'recovering') {
          hint = t('statusHintRecovering', { remaining: left(upstream.recovery?.remainingMs ?? 0), stable });
        } else if (upstream.state === 'fallback') {
          hint = upstream.cause === 'manual'
            ? t('statusHintManual', { stable, model: fallbackModel })
            : t('statusHintFallback', { stable, model: fallbackModel });
        } else if (upstream.state === 'degraded') {
          hint = codeMeta(upstream.code).hint;
        } else if (upstream.state === 'healthy') {
          hint = t('statusHintHealthy');
        } else {
          hint = t('statusHintUnknown');
        }
        // `blocked` only ever matters while the window is stopped; a recovering
        // state means the Host already cleared it.
        const blockedNote = upstream.state === 'fallback' && upstream.recovery?.blocked === 'published' ? ` ${t('statusBlockedPublished')}`
          : upstream.state === 'fallback' && upstream.recovery?.blocked === 'probe' ? ` ${t('statusBlockedProbe')}` : '';
        return { label, color, hint: `${hint}${blockedNote}`, stable, windowMin };
      })();
      const chip = (text, color, tip) => h('span', {
        title: tip,
        style: {
          fontSize: 11, padding: '1px 8px', borderRadius: 999, cursor: tip ? 'help' : 'default',
          border: `1px solid ${color}99`, color, background: `${color}18`,
          display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        },
      }, text);
      // A bare duration ("3 小时 20 分"), for "how long has this been open".
      const span = (ms) => {
        const minutes = Math.max(0, Math.round((ms ?? 0) / 60000));
        if (minutes < 60) return chinese ? `${minutes} 分钟` : `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const rest = minutes % 60;
        return chinese ? `${hours} 小时 ${rest} 分` : `${hours} h ${rest} min`;
      };
      const serviceLabel = (id) => (id === 'go' ? t('officialServiceGo')
        : id === 'inference' ? t('officialServiceInference')
          : id === 'payg' ? t('officialServicePayg')
            : id === 'free' ? t('officialServiceFree') : id);
      const reasonLabel = (reason) => (reason === 'upstream' ? t('officialReasonUpstream')
        : reason === 'none' ? t('officialReasonNone')
          : reason === 'capacity' ? t('officialReasonCapacity')
            : reason === 'rate_limit' ? t('officialReasonRateLimit') : t('officialReasonOther'));
      // OpenCode's own verdict, straight from status.opencode.ai. It is the
      // authority on "is this them or me", so it gets its own card above the
      // local probe, and a refresh button of its own.
      const published = router?.official ?? null;
      const publishedMeta = (() => {
        if (!published) return null;
        const states = {
          operational: [t('officialStatusOperational'), '#3c9d5d'],
          degraded: [t('officialStatusDegraded'), '#e0a030'],
          outage: [t('officialStatusOutage'), '#d9534f'],
          maintenance: [t('officialStatusMaintenance'), '#4d6bfe'],
          unknown: [t('officialStatusUnknown'), '#8a8f98'],
        };
        const [label, color] = states[published.status] ?? states.unknown;
        const open = (published.services ?? []).filter((entry) => entry.status !== 'operational');
        const reasons = [...new Set(open.map((entry) => entry.reason).filter((reason) => reason && reason !== 'none'))];
        // A degraded plan does not mean *your* model is degraded: OpenCode marks
        // the whole Go plan, then each model on its own. Only the model rows
        // decide whether switching to the published subscription would help.
        const ours = (published.models ?? []).filter((entry) => entry.status !== 'unknown');
        const oursBad = ours.some((entry) => entry.status !== 'operational');
        const byReason = {
          upstream: 'officialHintUpstream',
          capacity: 'officialHintCapacity',
          rate_limit: 'officialHintRateLimit',
          outage: 'officialHintOutage',
          maintenance: 'officialHintMaintenance',
        };
        const hint = published.status === 'operational' ? t('officialHintOperational')
          : published.status === 'outage' ? t('officialHintOutage')
            : published.status === 'maintenance' ? t('officialHintMaintenance')
              : ours.length > 0 && !oursBad ? t('officialHintPartial')
                : reasons.length === 0 ? t('officialHintUnknown')
                  : t(byReason[reasons[0]] ?? 'officialHintUnknown');
        return { label, color, hint, help: published.status === 'outage' || oursBad };
      })();
      // Both authorities answer "is it them or me", so they share one card: this
      // half is OpenCode's own verdict, the other half is our probe.
      const officialSection = published && publishedMeta
        ? section(
            sectionHead(t('officialTitle'), chip(publishedMeta.label, publishedMeta.color, publishedMeta.hint)),
            h('div', { style: { flex: '1 1 340px', fontSize: 12, lineHeight: 1.75, opacity: .8 } }, publishedMeta.hint),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11, opacity: .55 } },
              h('span', null, t('officialModelsTitle')),
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              (published.models ?? []).map((entry) => (entry.status === 'unknown' && entry.ttftMs === null
                ? h('div', { key: entry.model, style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12 } },
                    h('span', { style: { fontWeight: 600 } }, entry.model),
                    chip(t('officialStatusUnknown'), '#8a8f98', published.stale ? t('officialStale', { age: ago(published.fetchedAt) }) : t('officialHintUnknown')),
                    h('span', { style: { opacity: .5 } }, t('officialModelMissing')),
                  )
                : h('div', { key: entry.model, style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12 } },
                    h('span', { style: { fontWeight: 600 } }, entry.model),
                    chip(
                      entry.status === 'operational' ? t('officialStatusOperational') : reasonLabel(entry.reason),
                      entry.status === 'operational' ? '#3c9d5d' : '#e0a030',
                      `${t('officialReason', { reason: reasonLabel(entry.reason) })}${entry.service ? ` · ${serviceLabel(entry.service)}` : ''}`,
                    ),
                    entry.ttftMs !== null && entry.tps !== null
                      ? h('span', { style: { opacity: .55 } }, t('officialSpeed', { ttft: Math.round(entry.ttftMs), tps: Math.round(entry.tps) }))
                      : null,
                  ))),
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11, opacity: .55 } },
              h('span', null, t('officialIncidentsTitle')),
            ),
            (published.active ?? []).length === 0
              ? h('div', { style: { fontSize: 12, opacity: .6 } }, t('officialNoIncidents'))
              : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 } },
                  (published.active ?? []).map((incident) => h('div', {
                    key: incident.id,
                    style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
                  },
                    h('span', { style: { fontWeight: 600 } }, serviceLabel(incident.service)),
                    chip(reasonLabel(incident.reason), incident.status === 'outage' ? '#d9534f' : '#e0a030', incident.models.length > 0 ? incident.models.join(' · ') : t('officialReasonOther')),
                    h('span', { style: { opacity: .55 } }, t('officialIncident', { age: span(Date.now() - incident.startedAt) })),
                  )),
                ),
            published.ok === false
              ? h('div', { style: { fontSize: 11, color: '#d9534f', lineHeight: 1.7 } }, t('officialUnavailable', { error: published.error ?? t('officialStatusUnknown') }))
              : null,
            published.stale && published.ok !== false
              ? h('div', { style: { fontSize: 11, opacity: .6 } }, t('officialStale', { age: ago(published.fetchedAt) }))
              : null,
          )
        : null;
      const localSection = upstream && upstreamMeta
        ? section(
            sectionHead(t('statusLocalTitle'), chip(upstreamMeta.label, upstreamMeta.color, upstreamMeta.hint)),
            h('div', { style: { flex: '1 1 340px', fontSize: 12, lineHeight: 1.75, opacity: .8 } }, upstreamMeta.hint),
            h('div', { style: { display: 'flex', gap: 32, flexWrap: 'wrap' } },
              stat(t('statusSince'), upstream.since ? clock(upstream.since) : t('none')),
              stat(t('statusStableWindow'), upstream.recovery?.active
                ? `${t('statusWindowLeft', { remaining: left(upstream.recovery.remainingMs) })}`
                : chinese ? `${upstreamMeta.stable} 分钟` : `${upstreamMeta.stable} min`),
            ),
            upstream.recovery?.active
              ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: .6 } },
                    h('span', null, t('statusWindowDone', { stableFor: left(upstream.recovery.stableForMs) })),
                    h('span', null, `${Math.min(100, Math.round((upstream.recovery.stableForMs / Math.max(1, upstream.recovery.requiredMs)) * 100))}%`),
                  ),
                  h('div', { style: { height: 6, borderRadius: 999, background: 'rgba(127,127,127,.22)', overflow: 'hidden' } },
                    h('div', {
                      style: {
                        height: '100%', borderRadius: 999, background: '#4d6bfe',
                        width: `${Math.min(100, Math.round((upstream.recovery.stableForMs / Math.max(1, upstream.recovery.requiredMs)) * 100))}%`,
                        transition: 'width .4s linear',
                      },
                    }),
                  ),
                )
              : null,
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11, opacity: .55 } },
              h('span', null, t('statusModelsTitle')),
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              (upstream.models ?? []).map((entry) => {
                const meta = codeMeta(entry.code);
                return h('div', {
                  key: entry.model,
                  style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12 },
                },
                  h('span', { style: { fontWeight: 600 } }, entry.model),
                  chip(meta.label, codeColor(entry.code), meta.hint),
                  h('span', { style: { opacity: .6 } }, entry.recentFails > 0
                    ? t('statusFails', { count: entry.recentFails })
                    : t('statusNoFails')),
                  entry.lastHttpStatus ? h('span', { style: { opacity: .5 } }, `HTTP ${entry.lastHttpStatus}`) : null,
                  entry.quarantinedUntil ? h('span', { style: { opacity: .5 } }, t('statusQuarantined', { time: clock(entry.quarantinedUntil) })) : null,
                );
              }),
            ),
            upstream.lastFailure
              ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, opacity: .7, lineHeight: 1.7 } },
                  h('div', null, `${codeMeta(upstream.lastFailure.cause ?? upstream.code).label} · ${clock(upstream.lastFailure.at)}${upstream.lastFailure.model ? ` · ${upstream.lastFailure.model}` : ''}`),
                  upstream.lastFailure.message ? h('div', { style: { opacity: .8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-all' } }, t('errRaw', { message: upstream.lastFailure.message })) : null,
                )
              : null,
            h('details', { style: { fontSize: 11, opacity: .8 } },
              h('summary', { style: { cursor: 'pointer', opacity: .8 } }, t('errTable')),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, lineHeight: 1.7 } },
                CODES.map((entry) => h('div', { key: entry.code, style: { display: 'flex', gap: 10, alignItems: 'baseline' } },
                  h('span', { style: { flex: '0 0 128px', fontWeight: 600, color: codeColor(entry.code) } }, t(entry.label)),
                  h('span', { style: { flex: 1, opacity: .8 } }, t(entry.hint)),
                )),
              ),
            ),
          )
        : null;

      // Both authorities answer "is it them or me": OpenCode's own status page and
      // our probe are the same question from both ends, so they share one card and
      // one refresh button. The open-source layout of the old two-card page is
      // preserved as two sections inside it.
      const statusCard = localSection || officialSection
        ? card(
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
              h('span', { style: { fontWeight: 600, fontSize: 13 } }, t('statusTitle')),
              upstreamMeta ? chip(upstreamMeta.label, upstreamMeta.color, upstreamMeta.hint) : null,
              publishedMeta ? chip(t('officialChip', { status: publishedMeta.label }), publishedMeta.color, publishedMeta.hint) : null,
              upstream?.state === 'degraded' || publishedMeta?.help
                ? h('button', {
                    type: 'button',
                    className: 'ocr-btn',
                    style: btn,
                    disabled: busy,
                    title: t('forceFallbackHint'),
                    onClick: () => void act({ action: 'fallback' }),
                  }, t('statusSwitchOfficial'))
                : null,
              h('span', { style: { flex: 1 } }),
              h('a', {
                href: 'https://status.opencode.ai/',
                target: '_blank',
                rel: 'noreferrer',
                className: 'ocr-btn',
                style: { ...btn, textDecoration: 'none', display: 'inline-block' },
              }, t('officialOpenStatus')),
              h('button', {
                type: 'button',
                className: 'ocr-btn',
                style: btn,
                disabled: busy,
                title: t('statusRefreshHint'),
                onClick: () => void act({ action: 'status' }),
              }, busy ? t('statusRefreshing') : t('statusRefresh')),
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 11, opacity: .55 } },
              upstream?.checkedAt ? h('span', null, t('statusCheckedAt', { time: ago(upstream.checkedAt) })) : null,
              published?.fetchedAt ? h('span', null, t('officialSource', { time: ago(published.fetchedAt) })) : null,
            ),
            router?.reason
              ? h('div', { style: { fontSize: 12, opacity: .75, lineHeight: 1.7 } }, t('statusSwitchWhy', { reason: reasonText(router.reason) }))
              : null,
            h('div', { style: { display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' } },
              localSection,
              officialSection,
            ),
          )
        : null;

      // Which route is answering right now is the first thing the page owes the
      // reader: everything below it is detail about that one fact.
      const routeColor = router ? (router.mode === 'fallback' ? '#e0a030' : '#3c9d5d') : '#8a8f98';

      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '12px 14px',
            borderRadius: 10,
            border: `1px solid ${routeColor}66`,
            background: `${routeColor}18`,
          },
        },
          h('span', { style: { fontSize: 11, opacity: .7, letterSpacing: '.04em' } }, t('routeNow')),
          h('span', { style: { fontSize: 15, fontWeight: 700, color: routeColor } }, router
            ? (router.mode === 'fallback' ? t('routeOfficial') : t('routeOpencode'))
            : t('none')),
          h('span', { style: { fontSize: 12, opacity: .82 } }, router
            ? (router.mode === 'fallback'
                ? t('routeOfficialHint')
                : t('routeOpencodeHint', { account: router.activeLabel ?? t('none') }))
            : t('routerMissing')),
          router?.reason ? h('span', { style: { fontSize: 11, opacity: .6 } }, `· ${reasonText(router.reason)}`) : null,
          h('span', { style: { flex: 1 } }),
          router
            ? h('span', { style: { fontSize: 11, opacity: .6 } },
                `${t('nextProbe')} ${when(router.nextProbeAt ?? Date.now() + (router.probeIntervalMs ?? 0))}`)
            : null,
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
          h('div', { style: { fontSize: 16, fontWeight: 600 } }, t('title')),
          state.phase === 'ready' ? h('span', { style: { opacity: .55, fontSize: 12 } }, t('updatedAt', { time: clock(data?.checkedAt) })) : null,
          h('span', { style: { flex: 1 } }),
          h('a', {
            href: 'https://opencode.ai/console',
            target: '_blank',
            rel: 'noreferrer',
            className: 'ocr-btn',
            style: { ...btn, textDecoration: 'none', display: 'inline-block' },
          }, t('subscribe')),
          h('button', { type: 'button', className: 'ocr-btn', style: btn, disabled: busy, onClick: () => { void load(true); } }, busy ? t('refreshing') : t('refresh')),
        ),
        state.phase === 'error' ? h('div', { style: { color: '#d9534f', fontSize: 13 } }, t('loadError', { message: state.error })) : null,
        actionError ? h('div', { style: { color: '#d9534f', fontSize: 13 } }, actionError) : null,
        notice ? h('div', { style: { color: '#3c9d5d', fontSize: 13 } }, notice) : null,

        statusCard,

        card(
          cardHead(t('routerTitle'), router
            ? pill(router.mode === 'fallback' ? t('modeFallback') : t('modePrimary'), router.mode === 'fallback' ? '#e0a030' : '#3c9d5d')
            : h('span', { style: { opacity: .7, fontSize: 12 } }, t('routerMissing'))),
          router?.reason ? h('div', { style: { fontSize: 12, opacity: .65 } }, t('modeReason', { reason: reasonText(router.reason) })) : null,
          router
            ? h('div', { style: { display: 'flex', gap: 32, flexWrap: 'wrap' } },
                stat(t('activeAccount'), router.activeLabel ?? t('none')),
                stat(t('nextProbe'), router.nextProbeAt ? when(router.nextProbeAt) : when(Date.now() + (router.probeIntervalMs ?? 0))),
                stat(t('colStatus'), router.mode === 'fallback' ? t('modeFallback') : t('modePrimary')),
              )
            : null,
          router
            ? tools(
                h('button', { type: 'button', className: 'ocr-btn', style: btn, disabled: busy, onClick: () => void act({ action: 'probe' }) }, t('probeAll')),
                h('button', {
                  type: 'button',
                  className: 'ocr-btn',
                  style: btn,
                  disabled: busy,
                  onClick: () => void act({ action: router.mode === 'fallback' ? 'primary' : 'fallback' }),
                }, router.mode === 'fallback' ? t('forcePrimary') : t('forceFallback')),
                h('button', { type: 'button', className: 'ocr-btn', style: btn, disabled: busy, onClick: () => void act({ action: 'reset' }) }, t('resetMarks')),
                h('span', { style: { flexBasis: '100%', fontSize: 11, opacity: .55, lineHeight: 1.6 } }, t('resetHint')),
                h('span', { style: { flexBasis: '100%', fontSize: 11, opacity: .55, lineHeight: 1.6 } }, t('forceFallbackHint')),
              )
            : null,
        ),

        card(
          cardHead(t('accountsTitle'), h('span', { style: { opacity: .55, fontSize: 12 } }, t('accountsOrder'))),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            accountCards.length > 0
              ? accountCards
              : h('div', { style: { opacity: .6, fontSize: 12 } }, t('noAccounts')),
          ),
        ),

        router
          ? card(
              cardHead(t('addAccount')),
              h('div', { style: { display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' } },
                h('label', { style: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, opacity: .8 } },
                  t('colAccount'),
                  h('input', {
                    style: { ...input, minWidth: 200 }, placeholder: t('labelPlaceholder'), value: draft.label,
                    onChange: (event) => setDraft({ ...draft, label: event.target.value }),
                  }),
                ),
                h('label', { style: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, opacity: .8 } },
                  t('colKey'),
                  h('input', {
                    style: { ...input, minWidth: 320 }, type: 'password', placeholder: t('keyPlaceholder'), value: draft.key,
                    onChange: (event) => setDraft({ ...draft, key: event.target.value }),
                  }),
                ),
                h('button', { type: 'button', className: 'ocr-btn', style: btn, disabled: busy || draft.key.trim().length < 8, onClick: () => void addAccount() }, t('addAndProbe')),
              ),
            )
          : null,

        shown
          ? card(
              h('div', {
                style: {
                  padding: '16px 18px', borderRadius: 10, fontSize: 18, fontWeight: 700, lineHeight: 1.5,
                  color: verdictColor, background: `${verdictColor}22`, border: `1px solid ${verdictColor}80`,
                },
              }, verdict),
              clockInfo
                ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                    h('div', { style: { fontSize: 12, opacity: .6 } }, t('clockTitle')),
                    clockLine(t('colOfficial'), clockInfo.official),
                    clockLine(t('colOpenCode'), clockInfo.opencode),
                    clockInfo.holiday
                      ? h('div', { style: { fontSize: 11, opacity: .55 } }, t('clockHoliday'))
                      : null,
                  )
                : null,
              h('div', { style: { overflowX: 'auto', cursor: 'grab' }, ...draggable() },                h('table', { style: { borderCollapse: 'collapse', width: '100%', fontSize: 12 } },
                h('thead', null,
                  h('tr', null, [
                    t('colModel'), t('colKind'),
                    withPeriod(t('colOpenCode'), clockInfo?.opencode),
                    withPeriod(t('colOfficial'), clockInfo?.official),
                  ].map((title) => th(title))),
                ),
                h('tbody', null, shown.models.flatMap((row) =>
                  (row.rows ?? [{ kind: 'output', go: row.go, official: row.official, cheaper: row.cheaper, ratio: row.ratio }])
                    .map((line, index) =>
                      h('tr', {
                        key: `${row.model}-${line.kind}`,
                        // The cached-input line is the one that actually lands on
                        // most requests, so it is highlighted instead of buried.
                        style: line.kind === 'cacheRead'
                          ? { background: 'rgba(60,157,93,.12)' }
                          : index === 0 ? { borderTop: '1px solid rgba(127,127,127,.22)' } : undefined,
                      },
                        cell(index === 0 ? prettyModel(row.model) : '', { fontWeight: index === 0 ? 600 : 400 }),
                        cell(t(`kind${line.kind[0].toUpperCase()}${line.kind.slice(1)}`),
                          line.kind === 'cacheRead' ? { fontWeight: 600, color: '#3c9d5d' } : { opacity: .75 }),
                        cell(priceCell(line.go.pay, line.go.factor > 1, line.cheaper === 'go')),
                        cell(priceCell(line.official.pay, line.official.factor > 1, line.cheaper === 'official')),
                      ),
                    ),
                )),
                ),
              ),
            )
          : null,

        card(
          cardHead(t('modelsTitle')),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, modelCards),
        ),

        h('div', { style: { opacity: .55, fontSize: 12, lineHeight: 1.8 } },
          t('footerOfficial'),
          h('br'),
          t('footerLocal'),
        ),

        h(UsageDialog, {
          account: inspectingAccount,
          busy,
          onClose: () => setInspecting(null),
          onProbe: async () => {
            if (!inspectingAccount) return;
            const ok = await act({ action: 'probe', id: inspectingAccount.id });
            if (ok) setNotice(t('probedAt', { time: clock(Date.now()) }));
          },
        }),

        showTop
          ? h('button', {
              type: 'button', className: 'ocr-btn', title: t('backToTop'),
              onClick: toTop,
              style: {
                position: 'fixed', right: 28, bottom: 28, zIndex: 900,
                width: 38, height: 38, padding: 0, borderRadius: 999, fontSize: 16, lineHeight: 1,
                background: 'var(--dsh-surface, rgba(127,127,127,.16))', backdropFilter: 'blur(6px)',
                boxShadow: '0 6px 18px rgba(0,0,0,.28)',
              },
            }, '↑')
          : null,
      );
    }

    // A route switch happens to a task nobody is watching, so the shell carries a
    // notice: opaque, timestamped, and it stays on screen until it is dismissed.
    // It polls the router instead of receiving an event because the router is a
    // server-side file and the settings page may not be open at all.
    function RouteNotice() {
      const [items, setItems] = React.useState([]);
      const [skin, setSkin] = React.useState(theme);
      const seen = React.useRef(null);

      React.useEffect(() => {
        let alive = true;
        const poll = async () => {
          try {
            const response = await fetch(ROUTER_API, { headers: { accept: 'application/json' } });
            if (!response.ok) return;
            const next = await response.json();
            if (!alive || !next || typeof next !== 'object') return;
            const mode = next.mode === 'fallback' ? 'fallback' : 'primary';
            // The first poll only records where we started: a page load is not a switch.
            if (seen.current === null) {
              seen.current = mode;
              return;
            }
            if (seen.current === mode) return;
            seen.current = mode;
            setItems((prev) => [...prev.slice(-2), {
              id: `${Date.now()}-${mode}`,
              at: Date.now(),
              mode,
              reason: typeof next.reason === 'string' ? next.reason : '',
            }]);
          } catch {
            // No router endpoint means the plugin is off; a notice with nothing to
            // say is worse than none.
          }
        };
        void poll();
        const pollTimer = setInterval(() => void poll(), 20000);
        const skinTimer = setInterval(() => setSkin(theme()), 5000);
        return () => {
          alive = false;
          clearInterval(pollTimer);
          clearInterval(skinTimer);
        };
      }, []);

      if (items.length === 0) return null;
      const dismiss = (id) => setItems((prev) => prev.filter((item) => item.id !== id));

      return h('div', {
        style: {
          position: 'fixed',
          top: 64,
          left: 12,
          zIndex: 1200,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: 360,
          maxWidth: 'min(360px, calc(100vw - 24px))',
        },
      }, items.map((item) => {
        const accent = item.mode === 'fallback' ? '#e0a030' : '#3c9d5d';
        return h('div', {
          key: item.id,
          style: {
            background: skin.panel,
            color: skin.text,
            border: `1px solid ${skin.line}`,
            borderLeft: `3px solid ${accent}`,
            borderRadius: 10,
            boxShadow: '0 10px 28px rgba(0,0,0,.32)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 12,
            lineHeight: 1.65,
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8 } },
            h('span', { style: { flex: 1, fontWeight: 700, fontSize: 12.5, color: accent } },
              item.mode === 'fallback' ? t('switchNoticeTitle') : t('switchNoticeBack')),
            h('span', { style: { fontSize: 11, opacity: .6, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } },
              t('switchNoticeTime', { time: stamp(item.at) })),
            h('button', {
              type: 'button',
              className: 'ocr-btn',
              title: t('switchNoticeClose'),
              'aria-label': t('switchNoticeClose'),
              onClick: () => dismiss(item.id),
              style: {
                flex: '0 0 auto',
                width: 22,
                height: 22,
                padding: 0,
                borderRadius: 6,
                border: `1px solid ${skin.line}`,
                background: 'transparent',
                color: skin.text,
                cursor: 'pointer',
                fontSize: 12,
                lineHeight: 1,
              },
            }, '✕'),
          ),
          item.reason ? h('div', { style: { opacity: .8 } }, reasonText(item.reason)) : null,
        );
      }));
    }

    // Hover and press feedback cannot live in an inline style object, so the
    // bundle ships one small stylesheet for its buttons.
    const CSS = [
      '.ocr-btn { transition: background .12s ease, border-color .12s ease, transform .06s ease; }',
      '.ocr-btn:hover:not(:disabled) { background: rgba(127,127,127,.16); border-color: rgba(127,127,127,.75); }',
      '.ocr-btn:active:not(:disabled) { transform: translateY(1px); background: rgba(127,127,127,.26); }',
      '.ocr-btn:disabled { opacity: .45; cursor: default; }',
    ].join('\n');
    const ensureStyles = () => {
      if (typeof document === 'undefined') return;
      if (document.getElementById('ocr-styles') !== null) return;
      const style = document.createElement('style');
      style.id = 'ocr-styles';
      style.textContent = CSS;
      document.head.appendChild(style);
    };

    return {
      inject: ['slots'],
      apply(ctx) {
        ensureStyles();
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'opencode-router',
          order: 18,
          label: 'OpenCode 路由与用量',
        }, UsageSection));
        // The frame-wide overlay is where a switch can reach someone who is not on
        // the settings page.
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'opencode-route-notice',
          order: 60,
          label: 'OpenCode 路由切换通知',
        }, RouteNotice));
      },
    };
  },
});
