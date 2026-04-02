---
name: skill_context_manager
description: 현재 대화 Context를 분석·관리하여, 작업 Todo Tree 작성, 의존성/중요도 검토, Context 요약 스냅샷, 작업 전환점 제안, 미완료 작업 핸드오프를 수행하는 스킬. 다음 상황에서 반드시 발동한다. case1. "context 정리", "컨텍스트 정리" 관련 문자열 포함 요청. case2. "작업 정리", "작업 현황" 관련 요청. case3. "todo 트리", "todo tree" 관련 요청.
---

# Role
현재 대화의 Context를 분석하고, 작업 항목을 구조화하며, 의존성·우선순위를 제안하는 Context 관리 오케스트레이터.
직접 분석하거나 결론을 내리지 않는다. 반드시 각 단계의 subagent에게 위임하고, 그 결과를 종합하여 사용자에게 전달한다.

# Variables
- $$mode: 실행 모드 (user input, 필수, default: "full")
  - summary: Context 요약만 수행
  - todo: Todo Tree만 생성
  - full: 전체 분석 (요약 + Todo + 의존성 + 전환점)
  - handoff: 미완료 작업 핸드오프 (memory 저장)
- $$scope: 분석 범위 (user input, default: "conversation")
  - conversation: 현재 대화 내용만 (메시지, 도구 호출, 파일 읽기/수정 이력)
  - with_memory: 대화 + memory 시스템에 저장된 정보 참조
  - with_project: 대화 + memory + 작업 디렉토리의 코드/설정 파일 스캔
- $$output_mode: 출력 방식 (user input, default: "console")
  - console: 콘솔 출력 (기본값)
  - file: 마크다운 파일로 저장
  - notion: Notion 페이지로 작성
- $$output_target: 출력 대상 정보 (file path 또는 Notion URL, $$output_mode에 따라 필요)
- $$depth: Todo Tree 분석 깊이 (user input, default: "normal")
  - shallow: 대분류만 (상위 작업 항목)
  - normal: 중분류까지 (하위 태스크 포함)
  - deep: 세부 태스크까지 (구현 단위 수준)

## Subagents
| # | Name | 역할 | 설명 |
|---|---|---|---|
| 1 | context_summarizer | Context 요약 및 사용량 추정 | 대화 흐름 분석, 다룬 파일/변경사항 목록화, 규모 추정, 전환점 판정 |
| 2 | context_todo_builder | 작업 항목 추출 및 트리 생성 | context 요약 기반 작업 항목 추출, 마크다운 트리 구조 생성, 완료/미완료 상태 표시 |
| 3 | context_dependency_analyzer | 작업간 의존성·중요도 분석 | Todo 항목간 의존성 맵핑, 중요도/우선순위 산정, 실행 순서 추천 |

### Pipeline
```
[사용자 요청: $$mode, $$scope]
       │
       ▼
 ── Phase 1: Context 수집 ──
 ① context_summarizer
   - 대화 흐름 분석
   - $$scope에 따른 분석 범위 결정
     - conversation: 현재 대화 내용만
     - with_memory: + memory 시스템 참조
     - with_project: + 작업 디렉토리 스캔
   - 사용량 휴리스틱 추정
     - 대화 턴 수, 도구 호출 횟수, 읽은 파일 수
     - 수정한 파일 수, 생성한 파일 수
   - 다룬 파일/변경사항 목록화
   - 전환점 필요 여부 판정
       │
       ▼
 ── Phase 2: 작업 구조화 ── ($$mode가 summary가 아닌 경우)
 ② context_todo_builder
   - Phase 1 요약 기반 작업 항목 추출
   - $$depth에 따른 트리 깊이 결정
   - 마크다운 트리 구조 생성
   - 완료/미완료 상태 표시 (체크박스)
       │
       ▼
 ── Phase 3: 분석 & 제안 ── ($$mode가 full인 경우)
 ③ context_dependency_analyzer
   - Todo 항목간 의존성 맵핑
   - 중요도/우선순위 산정 (HIGH/MEDIUM/LOW)
   - 실행 순서 추천 (크리티컬 패스 식별)
   - 병렬 가능 작업 식별
       │
       ▼
 ── Phase 4: 핸드오프 ── ($$mode가 handoff인 경우)
 [오케스트레이터]
   - Phase 1~3 전체 실행 후
   - 미완료 작업 → memory 저장
     - 저장 위치: memory/project_handoff_{timestamp}.md
     - 저장 내용: Todo Tree + 미완료 항목 + context 요약
   - 다음 대화 시작 시 복원 안내
```

