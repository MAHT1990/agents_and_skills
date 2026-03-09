# Guide 문서 인덱스

## 개요

이 디렉토리는 NestJS 백엔드 프로젝트의 아키텍처, 코딩 컨벤션, 인프라 패턴을 문서화합니다.

---

## 디렉토리 구조

```
docs/guides/
├── README.md                           # ← 현재 문서 (진입점)
│
├── architecture/                       # 아키텍처 개요
│   └── api-layer-architecture.md       # 4계층 아키텍처 다이어그램 + 요약
│
└── convention/                         # 상세 컨벤션
    │
    │   # 아키텍처 레이어
    ├── base-classes.md                 # BaseService, BaseRepository, BaseResponse
    ├── controller.md                   # Controller 패턴 + 데코레이터
    ├── service.md                      # Service 패턴 + Repository
    ├── dto.md                          # DTO + ValidationPipe
    ├── module.md                       # Module + DI 패턴
    │
    │   # 횡단 관심사
    ├── error-handling.md               # BaseException + ExceptionFactory
    ├── interceptor.md                  # Logging + Cache 인터셉터
    ├── jwt.md                          # JWT 인증 전략
    ├── role-guard.md                   # RBAC + PBAC 가드
    │
    │   # 인프라
    ├── cache.md                        # 캐시 모듈 (TTL + 태그)
    ├── transaction.md                  # 트랜잭션 패턴
    ├── search.md                       # Search API (복합 쿼리)
    │
    │   # 가이드
    └── new-domain-guide.md             # 새 도메인 추가 가이드
```

---

## 아키텍처

| 문서 | 설명 |
|------|------|
| [api-layer-architecture.md](./architecture/api-layer-architecture.md) | 4계층 API 아키텍처 개요, 요청 수명주기, 프로젝트 구조, 아키텍처 결정표 |

---

## 컨벤션

### 아키텍처 레이어

| 문서 | 설명 | 관련 경로 |
|------|------|----------|
| [base-classes.md](./convention/base-classes.md) | BaseService\<T\>, BaseRepository\<T\>, BaseResponse 추상 클래스 | `src/common/base/` |
| [controller.md](./convention/controller.md) | Controller 패턴, 데코레이터, 파라미터 바인딩 | `src/modules/routes/{domain}/{domain}.controller.ts` |
| [service.md](./convention/service.md) | CRUD별 서비스 분리, Repository 패턴 | `src/modules/routes/{domain}/services/` |
| [dto.md](./convention/dto.md) | DTO 유효성 검사, ValidationPipe 설정 | `src/modules/routes/{domain}/dtos/` |
| [module.md](./convention/module.md) | 도메인 모듈, 서비스 모듈, DI 패턴 | `src/modules/routes/{domain}/{domain}.module.ts` |

### 횡단 관심사

| 문서 | 설명 | 관련 경로 |
|------|------|----------|
| [error-handling.md](./convention/error-handling.md) | BaseException, ExceptionFactory, 글로벌 필터 | `src/common/exceptions/` |
| [interceptor.md](./convention/interceptor.md) | LoggingInterceptor, CacheInterceptor, 미들웨어 | `src/common/interceptors/` |
| [jwt.md](./convention/jwt.md) | JWT Strategy, JwtAuthGuard, 토큰 검증 | `src/common/strategies/`, `src/common/guards/` |
| [role-guard.md](./convention/role-guard.md) | RolesGuard, PermissionsGuard, RBAC/PBAC | `src/common/guards/` |

### 인프라

| 문서 | 설명 | 관련 경로 |
|------|------|----------|
| [cache.md](./convention/cache.md) | In-Memory 캐시, TTL + 태그 기반 무효화 | `src/modules/cache/` |
| [transaction.md](./convention/transaction.md) | PrismaService.transaction(), 원자적 작업 | `src/modules/prisma/services/transaction/` |
| [search.md](./convention/search.md) | Search API, 복합 쿼리 빌더, 멀티테넌트 | `src/modules/routes/search/` |

### 가이드

| 문서 | 설명 |
|------|------|
| [new-domain-guide.md](./convention/new-domain-guide.md) | 새 도메인 추가 시 단계별 작업 순서 + 코드 템플릿 |

---

## 레이어별 역할 요약

| 레이어 | 역할 | Base 클래스 |
|--------|------|------------|
| Controller | HTTP 엔드포인트, 파라미터 매핑, 서비스 위임 | - |
| Service | 비즈니스 로직, CRUD, 중복 검사, 페이지네이션 | `BaseService<T>` |
| Repository | Prisma 쿼리 래핑, 동적 모델 접근 | `BaseRepository<T>` |
| Response | 도메인별 응답 코드 생성 (`XXX-00` ~ `XXX-08`) | `BaseResponse` |
| DTO | 요청 유효성 검사 + 타입 변환 | `BaseFindDto` |

---

## 파일 네이밍 규칙

| 레이어 | 파일명 패턴 | 예시 |
|--------|------------|------|
| Controller | `{domain}.controller.ts` | `users.controller.ts` |
| Module | `{domain}.module.ts` | `users.module.ts` |
| Service Module | `{domain}-service.module.ts` | `users-service.module.ts` |
| Service (CRUD) | `{domain}.{action}.service.ts` | `users.find.service.ts` |
| Repository | `{domain}.repository.ts` | `users.repository.ts` |
| Response | `{domain}.response.ts` | `users.response.ts` |
| Constants | `{domain}.constants.ts` | `users.constants.ts` |
| Create DTO | `create-{domain}.dto.ts` | `create-users.dto.ts` |
| Find DTO | `find-{domain}.dto.ts` | `find-users.dto.ts` |
| Update DTO | `update-{domain}.dto.ts` | `update-users.dto.ts` |
| Middleware | `{domain}.middleware.ts` | `users.middleware.ts` |
