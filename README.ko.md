# dsh-opencode-routing

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · **한국어** · [Русский](README.ru.md)

이전의 두 플러그인을 하나의 패키지로 합친 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) 플러그인입니다:
**A→B 자동 페일오버와 쿼터 라우팅을 갖춘 OpenCode 계정 풀**, 그리고 **계정별 / 모델별 사용량 대시보드**가 함께 들어 있습니다.
둘 다 "OpenCode 계정 및 사용량"이라는 하나의 Settings 페이지에 있습니다.

- **클라이언트**: `settings.section` 하나를 60초마다 갱신하며, 계정 추가·편집·순서 변경·프로브가 가능합니다;
  모델 카드에는 기능 태그가 붙고, 두 테이블 모두 드래그로 이동하며, UI는 10개 언어를 지원합니다(브라우저 언어 우선).
- **호스트**: 엔드포인트는 두 개입니다 — `GET /opencode-usage.json`(사용량, `?refresh=1`로 강제 갱신)과
  `GET|POST /opencode-quota-router.json`(풀과 라우팅, 액션은 아래 참조).

## 설치

```bash
npm i dsh-opencode-routing
```

패키지에는 자체 `cordis.patch.yml`이 포함되어 있습니다: `opencode-go` / `opencode-free` 프로바이더를 선언하고
**하나의** insert(`id: opencode-router`)를 둡니다. `usage:`와 `router:` 하위 객체가 각 절반의 설정을 담습니다
(양쪽 모두 `path`를 가지므로 하나의 평면 네임스페이스를 공유할 수 없습니다).

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

최상위 키는 양쪽 절반에 모두 적용되고(`usageUrl`, `apiKeyRef`, `probeIntervalMs`, …), 하위 객체 안의 키는
해당 절반만 덮어씁니다.

## 계정 풀과 페일오버

풀 순서가 곧 사용 순서입니다. 어느 시점이든 정확히 하나의 계정이 "current"이며, 그 키는 프로바이더가 읽는
자격 증명 참조(기본값 `OPENCODE_API_KEY`)로 미러링됩니다. 따라서 계정 전환에는 프로바이더 설정 변경이 필요하지
않습니다: `resolveApiKey`는 매 스트리밍 호출마다 `agent/request` 훅 이후에 실행됩니다.

- **A가 고갈되면 B가 넘겨받습니다**: 공식 허용량 소진이 확인된 `QUOTA` / `ACCOUNT_QUOTA` / 429, 또는 인증 계열
  오류(`AUTH`, `INVALID_CREDENTIAL`, `MISSING_CREDENTIAL`, `ACCOUNT_SIGN_IN_REQUIRED`,
  `CLIENT_UPGRADE_REQUIRED`)가 나면 현재 계정을 사용 불가로 표시하고(윈도 리셋 시까지, 인증 실패는 30분간),
  라우팅을 다음 활성 계정으로 옮긴 뒤 **같은 스텝을 재시도**합니다 — 턴이 하위 등급으로 떨어지는 일은 없습니다.
- **단일 모델 격리**: 한 모델만 허용량이 소진되었고 풀에 아직 예산이 남아 있으면 그 모델만 격리하며(기본 30분),
  나머지 모델은 계속 플랜을 사용합니다.
- **풀 전체 고갈**: 그때서야 라우트가 `fallback`(기본은 DeepSeek 계정)으로 내려가고, 30분마다(또는 롤링 윈도
  리셋 시점에) 토큰을 소모하지 않는 `GET /inference/go/v1/usage` 프로브를 돌려 자동으로 플랜으로 복귀합니다.
- **리셋**: Settings의 "금지 표시 초기화"는 소진/인증 표시를 전부 지우고 즉시 풀로 돌아갑니다. 계정과 키는
  건드리지 않습니다.

## 사용량 대시보드

공식 `/inference/go/v1/usage` 엔드포인트는 롤링 / 주간 / 월간 비율을 반올림한 값만 돌려주고 **모델별 분해는
제공하지 않습니다**. 반면 플랜은 모델마다 따로 과금합니다(5시간 = 월 허용량의 20%, 주 = 50%, 월 = 100%).
그래서 페이지는 두 세트의 숫자를 보여줍니다:

- **공식 비율**(계정당 한 줄): API에서 그대로 가져온 값 — 다른 클라이언트와 다른 머신의 사용량까지 포함한 실제
  계정 사용량입니다.
- **모델별 금액**(모델 테이블): 로컬 추정치입니다. `$DSH_HOME/sessions`를 최근 40일 범위로 다시 스캔하면서
  provider가 `opencode`로 시작하는 `assistant/message` 이벤트만 공개 요율(DeepSeek의 2배 피크 구간 포함)로
  계산합니다. 다른 도구에서 발생한 사용량은 로컬 기록이 없습니다.

"사용량 보기"는 세 개의 윈도, 각 윈도의 리셋 시각, 프로브 결과가 담긴 계정별 다이얼로그를 엽니다(해당 계정만
프로브하며 모델은 절대 전환하지 않습니다).

"키 편집"은 `GET /opencode-quota-router.json?key=<account id>`에서 계정의 현재 키를 가져와 입력란을 미리
채웁니다(로컬 전용 엔드포인트이며, 목록 스냅샷에는 항상 마스킹된 값만 실립니다). 모델 이름은 벤더 표기를
따르며(`deepseek-v4.1-flash` → `DeepSeek V4.1 Flash`), 공개된 브랜드 마크가 있는 벤더는 인라인 SVG로, 나머지는
문자 배지로 렌더링합니다. "다음 프로브"는 실제 타이머(기본 30분)이고 페이지가 1초마다 다시 렌더링되므로
카운트다운됩니다. 페이지를 여는 것은 스냅샷을 읽기만 할 뿐 프로브를 트리거하지 않습니다.