### Mode별 실행 범위
| Phase | summary | todo | full | handoff |
|---|---|---|---|---|
| Phase 1: Context 수집 | O | O | O | O |
| Phase 2: 작업 구조화 | X | O | O | O |
| Phase 3: 분석 & 제안 | X | X | O | O |
| Phase 4: 핸드오프 | X | X | X | O |

### Constraints for Subagents
- subagent는 서로의 컨텍스트를 공유하지 않는다.
- subagent간 데이터 전달은 반드시 오케스트레이터를 통해 이루어진다.
- 각 subagent는 이전 Phase의 결과를 오케스트레이터로부터 전달받아 작업한다.
- Pipeline은 순차 실행이다 (각 Phase가 이전 Phase의 출력에 의존).

# Error Handling
- $$mode 미제공 → default "full"로 진행
- $$scope가 with_memory인데 memory 파일이 없는 경우 → conversation으로 폴백, Human에게 보고
- $$scope가 with_project인데 작업 디렉토리가 불명확한 경우 → Human에게 경로 확인 요청
- $$output_mode가 file인데 $$output_target 미제공 → Human에게 경로 요청
- $$output_mode가 notion인데 $$output_target 미제공 → Human에게 Notion URL 요청
- subagent 실패 → 해당 Phase 스킵, Human에게 보고 후 가능한 Phase만 계속 진행
- context가 너무 짧아 분석 불가 → Human에게 보고, 가능한 범위만 출력

---
# Action

## Rules
- **skill 발동 즉시, 이 파일의 frontmatter(name, description), Variables, Steps 섹션을 파싱하여 아래 Quick Help 형식으로 Human에게 출력한 후 첫 Step부터 진행한다.**
  ```
  {name} — {description 첫 문장}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ▶ 입력값
    {Variables 섹션의 각 $$변수를 "$$변수명 : 설명 (필수/선택, 기본: 값)" 형태로 나열}

  ▶ 진행 단계
    {Steps 섹션의 각 Step을 "Step N. 제목" 형태로 나열}

  💡 각 Step 완료 후 "진행" / "수정" / "중단"으로 응답하세요.
  ```
- 각 Step 완료 시, 해당 Step의 결과를 아래 형식으로 요약하여 Human에게 제시한다:
  ```
  --- Step N 결과 요약 ---
  • 수행 내용: {이번 Step에서 수행한 작업 요약}
  • 산출물: {생성/수집/분석된 결과물}
  • 특이사항: {이슈, 경고, 참고 사항}
  --- 다음 Step: {Step N+1 제목} ---
  ```
- Human의 확인("진행", "수정", "중단")을 받은 후에만 다음 Step으로 진행한다.
- "수정" 요청 시, 해당 Step 내에서 수정을 완료한 후 재요약하여 확인받는다.
- "중단" 요청 시, 현재까지의 결과를 Output 형식으로 정리하여 종료한다.

## Step 0. 요구사항 회의 (Human-in-the-Loop)

### 0-1. 변수 수집
아래 정보를 확보한다. 미제공 시 기본값 적용.
- $$mode: 실행 모드 (기본: "full")
- $$scope: 분석 범위 (기본: "conversation")
- $$output_mode: 출력 방식 (기본: "console")
- $$output_target: 출력 대상 (output_mode가 file 또는 notion인 경우 필수)
- $$depth: Todo Tree 분석 깊이 (기본: "normal")

### 0-2. 요구사항 구체화 회의
수집된 변수를 바탕으로 Human과 회의하여 아래 사항을 구체화한다.
Human이 최종 승인할 때까지 회의를 반복한다.
- Context 정리의 목적 (현황 파악, 작업 전환, 핸드오프 등)
- 분석 범위에 포함/제외할 항목
- 특별히 중점적으로 정리할 영역

