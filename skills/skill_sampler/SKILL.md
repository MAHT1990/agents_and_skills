---
name: skill_sampler
description: 신규 기획을 바탕으로 원활한 소통을 위한 sample 프로젝트를 만드는 스킬. sample 생성 요청에 발동한다. 다음 상황에서 반드시 발동한다. case1. "sample", "샘플", "프로토타입 생성" 관련 문자열 포함 요청. case2. 기획 산출물 기반 sample 프로젝트 생성 요청. case3. mock 데이터 + UI 화면 생성 요청.
---

# Role
여러 subagent를 조율하는 sample 프로젝트 오케스트레이터.
직접 코드를 작성하거나 데이터를 생성하지 않는다.
반드시 각 단계에 해당하는 subagent에게 위임한다.

# Variables
- $$sample_root: sample 프로젝트 루트 경로 (user input, 필수)
- $$schema_path: DB schema 경로 (user input, 선택)
  - prisma.schema 파일 경로 또는 Entity 정의 디렉토리 경로
  - 미제공 시, docs/plans/ 기획서 기반으로 추론
- $$convention_path: 프로젝트 컨벤션 참조 경로 (user input, 선택)
  - 기존 프로젝트의 코드 컨벤션을 참조할 경로
  - 미제공 시, 범용 컨벤션 적용
- $$tech_stack: 화면 기술 스택 (user input, 선택, default: "Vue 3 CDN")
  - 예: "Vue 3 CDN", "React CDN", "Vanilla JS" 등
- $$mock_count: 테이블당 mock 데이터 건수 (user input, Step 진행 중 확인)

## Subagents
| # | Name | 역할 | 설명 |
|---|---|---|---|
| 1 | sampler_db_modeler | DB 구조 + Mock 데이터 생성 | 제공된 schema 또는 기획서 기반으로 CSV 파일과 mock 데이터를 생성 |
| 2 | sampler_screen_builder | 화면 구성 | mock 데이터와 사용자 요청 기반으로 화면 코드를 생성 |

### Pipeline
```
[사용자 입력: $$sample_root, $$schema_path, $$convention_path, $$tech_stack]
        │
        ▼
  docs/plans/ 확인
  ├─ 비어있음 → skill_plan 자동 호출 → 기획서 생성
  └─ 존재함 → 기획서 파싱
        │
        ▼
  ① sampler_db_modeler (DB 구조 + Mock 데이터 생성)
        │
        ▼
  ② sampler_screen_builder (화면 구성)
        │  ↕ db_modeler와 유기적 피드백
        ▼
  index.html 생성/갱신
        │
        ▼
  (선택) skill_test_scenario (E2E 검증)
```

### Constraints for Subagents
- subagent는 서로의 컨텍스트를 공유하지 않는다.
- subagent간 데이터 전달은 반드시 오케스트레이터를 통해 이루어진다.
- sampler_screen_builder가 추가 데이터 구조를 요청할 경우, 오케스트레이터가 sampler_db_modeler를 재호출하여 보완한다.
- $$convention_path가 제공된 경우, 해당 컨벤션 정보를 두 subagent 모두에게 전달한다.

## 디렉토리 구조
```
$$sample_root/
├── docs/
│   └── plans/          ← skill_plan 산출물 (기획서)
├── src/                ← sampler_screen_builder 산출물
├── mock/               ← sampler_db_modeler 산출물 (CSV + mock_data)
└── index.html          ← 엔트리포인트 (skill 자동 생성)
```

# Error Handling
- $$sample_root 미제공 → Human에게 재요청
- $$schema_path 제공했으나 경로 무효 → Human에게 보고, 기획서 기반 추론 전환 여부 확인
- docs/plans/ 비어있고 skill_plan 호출 실패 → Human에게 보고, 기획서 직접 제공 요청
- sampler_db_modeler 실패 → Human에게 보고, mock 데이터 없이 screen_builder 진행 여부 확인
- sampler_screen_builder가 추가 데이터 요청 → sampler_db_modeler 재호출 (최대 3회)

---
# Steps

## Step 0. Collect Required Info
아래 정보를 확보한다:
- $$sample_root, $$schema_path, $$convention_path, $$tech_stack, $$mock_count

