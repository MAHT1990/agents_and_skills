# Goal
이 파일을 읽은 Agent는 IaC(Terraform 등) 인프라 레포를 분석하여 핵심 구성 요소(레이어·모듈·환경·state·백엔드)를 식별하고, 그에 맞는 디렉토리와 마크다운 파일을 동적으로 생성한다.

# Structure
```
docs/
└── guides/
    ├── architecture/
    │   └── architecture.md            # 레이어·환경 2축 구조 개요 + 의존/조립 다이어그램
    ├── convention/
    │   └── {구성요소}.md               # 인프라 구성요소 분석 후 동적 결정 (하단 참고)
    ├── workflow/
    │   └── {작업명}.md                 # 반복 인프라 작업 절차 (하단 참고)
    └── INDEX.md                        # 모든 문서 링크 취합
```

# 작성 규칙
## 생성 순서
- 1단계. 레포 전체 탐색: 구성 요소 목록 및 구조 확정
  - 산출물·캐시 디렉토리(ex. `.terraform/`, `*.tfstate`, `.terraform.lock.hcl`) 제외
- 2단계. convention/*.md 생성 (병렬 생성 가능)
- 3단계. architecture/{architecture_name}.md (convention 파일 목록 확정 후)
- 4단계. workflow/*.md (반복 구조가 발견된 경우)
- 5단계. INDEX.md (모든 파일 작성 완료 후 링크 취합)

## Convention/ 구성요소 동적 결정 규칙
### Step1. 레포에서 핵심 구성 요소 식별
- Agent는 IaC 레포의 주요 구성 요소를 식별한다.
- 구성 요소는 모듈(재사용 부품), 환경(배포 단위), state 백엔드, 레이어 의존(remote_state), 명명·태깅, 부트스트랩, 글로벌 자원, CI/CD, 시크릿 관리, 프로바이더 설정 등으로 분류된다.
- 각 구성 요소는 마크다운 파일로 문서화된다.
- 인프라 도메인 대표 매핑 (존재하는 것만 생성):

  | 구성 요소 | 책임 | 대표 파일 단서 |
  |---|---|---|
  | `modules` | 환경 독립 재사용 부품 | `modules/<name>/{main,variables,outputs}.tf` |
  | `environments` | 배포 단위(환경×레이어) | `environments/<env>/<layer>/` |
  | `state-backend` | state 보관·잠금 | `backend.tf`, `bootstrap/` |
  | `remote-state-dependency` | 레이어 간 값 전달 | `terraform_remote_state` data source |
  | `naming-tagging` | 명명·태깅·버전 핀 | `providers.tf` `default_tags`, `versions.tf` |
  | `bootstrap` | 백엔드 1회성 생성 | `bootstrap/` (backend 없는 root) |
  | `global` | 환경 공통 글로벌 자원 | `global/` (IAM, ECR, DNS zone) |
  | `cicd` | plan/apply 자동화 | `.github/workflows/*.yml` |

### Step2. 파일명 결정 규칙
- 구성 요소의 책임 단위로 파일을 생성한다.
- 하나의 경로에 여러 책임이 섞여 있으면 책임별로 분리한다.
  - ex. `bootstrap/`에 backend 생성과 IAM 부트스트랩이 공존 → `state-backend.md`, `bootstrap.md`
- 유사 구성 요소는 하나의 파일로 통합한다.
  - ex. `modules/network`, `modules/compute` 등 다수 모듈 → `modules.md` 1개 (개별 자원은 모듈 README에 위임)

### Step3. 각 *.md 파일의 내용 구성 규칙
```
# {구성요소명} 컨벤션

## 개요
<!-- 이 구성 요소의 책임과 레포 내 위치 -->

## 구조
<!-- 실제 디렉토리/파일 경로, state key 규칙, 자원 목록 -->

## 사용 패턴
<!-- 실제 .tf 코드에서 어떻게 쓰는지 예시 -->

## 주의사항
<!-- 이 구성 요소 사용 시 반드시 알아야 할 제약 -->
```
- "사용 패턴" 섹션에 가능하면 Good/Bad 또는 현재표준/Deprecated 대비 HCL 코드를 포함한다.
- "구조" 섹션에 ASCII 다이어그램 또는 mermaid 다이어그램을 허용한다.
- 설정/백엔드 구성요소는 부트스트랩 순서와 의존 관계 다이어그램을 포함한다.
- **버전·기능 정확성**: deprecated 인자(ex. backend s3의 `dynamodb_table`)는 공식문서 기준 현재 표준(ex. `use_lockfile = true`)을 병기한다.

## architecture/{architecture_name}.md 작성 규칙
> 아래 Step1~5와 본 문서의 다이어그램 템플릿(레이어 의존 흐름 / 조립 흐름)을 따른다.

### Step1. 인프라 아키텍처 파악
> 아래 질문 흐름에 따라 레포를 분석한다.
- 레이어가 몇 개이고 각각의 책임은 무엇인가?
  - ex. network → data → compute → observability
- 레이어 간 의존은 어떻게 흐르는가? (단방향/순환 여부)
  - `terraform_remote_state` 참조 관계를 추적하여 의존 방향 확정
- 모듈(부품)과 환경(조립)은 어떻게 분리되는가?
  - `modules/` ↔ `environments/` 의 source 참조·변수 주입 흐름 확인
- 환경은 어떻게 분리되는가? (디렉토리 / workspace)
- State 입자(granularity)는 무엇인가? (환경당 단일 / 환경×레이어 분리)
  - `backend.tf`의 key 규칙으로 state 분할 단위 확정
- State 백엔드와 잠금은 어떻게 구성되는가? (S3+lockfile / TFC 등)
- 프로바이더·리전·태깅 전략은 무엇인가?
- CI/CD(plan/apply) 자동화 여부와 실행 주체는?

### Step2. project Overview
> 레포 전체 디렉토리 구조를 작성. (bootstrap/modules/global/environments/.github 등)

### Step3. 다이어그램 작성
> 인프라의 실제 흐름을 반영. 두 종류를 권장.
- 레이어 의존 흐름 (단방향)
```
┌──────────────────────┐
│  {layer1}            │   {대표 자원}
│  (modules/{layer1})  │
└──────────┬───────────┘
           │ remote_state ({output})
┌──────────▼───────────┐
│  {layer2}            │
└──────────────────────┘
```
- 조립 흐름 (modules ↔ environments)
```
        modules/{layer}  (부품: 어떻게 만드나)
              ▲ source
              │ 변수 주입(환경별 값)
environments/{env}/{layer}  (조립 + 독립 state)
              │ outputs
              ▼ terraform_remote_state
environments/{env}/{상위 layer}
```
- 박스 안에는 실제 모듈명·레이어명·자원명 사용 (추상 명칭 금지)
- 레포에 존재하지 않는 단계는 다이어그램에 포함하지 않음
- 환경이 2개 이상이면 환경×레이어 매트릭스 표를 별도 작성

### Step4. 레이어별 개요와 구성요소 .md 파일 링크 작성
ex.

| 레이어/주제 | 문서 |
|---|---|
| 재사용 부품 | [modules](../convention/modules.md) |
| State 백엔드 | [state-backend](../convention/state-backend.md) |

### Step5. 주의사항 작성
- 의존 방향(단방향), apply 순서, 보류 중 결정(백엔드/CI-CD), 모듈 provider/backend 금지 등 핵심 제약을 명시한다.

## workflow/ 작성 규칙
### 생성 조건
- architecture 분석 결과, 반복되는 구조(환경×레이어 매트릭스 등)가 발견될 때 생성한다.
### 파일명 결정 규칙
- 작업 단위를 kebab-case로 명명한다. (예: `add-new-layer.md`, `add-new-environment.md`)
### 내용 구성 규칙
- 인프라 의존 순서(하위 레이어 → 상위 레이어)대로 작업 단계를 구성한다.
- 각 단계마다 HCL 코드 템플릿과 state key·태깅 체크포인트를 포함한다.
- 말미에 체크리스트(모듈 provider 금지, backend key 규칙, use_lockfile, 단방향 의존 등)를 첨부한다.
```
# {작업명} 워크플로우

## Step 1. {최하위 레이어 / 모듈 준비}
<!-- HCL 코드 템플릿 -->

## Step N. {상위 레이어 / apply}
<!-- HCL 코드 템플릿 + 의존 순서 준수 -->

## 체크리스트
- [ ] ...
```

## 갱신 모드 (Update Mode) — 기존 guide docs 보강/정정
> 이미 guide docs가 존재하고, **코드 실태와의 괴리 해소**가 목적인 경우 사용한다.

### 발동 조건
- `docs/guides/` 디렉토리에 1개 이상의 기존 문서가 존재

### 갱신 프로토콜
#### Step A. 실태 조사
- `docs/guides/` 하위 파일 트리 확인 → 기존 문서 목록 파악
- 갱신 항목을 유형 분류
  - **A형**: 가이드 기술 ≠ 실제 코드 → 문서를 실제에 맞게 수정 (ex. deprecated 인자 잔존)
  - **B형**: 가이드에 없는 패턴이 코드에 존재 → 섹션 추가 또는 신규 문서
  - **C형**: 가이드가 "필수"로 기술했으나 실제는 보류/일부 적용 → 실태("보류" 등) 명시

#### Step B. 문서별 수정 범위 산정
- **소폭 수정**: 인자명·예시 정정 → 해당 섹션만 `Edit`
- **섹션 추가**: 누락된 구성요소(ex. cicd) → 기존 문서 끝에 새 섹션
- **신규 문서**: 대형 주제 → `convention/*.md` 또는 `workflow/*.md` 신규 생성
- **실태 반영 섹션**: "표준 vs 실제 실태(보류/미적용)"를 명확히 구분 기록

#### Step C. 원칙
- **코드 수정과 분리**: 문서 변경만 수행. 코드 수정 필요 항목은 Backlog로 분리하고 "수정 대상" 주석만 남긴다.
- **보존 우선**: 기존 섹션을 무리하게 삭제하지 않고 "실태 반영"으로 교정.
- **통합 참조**: 신규 문서는 기존 convention/*.md와 크로스 링크로 연결.
- **우선순위**: 🔴 보안/state/백엔드 괴리 → 🟠 반복 패턴/필수 신규 → 🟡 보충 설명.

#### Step D. INDEX.md 반영
- 신규 convention/workflow 문서를 INDEX.md 표에 추가
- 환경×레이어 매트릭스 등 "프로젝트 고유 성질" 섹션을 실태에 맞게 갱신

---

## INDEX.md
> docs/guides/INDEX.md 는 Agent가 프로젝트를 파악하기 위한 문서 진입점.
> 아래 Step1~3 기준으로 작성한다.

- INDEX.md는 모든 문서의 링크를 모아둔 파일로, 각 구성 요소의 마크다운 파일 링크를 포함한다.
- 구성 요소별로 분류하며, 처음 보는 사람이 전체 구조를 빠르게 파악하도록 돕는다.

### Step1. 정보 수집
INDEX.md는 모든 문서가 완성된 후 마지막에 작성.
- architecture/*.md
- convention/*.md
- workflow/*.md

### Step2. 섹션 작성
아래는 판단 기준이며 고정 목록이 아님. 생성 근거가 있는 경우 작성.

| 섹션 | 작성 조건 | 내용 기준 |
|---|---|---|
| 개요 | 항상 작성 | 레포가 관리하는 인프라 범위·클라우드·핵심 원리를 한 문단으로 기술 |
| 디렉토리 구조 | 항상 작성 | 생성 문서 트리, 각 파일 옆 한 줄 설명 |
| 아키텍처 | architecture/*.md 존재 | 파일명·설명 2열 테이블, 상대 경로 링크 |
| 컨벤션 | convention/*.md 존재 | 책임 유형별 그룹화, 파일명·설명·관련 경로 테이블 |
| 프로젝트 고유 성질 | 반복 패턴 존재 | 하단 Step3 참고 |
| Workflow | workflow/*.md 존재 | 파일명·설명 2열 테이블, 상대 경로 링크 |
| 코드 리뷰 체크리스트 | 필수 규칙 3개 이상 | convention의 필수 규칙을 체크박스로 취합 |

### Step3. 프로젝트 고유 요약 테이블 결정 원칙
레포에서 도메인 전반에 반복되는 패턴을 발견하면 요약 테이블로 추가한다.

| 발견 패턴 | 테이블로 만들 것 |
|---|---|
| 환경 × 레이어로 root가 반복된다 | 환경×레이어 매트릭스 (각 칸 = 독립 state) |
| state key에 일관된 규칙 존재 | key 규칙(`<env>/<layer>/terraform.tfstate`) 요약 |
| 모든 레이어 root가 동일 파일 구성 | root 파일 구성(backend/providers/main/variables/tfvars/outputs) 요약 |
| 공통 태그·버전 핀 반복 | default_tags 키·required_version 요약 |
| 그 외 레포 고유 반복 규칙 | 해당 규칙에 맞는 자유 형식 테이블 |
