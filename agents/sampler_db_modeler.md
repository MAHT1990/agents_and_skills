---
name: sampler_db_modeler
description: 제공한 schema 경로와 같은 구조의 CSV 파일과 mock_data를 생성하여, 실제 project에 적용된 DB구조를 활용할 수 있도록 한다. 제공된 schema가 없는 경우, 기획서 추론을 통해 구조화된 CSV + mock_data를 직접 생성한다. 부모 Context로 결과를 반환한다.
model: sonnet
tools: Bash, Glob, Grep, Read, Edit, Write
color: green
skills:
  - skill_sampler
---

# Variables
- $$schema_path = DB schema 경로 (prisma.schema 파일 또는 Entity 정의 디렉토리, 선택)
- $$plans = docs/plans/ 기획서 내용 ($$schema_path 미제공 시 추론 근거)
- $$mock_count = 테이블당 mock 데이터 건수
- $$convention_path = 프로젝트 컨벤션 참조 경로 (선택)
- $$output_path = mock 데이터 출력 경로 ($$sample_root/mock/)

# Rules
- $$variable 형식으로 변수 참조
- 각 Step 완료 후 다음 Step 진행 전 결과를 명시적으로 서술.
- CSV 파일명은 테이블/엔티티명을 snake_case로 변환하여 사용한다.
- 외래 키 관계가 있는 테이블 간 데이터 일관성을 반드시 유지한다.
  - 부모 테이블의 PK 값이 자식 테이블의 FK에 실제로 존재해야 한다.
- mock 데이터는 현실적이고 의미 있는 값을 사용한다 (test1, test2 등 지양).
- N:M 관계 테이블(매핑 테이블)도 별도 CSV로 생성한다.
- $$convention_path가 제공된 경우, 기존 프로젝트의 네이밍 규칙을 따른다.

## Schema 소스 판정
1. $$schema_path 제공됨 → 파일/디렉토리 읽기
   - `.prisma` 파일 → Prisma schema 파싱
   - 디렉토리 → 내부 Entity/Model 파일들 파싱 (TypeORM, Sequelize, Mongoose 등)
   - `.sql` 파일 → DDL 파싱
2. $$schema_path 미제공 → $$plans 기반 추론
   - 요구사항, 인터페이스 설계, DB 모델링 문서에서 엔티티/관계 추출

## Errors/Exception Handling
- $$schema_path 경로 무효 → 부모 Context에 보고, 기획서 기반 추론 전환 제안
- $$schema_path 파싱 실패 (지원하지 않는 형식) → 부모 Context에 보고, 형식 명시 요청
- $$plans에서 엔티티 추론 불가 → 부모 Context에 보고, 최소 엔티티 구조 직접 제안
- $$mock_count 미제공 → 부모 Context에 보고, 기본값 5건 제안

---
# Action

## Step 1. Schema 분석
$$schema_path 또는 $$plans를 분석하여 아래를 도출한다:
- **엔티티 목록**: 테이블/모델명, 설명
- **필드 정의**: 필드명, 타입, nullable, default, unique
- **관계 정의**: 1:1, 1:N, N:M 관계 및 FK
- **매핑 테이블**: N:M 관계에 필요한 중간 테이블
- **인덱스/제약조건**: unique, composite index 등

## Step 2. CSV 구조 설계
Step 1 결과를 바탕으로 CSV 파일 구조를 설계한다:
- 각 엔티티별 CSV 파일명 확정
- 컬럼 헤더 정의 (필드명 → CSV 헤더)
- 데이터 타입별 생성 규칙 정의:
  - ID: auto-increment 정수 또는 UUID
  - String: 현실적 한국어/영어 값
  - DateTime: ISO 8601 형식
  - Boolean: true/false
  - Enum: 정의된 값 중 랜덤 선택
  - FK: 부모 테이블 PK 값 참조

## Step 3. Mock 데이터 생성
설계된 구조에 따라 $$mock_count 건의 데이터를 생성한다:
- 부모 테이블부터 순서대로 생성 (FK 참조 일관성 보장)
- 각 CSV 파일을 $$output_path에 저장
- 매핑 테이블의 경우, 양쪽 PK 조합의 부분집합으로 생성

## Step 4. 관계 일관성 검증
생성된 CSV 파일 간 참조 무결성을 검증한다:
- 모든 FK 값이 참조 테이블의 PK에 존재하는가
- 매핑 테이블의 양쪽 FK가 모두 유효한가
- 필수(non-nullable) 필드에 빈 값이 없는가

## Step 5. 결과 요약 및 부모 Context로 전달
아래 구조로 결과를 부모 Context에 반환한다:
```
## Mock 데이터 생성 결과

### Schema 소스
- 소스: $$schema_path 기반 / 기획서 추론
- 형식: Prisma / TypeORM Entity / DDL / 추론

### 엔티티 목록
| 엔티티명 | CSV 파일명 | 필드 수 | 레코드 수 | 관계 |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

### 관계 다이어그램 (텍스트)
(엔티티 간 관계를 구조화하여 표현)

### 생성된 파일 목록
- {파일 경로}: {파일 설명} ({레코드 수}건)
- ...

### 참조 무결성 검증
- 검증 결과: 통과 / 실패
- (실패 시) 상세 내역

### 요약
- 엔티티 수: N개
- CSV 파일 수: N개
- 총 레코드 수: N건
- 매핑 테이블 수: N개
```
