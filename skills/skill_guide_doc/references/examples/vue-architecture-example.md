# API 레이어 아키텍처

## 개요

이 프로젝트는 **6계층 API 아키텍처**를 채택하여 Electron 데스크톱 앱과 Vue PWA를 동시에 지원합니다.

- **Electron 환경**: 6계층 (IPC 포함)
- **Browser 환경**: 5계층 (IPC 제외)

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: Vue Component                                      │
│  - UI 렌더링, 사용자 이벤트 처리                               │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  Layer 2: Composables                                        │
│  - 비즈니스 로직, 상태 관리, API 호출 조합                      │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  Layer 3: Renderer API Client                                │
│  - 환경 감지 (Electron/Browser), 토큰 갱신 로직                │
└──────────────────────────┬───────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │ Electron                        │ Browser
          ▼                                 │
┌─────────────────────┐                     │
│  Layer 4: IPC       │                     │
│  Main Process       │                     │
└─────────┬───────────┘                     │
          │                                 │
          └────────────────┬────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 5: 공유 API 패키지 (@crowsgear/online-class-apis)     │
│  - Axios 래퍼, 타입 정의 (DTOs)                              │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 6: Backend Server (NestJS)                            │
│  - REST API 엔드포인트, 데이터베이스 연동                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 레이어별 상세

### Layer 1: Vue Component

**경로**: `src/apps/electron/renderer-process/pages/`

**역할**:

- UI 렌더링 및 사용자 이벤트 처리
- 최소한의 로직만 포함 (표시 로직)
- Composable을 통해 비즈니스 로직 위임

**구조**:

```
renderer-process/pages/
├── auth/                       # 인증 관련 화면
│   └── Login.vue
├── courses/                    # 강의 관련 화면
│   ├── CourseList.vue
│   └── attendances/
│       └── AttendanceList.vue
├── students/                   # 학생 관련 화면
│   ├── StudentList.vue
│   └── StudentDetail.vue
└── tests/                      # 시험 관련 화면
    └── TestList.vue
```

**핵심 코드 패턴**:

```vue
<script setup lang="ts">
/* Composable 사용 - 비즈니스 로직 위임 */
const { refTableData, cptFilteredData, handleSearch, handleRowClick } = useCourseListComposable();

onMounted(() => {
    /* 초기 데이터 로드 */
});
</script>

<template>
    <!-- UI만 담당 -->
</template>
```

---

### Layer 2: Composables

**경로**: `src/apps/electron/renderer-process/composables/`

**역할**:

- 비즈니스 로직 캡슐화
- 상태 관리 (ref, computed)
- API Client 호출 및 데이터 변환
- 이벤트 핸들러 정의

**구조**:

```
renderer-process/composables/
├── common/                     # 공통 composable
│   └── table/
│       └── common-table.composable.ts
├── courses/                    # 강의 도메인
│   ├── course-list.composable.ts
│   └── course-detail.composable.ts
├── students/                   # 학생 도메인
│   ├── student-list.composable.ts
│   └── student-detail.composable.ts
└── search/                     # 검색 기능
    └── index.ts
```

**핵심 코드 패턴**:

```typescript
export const useCourseListComposable = () => {
    const courseApiClient = CourseApiClient.getInstance();

    /* Ref (상태) */
    const refSearchQuery = ref("");
    const refTableData = ref<ICourse[]>([]);

    /* Computed */
    const cptFilteredData = computed(() => {
        return refTableData.value.filter(/* ... */);
    });

    /* Handler */
    const handleSearch = async () => {
        const result = await courseApiClient.getCourses({ query: refSearchQuery.value });
        refTableData.value = result.data.items;
    };

    return {
        refSearchQuery,
        refTableData,
        cptFilteredData,
        handleSearch,
    };
};
```

> 상세한 네이밍 규칙은 [composable.md](../convention/composable.md) 참조

---

### Layer 3: Renderer API Client

**경로**: `src/apps/electron/renderer-process/apis/`

**역할**:

- Composable에서 API 호출의 진입점
- Electron/Browser 환경 자동 감지 및 분기
- 토큰 갱신 로직 중앙 관리
- 싱글톤 패턴으로 인스턴스 관리

**구조**:

