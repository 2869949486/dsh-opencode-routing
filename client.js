window.__ModuleLoader__.load({
  id: 'dsh-opencode-router',
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
        editKey: '改密钥',
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
        peakAtPeak: '峰段',
        peakOffPeak: '谷段',
        peakHoliday: '——今天是中国法定节假日，官方整天算谷，OpenCode 照算峰',
        peakExhausted: '但本月额度已经用尽，只能走官方。',
        peakGoPay: '走 OpenCode 你实付',
        peakOfficialPay: '走官方直连你实付',
        peakVerdict: '结论',
        peakGoCheaper: '走 OpenCode 便宜 {percent}%',
        peakOfficialCheaper: '走官方直连便宜 {percent}%',
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
        editKey: 'Change key',
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
        peakHoliday: ' — today is a Chinese public holiday, so the official API charges off-peak all day while OpenCode still charges peak',
        peakExhausted: ' But this month’s allowance is already spent, so only the official route is left.',
        peakGoPay: 'You pay via OpenCode',
        peakOfficialPay: 'You pay via official API',
        peakVerdict: 'Verdict',
        peakGoCheaper: 'OpenCode is {percent}% cheaper',
        peakOfficialCheaper: 'Official API is {percent}% cheaper',
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
        editKey: '更換金鑰',
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
        peakAtPeak: '峰段',
        peakOffPeak: '谷段',
        peakHoliday: '——今天是中國法定假日，官方整天算谷，OpenCode 照算峰',
        peakExhausted: '但本月額度已用盡，只能走官方。',
        peakGoPay: '走 OpenCode 你實付',
        peakOfficialPay: '走官方直連你實付',
        peakVerdict: '結論',
        peakGoCheaper: '走 OpenCode 便宜 {percent}%',
        peakOfficialCheaper: '走官方直連便宜 {percent}%',
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
    "peakGoPay": "Du zahlst über OpenCode",
    "peakOfficialPay": "Du zahlst über die offizielle API",
    "peakVerdict": "Fazit",
    "peakGoCheaper": "OpenCode ist {percent}% günstiger",
    "peakOfficialCheaper": "Die offizielle API ist {percent}% günstiger",
    "peakFootnote": "Gerechnet pro 1 Mio. Ausgabe-Tokens (bei einer Coding-Rechnung dominiert die Ausgabe), bei ¥{fx} je $. Haupt- und Nebenzeit ändern nur, wie schnell das Kontingent verbraucht wird, nicht das Fazit: Innerhalb des Kontingents bleibt OpenCode günstiger als die offizielle API; Ausnahmen sind ein aufgebrauchtes Kontingent oder ein Modell, dessen eigenes Limit zuerst endet.",
    "footerOfficial": "Die offiziellen Prozente für 5 Stunden / Woche / Monat kommen von der OpenCode-API und beschreiben das ganze Konto – Nutzung über andere Clients oder Rechner zählt mit.",
    "footerLocal": "Beträge pro Modell sind eine lokale Schätzung: Sie zählen nur das Sitzungsprotokoll dieses Harness, und genau das macht die Verteilung pro Modell sichtbar; Aufrufe anderer Tools hinterlassen lokal keine Spur.",
    "footerPeakRule": "Beträge sind zum Nebenzeit-Preis geschätzt, bei DeepSeek-Modellen zur Hauptzeit doppelt; kostenlose Modelle werden nicht berechnet.",
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
    "peakGoPay": "Pagas por OpenCode",
    "peakOfficialPay": "Pagas por la API oficial",
    "peakVerdict": "Conclusión",
    "peakGoCheaper": "OpenCode sale {percent}% más barato",
    "peakOfficialCheaper": "La API oficial sale {percent}% más barata",
    "peakFootnote": "Calculado por millón de tokens de salida (en una factura de código manda la salida), a ¥{fx} por dólar. Las horas pico solo cambian la rapidez con que se consume la cuota, no la conclusión: dentro de la cuota, OpenCode siempre sale más barato que la API oficial; las excepciones son que la cuota se agote o que el límite de un modelo concreto se acabe antes.",
    "footerOfficial": "Los porcentajes oficiales de 5 horas / semana / mes vienen de la API de OpenCode y describen la cuenta completa: el uso desde otros clientes u otras máquinas también cuenta.",
    "footerLocal": "El importe por modelo es una estimación local: solo cuenta el registro de sesiones de este harness, que es lo que permite ver el reparto por modelo; las llamadas de otras herramientas no dejan rastro local.",
    "footerPeakRule": "El importe se estima a tarifa valle, duplicada en hora pico para los modelos DeepSeek; los modelos gratuitos no se facturan.",
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
    "peakGoPay": "Vous payez via OpenCode",
    "peakOfficialPay": "Vous payez via l’API officielle",
    "peakVerdict": "Verdict",
    "peakGoCheaper": "OpenCode coûte {percent}% de moins",
    "peakOfficialCheaper": "L’API officielle coûte {percent}% de moins",
    "peakFootnote": "Pour 1 M de tokens en sortie (la sortie domine une facture de code), au taux de ¥{fx} pour 1 $. Les heures pleines ne changent que la vitesse à laquelle le quota se consomme, pas la conclusion : tant qu’il reste du quota, OpenCode reste moins cher que l’API officielle ; les exceptions sont un quota épuisé ou un modèle dont le plafond tombe en premier.",
    "footerOfficial": "Les pourcentages officiels 5 heures / semaine / mois viennent de l’API OpenCode et décrivent le compte entier : l’usage d’autres clients ou d’autres machines compte aussi.",
    "footerLocal": "Le montant par modèle est une estimation locale : seuls les journaux de session de ce harness sont comptés, ce qui permet de voir la répartition par modèle ; les appels des autres outils ne laissent aucune trace locale.",
    "footerPeakRule": "Le montant est estimé au tarif heures creuses, doublé en heures pleines pour les modèles DeepSeek ; les modèles gratuits ne sont pas facturés.",
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
    "peakGoPay": "OpenCode 経由の支払い",
    "peakOfficialPay": "公式直結の支払い",
    "peakVerdict": "結論",
    "peakGoCheaper": "OpenCode のほうが {percent}% 安い",
    "peakOfficialCheaper": "公式直結のほうが {percent}% 安い",
    "peakFootnote": "出力 100 万トークンあたりに換算（コーディングの請求はほとんどが出力由来）、レートは ¥{fx}/$。ピークとオフピークはクォータの減る速さに影響するだけで、結論は変わりません。クォータの範囲内なら OpenCode 経由のほうが公式直結より常に安く、例外はクォータを使い切った場合と、特定モデルの上限に先に達した場合です。",
    "footerOfficial": "上の「公式 5 時間 / 今週 / 今月」の割合は OpenCode の API が返す実際のアカウント使用量で、他のクライアントや別のマシンからの利用も含まれます。",
    "footerLocal": "モデル別の金額はローカル推定です。この harness のセッションログだけを集計してモデル別の内訳を出すもので、他のツールからの呼び出しはローカルに記録されません。",
    "footerPeakRule": "金額はオフピーク価格で見積もり、DeepSeek モデルはピーク時に 2 倍で計算します。無料モデルは課金されません。",
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
    "peakGoPay": "OpenCode 경유 결제액",
    "peakOfficialPay": "공식 직결 결제액",
    "peakVerdict": "결론",
    "peakGoCheaper": "OpenCode가 {percent}% 더 저렴",
    "peakOfficialCheaper": "공식 직결이 {percent}% 더 저렴",
    "peakFootnote": "출력 100만 토큰 기준 환산(코딩 요금은 대부분 출력에서 발생), 환율 ¥{fx}/$. 피크·비피크는 할당량이 줄어드는 속도에만 영향을 주고 결론은 바뀌지 않습니다. 할당량 안에서는 OpenCode 경유가 공식 직결보다 항상 저렴하며, 예외는 할당량을 다 쓴 경우와 특정 모델 한도가 먼저 바닥나는 경우입니다.",
    "footerOfficial": "위의 \"공식 5시간 / 이번 주 / 이번 달\" 비율은 OpenCode API가 주는 실제 계정 사용량이며, 다른 클라이언트나 다른 기기에서 쓴 양도 포함됩니다.",
    "footerLocal": "모델별 금액은 로컬 추정치입니다. 이 harness의 세션 로그만 집계해 모델별 분포를 보여 주는 것이며, 다른 도구의 호출은 로컬에 기록되지 않습니다.",
    "footerPeakRule": "금액은 비피크 가격으로 추정하고, DeepSeek 모델은 피크 시간에 2배로 계산합니다. 무료 모델은 과금되지 않습니다.",
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
    "peakGoPay": "Você paga pelo OpenCode",
    "peakOfficialPay": "Você paga pela API oficial",
    "peakVerdict": "Veredito",
    "peakGoCheaper": "O OpenCode sai {percent}% mais barato",
    "peakOfficialCheaper": "A API oficial sai {percent}% mais barata",
    "peakFootnote": "Cálculo por 1 M de tokens de saída (numa fatura de código a saída domina), a ¥{fx} por dólar. O pico só muda a velocidade com que a cota queima, não a conclusão: dentro da cota, o OpenCode continua mais barato que a API oficial; as exceções são a cota esgotada ou um modelo cujo limite próprio acaba antes.",
    "footerOfficial": "As porcentagens oficiais de 5 horas / semana / mês vêm da API do OpenCode e descrevem a conta inteira: uso de outros clientes ou de outras máquinas também entra na conta.",
    "footerLocal": "O valor por modelo é uma estimativa local: conta só o log de sessões deste harness, que é o que permite ver a divisão por modelo; chamadas de outras ferramentas não deixam registro local.",
    "footerPeakRule": "O valor é estimado a preço fora do pico, dobrado no horário de pico para os modelos DeepSeek; modelos gratuitos não são cobrados.",
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
    "peakGoPay": "Вы платите через OpenCode",
    "peakOfficialPay": "Вы платите через официальный API",
    "peakVerdict": "Итог",
    "peakGoCheaper": "OpenCode дешевле на {percent}%",
    "peakOfficialCheaper": "Официальный API дешевле на {percent}%",
    "peakFootnote": "В расчёте на 1 млн выходных токенов (в счёте за код преобладает выход), курс ¥{fx}/$. Пик влияет только на скорость расхода квоты и не меняет вывод: в пределах квоты OpenCode всегда дешевле прямого официального API; исключения — исчерпанная квота или лимит отдельной модели, который закончится раньше.",
    "footerOfficial": "Проценты «официально 5 часов / неделя / месяц» выше приходят из API OpenCode и отражают реальный расход аккаунта — включая другие клиенты и другие машины.",
    "footerLocal": "Суммы по моделям — локальная оценка: учитывается только журнал сессий этого harness, поэтому разбивка по моделям и видна; вызовы из других инструментов локально не записываются.",
    "footerPeakRule": "Суммы считаются по ценам вне пика, для моделей DeepSeek в часы пика применяется коэффициент 2. Бесплатные модели не тарифицируются.",
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
      if (delta <= 0) return localeOf(navigator.language) === 'zh' || LANG === 'zh-tw' ? '已到期' : 'expired';
      const minutes = Math.round(delta / 60000);
      const relative = LANG === 'zh' || LANG === 'zh-tw'
        ? `${minutes < 60 ? `${minutes} 分钟` : `${Math.round(minutes / 60)} 小时`}后`
        : new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return relative;
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
      const labels = inputs.map((kind) => ({
        text: t('capsText'), image: t('capsImage'), video: t('capsVideo'),
        audio: t('capsAudio'), pdf: t('capsPdf'),
      }[kind] ?? kind));
      if (row.tools === true) labels.push(t('capsTools'));
      if (row.reasoning === true) labels.push(t('capsReasoning'));
      return labels;
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
      return h('div', {
        style: {
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        },
        onMouseDown: (event) => { if (event.target === event.currentTarget) onClose(); },
      },
        h('div', {
          style: {
            minWidth: 380, maxWidth: 520, width: '100%', padding: '16px 18px', borderRadius: 10,
            background: 'var(--dsh-surface, #1b1b1b)', color: 'inherit',
            border: '1px solid rgba(127,127,127,.35)', boxShadow: '0 18px 48px rgba(0,0,0,.45)',
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
            h('div', { style: { fontWeight: 600, fontSize: 14 } }, t('dialogTitle', { label: account.label })),
            account.active ? h('span', {
              style: { fontSize: 11, padding: '1px 6px', borderRadius: 999, border: '1px solid rgba(60,157,93,.6)', color: '#3c9d5d' },
            }, t('statusCurrent')) : null,
            h('span', { style: { flex: 1 } }),
            h('button', { type: 'button', style: btn, onClick: onClose }, t('close')),
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
            h('button', { type: 'button', style: btn, disabled: busy, onClick: onProbe }, t('dialogProbe')),
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

      const accountRows = accountList.map((account, index) => {
        const [text, color] = statusText[account.status] ?? [
          account.usageError ? t('statusError') : account.enabled === false ? t('statusDisabled') : account.active ? t('statusActive') : t('statusSpare'),
          account.usageError ? '#d9534f' : 'inherit',
        ];
        return h(React.Fragment, { key: account.id },
          h('tr', null,
            cell(String(index + 1), { opacity: .6 }),
            cell(h('span', null,
              account.label,
              account.active ? h('span', {
                style: { marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 999, border: '1px solid rgba(60,157,93,.6)', color: '#3c9d5d' },
              }, t('statusCurrent')) : null,
            )),
            cell(account.hint
              ? h('span', { style: { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 } }, account.hint)
              : h('span', { style: { opacity: .55 } }, t('notConfigured'))),
            cell(official(account.usage?.rolling)),
            cell(official(account.usage?.weekly)),
            cell(official(account.usage?.monthly)),
            cell(h('span', { style: { color } },
              text,
              account.exhaustedUntil ? ` · ${clock(account.exhaustedUntil)}` : '',
            )),
            cell(router && h('div', {
              style: {
                display: 'grid', gridTemplateColumns: 'repeat(2, minmax(78px, max-content))',
                gap: 6, padding: '2px 0',
              },
            },
              h('button', { type: 'button', style: btn, onClick: () => setInspecting(account.id) }, t('viewUsage')),
              h('button', { type: 'button', style: btn, disabled: busy || account.active, onClick: () => void act({ action: 'activate', id: account.id }) }, t('setActive')),
              h('button', { type: 'button', style: btn, disabled: busy, onClick: () => void act({ action: 'update', id: account.id, enabled: !account.enabled }) }, account.enabled ? t('disable') : t('enable')),
              h('button', {
                type: 'button', style: btn, disabled: busy,
                onClick: () => { void act({ action: 'move', id: account.id, direction: 'up' }); },
              }, '↑'),
              h('button', {
                type: 'button', style: btn, disabled: busy,
                onClick: () => { void act({ action: 'move', id: account.id, direction: 'down' }); },
              }, '↓'),
              h('button', {
                type: 'button', style: btn, disabled: busy,
                onClick: () => { setEditing(editing === account.id ? null : account.id); setKeyDraft(''); },
              }, t('editKey')),
              h('button', {
                type: 'button', style: { ...btn, color: '#d9534f' }, disabled: busy,
                onClick: () => {
                  if (accountList.length <= 1) {
                    setActionError(t('keepOne'));
                    return;
                  }
                  void act({ action: 'remove', id: account.id });
                },
              }, t('remove')),
            ) || h('span', { style: { opacity: .5, fontSize: 12 } }, t('readonly'))),
          ),
          editing === account.id
            ? h('tr', { key: `${account.id}-edit` },
                h('td', { colSpan: 8, style: { padding: '6px 10px', borderBottom: '1px solid rgba(127,127,127,.22)' } },
                  h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
                    h('span', { style: { opacity: .7, fontSize: 12 } }, t('newKeyFor', { ref: account.keyRef ?? '' })),
                    h('input', {
                      style: { ...input, minWidth: 320 }, type: 'password', placeholder: 'oc_sk_…', value: keyDraft,
                      onChange: (event) => setKeyDraft(event.target.value),
                    }),
                    h('button', {
                      type: 'button', style: btn, disabled: busy || keyDraft.trim().length < 8,
                      onClick: async () => {
                        const ok = await act({ action: 'update', id: account.id, key: keyDraft.trim() });
                        if (ok) {
                          setEditing(null);
                          setKeyDraft('');
                          setNotice(t('keyUpdated'));
                        }
                      },
                    }, t('save')),
                    h('button', { type: 'button', style: btn, onClick: () => { setEditing(null); setKeyDraft(''); } }, t('cancel')),
                  ),
                ),
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

      const rows = (data?.models ?? []).map((row) =>
        h('tr', { key: row.model },
          cell(money(row.remaining), { fontWeight: 600 }),
          cell(row.free ? t('unlimited') : `${yuan(row.monthly)} / ${money(row.limit)}`),
          cell(yuan(row.weekly)),
          cell(percentText(row.rolling, row.rollingLimit, row.free)),
          cell(h('div', { style: { display: 'flex', flexDirection: 'column' } },
            h('span', { style: { fontFamily: 'ui-monospace, Consolas, monospace' } }, row.model),
            row.name && row.name !== row.model ? h('span', { style: { fontSize: 11, opacity: .55 } }, row.name) : null,
          )),
          cell(h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 260 } },
            capabilityTags(row).map((label) => h('span', {
              key: label,
              style: {
                padding: '0 6px', borderRadius: 4, fontSize: 11,
                border: '1px solid rgba(127,127,127,.35)', opacity: .85,
              },
            }, label)),
          )),
          cell(String(row.requests)),
          cell(`${tokens(row.input)} / ${tokens(row.output)}`),
        ),
      );

      const peak = data?.peak;
      const quotaSpent = typeof data?.usage?.monthly?.percent === 'number' ? data.usage.monthly.percent : null;
      const priceCell = (price, peakFlag, winner) => h('span', {
        style: winner
          ? { fontWeight: 600, color: '#3c9d5d', background: 'rgba(60,157,93,.12)', padding: '1px 6px', borderRadius: 4 }
          : undefined,
      }, `${yuan(price)}（${peakFlag ? t('peakAtPeak') : t('peakOffPeak')}）`);

      const inspectingAccount = accountList.find((account) => account.id === inspecting) ?? null;

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
        style: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 110 },
      },
        h('span', { style: { fontSize: 11, opacity: .55 } }, label),
        h('span', { style: { fontSize: 13, fontWeight: 500 } }, value),
      );

      const tools = (...children) => h('div', {
        style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
      }, ...children);

      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
          h('div', { style: { fontSize: 16, fontWeight: 600 } }, t('title')),
          state.phase === 'ready' ? h('span', { style: { opacity: .55, fontSize: 12 } }, t('updatedAt', { time: clock(data?.checkedAt) })) : null,
          h('span', { style: { flex: 1 } }),
          h('button', { type: 'button', style: btn, disabled: busy, onClick: () => { void load(true); } }, busy ? t('refreshing') : t('refresh')),
        ),
        state.phase === 'error' ? h('div', { style: { color: '#d9534f', fontSize: 13 } }, t('loadError', { message: state.error })) : null,
        actionError ? h('div', { style: { color: '#d9534f', fontSize: 13 } }, actionError) : null,
        notice ? h('div', { style: { color: '#3c9d5d', fontSize: 13 } }, notice) : null,

        card(
          cardHead(t('routerTitle'), router
            ? h('span', {
                style: {
                  padding: '1px 8px', borderRadius: 999, fontSize: 12,
                  border: `1px solid ${router.mode === 'fallback' ? 'rgba(224,160,48,.7)' : 'rgba(60,157,93,.6)'}`,
                  color: router.mode === 'fallback' ? '#e0a030' : '#3c9d5d',
                },
              }, router.mode === 'fallback' ? t('modeFallback') : t('modePrimary'))
            : h('span', { style: { opacity: .7, fontSize: 12 } }, t('routerMissing'))),
          router?.reason ? h('div', { style: { fontSize: 12, opacity: .6 } }, t('modeReason', { reason: router.reason })) : null,
          router
            ? h('div', { style: { display: 'flex', gap: 32, flexWrap: 'wrap' } },
                stat(t('activeAccount'), router.activeLabel ?? t('none')),
                stat(t('nextProbe'), router.nextProbeAt ? when(router.nextProbeAt) : t('none')),
                stat(t('colStatus'), router.mode === 'fallback' ? t('modeFallback') : t('modePrimary')),
              )
            : null,
          router
            ? tools(
                h('button', { type: 'button', style: btn, disabled: busy, onClick: () => void act({ action: 'probe' }) }, t('probeAll')),
                h('button', { type: 'button', style: btn, disabled: busy, onClick: () => void act({ action: 'reset' }) }, t('resetMarks')),
                h('span', { style: { flexBasis: '100%', fontSize: 11, opacity: .55, lineHeight: 1.6 } }, t('resetHint')),
              )
            : null,
        ),

        card(
          cardHead(t('accountsTitle'), h('span', { style: { opacity: .55, fontSize: 12 } }, t('accountsOrder'))),
          h('div', {
            style: {
              overflowX: 'auto', cursor: 'grab', borderRadius: 8,
              border: '1px solid rgba(127,127,127,.18)',
            },
            ...draggable(),
          },
            h('table', { style: { borderCollapse: 'collapse', width: '100%', fontSize: 12 } },
              h('thead', null,
                h('tr', null, [t('colIndex'), t('colAccount'), t('colKey'), t('colRolling'), t('colWeekly'), t('colMonthly'), t('colStatus'), t('colActions')].map((title) => th(title))),
              ),
              h('tbody', null, accountRows.length > 0
                ? accountRows
                : h('tr', null, h('td', { colSpan: 8, style: { padding: 14, opacity: .6 } }, t('noAccounts')))),
            ),
          ),
          router ? h('div', {
            style: {
              display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap',
              paddingTop: 12, borderTop: '1px solid rgba(127,127,127,.18)',
            },
          },
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
            h('button', { type: 'button', style: btn, disabled: busy || draft.key.trim().length < 8, onClick: () => void addAccount() }, t('addAndProbe')),
          ) : null,
        ),

        peak && card(
          cardHead(t('peakTitle')),
          h('div', { style: { fontSize: 12, opacity: .78, lineHeight: 1.8, marginBottom: 2 } },
            t('peakPlan', {
              plan: peak.plan.id,
              price: peak.plan.priceCny.toFixed(0),
              usd: peak.plan.priceUsd,
              allowance: peak.plan.allowanceCny.toFixed(0),
              allowanceUsd: peak.plan.allowanceUsd,
              discount: (10 / peak.plan.leverage).toFixed(1),
              percent: (100 / peak.plan.leverage).toFixed(0),
            })),
          h('div', { style: { fontSize: 12, opacity: .78, lineHeight: 1.8, marginBottom: 8 } },
            t('peakNow', {
              goPeak: peak.go.peak ? t('peakGoPeak') : t('peakGoOff'),
              officialPeak: peak.official.peak ? t('peakOfficialPeak') : t('peakOfficialOff'),
              holiday: peak.holiday && peak.go.peak ? t('peakHoliday') : '',
            }),
            quotaSpent !== null && quotaSpent >= 100 ? t('peakExhausted') : ''),
          h('table', { style: { borderCollapse: 'collapse', width: '100%', fontSize: 12 } },
            h('thead', null,
              h('tr', null, [t('colModel'), t('peakGoPay'), t('peakOfficialPay'), t('peakVerdict')].map((title) => th(title))),
            ),
            h('tbody', null, peak.models.map((row) =>
              h('tr', { key: row.model },
                cell(h('span', { style: { fontFamily: 'ui-monospace, Consolas, monospace' } }, row.model)),
                cell(priceCell(row.go.pay, row.go.factor > 1, row.cheaper === 'go')),
                cell(priceCell(row.official.pay, row.official.factor > 1, row.cheaper === 'official')),
                cell(row.cheaper === 'go'
                  ? t('peakGoCheaper', { percent: Math.round((1 - row.ratio) * 100) })
                  : t('peakOfficialCheaper', { percent: Math.round((row.ratio - 1) * 100) }), { fontWeight: 600 }),
              ),
            )),
          ),
          h('div', { style: { opacity: .55, fontSize: 11, marginTop: 6, lineHeight: 1.6 } },
            t('peakFootnote', { fx: peak.cnyPerUsd })),
        ),

        card(
          cardHead(t('modelsTitle')),
          h('div', {
            style: {
              overflowX: 'auto', maxHeight: '56vh', overflowY: 'auto', cursor: 'grab',
              borderRadius: 8, border: '1px solid rgba(127,127,127,.18)',
            },
            ...draggable(),
          },
            h('table', { style: { borderCollapse: 'collapse', width: '100%', fontSize: 12 } },
              h('thead', null,
                h('tr', null, [t('colRemaining'), t('colMonthlyUsed'), t('colWeeklyUsed'), t('colRolling'), t('colModel'), t('colCaps'), t('colRequests'), t('colTokens')].map((title) => th(title))),
              ),
              h('tbody', null, rows),
            ),
          ),
        ),

        h('div', { style: { opacity: .55, fontSize: 12, marginTop: 4, lineHeight: 1.8 } },
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
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
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
