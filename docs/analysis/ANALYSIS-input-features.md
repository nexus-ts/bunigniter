# NexusTS Input 기능 분석 — CodeIgniter 3/4 / Laravel / AdonisJS / Elysia 대비

> 분석일: 2026-06-28
> 대상: CodeIgniter 3, CodeIgniter 4, Laravel 11, AdonisJS 6, Elysia 2.0.0-exp.9

---

## 1. 프레임워크별 Input 아키텍처 개요

### Elysia (NexusTS 기반)

Elysia는 Web Standard Request 기반으로 최소한의 Context만 제공한다.

- `ctx.body` — JSON/form body (Elysia가 자동 파싱)
- `ctx.query` — URL query string
- `ctx.params` — route parameters
- `ctx.headers` — HTTP headers (헤더명 소문자)
- `ctx.cookie` — Cookie Store (mutable signal)
- `ctx.request` — Web Standard `Request` 객체
- `ctx.server` — Bun server instance (Bun only)
- `server.requestIP(request)` — IP 조회 (Bun only)

NexusTS Controller는 여기에 `this.body`, `this.query`, `this.param(name)`, `this.headers` getter만 추가했다.
**별도의 `Request` 래퍼 클래스가 없어서** input 관련 API가 매우 빈약하다.

### CodeIgniter 3 (CI_Input)

클래식 `CI_Input` 클래스 (`system/core/Input.php`)

- `$this->input->get($key, $xss_clean)` — GET
- `$this->input->post($key, $xss_clean)` — POST
- `$this->input->post_get($key, $xss_clean)` — POST→GET fallback
- `$this->input->get_post($key, $xss_clean)` — GET→POST fallback
- `$this->input->cookie($key, $xss_clean)` — COOKIE
- `$this->input->server($key, $xss_clean)` — SERVER
- `$this->input->input_stream($key, $xss_clean)` — php://input (PUT/PATCH/DELETE)
- `$this->input->ip_address()` — 클라이언트 IP (proxy 지원)
- `$this->input->valid_ip($ip, $which)` — IP 유효성 검증 (ipv4/ipv6)
- `$this->input->user_agent($xss_clean)` — User-Agent
- `$this->input->request_headers($xss_clean)` — 전체 헤더
- `$this->input->get_request_header($index, $xss_clean)` — 단일 헤더
- `$this->input->is_ajax_request()` — AJAX 감지
- `$this->input->method($upper)` — HTTP method
- `$this->input->set_cookie(...)` — 쿠키 설정
- `_fetch_from_array()` 내부에서 `user[name]` 같은 **대괄호 표기법 지원** (array notation)
- **모든 메서드에 선택적 XSS 필터링** (`$xss_clean` 파라미터)

> CI3 전용 특징: `$this->input->` 형태로 접근 (전역 Input 라이브러리), XSS 필터 빌트인, `set_cookie()` 포함

### CodeIgniter 4 (IncomingRequest)

전용 `IncomingRequest` 클래스 (extends `Request` → `OutgoingRequest` → `Message`)

- `$request->getGet($key)` / `getPost($key)` / `getPostGet($key)` / `getGetPost($key)`
- `$request->getJSON($assoc)` / `getJsonVar($key)` (dot-notation)
- `$request->getRawInput()` / `getRawInputVar($key)`
- `$request->getServer($key)` / `getCookie($key)`
- `$request->getIPAddress()` / `getUserAgent()` / `getMethod()`
- `$request->isAJAX()` / `isSecure()` / `is('json')` / `isCLI()`
- `$request->getOldInput($key)` — flash data from redirect
- `$request->getFiles()` / `getFile($field)` / `getFileMultiple($field)`
- 모든 메서드에 PHP `filter_var` 지원 (validation/sanitization)
- content negotiation: `negotiate('media', ...)` / `negotiate('language', ...)`

> CI4 전용 특징: CI3 대비 JSON 전용 메서드, flash input, content negotiation, 파일 업로드 통합 추가

### Laravel 11

Symfony Request 기반 + `InteractsWithInput` trait