```
renderer-process/apis/
├── base/
│   └── base-api-client.ts      # 공통 추상 클래스
├── auth/
│   └── auth-api-client.ts      # 인증 API
├── courses/
│   └── course-api-client.ts    # 강의 API
├── users/
│   └── user-api-client.ts      # 사용자 API
├── tests/
│   └── test-api-client.ts      # 시험 API
└── ... (30+ 도메인)
```

**핵심 코드 패턴**:

```typescript
export class CourseApiClient extends BaseApiClient {
    private static instance: CourseApiClient;

    /* 싱글톤 패턴 */
    static getInstance(): CourseApiClient {
        if (!CourseApiClient.instance) {
            CourseApiClient.instance = new CourseApiClient();
        }
        return CourseApiClient.instance;
    }

    /* 이중 메서드 패턴 - Electron/Browser 분기 */
    public async getCourses(params: any): Promise<any> {
        return this.executeRequest(
            () => window.electronAPI.api.courses.getCourses(params) /* Electron */,
            () => coursesApi.getCourses(params) /* Browser */,
        );
    }
}
```

**BaseApiClient 주요 기능**:

- `environment` 감지 (ELECTRON vs BROWSER)
- `executeRequest()` - 환경별 분기 및 토큰 갱신
- `isRefreshing` 플래그로 중복 갱신 방지

---

### Layer 2: Main Process IPC Handler

**경로**: `src/apps/electron/main-process/ipc-handlers/api/`

**역할**:

- Renderer에서 오는 IPC 요청 처리
- 공유 API 패키지 호출
- httpOnly 쿠키 기반 토큰 관리
- 에러 처리 및 로깅

**구조**:

```
main-process/ipc-handlers/
├── api/
│   ├── base.handler.ts         # 공통 핸들러 클래스
│   ├── auth/
│   │   └── auth-service.handler.ts
│   ├── course/
│   │   └── course-service.handler.ts
│   └── ... (30+ 도메인 대응)
├── hwp/                        # HWP 파서 (Python 연동)
├── omr/                        # OMR 스캐너 (Python 연동)
└── updater/                    # 앱 업데이트
```

**핵심 코드 패턴**:

```typescript
export class IPCCourseApiHandler extends IPCBaseServiceHandler {
    initialize() {
        this.setUpGetCourses();
        this.setUpCreateCourse();
        /* ... */
    }

    private setUpGetCourses() {
        this.registerHandler("api-get-courses", async (_, params: any) => {
            const result = await coursesApi.getCourses(params);
            this.logger.success("강의 목록 조회 성공");
            return result;
        });
    }
}
```

**IPCBaseServiceHandler 주요 기능**:

- `registerHandler()` - IPC 채널 등록 (ipcMain.handle)
- `setCookie()` / `getCookies()` - Electron Session API
- 에러 처리 래핑 (try-catch)

---

### Layer 3: 공유 API 패키지

**경로**: `src/packages/apis/`
**패키지명**: `@crowsgear/online-class-apis`

**역할**:

- Electron과 Vue PWA 모두에서 사용 가능
- 실제 HTTP 요청 실행 (Axios)
- 타입 정의 및 DTOs 제공

**구조**:

```
packages/apis/src/
├── clients/
│   └── apiClient.ts            # Axios 래퍼
├── endpoints/                  # API 서비스 함수
│   ├── auth/
│   ├── courses/
│   └── ... (30+ 도메인)
├── types/                      # 타입 정의
│   ├── auth/
│   │   ├── ILoginDto.ts
│   │   └── ILoginResponse.ts
│   └── ...
├── interceptors/               # Request/Response 인터셉터
└── enums/                      # 열거형
```

**사용 예시**:

```typescript
import { coursesApi, authApi } from "@crowsgear/online-class-apis";
import type { ILoginDto, ICourse } from "@crowsgear/online-class-apis/types";

/* 로그인 */
const result = await authApi.login({ email, password });

/* 강의 목록 조회 */
const courses = await coursesApi.getCourses({ page: 1, limit: 10 });
```

---

## 통신 흐름

### Electron 환경

```
1. Vue Component
   │
   ▼
2. CourseApiClient.getCourses(params)
   ├─ environment 감지 → ELECTRON
   └─ executeRequest() 호출
      │
      ▼
3. IPC 채널 호출
   window.electronAPI.api.courses.getCourses(params)
   → ipcRenderer.invoke("api-get-courses", params)
      │
      ▼
4. Main Process Handler
   IPCCourseApiHandler.registerHandler("api-get-courses", ...)
      │
      ▼
5. 공유 API 패키지
   coursesApi.getCourses(params)
      │
      ▼
6. HTTP 요청 (Axios)
   GET /api/courses
      │
      ▼
7. Backend Response → 역순 반환
```

