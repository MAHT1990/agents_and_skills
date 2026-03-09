# API 레이어 아키텍처

## 개요

이 프로젝트는 **4계층 API 아키텍처**를 채택한 NestJS 기반 REST API 서버입니다.

- **Controller**: HTTP 요청/응답 처리
- **Service**: 비즈니스 로직 (CRUD별 분리)
- **Repository**: 데이터베이스 작업 추상화
- **Database**: Prisma ORM + PostgreSQL

```
┌──────────────────────────────────────────────────────────────┐
│  HTTP Request                                                │
│  GET /api/v1/users?name=홍길동&page=1                         │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  Global Pipeline                                             │
│  - LoggingInterceptor (요청 Logging)                          │
│  - ApiKeyGuard → JwtAuthGuard → RolesGuard → PermissionsGuard│
│  - ValidationPipe (DTO 변환 + 유효성 검사)                      │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  Layer 1: Controller                                         │
│  - HTTP 엔드포인트 정의, 요청 파라미터 매핑                        │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  Layer 2: Service (extends BaseService<T>)                   │
│  - 비즈니스 로직, 중복 검사, 페이지네이션                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  Layer 3: Repository (extends BaseRepository<T>)             │
│  - Prisma 쿼리 래핑, 모델별 데이터 접근                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  Layer 4: Database (Prisma + Middleware)                     │
│  - Soft delete 변환, 기본 정렬, 쿼리 실행                        │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  Response Pipeline                                           │
│  - BaseResponse 포맷팅 (응답 코드 생성)                         │
│  - LoggingInterceptor (응답 로깅 + KST 변환)                   │
│  - CacheInterceptor (@Cacheable 캐시 저장)                    │
└──────────────────────────────────────────────────────────────┘
```

> 각 레이어의 상세 컨벤션은 [Guide 문서 인덱스](../INDEX.md)를 참조하세요.

---

## 프로젝트 구조 Overview