- `$request->input($key, $default)` — POST + GET 통합 접근
- `$request->query($key, $default)` — GET 전용
- `$request->post($key, $default)` — POST 전용
- `$request->only($keys)` / `except($keys)` — 키 필터링
- `$request->has($key)` / `filled($key)` / `missing($key)` — 존재 여부
- `$request->boolean($key)` / `integer($key)` / `float($key)` / `date($key)` / `enum($key)` — 타입 캐스팅
- `$request->str($key)` / `array($key)` / `collect($key)`
- `$request->json($key)` — JSON body 접근
- `$request->bearerToken()` — Bearer token 추출
- `$request->ip()` / `ips()` / `userAgent()` / `method()`
- `$request->ajax()` / `pjax()` / `prefetch()` / `secure()`
- `$request->wantsJson()` / `expectsJson()` / `accepts()`
- `$request->old($key)` / `flash()` / `flashOnly()` / `flashExcept()`
- `$request->hasFile($key)` / `file($key)` / `allFiles()`
- `$request->server($key)` / `header($key)` / `cookie($key)`
- `$request->merge($input)` / `mergeIfMissing($input)` / `replace($input)`
- `$request->validate($rules)` — 바로 validation
- `$request->__get($key)` — magic getter for input

### AdonisJS 6

전용 `Request` 클래스 (HttpContext.request)

- `request.all()` / `body()` — 전체 body
- `request.input($key, $default)` — 특정 필드
- `request.only($keys)` / `except($keys)` — 키 필터링
- `request.param($key, $default)` / `params()` — route params
- `request.qs()` — query string 전체
- `request.raw()` — raw body string
- `request.header($key, $default)` / `headers()` — 헤더
- `request.method()` / `intended()` — HTTP method
- `request.url()` / `completeUrl()` — URL 정보
- `request.ip()` / `ips()` — IP (trust proxy 지원)
- `request.protocol()` / `secure()` — 프로토콜
- `request.host()` / `hostname()` / `subdomains()`
- `request.ajax()` / `pjax()`
- `request.is($types)` — content-type matching
- `request.accepts($types)` / `types()` — Accept 협상
- `request.language($languages)` / `languages()` — 언어 협상
- `request.charset()` / `encoding()` — charset/encoding 협상
- `request.cookie($key)` / `encryptedCookie($key)` / `plainCookie($key)`
- `request.file($key, $options)` — 업로드 파일
- `request.hasBody()` / `fresh()` / `stale()`
- `request.hasValidSignature($purpose)` — signed URL
- `request.matchesRoute($id)` — route match
- `request.id()` — unique request ID (distributed tracing)
- `request.serialize()` / `toJSON()` — 직렬화

---

## 2. 기능별 비교표

### 2.1 Input 데이터 접근

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| 전체 body | ✗ | `getJSON()` | `all()` | `all()` / `body()` | `ctx.body` | `this.body` | ⚠️ CI3 제외 |
| 단일 필드 | `post('name')` | `getPost('name')` | `input('name')` | `input('name')` | `ctx.body.name` | `this.body.name` | ⚠️ |
| 기본값 지원 | ✗ | ✗ | `input('name', default)` | `input('name', default)` | ✗ | ✗ | **🔴** |
| GET 전용 | `get('page')` | `getGet('page')` | `query('page')` | `input('page')` | `ctx.query.page` | `this.query.page` | ⚠️ |
| POST 전용 | `post('name')` | `getPost('name')` | `post('name')` | `input('name')` | `ctx.body.name` | `this.body.name` | ⚠️ |
| POST→GET fallback | `post_get()` | `getPostGet()` | `input()` (자동) | `input()` (자동) | ✗ | ✗ | **🔴** |
| GET→POST fallback | `get_post()` | `getGetPost()` | ✗ | ✗ | ✗ | ✗ | **🔴** |
| 대괄호 표기법 | `name[0]` ✅ | `_fetchGlobal` | ✗ | ✗ | ✗ | ✗ | **🔴** |
| JSON 전용 | ✗ | `getJsonVar('user.name')` | `json('user.name')` | `input('user.name')` | ✗ | ✗ | **🔴** |
| raw body | `input_stream()` | `getRawInput()` | `getContent()` | `raw()` | `ctx.request.text()` | ✗ | **🔴** |
| only(keys) | ✗ | ✗ | ✅ | ✅ | ✗ | ✗ | **🔴** |
| except(keys) | ✗ | ✗ | ✅ | ✅ | ✗ | ✗ | **🔴** |
| merge/replace | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |

