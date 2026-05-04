---
name: skill_code_analyze
description: 도메인과 도메인에 대한 요청 세부내용, 분석범위를 입력받아, 담당 subagent를 통해 주어진 소스코드 기반 요청 파이프라인을 분석해주는 SKILL. -발동조건1. 특정 리소스에 대한 요청 분석을 요청받은 경우.
---
# Agents
- code_analyzer_front
- code_analyzer_electron
- code_analyzer_back
# Variable
- $$SRC_FRONT: user input
- $$SRC_BACK: user input
- $$SRC_ELECTRON: user input
- $$GUIDE_FRONT: $$SRC_FRONT에 대한 guide docs (user input, 필수, default: $$SRC_FRONT/docs/guides/INDEX.md)
- $$GUIDE_BACK: $$SRC_BACK에 대한 guide docs (user input, 필수, default: $$SRC_BACK/docs/guides/INDEX.md)
- $$GUIDE_ELECTRON: $$SRC_ELECTRON에 대한 guide docs (user input, 필수, default: $$SRC_ELECTRON/docs/guides/INDEX.md)
- $$Domain: 관련 도메인
- $$Request: $$Domain과 관련된 요청의 세부내용.
- $$Scope: 분석 범위
  - 프론트엔드: "FRONT", "front", "프론트", "프론트엔드"
  - 백엔드: "BACK", "back", "백", "백엔드"
  - 데스크탑: "DESK", "DESKTOP", "ELECTRON",
# Error Handling
- $$Domain 또는 $$Request 미제공 → Human에게 재요청
- $$Scope 불일치 → Human에게 보고 후 재입력 요청
- subagent 실패 → 해당 Scope 스킵, Human에게 보고 후 나머지 계속 진행
- $$GUIDE_* 파일 미존재 → 해당 Scope의 가이드 문서가 없음을 Human에게 보고하고, `skill_guide_doc` 선행 실행(mode=guide)을 안내한다. 생성 완료 후 본 skill 재진입을 유도한다.

# Actions
## Rules
- 직접 처리하지말고, 반드시 subagent를 통해 수행할 것.(Context 분리를 위해)
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
아래 정보를 모두 확보할 때까지 회의 단계로 진행하지 않는다.
- $$Domain: 관련 도메인 (필수)
- $$Request: 도메인 관련 요청 세부내용 (필수)
- $$Scope: 분석 범위 — FRONT / BACK / DESK (필수)
- Scope별 추가 정보:
  - FRONT: $$SRC_FRONT (필수), $$GUIDE_FRONT (기본: $$SRC_FRONT/docs/guides/INDEX.md)
  - BACK: $$SRC_BACK (필수), $$GUIDE_BACK (기본: $$SRC_BACK/docs/guides/INDEX.md)
  - DESK: $$SRC_ELECTRON (필수), $$GUIDE_ELECTRON (기본: $$SRC_ELECTRON/docs/guides/INDEX.md)

### 0-2. 요구사항 구체화 회의
수집된 변수를 바탕으로 Human과 회의하여 아래 사항을 구체화한다.
Human이 최종 승인할 때까지 회의를 반복한다.
- 분석 목적과 기대하는 결과물 형태
- 요청 파이프라인의 시작/끝 범위
- 분석 깊이 (개요 수준 vs 코드 레벨 상세)
- 복수 Scope 분석 여부

### 0-3. 최종 승인
확정된 요구사항을 요구사항 확인서 형식으로 Human에게 제시하고 **최종 승인**을 받는다.
승인 없이 다음 Step으로 진행하지 않는다.
"수정" 시, 0-2(회의)로 돌아가 재논의 후 다시 승인을 요청한다.

## Steps
### Step1.
$$Scope에 따라, $$Domain, $$Request, $$GUIDE_*를 적절한 subagent에게 위임.
- 위임 전 $$GUIDE_* 파일 존재 여부를 확인한다. 미존재 시 Error Handling 규칙에 따라 `skill_guide_doc` 선행 실행을 Human에게 안내한다.
### Step2.
subagent의 결과 수합.
### Step3. 결과 검증
subagent 반환 결과에 대해 아래 항목을 자체 검증한다:
- 요청된 $$Domain에 대한 분석이 누락 없이 포함되어 있는가
- $$Request의 세부내용이 모두 반영되었는가
- 분석 흐름(요청 → 처리 → 응답)이 논리적으로 완결되는가
- 검증 결과를 체크리스트 형태로 Human에게 출력한다.