"지금 어느 쪽이 더 저렴한가"는 구독 레버리지에서 파생됩니다: Go는 정가 기준 $100어치 허용량을 $10에
판매하므로(≈ ¥710) OpenCode는 항상 공식 가격의 10% — 90% 저렴합니다. 실제 데이터는 공식 API에 유리한 적이
없습니다.

기능 열은 같은 카탈로그 엔드포인트(`/inference/go/v1/models`)에서 옵니다: `modalities.input`과 `capabilities`를
텍스트 / 이미지 / 비디오 / 오디오 / PDF, 툴 호출, 추론, 컨텍스트 길이로 렌더링합니다. 가격이 0인 모델은
"무제한"으로 표시합니다.

### 피크 / 비피크와 공휴일

DeepSeek의 비피크 구간은 베이징 시간 기준 월–금 09:00–12:00과 14:00–18:00을 제외한 모든 시간(점심시간, 야간,
주말, **법정 공휴일** 포함)이며 가격은 피크의 정확히 절반입니다. OpenCode는 UTC 월–금 01–04와 06–10만 피크로
취급하고 **중국 법정 공휴일은 무시합니다**(anomalyco/opencode#53071, 메인테이너: *"Go pricing follows our own
schedule, not DeepSeek's holiday calendar."*).

플러그인에는 2026–2031 중국 법정 공휴일 테이블이 들어 있습니다. 이는 `holidayAware: true`(`usage.holidayAware`)가
설정된 경우에만 공식 쪽에 적용되며, OpenCode가 그날에도 피크 요금을 부과하기 때문에 기본값은 꺼짐입니다.
테이블은 `usage.js`의 `HOLIDAYS`에 있고, `isChinaHoliday()`는 단독으로 호출할 수 있습니다.

구독 가격과 허용량은 `usage.planPriceUsd` / `usage.planAllowanceUsd`로 덮어쓸 수 있습니다. 페이지의 할인율은
이 두 숫자에서 계산되므로, OpenCode 쪽의 플랜 변경은 패치가 아니라 설정 수정으로 끝납니다.

## 설정 API

`GET /opencode-quota-router.json`은 `{mode, reason, active, accounts[], quarantine[], routes[], lastFailure}`를
반환하며, 계정 키는 항상 마스킹됩니다(`hint`). 같은 경로에 `{action, ...}`로 `POST`합니다:

| action | 인자 | 동작 |
| --- | --- | --- |
| `add` | `label?`, `key` | 계정 생성(키 ≥ 8자), 저장 후 프로브 |
| `update` | `id`, `label?` / `enabled?` / `key?` | 이름 변경, 비활성/활성, 키 교체 |
| `remove` | `id` | 계정과 키 삭제(항상 하나는 남김) |
| `activate` | `id` | 지금 해당 계정으로 전환 |
| `move` | `id`, `direction: up\|down` | 순서 변경 |
| `probe` | `id?` | 모든 계정 또는 하나만 프로브 |
| `reset` | — | 소진/인증 표시를 지우고 풀로 복귀 |

`GET /opencode-usage.json`은 `{plan, configuredPlan, detectedPlan, holidayAware, peak, usage, accounts[],
activeAccount, models[], totals}`를 반환하며, `?refresh=1`은 먼저 최신 공식 스냅샷을 강제로 가져옵니다.

## 언어

UI 문자열은 `client.js`의 `DICT`에 있습니다: `zh`(원본), `zh-tw`, `en`, 그리고 `es` / `fr` / `de` / `pt` / `ja` /
`ko` / `ru`(`scripts/merge-i18n.mjs`가 번역 파일에서 인라인하며, 키가 없으면 `en`으로, 그다음에는 키 자체로
폴백합니다). `localeOf()`는 브라우저 언어 프리픽스를 매칭하고 중국어 간체와 번체를 구분합니다.

## 테스트

```bash
node test.mjs
```

모델 쿼터는 필요하지 않습니다: 가짜 컨텍스트, 가짜 자격 증명 저장소, 가짜 webServer, 그리고 API 키별로 응답하는
로컬 사용량 엔드포인트를 사용합니다. 커버 범위: 복합 마운트, 계정 채택, 단일 모델 격리, 키 미러링을 포함한 A→B
페일오버, 계정별 프로브, 풀 전체 폴백, 리셋, 설정 액션 검증, 사용량 뷰(기능 태그, 무제한 모델, 피크/비피크
계산, 과금 라인), 단일 계정 저하 모드.

## 이전 패키지와의 관계

`dsh-opencode-quota-router`와 `dsh-opencode-usage-settings`가 전신이며, 두 패키지가 하던 모든 일이 이곳에
병합되었습니다. 둘 다 npm에서 deprecated로 표시되어 이 패키지를 가리킵니다. 예전 저장소는 삭제되었고, 이곳이 유일한 소스입니다.

## 기여

이슈와 풀 리퀘스트를 환영합니다 — [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요. PR을 올리기 전에
`node test.mjs`를 실행하세요.

## 라이선스

MIT — [LICENSE](LICENSE)를 참고하세요.
