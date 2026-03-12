---
name: skill_build
description: planning 산출물을 기반으로 프로젝트를 구축하는 빌더 오케스트레이터 스킬. 5개의 subagent(scaffolder, infra, client, server, database)를 지휘하여 실제 코드·설정·인프라를 생성한다. 다음 상황에서 반드시 발동한다. case1. "빌드", "구축", "build" 관련 문자열 포함 요청과 planning 산출물이 존재하는 경우. case2. planning 결과를 기반으로 프로젝트 생성 요청. case3. "프로젝트 셋업", "프로젝트 초기화" 관련 요청.
---

# Role
여러 subagent를 조율하는 빌더 오케스트레이터.
직접 코드를 작성하거나 설정 파일을 생성하지 않는다.
반드시 각 단계에 해당하는 subagent에게 위임한다.

# Variables
- $$planning_path: planning 산출물 디렉토리 경로 (user input, 필수)
  - skill_plan이 생성한 산출물(01_requirements.md ~ 05_tech_spec.md)이 위치한 경로
- $$output_path: 프로젝트 생성 경로 (user input, 필수)
- $$exclude: 제외할 빌드 단계 (agent 번호 또는 이름, default: 없음)
  - 예: "3" 또는 "build_client_engineer" → 클라이언트 작업 단계 건너뜀
- $$pipeline_order: 병렬 그룹 내 실행 순서 (user input, default: "infra → db,server,client")
  - 사용자가 의존관계에 따라 순서를 지정할 수 있다.
  - 쉼표(,)로 구분된 항목은 병렬 실행, 화살표(→)로 구분된 항목은 순차 실행
  - 예시:
    - "infra → db → server → client": 전체 순차
    - "infra → db,server → client": DB와 서버 병렬 후 클라이언트
    - "infra → server → db → client": 서버 먼저 후 DB
    - "infra → db,server,client": DB·서버·클라이언트 모두 병렬
  - $$exclude로 제외된 agent는 pipeline_order에서 자동 제거된다.
- $$dry_run: 코드 생성 없이 실행 계획만 출력 (user input, default: false)
  - true: Step 1까지만 실행하고 계획을 출력한 뒤 종료
  - false: 전체 파이프라인 실행

## Subagents
| # | Name | 역할 | 설명 |
|---|---|---|---|
| 1 | build_scaffolder | 프로젝트 구조 초기화 | 프로젝트 루트 구조, 패키지 매니저 설정, 모노레포/멀티레포 초기화, 공통 설정 파일 생성 |
| 2 | build_infra_engineer | 인프라 작업 | Docker, CI/CD, 환경변수, 배포 설정 등 인프라 관련 코드·설정 생성 |
| 3 | build_client_engineer | 클라이언트 작업 | 프론트엔드/클라이언트 애플리케이션 코드 생성 |
| 4 | build_server_engineer | 서버 작업 | 백엔드/서버 애플리케이션 코드 생성 |
| 5 | build_database_engineer | 데이터베이스 작업 | 스키마 설계, 마이그레이션, 시드 데이터 등 DB 관련 코드 생성 |

### Pipeline
```
[planning 산출물 파싱]
        │
        ▼
  ① build_scaffolder (프로젝트 구조 초기화)
        │
        ▼
  ┌─── $$pipeline_order에 따라 실행 ───┐
  │                                     │
  │  ②③④⑤ 중 $$exclude 제외 후         │
  │  $$pipeline_order 순서대로 실행      │
  │                                     │
  │  기본값: infra → db,server,client   │
  │                                     │
  │  예시 (기본값 적용 시):              │
  │    ② build_infra_engineer           │
  │          │                          │
  │     ┌────┼────────┐                 │
  │     ▼    ▼        ▼                │
  │    ⑤DB  ④Server  ③Client          │
  │    (병렬 실행)                      │
  └─────────────────────────────────────┘
        │
        ▼
  결과 수집 & 검증
```

### Constraints for Subagents
- subagent는 서로의 컨텍스트를 공유하지 않는다.
- subagent간 데이터 전달은 반드시 오케스트레이터를 통해 이루어진다.
- 오케스트레이터는 planning 산출물을 파싱하여 각 subagent에 필요한 정보만 추출·전달한다.
- 각 subagent는 $$output_path 하위에 자신의 담당 영역 코드를 생성한다.
- subagent는 이전 단계(scaffolder 또는 선행 agent)의 결과물 구조를 전달받아 이를 기반으로 작업한다.