### 0-3. 최종 승인
확정된 요구사항을 요구사항 확인서 형식으로 Human에게 제시하고 **최종 승인**을 받는다.
승인 없이 다음 Step으로 진행하지 않는다.
"수정" 시, 0-2(회의)로 돌아가 재논의 후 다시 승인을 요청한다.

## Step 1. Context 수집 & 요약 (context_summarizer)
context_summarizer에게 위임하여 현재 대화의 Context를 분석한다.

### 1-1. 대화 흐름 분석
- 대화 턴 수 집계
- 주요 주제/토픽 추출
- 사용자 요청 흐름 정리

### 1-2. 도구 사용 이력 분석
- 도구 호출 횟수 및 종류 집계
- 읽은 파일 목록 (경로, 읽은 범위)
- 수정/생성한 파일 목록
- 실행한 명령 목록

### 1-3. 사용량 휴리스틱 추정
- 대화 규모 추정 (소/중/대)
  - 소: 턴 10회 미만, 파일 5개 미만
  - 중: 턴 10~30회, 파일 5~15개
  - 대: 턴 30회 초과, 파일 15개 초과
- Context 활용도 표시
  ```
  📊 Context 현황
  ┌─────────────────────────────────┐
  │ 대화 턴: N회                    │
  │ 도구 호출: N회                  │
  │ 읽은 파일: N개                  │
  │ 수정/생성 파일: N개             │
  │ 규모: 소/중/대                  │
  │ 주요 토픽: ...                  │
  └─────────────────────────────────┘
  ```

### 1-4. 전환점 판정
- 아래 조건 중 2개 이상 해당 시 전환점 제안:
  - 대화 턴 30회 초과
  - 다룬 주제가 3개 이상으로 분산
  - 동일 파일을 3회 이상 재읽기
  - 이전 작업과 관련 없는 새로운 요청 등장
- 전환점 제안 시 메시지:
  ```
  ⚠️ 전환점 제안: 현재 대화가 {사유}하여 새 대화 시작을 권장합니다.
  핸드오프를 원하시면 $$mode=handoff로 재실행해주세요.
  ```

### 1-5. 확장 분석 ($$scope에 따라)
- with_memory: memory 디렉토리 스캔, 관련 memory 파일 참조하여 context 보강
- with_project: 작업 디렉토리의 주요 파일 구조 스캔, git status/log 참조

$$mode가 summary인 경우 여기서 종료하고 결과를 출력한다.

## Step 2. Todo Tree 생성 (context_todo_builder)
context_todo_builder에게 위임하여 작업 항목을 구조화한다.

### 2-1. 작업 항목 추출
- Step 1의 context 요약을 기반으로 작업 항목을 식별
- 사용자의 명시적 요청, 암묵적 과제, 미완료 작업을 구분

### 2-2. 트리 구조 생성
- $$depth에 따라 트리 깊이 결정
  - shallow: 대분류만 (예: "API 개발", "프론트엔드 수정")
  - normal: 중분류까지 (예: "API 개발" > "인증 엔드포인트 구현")
  - deep: 세부 태스크까지 (예: "API 개발" > "인증 엔드포인트" > "JWT 토큰 검증 로직")
- 마크다운 체크박스 트리 형식:
  ```
  📋 Todo Tree
  ├── [x] 1. 완료된 작업
  │   ├── [x] 1.1 하위 작업 A
  │   └── [x] 1.2 하위 작업 B
  ├── [ ] 2. 미완료 작업
  │   ├── [x] 2.1 완료된 하위
  │   └── [ ] 2.2 미완료 하위
  └── [ ] 3. 새로 식별된 작업
  ```

### 2-3. 진행률 계산
- 전체 항목 수 대비 완료 항목 수 비율
- 진행률 시각화:
  ```
  📈 진행률: ████████░░ 75% (12/16 완료)
  ```

$$mode가 todo인 경우 여기서 종료하고 결과를 출력한다.

## Step 3. 의존성 & 중요도 분석 (context_dependency_analyzer)
context_dependency_analyzer에게 위임하여 작업간 관계를 분석한다.

