# Integration Test Scenario 작성 가이드

## 목적
모듈 간 연동 지점을 검증하는 테스트 시나리오를 도출한다.
단위 테스트로 검증할 수 없는 모듈 간 데이터 흐름, 의존성, 부수효과를 대상으로 한다.

## 분석 기준
### Step1. 연동 지점 식별
소스코드에서 아래 연동 지점을 식별:

| 연동 유형 | 식별 방법 | 예시 |
|---|---|---|
| 모듈 간 호출 | import/require로 다른 모듈 함수 호출 | Service → Repository |
| DB 연동 | ORM/Query Builder 사용 지점 | Prisma, TypeORM, Sequelize |
| 외부 API 호출 | HTTP 클라이언트 사용 지점 | axios, fetch, HttpService |
| 메시지 큐 | Producer/Consumer 패턴 | Redis, RabbitMQ, Kafka |
| 파일시스템 | 파일 읽기/쓰기 지점 | fs, multer |
| 캐시 | 캐시 read/write 지점 | Redis, in-memory cache |

### Step2. 데이터 흐름 추적
각 연동 지점에 대해:
- 입력 데이터가 어떤 변환을 거치는가
- 중간 단계에서 어떤 검증/가공이 일어나는가
- 최종 출력이 기대와 일치하는가

### Step3. TC 도출 기준
| 유형 | 설명 | 예시 |
|---|---|---|
| Happy Path | 정상 연동 흐름 | 요청 → 서비스 → DB → 응답 |
| Data Flow | 데이터 변환 검증 | DTO → Entity → Response 매핑 |
| Error Propagation | 하위 모듈 에러 전파 | DB 에러 → 서비스 예외 → 응답 코드 |
| Transaction | 트랜잭션 원자성 | 부분 실패 시 롤백 여부 |
| Concurrency | 동시 접근 | 동시 요청 시 데이터 정합성 |

### Step4. TC 형식
```
[TC-{번호}] {시나리오 제목}
- 연동 경로: {ModuleA} → {ModuleB} → {ModuleC}
- 유형: Happy Path / Data Flow / Error Propagation / Transaction / Concurrency
- 사전 조건: ...
- 입력값: ...
- 테스트 절차: ...
- 예상 결과: ...
```

## 주의사항
- 외부 서비스(3rd party API 등)는 실제 호출 vs mock 여부를 명시
- DB 테스트 시 테스트 데이터 setup/teardown 방안 명시
- 트랜잭션 테스트 시 격리 수준(isolation level) 고려