```
src/
├── main.ts                              # 앱 부트스트랩
├── common/                              # 공유 인프라 레이어
│   ├── base/                            # 추상 기반 클래스
│   │   ├── service/
│   │   │   ├── base-service.service.ts  # BaseService<T> (CRUD + 페이지네이션)
│   │   │   └── base-service.interfaces.ts
│   │   ├── repository/
│   │   │   └── base-repository.service.ts # BaseRepository<T> (Prisma 래퍼)
│   │   ├── responses/
│   │   │   ├── base.response.ts         # BaseResponse (응답 포맷팅)
│   │   │   ├── response.interfaces.ts   # IResponse 인터페이스
│   │   │   └── response.constants.ts    # 응답 코드 상수
│   │   └── dtos/
│   │       └── base-dto.dto.ts          # BaseFindDto (공통 쿼리 파라미터)
│   ├── guards/                          # 인증 & 인가
│   │   ├── api-key.guard.ts             # X-API-Key 검증
│   │   ├── jwt-auth.guard.ts            # JWT 토큰 검증 + 사용자 상태 확인
│   │   ├── roles.guard.ts              # 역할 기반 접근 제어 (RBAC)
│   │   └── permissions.guard.ts         # 권한 기반 접근 제어 (PBAC)
│   ├── decorators/                      # 커스텀 데코레이터
│   │   ├── permissions.decorator.ts     # @Permissions()
│   │   ├── roles.decorator.ts           # @Roles()
│   │   ├── current-user.decorator.ts    # @CurrentUser()
│   │   └── public.decorator.ts          # @Public()
│   ├── strategies/
│   │   └── jwt.strategy.ts             # Passport JWT 전략
│   ├── interceptors/
│   │   ├── logging.interceptor.ts       # 요청/응답 로깅 + KST 변환
│   │   └── cache.interceptor.ts         # @Cacheable / @CacheEvict 처리
│   ├── exceptions/
│   │   ├── base.exception.ts            # 커스텀 예외 기반 클래스
│   │   ├── exception.factory.ts         # 예외 팩토리
│   │   ├── global-proccess.handler.ts   # 프로세스 레벨 예외 핸들러
│   │   └── filters/
│   │       ├── exception.filter.ts      # HttpExceptionFilter
│   │       └── prisma-exception.filter.ts # PrismaExceptionFilter
│   └── util/
│       └── file-logging.service.ts      # 파일 기반 로깅
│
└── modules/                             # 기능 모듈
    ├── app.module.ts                    # 루트 모듈 (글로벌 설정)
    ├── config/                          # 설정 모듈
    │   ├── config.module.ts
    │   ├── config.service.ts            # 환경 변수 관리
    │   ├── swagger/                     # Swagger 설정
    │   ├── cors/                        # CORS 설정
    │   └── validation/                  # ValidationPipe 설정
    ├── prisma/                          # 데이터베이스 레이어
    │   ├── prisma.module.ts
    │   └── services/
    │       ├── prisma.service.ts        # PrismaClient 래퍼 + 트랜잭션
    │       ├── middleware/              # Soft delete + 기본 정렬 미들웨어
    │       ├── transaction/             # 트랜잭션 래퍼
    │       └── soft-delete/             # Cascade soft delete
    ├── cache/                           # 캐시 모듈
    │   └── services/
    │       └── cache.service.ts         # TTL + 태그 기반 캐시
    └── routes/                          # 도메인별 라우트 모듈
        ├── routes.module.ts             # 전체 라우트 등록
        ├── search/                      # Search API (복합 쿼리)
        ├── users/                       # 사용자 도메인 (예시)
        │   ├── users.controller.ts
        │   ├── users.module.ts
        │   ├── users.repository.ts
        │   ├── users.response.ts
        │   ├── users.constants.ts
        │   ├── middlewares/
        │   │   └── users.middleware.ts
        │   ├── dtos/
        │   │   ├── create-users.dto.ts
        │   │   ├── find-users.dto.ts
        │   │   └── update-users.dto.ts
        │   └── services/
        │       ├── users-service.module.ts
        │       ├── users.create.service.ts
        │       ├── users.find.service.ts
        │       ├── users.update.service.ts
        │       └── users.delete.service.ts
        ├── courses/                     # 강의 도메인
        ├── tests/                       # 시험 도메인
        ├── permissions/                 # 권한 도메인
        └── ... (20+ 도메인)
```

---

## 요청/응답 수명주기 (Request Lifecycle)

### `GET /api/v1/users?name=홍길동&page=1` 전체 흐름

```
 1. HTTP 요청 도착
    │
 2. LoggingInterceptor (in)
    │  - 요청 메서드, URL, IP, User-Agent 로깅
    │  - traceId 생성 후 request 객체에 저장
    │
 3. Global Guard Pipeline (순서대로 실행)
    │  ① ApiKeyGuard      → X-API-Key 헤더 검증
    │  ② JwtAuthGuard     → Bearer 토큰 검증 + 사용자 상태 확인 (캐시 우선)
    │  ③ RolesGuard       → @Roles() 메타데이터 확인 (캐시 기반)
    │  ④ PermissionsGuard → @Permissions() 메타데이터 확인 (캐시 기반)
    │
 4. Controller 핸들러 매칭
    │  @Get()
    │  @Permissions(PERMISSION_CODES.USER_READ)
    │  async findAll(@Query() query: FindAllUsersDto)
    │
 5. GlobalPipe: ValidationPipe
    │  - @Transform 데코레이터 적용 (string → number 등)
    │  - @IsEmail, @IsNotEmpty 등 유효성 검사
    │  - whitelist: true (알 수 없는 프로퍼티 제거)
    │  - forbidNonWhitelisted: true (알 수 없는 프로퍼티 시 에러)
    │
 6. Service Layer (BaseService<Users>)
    │  - getPagination(query) → { skip: 0, take: 10 }
    │  - getWhere(where, query) → { name: { contains: "홍길동" }, deletedAt: null }
    │  - getOrderBy(query) → [{ createdAt: "desc" }]
    │  - repository.count({ where })
    │  - repository.findAll({ where, include, skip, take, orderBy })
    │
 7. Repository Layer (BaseRepository<Users>)
    │  - prismaService["users"].findMany(queryOptions)
    │
 8. Prisma Middleware
    │  - Soft delete 변환 (delete → update deletedAt)
    │  - 기본 정렬 적용
    │
 9. PostgreSQL 쿼리 실행
    │
10. BaseResponse.findSuccess({ items, count })
    │  → { code: "USR-00", message: "조회 성공", data: { items: [...], count: 42 } }
    │
11. LoggingInterceptor (out)
    │  - 응답 로깅 + 소요 시간 기록
    │  - UTC → KST 날짜 변환
    │
12. CacheInterceptor
    │  - @Cacheable() 메타데이터가 있으면 캐시 저장
    │
13. HTTP 응답 반환
```