### 2.2 Input 존재 여부 확인

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| `has(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `filled(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `missing(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `hasAny(keys)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |

### 2.3 타입 캐스팅

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| `boolean(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `integer(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `float(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `date(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `enum(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `str(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `array(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `collect(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |

### 2.4 요청 식별 / 메타데이터

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| `method()` | `method()` | `getMethod()` | `method()` | `method()` / `intended()` | `ctx.request.method` | ✗ | **🔴** |
| `isAjax()` | `is_ajax_request()` | ✅ | `ajax()` | `ajax()` | ✗ | ✗ | **🔴** |
| `isSecure()` | ✗ | ✅ | `secure()` | `secure()` | ✗ | ✗ | **🔴** |
| `is('json')` | ✗ | ✅ | `isJson()` | `is(['json'])` | ✗ | ✗ | **🔴** |
| `wantsJson()` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `expectsJson()` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `accepts()` | ✗ | ✗ | ✅ | ✅ | ✗ | ✗ | **🔴** |
| `prefers()` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `pjax()` | ✗ | ✗ | ✅ | ✅ | ✗ | ✗ | **🔴** |
| `isCLI()` | ✗ | ✅ | ✗ | ✗ | ✗ | ✗ | **🔴** |

### 2.5 IP / User Agent

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| `ip()` / `ipAddress()` | `ip_address()` | `getIPAddress()` | `ip()` | `ip()` | `server.requestIP()` | ✗ | **🔴** |
| IP 유효성 검증 | `valid_ip($ip)` | ✗ | ✗ | ✗ | ✗ | ✗ | **🔴** |
| `ips()` (proxy chain) | ✗ | ✗ | ✅ | `ips()` | ✗ | ✗ | **🔴** |
| `userAgent()` | `user_agent()` | `getUserAgent()` | `userAgent()` | `header('User-Agent')` | `ctx.headers['user-agent']` | `this.headers['user-agent']` | ⚠️ |
| `host()` | ✗ | ✗ | ✅ | ✅ | `ctx.request.url.host` | ✗ | **🔴** |
| `hostname()` | ✗ | ✗ | ✗ | ✅ | ✗ | ✗ | **🔴** |
| `subdomains()` | ✗ | ✗ | ✗ | ✅ | ✗ | ✗ | **🔴** |
| trust proxy 설정 | `$config['proxy_ips']` | `$config->proxyIPs` | `setTrustedProxies()` | `config.http.trustProxy` | ✗ | ✗ | **🔴** |

### 2.6 서버 / 헤더 / 쿠키

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| `server(key)` | `server()` | `getServer()` | `server()` | ✗ | ✗ | ✗ | **🔴** |
| `header(key)` | `get_request_header()` | `header()` | `header()` | `header()` | `ctx.headers['key']` | `this.headers['key']` | ⚠️ |
| `hasHeader(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `bearerToken()` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `cookie(key)` | `cookie()` | `getCookie()` | `cookie()` | `cookie()` | `ctx.cookie.name.value` | ✗ | **🔴** |
| `hasCookie(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `set_cookie()` | `set_cookie()` | ✗ | ✗ | ✗ | `ctx.cookie.name.value = v` | ✗ | ⚠️ CI3만 |

### 2.7 파일 업로드

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| `file(key)` | ✗ (별도 Upload lib) | `getFile()` | `file()` | `file()` | Elysia `body` (formdata) | `this.upload.file(body, key)` | ⚠️ |
| 파일 검증 | ✅ (별도 Upload lib) | `isValid()` | `validate()` | `file(key, options)` | ✗ | size/MIME 검증 | ⚠️ |
| `hasFile(key)` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `allFiles()` | ✗ | `getFiles()` | `allFiles()` | ✗ | ✗ | ✗ | **🔴** |

### 2.8 Old Input / Flash

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| `old(key)` | ✗ | `getOldInput()` | `old()` | ✗ (session 직접) | ✗ | ✗ | **🔴** |
| `flash()` / `flashOnly()` / `flashExcept()` | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |
| `withInput()` (redirect) | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | **🔴** |

### 2.9 보안

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| XSS 필터링 | ✅ (`xss_clean`) | ✅ (`xss_clean`) | Blade 자동 escape | Edge 자동 escape | ✗ | ✗ | **🔴** |
| Input sanitize | ✗ | `filter_var` flags | ✗ (validation 사용) | ✗ | ✗ | ✗ | **🔴** |
| signed URL 검증 | ✗ | ✗ | ✅ | `hasValidSignature()` | ✗ | ✗ | **🔴** |
| request ID 추적 | ✗ | ✗ | ✗ | `id()` | ✗ | ✗ | **🔴** |

### 2.10 Validation 통합

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| Inline validation | ✗ (별도 Validator) | ✗ | `$request->validate()` | `request.validate()` | Elysia schema | `this.validate()` | ✅ |
| Form Request | ✗ | ✗ | `FormRequest` class | validator class | Elysia plugin | ✗ | **🔴** |
| String rules | `$this->form_validation->set_rules()` | `$this->validate()` | ✗ | ✗ | ✗ | `this.validate(body, rules)` | ✅ CI-style |

### 2.11 Content Negotiation

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| Accept 협상 | ✗ | `negotiate('media', ...)` | `accepts()` | `accepts()` / `is()` | ✗ | ✗ | **🔴** |
| 언어 협상 | ✗ | `negotiate('language', ...)` | ✗ | `language()` | ✗ | ✗ | **🔴** |
| Charset 협상 | ✗ | ✗ | ✗ | `charset()` | ✗ | ✗ | **🔴** |

### 2.12 IP 유효성 검증 (CI3 특화)

| 기능 | CI3 | CI4 | Laravel | AdonisJS | Elysia | NexusTS | 상태 |
|------|:---:|:---:|:-------:|:--------:|:------:|:-------:|:----:|
| `valid_ip($ip)` | ✅ | ✗ | ✗ | ✗ | ✗ | ✗ | **🔴** |
| `valid_ip($ip, 'ipv4')` | ✅ (프로토콜 지정) | ✗ | ✗ | ✗ | ✗ | ✗ | **🔴** |
| `valid_ip($ip, 'ipv6')` | ✅ (프로토콜 지정) | ✗ | ✗ | ✗ | ✗ | ✗ | **🔴** |

---

## 3. 프레임워크별 총 Input Method 수

| 프레임워크 | Input 메서드 수 | Request 전용 클래스 | 접근 방식 |
|-----------|:--------------:|:------------------:|:---------:|
| **Laravel 11** | ~70+ | `Illuminate\Http\Request` (Symfony 기반) | `$request->method()` |
| **AdonisJS 6** | ~45+ | `@adonisjs/http-server/Request` | `request.method()` |
| **CodeIgniter 4** | ~25+ | `CodeIgniter\HTTP\IncomingRequest` | `$request->method()` |
| **CodeIgniter 3** | ~18+ | `CI_Input` (system/core/Input.php) | `$this->input->method()` |
| **Elysia 2.0** | ~10 (raw) | 없음 (Context 객체뿐) | `ctx.method` |
| **NexusTS** (현재) | ~5 (getter) | 없음 (Controller getter만) | `this.body` |

---

## 4. 프레임워크별 Input 특징 요약

### CI3 — 심플 & 실용적

- `$this->input->get/post/cookie/server()` — 4개로 모든 input 처리
- 모든 메서드에 `$xss_clean` 파라미터로 보안 내장
- 대괄호 표기법 (`name[0]`) 지원 — PHP 배열 자연스럽게 처리
- `$this->input->set_cookie()` — 설정까지 Input 클래스에서
- `valid_ip()` — IP 검증 전용 메서드 (CI3만의 특징)
- JSON 전용 메서드 없음 — PHP era 스타일

### CI4 — CI3의 현대화

- CI3 기능 계승 + JSON 전용 메서드 추가 (`getJsonVar`)
- `getRawInput()` / `getRawInputVar()` — PUT/PATCH 명시적 지원
- `getOldInput()` — flash input 추가 (redirect 유지)
- `is('json')` / `isAJAX()` / `isSecure()` — 요청 타입 검사
- content negotiation — `negotiate('media', ...)`
- 파일 업로드 Input 클래스에 통합

### Laravel — 가장 풍부함

- 타입 캐스팅 전용 메서드群 (`boolean`, `integer`, `float`, `date`, `enum`...)
- `only()` / `except()` — mass assignment 방어
- `has()` / `filled()` / `missing()` — 조건부 로직
- `flash()` / `flashOnly()` / `flashExcept()` — 세션 플래시
- `wantsJson()` / `expectsJson()` — API 응답 최적화
- `bearerToken()` — 인증 토큰 전용

### AdonisJS — 가장 현대적

- 모든 협상 (accept/language/charset/encoding)
- `serialize()` / `toJSON()` — request 전체 직렬화
- `id()` — 분산 추적용 고유 ID
- `hasValidSignature()` — signed URL
- `fresh()` / `stale()` — HTTP 캐시
- `matchesRoute()` — route 매칭
- Trust proxy 설정 가장 명확

### Elysia — 미니멀

- 최소한의 raw 데이터만 제공
- Web Standard Request 기반 (범용성)
- cookie를 mutable signal로 제공 (독특)
- 확장 포인트: `derive` / `resolve`로 context 확장 가능

---

## 5. 결론: NexusTS에 가장 필요한 Input 기능 (우선순위)

### Phase 1 — 필수 (MVP)

```
this.request.input(key, default?)     // GET + POST 통합 (Laravel/AdonisJS)
this.request.get(key, default?)       // GET 전용 (CI3/CI4)
this.request.post(key, default?)      // POST 전용 (CI3/CI4)
this.request.only(keys)               // mass-assignment 보호 (Laravel/AdonisJS)
this.request.has(key)                 // 존재 여부 (Laravel)
this.request.filled(key)              // 값 존재 여부 (Laravel)
this.request.method()                 // HTTP method (CI3/CI4/Laravel/AdonisJS)
this.request.isAjax()                 // AJAX 감지 (CI3/CI4/Laravel/AdonisJS)
this.request.ip()                     // 클라이언트 IP (모든 프레임워크)
```

### Phase 2 — 생산성

```
this.request.boolean(key)             // 타입 캐스팅 (Laravel)
this.request.integer(key)             // 타입 캐스팅 (Laravel)
this.request.json(key)                // JSON dot-notation (CI4/Laravel)
this.request.bearerToken()            // Bearer token (Laravel)
this.request.userAgent()              // User-Agent (CI3/CI4/Laravel)
this.request.cookie(key)              // 쿠키 접근 (CI3/CI4/Laravel/AdonisJS)
this.request.server(key)              // 서버 변수 (CI3/CI4/Laravel)
```

### Phase 3 — 고급

```
this.request.except(keys)             // 키 제외 (Laravel/AdonisJS)
this.request.missing(key)             // 부재 확인 (Laravel)
this.request.is(type)                 // Content-Type 감지 (CI4/AdonisJS)
this.request.wantsJson()              // JSON 선호 (Laravel)
this.request.secure()                 // HTTPS 확인 (CI4/Laravel/AdonisJS)
this.request.accepts(types)           // Accept 협상 (CI4/Laravel/AdonisJS)
this.request.old(key)                 // flash input (CI4/Laravel)
this.request.flash()                  // flash 저장 (Laravel)
this.request.merge(data)              // input 병합 (Laravel)
this.request.validIp(ip)              // IP 검증 (CI3)
```

---

## 6. CI3만의 독특한 포인트 (참고)

CI3 Input 클래스는 다른 프레임워크와 비교해 몇 가지 독특한 특징이 있다:

| 특징 | 설명 | 채택 여부 |
|------|------|:---------:|
| `valid_ip()` | IP 주소 유효성 및 프로토콜(ipv4/ipv6) 검증 전용 메서드 | 고려 |
| 대괄호 배열 표기법 | `$this->input->post('user[name]')` 처럼 HTML form 배열 접근 | TS에서는 자연스러움 |
| `$xss_clean` 파라미터 | 모든 input 메서드에 선택적 XSS 필터 내장 | 필요시 검토 |
| `set_cookie()` | Input 클래스에서 쿠키 설정까지 담당 | 분리 가능 |