### 0-1. 기획서 확인
$$sample_root/docs/plans/ 디렉토리를 확인한다:
- 기획서 존재 → 파싱하여 다음 Step으로
- 기획서 미존재 → skill_plan 자동 호출하여 기획서 생성
  - skill_plan의 $$output_mode = "file", $$output_target = "$$sample_root/docs/plans/"

## Step 1. Make Plan (Human Confirm Required)
수집한 정보를 바탕으로 아래 계획을 수립하고 Human에게 확인받는다.
- 기획서 요약 (핵심 기능, 화면 구성, 데이터 모델)
- schema 소스 (제공된 schema vs 기획서 기반 추론)
- 기술 스택 확인
- 컨벤션 적용 여부
- 예상 산출물 목록

## Step 2. DB 구조 + Mock 데이터 생성
- sampler_db_modeler에게 위임
- 전달 정보:
  - $$schema_path (있는 경우: schema 파일/디렉토리)
  - docs/plans/ 기획서 내용 ($$schema_path 없는 경우)
  - $$mock_count
  - $$convention_path (있는 경우)
  - 출력 경로: $$sample_root/mock/
- 기대 결과:
  - 테이블별 CSV 파일
  - mock 데이터 ($$mock_count 건씩)
  - 데이터 간 관계 일관성 유지

## Step 3. 화면 구성
- sampler_screen_builder에게 위임
- 전달 정보:
  - docs/plans/ 기획서 내용 (화면 설계, 사용자 행동 시나리오)
  - Step 2 결과 (mock 데이터 구조, CSV 파일 목록)
  - $$tech_stack
  - $$convention_path (있는 경우)
  - 출력 경로: $$sample_root/src/, $$sample_root/index.html
- 기대 결과:
  - 화면 컴포넌트 코드 (src/ 하위)
  - index.html 엔트리포인트
  - mock 데이터 로딩 유틸리티

### 3-1. 유기적 피드백 루프
- sampler_screen_builder가 추가 데이터 구조를 요청하는 경우:
  - 오케스트레이터가 요청 내용을 sampler_db_modeler에게 전달
  - sampler_db_modeler가 추가 CSV/mock 생성
  - 결과를 다시 sampler_screen_builder에게 전달
  - 최대 3회 반복

## Step 4. 결과 수집 & 검증
### 고유 검증 항목
- mock/ 디렉토리에 CSV 파일이 정상 생성되었는가
- src/ 디렉토리에 화면 코드가 정상 생성되었는가
- index.html이 생성되었는가
- mock 데이터와 화면 코드 간 참조 일관성이 유지되는가
- index.html을 브라우저에서 열었을 때 기본 동작이 가능한 구조인가

## Step 5. E2E 검증 (선택)
Human에게 E2E 검증 여부를 확인한다.
- 검증 요청 시: skill_test_scenario (scope: e2e) 호출
  - $$URI_List: index.html 경로
  - 기본 화면 렌더링 및 인터랙션 검증
- 검증 불필요 시: 스킵

## Step 6. 최종 리뷰
### 고유 피드백 항목
- mock 데이터 구조 및 양이 적절한가
- 화면 구성이 의도에 부합하는가
- 추가/수정할 화면이나 데이터가 있는가

### 고유 영향 범위 판정
- mock 데이터 수정 → sampler_db_modeler 재실행 + sampler_screen_builder 재실행
- 화면만 수정 → sampler_screen_builder만 재실행
- 기획 변경 → Step 0부터 재실행

# Output
- Step별 전체 작업 요약
  - Step 0. 수집 정보 요약 (sample_root, schema_path, convention_path, tech_stack, mock_count)
  - Step 1. 수립된 계획 요약 (기획서 상태, schema 소스, 기술 스택)
  - Step 2. DB 구조 + Mock 데이터 생성 결과 (테이블 수, CSV 파일 수, 레코드 수)
  - Step 3. 화면 구성 결과 (페이지 수, 컴포넌트 수, 피드백 루프 횟수)
  - Step 4. 검증 결과 (일관성 체크, 누락 여부)
  - Step 5. E2E 검증 결과 (실행 여부, 통과/실패)
  - Step 6. 피드백 루프 결과 (피드백 횟수, 재실행 단계, 최종 승인 여부)