---

## 상세 컨벤션 문서

각 구성요소의 코드 패턴과 상세 설명은 아래 문서를 참조하세요.

### 아키텍처 레이어

| 문서 | 내용 |
|------|------|
| [Base 클래스](../convention/base-classes.md) | BaseService\<T\>, BaseRepository\<T\>, BaseResponse 추상 클래스 |
| [Controller](../convention/controller.md) | HTTP 엔드포인트, 데코레이터, 파라미터 바인딩 |
| [Service](../convention/service.md) | CRUD별 서비스 분리, Repository 패턴 |
| [DTO](../convention/dto.md) | 유효성 검사, ValidationPipe, class-validator |
| [Module](../convention/module.md) | 도메인 모듈, 서비스 모듈, DI 패턴, AppModule |

### 횡단 관심사

| 문서 | 내용 |
|------|------|
| [에러 처리](../convention/error-handling.md) | BaseException, ExceptionFactory, 글로벌 필터 |
| [인터셉터](../convention/interceptor.md) | LoggingInterceptor, CacheInterceptor, 도메인 미들웨어 |
| [JWT 인증](../convention/jwt.md) | JWT Strategy, JwtAuthGuard, 토큰 검증 |
| [역할/권한 가드](../convention/role-guard.md) | RolesGuard, PermissionsGuard, RBAC/PBAC |

### 인프라

| 문서 | 내용 |
|------|------|
| [캐시](../convention/cache.md) | In-Memory 캐시, TTL + 태그 기반 무효화 |
| [트랜잭션](../convention/transaction.md) | PrismaService.transaction(), Soft Delete |
| [Search API](../convention/search.md) | 복합 쿼리 빌더, 멀티테넌트 자동 스코핑 |

### 가이드

| 문서 | 내용 |
|------|------|
| [새 도메인 추가](../convention/new-domain-guide.md) | 단계별 작업 순서 + 코드 템플릿 + 체크리스트 |

---

## 인증 & 인가 흐름 (요약)

```
ApiKeyGuard → JwtAuthGuard → RolesGuard → PermissionsGuard
```

| 가드 | 역할 | 데코레이터 |
|------|------|-----------|
| ApiKeyGuard | `X-API-Key` 헤더 검증 | - (전역) |
| JwtAuthGuard | Bearer 토큰 검증 + 사용자 상태 확인 (캐시) | `@Public()` 스킵 |
| RolesGuard | 역할 기반 접근 제어 (RBAC) | `@Roles()` |
| PermissionsGuard | 권한 기반 접근 제어 (PBAC) | `@Permissions()` |

> 상세: [jwt.md](../convention/jwt.md), [role-guard.md](../convention/role-guard.md)

---

## 부트스트랩 (main.ts)