# Error Handling
- $$planning_path 미제공 또는 산출물 파일 누락 → Human에게 재요청, Step 0로 복귀
- $$output_path가 이미 존재하고 비어있지 않은 경우 → Human에게 덮어쓰기 여부 확인
- $$pipeline_order 파싱 오류 → Human에게 보고 후 기본값으로 대체 여부 확인
- $$exclude로 인해 후속 agent의 입력이 부족한 경우 → Human에게 보고 후 진행 여부 확인
- subagent 실패 → 해당 단계 스킵, Human에게 보고 후 나머지 계속 진행
- 병렬 실행 중 일부 실패 → 성공한 결과만 수집, 실패 건 Human에게 보고

---
# Action
## Step 0. Collect Required Info (Human-in-the-Loop)
아래 정보를 모두 확보할 때까지 다음 Step 진행 금지.
- $$planning_path: planning 산출물 디렉토리 경로
- $$output_path: 프로젝트 생성 경로
- $$exclude: 제외할 단계 (없으면 전체 진행)
- $$pipeline_order: 병렬 그룹 실행 순서 (기본값: "infra → db,server,client")
- $$dry_run: 계획만 출력 여부 (기본값: false)

### 0-1. Planning 산출물 파싱
$$planning_path에서 아래 파일들을 읽어 핵심 정보를 추출한다:
- `01_requirements.md` → 기능/비기능 요구사항 목록
- `02_user_classification.md` → 사용자 유형 (subagent 전달용 컨텍스트)
- `03_behavior_design.md` → 행동 시나리오 (subagent 전달용 컨텍스트)
- `04_interface_design.md` → 인터페이스(화면/API/데이터 모델) 설계, 디렉토리 구조
- `05_tech_spec.md` → 기술 스택, 아키텍처, 패키지 목록, 인프라 구성

파싱 실패 시 Human에게 누락 파일을 보고하고 진행 여부를 확인한다.

## Step 1. Make Plan (Human Confirm Required)
파싱된 정보를 바탕으로 아래 계획을 수립하고 Human에게 확인받는다.
- planning 산출물 요약 (프로젝트명, 기술 스택, 서비스 구성)
- 실행할 subagent 목록 ($$exclude 반영)
- 파이프라인 실행 순서 ($$pipeline_order 반영, 시각적 다이어그램 포함)
- 각 subagent에게 전달할 핵심 정보 요약
- 생성될 프로젝트 구조 미리보기

$$dry_run이 true인 경우 이 단계에서 종료한다.

## Step 2. 프로젝트 구조 초기화
- build_scaffolder에게 위임
- 전달 정보:
  - 05_tech_spec.md에서 추출한 기술 스택 (런타임, 프레임워크, 모노레포 구성 방식)
  - 04_interface_design.md에서 추출한 디렉토리 구조
  - $$output_path
- 기대 결과:
  - 프로젝트 루트 디렉토리 생성
  - 패키지 매니저 초기화 (package.json, tsconfig.json 등)
  - 모노레포/멀티레포 구조 설정
  - 공통 설정 파일 (.gitignore, .env.example, README.md 골격 등)
  - 공유 라이브러리 디렉토리 및 기본 파일 (DTO, interfaces, constants)

## Step 3. Pipeline 실행 ($$pipeline_order에 따라)
$$pipeline_order를 파싱하여 순차/병렬 실행 계획을 수립하고 실행한다.

### 파이프라인 실행 규칙
1. 화살표(→)로 구분된 그룹은 순차 실행한다.
2. 쉼표(,)로 구분된 항목은 병렬 실행한다.
3. $$exclude에 포함된 agent는 건너뛴다.
4. 각 agent 실행 시, 선행 단계의 결과물 구조를 컨텍스트로 전달한다.

### 3-INFRA. 인프라 작업 (build_infra_engineer)
- 전달 정보:
  - 05_tech_spec.md에서 추출한 인프라 구성 (Docker, 컨테이너 목록, 포트 설정)
  - 01_requirements.md에서 추출한 비기능 요구사항
  - Step 2 결과 (프로젝트 구조)
- 기대 결과:
  - Dockerfile(s)
  - docker-compose.yml
  - 환경변수 설정 (.env, .env.example)
  - CI/CD 설정 (필요 시)
  - Makefile 또는 npm scripts