### Step4. 결과 출력
검증을 통과한 분석 결과를 구조화하여 Human에게 출력한다.

#### 4-1. 시각화 의무
분석된 컴포넌트·컴포저블·API 등은 반드시 와이어프레임으로 시각화한다.
시각화 형식은 `rule_visualization_guide.md`의 "와이어프레임 + 외부 라벨링 패턴"을 따른다.
- console 모드: ASCII 와이어프레임
- file / notion 모드: mermaid `flowchart`로 대체 (식별자 + 경로·역할을 노드 라벨에 함께 기재)

#### 4-2. Scope별 와이어프레임 매핑
| Scope | 시각화 대상 | 와이어프레임 형태 |
|---|---|---|
| FRONT | 컴포넌트·컴포저블·라우트 | 화면 영역 박스 + 컴포넌트 식별자 + 외부에 파일 경로·역할 |
| BACK  | API 엔드포인트·미들웨어·핸들러·서비스·DB | 요청→미들웨어→핸들러→서비스→DB 레인 박스 + 외부에 모듈 경로·역할 |
| DESK  | 윈도우·IPC 채널·메인/렌더러 | 윈도우 박스 + IPC 채널 화살표 + 외부에 채널명·핸들러 경로 |

#### 4-3. 라벨링 규칙 (모든 Scope 공통)
- 박스 **내부**: 식별자만 기재 (컴포넌트명, 함수명, 엔드포인트 경로 등)
- 박스 **외부**: `◀──` 화살표로 `[경로]` + 역할 주석 부착
- 중첩 구성 요소는 들여쓰기로 표현하고, 각 요소마다 외부 라벨을 붙인다.

### Step5. 피드백 루프

#### 5-1. 피드백 수집
- Human에게 아래 항목별 피드백을 요청한다:
  - 분석 결과에서 누락된 파이프라인 구간이 있는가
  - 추가로 분석이 필요한 영역(다른 Scope 포함)이 있는가
  - 분석 깊이가 충분한가 (더 상세한 분석 필요 여부)

#### 5-2. 영향 범위 분석
- 피드백 내용을 분석하여 재실행 범위를 판정한다:
  - 동일 Scope 내 보완 → 해당 subagent만 추가 분석 위임
  - 다른 Scope 추가 요청 → 해당 Scope의 subagent 신규 실행
  - 분석 관점 변경 → Step 1부터 재실행
- 재실행 계획을 Human에게 제시하고 확인받는다.

#### 5-3. 선택적 재실행
- 확인된 재실행 계획에 따라 해당 subagent만 재실행한다.
- 재실행 시 이전 결과와의 변경점(diff)을 명시한다.

#### 5-4. 반복 판정
- 재실행 결과를 Human에게 제시한다.
- Human이 승인하면 최종 결과를 확정하고 종료한다.
- 추가 피드백이 있으면 Step 5-1로 복귀하여 루프를 반복한다.
- 최대 반복 횟수: 3회 (초과 시 Human에게 알리고 현재 결과로 확정)

# Output
- Step별 전체 작업 요약
  - Step 1. subagent 위임 내역 (Scope, Domain, Request)
  - Step 2. 결과 수합 요약
  - Step 3. 검증 체크리스트 결과
  - Step 4. 최종 분석 결과
  - Step 5. 피드백 루프 결과 (피드백 횟수, 재실행 Scope, 최종 승인 여부)

# Next Skills
| 후속 Skill | 조건 | 입력 매핑 |
|---|---|---|
| skill_test_scenario | 테스트 시나리오 보완 시 | 분석 대상 → $$target |
| skill_guide_doc | 분석 결과 문서화 시 | 분석 대상 → $$source_path |