```typescript
async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // 1. 미들웨어 설정
    app.use(cookieParser());

    // 2. 글로벌 예외 핸들러 초기화 (프로세스 이벤트 리스너)
    GlobalProcessHandler.initialize();

    // 3. Swagger 문서 설정 → /api-docs 에서 접근
    const document = SwaggerModule.createDocument(app, createSwaggerConfig());
    SwaggerModule.setup("api-docs", app, document, createSwaggerSetupOptions());

    // 4. 글로벌 유효성 검사 파이프
    app.useGlobalPipes(new ValidationPipe(createValidationConfig()));

    // 5. CORS 설정
    app.enableCors(createCorsConfig());

    // 6. API 접두사 설정 (예: /api/v1)
    app.setGlobalPrefix(process.env.API_PREFIX);

    // 7. 서버 시작
    await app.listen(process.env.PORT);
}
```

---

## 아키텍처 결정 요약표

| 항목 | 결정 | 근거 |
|------|------|------|
| **Base 클래스** | `BaseService<T>` + `BaseRepository<T>` | DRY, 모든 도메인에서 CRUD 재사용 |
| **응답 포맷** | 도메인별 응답 코드 (`XXX-00` ~ `XXX-08`) | 일관된 API 계약, 프론트엔드 에러 핸들링 용이 |
| **DTO 검증** | `class-validator` + `class-transformer` | 타입 안전, 선언적 유효성 검사 |
| **서비스 분리** | Create/Find/Update/Delete 별도 서비스 | 단일 책임 원칙, 테스트 용이 |
| **예외 처리** | `BaseException` + `ExceptionFactory` 패턴 | 일관된 에러 코드, 중앙 집중 관리 |
| **인증** | JWT + Passport + 커스텀 가드 | 업계 표준 |
| **인가** | 다중 레이어: ApiKey → JWT → Roles → Permissions | 세분화된 접근 제어 |
| **캐싱** | In-Memory, TTL + 태그 기반 무효화 | 관련 엔티티 변경 시 선택적 캐시 무효화 |
| **데이터베이스** | Prisma ORM + soft delete 미들웨어 | 타입 안전 쿼리, 마이그레이션 관리 |
| **트랜잭션** | PrismaService.transaction() 래퍼 | 원자적 다중 테이블 작업 |
| **로깅** | 콘솔 + 파일 (traceId) | 디버깅 + 운영 환경 추적 |
| **인터셉터** | 글로벌 (Logging + Cache) | 횡단 관심사 분리 |
| **미들웨어** | 모듈 레벨 (도메인별) | 유연한 요청 전처리 |
| **멀티테넌트** | JWT 기반 자동 스코핑 (Search + Guard) | 데이터 격리 |

---

## 주의사항

1. **select vs include**: Prisma에서 `select`와 `include`는 동시에 사용할 수 없습니다. `BaseRepository`에서 `select` 우선 적용.
2. **Soft Delete**: `delete()` 호출 시 Prisma Middleware에서 `update({ deletedAt: new Date() })`로 자동 변환됩니다. 실제 물리 삭제가 필요한 경우 별도 처리 필요.
3. **응답 코드 접두사**: 각 도메인의 `RESPONSE_CODE_PREFIX`는 Injectable 토큰으로 등록해야 합니다. `useValue`로 문자열 직접 제공.
4. **가드 실행 순서**: `APP_GUARD` 등록 순서가 실행 순서를 결정합니다. ApiKey → JWT → Roles → Permissions 순서를 변경하지 마세요.
5. **캐시 무효화**: 데이터 변경 시 관련 캐시 태그를 정확히 무효화해야 합니다. 특히 권한/역할 변경 시 `PERMISSIONS_GUARD` 태그 무효화 필수.
6. **멀티테넌트**: `TENANT_SCOPED_MODELS`에 등록된 모델은 Search API에서 자동으로 테넌트 필터링이 적용됩니다. 새 도메인 추가 시 해당 목록 확인 필요.
7. **트랜잭션 범위**: `prismaService.transaction()` 내부에서만 원자성이 보장됩니다. 여러 테이블을 수정하는 서비스 로직은 반드시 트랜잭션으로 감싸세요.