### Browser 환경

```
1. Vue Component
   │
   ▼
2. CourseApiClient.getCourses(params)
   ├─ environment 감지 → BROWSER
   └─ executeRequest() 호출
      │
      ▼
3. 공유 API 패키지 직접 호출
   coursesApi.getCourses(params)
      │
      ▼
4. HTTP 요청 (Axios)
   GET /api/courses
      │
      ▼
5. Backend Response → 반환
```

---

## 토큰 갱신 메커니즘

```typescript
/* BaseApiClient.executeRequest() 내부 */

1. API 요청 실행
2. 401 에러 발생 시 (TOKEN_EXPIRE)
   │
   ├─ isRefreshing === true
   │  └─ 기존 refreshPromise 대기
   │
   └─ isRefreshing === false
      ├─ isRefreshing = true
      ├─ performTokenRefresh() 호출
      │  ├─ Electron: window.electronAPI.api.auths.getAccessToken()
      │  └─ Browser: authApi.refreshToken()
      ├─ 새 토큰 저장
      └─ 원래 요청 재시도

3. 성공 시 결과 반환
```

**핵심**: `isRefreshing` 플래그로 동시 요청 시 중복 갱신 방지

---

## 새 API 추가 시 작업 순서

### 1. 공유 API 패키지 (`packages/apis/`)

```typescript
/* 1-1. 타입 정의 */
/* packages/apis/src/types/notices/INoticeDto.ts */
export interface ICreateNoticeDto {
    title: string;
    content: string;
}

/* 1-2. API 엔드포인트 함수 */
/* packages/apis/src/endpoints/notices/index.ts */
export const noticesApi = {
    getNotices: (params: any) => apiClient.search("/notices", params),
    createNotice: (data: ICreateNoticeDto) => apiClient.post("/notices", data),
};
```

### 2. Main Process IPC Handler

```typescript
/* main-process/ipc-handlers/api/notices/notices-service.handler.ts */
export class IPCNoticesApiHandler extends IPCBaseServiceHandler {
    initialize() {
        this.registerHandler("api-get-notices", async (_, params) => {
            return await noticesApi.getNotices(params);
        });
        this.registerHandler("api-create-notice", async (_, data) => {
            return await noticesApi.createNotice(data);
        });
    }
}
```

### 3. Renderer API Client

```typescript
/* renderer-process/apis/notices/notices-api-client.ts */
export class NoticesApiClient extends BaseApiClient {
    static getInstance() {
        /* 싱글톤 */
    }

    async getNotices(params: any) {
        return this.executeRequest(
            () => window.electronAPI.api.notices.getNotices(params),
            () => noticesApi.getNotices(params),
        );
    }
}
```

### 4. Preload 스크립트 (Electron)

```typescript
/* preload/index.ts */
api: {
    notices: {
        getNotices: (params: any) => ipcRenderer.invoke("api-get-notices", params),
        createNotice: (data: any) => ipcRenderer.invoke("api-create-notice", data),
    },
}
```

> 상세한 워크플로우는 [api-workflow/](../../../prompts/api-workflow/README.md) 참조

---

## 파일 네이밍 규칙

| 레이어              | 파일명 패턴                           | 예시                         |
| ------------------- | ------------------------------------- | ---------------------------- |
| Renderer API Client | `{domain}-api-client.ts`              | `course-api-client.ts`       |
| IPC Handler         | `{domain}-service.handler.ts`         | `course-service.handler.ts`  |
| 공유 API 엔드포인트 | `index.ts` (폴더별)                   | `endpoints/courses/index.ts` |
| 타입 정의           | `I{Name}Dto.ts`, `I{Name}Response.ts` | `ILoginDto.ts`               |

---

## 주의사항

1. **IPC 채널 명명 규칙**: `api-{action}-{domain}` 형식 유지 (예: `api-get-courses`)
2. **토큰 동기화**: Main Process와 Renderer 간 토큰 상태 일관성 유지
3. **에러 처리**: Electron에서는 에러를 예외로 변환, Browser에서는 응답 객체로 처리
4. **환경 분기**: `executeRequest()` 내에서 자동 처리되므로 개별 분기 코드 작성 불필요
