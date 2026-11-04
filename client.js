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

      // The router stores machine reasons ("allowance recovered"); the page says
      // what actually happened instead of echoing the enum.
      const reasonText = (reason) => {
        const raw = String(reason ?? '');
        const pick = (zh, en) => (chinese ? zh : en);
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
          [/^active account (\S+) removed/i, pick('当前账户被删除，已自动换下一个', 'the active account was deleted, switched to the next one')],
          [/^auth \((.+)\)/i, pick('鉴权失败：$1', 'authentication failed: $1')],
        ];
        for (const [pattern, text] of rules) {
          if (pattern.test(raw)) return raw.replace(pattern, text);
        }
        return raw;
      };

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

      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
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
                h('button', { type: 'button', className: 'ocr-btn', style: btn, disabled: busy, onClick: () => void act({ action: 'reset' }) }, t('resetMarks')),
                h('span', { style: { flexBasis: '100%', fontSize: 11, opacity: .55, lineHeight: 1.6 } }, t('resetHint')),
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
      },
    };
  },
});