### 3-1. 의존성 맵핑
- 각 Todo 항목간 선행/후행 관계 식별
- 의존성 표기:
  ```
  🔗 의존성 맵
  작업 2.2 → 작업 1.1에 의존 (1.1 완료 후 진행 가능)
  작업 3.1 → 작업 2.1, 2.2에 의존 (둘 다 완료 후 진행 가능)
  작업 2.3 ↔ 작업 2.4 (병렬 진행 가능)
  ```

### 3-2. 중요도 산정
- 각 항목의 중요도를 3단계로 분류:
  - 🔴 HIGH: 다른 작업의 선행 조건, 핵심 기능, 블로커
  - 🟡 MEDIUM: 주요 기능이나 독립적으로 진행 가능
  - 🟢 LOW: 부가 기능, 후순위 가능
- 중요도 판정 기준:
  - 후속 의존 작업 수가 많을수록 HIGH
  - 사용자가 명시적으로 요청한 항목은 최소 MEDIUM
  - 독립적이고 부가적인 항목은 LOW

### 3-3. 실행 순서 추천
- 크리티컬 패스 식별 (가장 긴 의존 체인)
- 병렬 가능 작업 그룹 식별
- 추천 실행 순서 제시:
  ```
  🎯 추천 실행 순서
  ──────────────────
  1단계: [작업 1.1] 🔴 ← 블로커, 최우선
  2단계: [작업 2.1] 🟡 + [작업 2.3] 🟢 ← 병렬 가능
  3단계: [작업 2.2] 🔴 ← 2.1 완료 후
  4단계: [작업 3.1] 🟡 ← 2.1, 2.2 완료 후
  ```

## Step 4. 핸드오프 ($$mode=handoff 시, 오케스트레이터 직접 수행)
미완료 작업을 memory에 저장하여 다음 대화에서 이어갈 수 있도록 한다.

### 4-1. 핸드오프 데이터 구성
- context 요약 (Step 1 결과)
- 미완료 Todo Tree (Step 2에서 [ ]인 항목만)
- 의존성/우선순위 정보 (Step 3 결과)
- 현재 작업 디렉토리 및 주요 파일 경로

### 4-2. Memory 저장
- 저장 위치: `C:\Users\SDIJ\.claude\projects\{project}\memory\project_handoff_{YYYYMMDD_HHmmss}.md`
- frontmatter:
  ```yaml
  ---
  name: handoff_{날짜}
  description: {주요 토픽} 작업 핸드오프 — 미완료 N건
  type: project
  ---
  ```
- MEMORY.md 인덱스에 포인터 추가

### 4-3. 복원 안내
- 다음 대화에서 복원하는 방법을 안내:
  ```
  💾 핸드오프 완료
  다음 대화에서 아래와 같이 이어갈 수 있습니다:
  → "작업 이어하기" 또는 "context 정리"로 호출
  → 저장된 핸드오프에서 미완료 작업을 자동 로드합니다.
  ```

## Step 5. 결과 출력
$$output_mode에 따라 최종 결과를 출력한다.
- console: 대화창에 전체 결과 출력
- file: $$output_target 경로에 마크다운 파일로 저장
- notion: $$output_target에 Notion 페이지로 작성

### 출력 구조
```markdown
# Context Manager Report

## 1. Context 요약
{Step 1 결과}

## 2. Todo Tree
{Step 2 결과}

## 3. 의존성 & 우선순위 분석
{Step 3 결과}

## 4. 전환점 제안
{Step 1-4 판정 결과}

## 5. 핸드오프 상태
{Step 4 결과 또는 "핸드오프 미수행"}
```

# Output
- Step별 전체 작업 요약
  - Step 0. 수집 정보 요약 (mode, scope, output_mode, depth)
  - Step 1. Context 요약 결과 (대화 규모, 주요 토픽, 사용량 추정, 전환점 판정)
  - Step 2. Todo Tree 생성 결과 (항목 수, 완료/미완료 비율, 진행률)
  - Step 3. 의존성/중요도 분석 결과 (의존 관계 수, 크리티컬 패스, 추천 순서)
  - Step 4. 핸드오프 결과 (저장 경로, 미완료 항목 수)
  - Step 5. 출력 결과 (출력 방식, 위치)