### 3-CLIENT. 클라이언트 작업 (build_client_engineer)
- 전달 정보:
  - 04_interface_design.md에서 추출한 인터페이스 설계, User Flow
  - 05_tech_spec.md에서 추출한 클라이언트 기술 스택
  - 01_requirements.md에서 추출한 관련 기능 요구사항
  - Step 2 결과 (프로젝트 구조)
- 기대 결과:
  - 클라이언트 애플리케이션 코드
  - 라우팅 설정
  - 컴포넌트/페이지 구조
  - API 클라이언트 연동 코드

### 3-SERVER. 서버 작업 (build_server_engineer)
- 전달 정보:
  - 04_interface_design.md에서 추출한 API 엔드포인트 설계
  - 05_tech_spec.md에서 추출한 서버 기술 스택, 아키텍처 패턴
  - 01_requirements.md에서 추출한 관련 기능/비기능 요구사항
  - Step 2 결과 (프로젝트 구조, 공유 라이브러리)
- 기대 결과:
  - 서버 애플리케이션 코드 (서비스별 모듈, 컨트롤러, 서비스 레이어)
  - API 라우팅 설정
  - 인증/인가 구현
  - 서비스 간 통신 설정
  - 공유 DTO/인터페이스 구현

### 3-DB. 데이터베이스 작업 (build_database_engineer)
- 전달 정보:
  - 05_tech_spec.md에서 추출한 DB 기술 스택, Database-per-Service 구성
  - 04_interface_design.md에서 추출한 데이터 모델 관련 정보
  - 01_requirements.md에서 추출한 관련 기능 요구사항
  - Step 2 결과 (프로젝트 구조)
- 기대 결과:
  - 데이터베이스 스키마 정의 (Entity, Migration)
  - ORM 설정
  - 시드 데이터 (필요 시)
  - 데이터베이스 연결 설정

## Step 4. 결과 수집 & 검증
모든 subagent의 반환값을 수집하고 아래를 검증한다:
- 각 단계의 결과가 누락 없이 존재하는가
- 단계 간 산출물의 일관성이 유지되는가 (import 경로, 패키지 참조 등)
- planning 산출물의 요구사항이 빠짐없이 반영되었는가
- 누락 또는 불일치 발생 시 해당 subagent만 재실행

## Step 5. 최종 리뷰 & 피드백 루프
- 모든 단계가 처리되었는지 확인
- Human에게 최종 결과를 단계별로 제시
  - 생성된 파일 목록 (트리 구조)
  - 각 subagent별 작업 요약
  - planning 요구사항 대비 구현 커버리지

### 5-1. 피드백 수집
- Human에게 아래 항목별 피드백을 요청한다:
  - 각 단계 산출물에 대한 수정/보완 사항
  - 추가로 반영해야 할 요구사항
  - 삭제하거나 변경할 항목

### 5-2. 영향 범위 분석
- 피드백 내용을 분석하여 영향받는 단계를 식별한다.
- 영향 범위 판정 기준:
  - scaffolder 수정 → 전체 재실행
  - infra 수정 → infra만 재실행
  - server/client/db 수정 → 해당 단계만 재실행
  - 서비스 간 연동 변경 → 관련된 모든 단계 재실행
- 재실행 계획을 Human에게 제시하고 확인받는다.

### 5-3. 선택적 재실행
- 확인된 재실행 계획에 따라 해당 subagent만 재실행한다.
- 재실행 시 이전 결과와의 변경점(diff)을 명시한다.
- 재실행 결과를 후속 단계에 전파하여 일관성을 유지한다.

### 5-4. 반복 판정
- 재실행 결과를 Human에게 제시한다.
- Human이 승인하면 종료한다.
- 추가 피드백이 있으면 Step 5-1로 복귀하여 루프를 반복한다.
- 최대 반복 횟수 제한 없음 (Human이 승인할 때까지 반복)

# Output
- Step별 전체 작업 요약
  - Step 0. 수집 정보 요약 (planning_path, output_path, exclude, pipeline_order, dry_run)
  - Step 1. 수립된 계획 요약 (프로젝트명, 기술 스택, 실행 파이프라인)
  - Step 2. 프로젝트 구조 초기화 결과 (생성된 루트 파일/디렉토리 수)
  - Step 3. Pipeline 실행 결과 (각 agent별 생성 파일 수, 실행 순서)
  - Step 4. 검증 결과 (누락/불일치 여부, 요구사항 커버리지)
  - Step 5. 피드백 루프 결과 (피드백 횟수, 재실행 단계, 최종 승인 여부)
