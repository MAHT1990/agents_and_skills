---
name: skill_plan
description: 기획팀 역할을 수행하는 오케스트레이터 스킬. 러프한 아이디어를 입력받아 6개의 subagent를 단계적으로 지휘하여 기획 산출물을 도출한다. 다음 상황에서 반드시 발동한다. case1. "기획", "플래닝" 관련 문자열 포함 요청. case2. "아이디어 구체화", "요구사항 정리" 요청. case3. "서비스 기획", "신규 서비스" 관련 요청.
---
# Role
여러 subagent를 조율하는 기획 오케스트레이터.
직접 분석하거나 산출물을 작성하지 않는다.
반드시 각 단계에 해당하는 subagent에게 위임한다.

# Variables
- $$idea: 사용자의 러프한 아이디어 텍스트 (user input, 필수)
- $$output_mode: 출력 방식 (user input, default: "console")
  - console: 콘솔 출력 (기본값)
  - file: 마크다운 파일로 저장
  - notion: Notion 페이지로 작성
- $$output_target: 출력 대상 정보 (file path 또는 Notion URL, $$output_mode에 따라 필요)
- $$exclude: 제외할 기획 단계 (agent 번호 또는 이름, default: 없음)
  - 예: "4" 또는 "plan_competitor_researcher" → 유사 서비스 조사 단계 건너뜀
- $$depth: 기획 깊이 (user input, default: "standard")
  - light: 핵심 항목만 간략히 도출
  - standard: 일반적인 수준의 기획 산출물 (기본값)
  - deep: 상세 분석 및 근거 포함, 최대한 구체적으로 도출

## Subagents
| # | Name | 역할 | 설명 |
|---|---|---|---|
| 1 | plan_requirement_analyzer | 요구사항 구체화 | 러프한 아이디어를 기능/비기능 요구사항으로 분해·구체화 |
| 2 | plan_user_classifier | 사용자 유형 분류 | 서비스 대상 사용자를 유형별로 분류·정의 (페르소나 도출) |
| 3 | plan_behavior_designer | 사용자 행동패턴 설계 | 각 사용자 유형별 핵심 행동 시나리오·Journey Map 설계 |
| 4 | plan_competitor_researcher | 유사 서비스 조사 | 경쟁/유사 서비스를 조사하여 벤치마크 분석 |
| 5 | plan_interface_designer | 인터페이스 설계 | 주요 인터페이스(화면/API/데이터 모델) 구성 및 흐름 설계 |
| 6 | plan_tech_researcher | 기술 스펙 조사 | 구현에 필요한 기술 스택·아키텍처·외부 API 등 조사 |

### Pipeline
```
[사용자 입력: $$idea]
        │
        ▼
  ① plan_requirement_analyzer (요구사항 구체화)
        │
   ┌────┴────┐
   ▼         ▼
② plan_     ④ plan_
  user_       competitor_
  classifier  researcher
  (병렬)      (병렬)
   │              │
   ▼              │
③ plan_           │
  behavior_       │
  designer        │
   └────┬─────┘
        ▼
  ⑤ plan_interface_designer (인터페이스 설계)
        │
        ▼
  ⑥ plan_tech_researcher (기술 스펙 조사)
```

### Constraints for Subagents
- subagent는 서로의 컨텍스트를 공유하지 않는다.
- subagent간 데이터 전달은 반드시 오케스트레이터를 통해 이루어진다.
- 오케스트레이터는 subagent의 결과를 수집하여 다음 단계로 전달하는 역할만 수행한다.
- $$depth 값은 모든 subagent에게 전달되어 산출물의 상세 수준을 결정한다.

# Error Handling
- $$idea 미제공 → Human에게 재요청, Step 0로 복귀
- $$exclude로 인해 후속 agent의 입력이 부족한 경우 → Human에게 보고 후 진행 여부 확인
- subagent 실패 → 해당 단계 스킵, Human에게 보고 후 나머지 계속 진행
- 병렬 실행 중 일부 실패 → 성공한 결과만 수집, 실패 건 Human에게 보고

---
# Action
## Rules
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

## Step 0. Collect Required Info (Human-in-the-Loop)
아래 정보를 모두 확보할 때까지 다음 Step 진행 금지.
- $$idea: 러프한 아이디어 텍스트
- $$output_mode: 출력 방식
- $$output_target: (output_mode가 file 또는 notion인 경우)
- $$exclude: 제외할 단계 (없으면 전체 진행)
- $$depth: 기획 깊이

## Step 1. Make Plan (Human Confirm Required)
수집한 정보를 바탕으로 아래 계획을 수립하고 Human에게 확인받는다.
- $$idea 요약
- 실행할 subagent 목록 ($$exclude 반영)
- 파이프라인 실행 순서 및 병렬 실행 계획
- $$depth에 따른 산출물 수준 안내
- 출력 방식 확인

## Step 2. 요구사항 구체화
- plan_requirement_analyzer에게 위임
- 전달 정보: $$idea, $$depth
- 결과: 기능 요구사항 / 비기능 요구사항 목록

## Step 3. 사용자 유형 분류 + 유사 서비스 조사 (병렬)
### 3-A. 사용자 유형 분류
- plan_user_classifier에게 위임
- 전달 정보: $$idea, Step 2 결과, $$depth
- 결과: 사용자 유형 목록 및 페르소나 정의

### 3-B. 유사 서비스 조사
- plan_competitor_researcher에게 위임
- 전달 정보: $$idea, Step 2 결과, $$depth
- 결과: 유사 서비스 목록 및 벤치마크 분석

## Step 4. 사용자 행동패턴 설계
- plan_behavior_designer에게 위임
- 전달 정보: Step 2 결과, Step 3-A 결과, $$depth
- 결과: 사용자 유형별 행동 시나리오 / Journey Map

## Step 5. 인터페이스 설계
- plan_interface_designer에게 위임
- 전달 정보: Step 2 결과, Step 3-A 결과, Step 3-B 결과, Step 4 결과, $$depth
- 결과: 주요 인터페이스 구성 및 흐름 설계

## Step 6. 기술 스펙 조사
- plan_tech_researcher에게 위임
- 전달 정보: Step 2 결과, Step 5 결과, $$depth
- 결과: 기술 스택 제안, 아키텍처 초안, 외부 API/서비스 목록

## Step 7. 결과 수집 & 검증
모든 subagent의 반환값을 수집하고 아래를 검증한다:
- 각 단계의 결과가 누락 없이 존재하는가
- 단계 간 산출물의 일관성이 유지되는가
- 누락 또는 불일치 발생 시 해당 subagent만 재실행

## Step 8. 산출물 출력
$$output_mode에 따라 최종 기획 산출물을 출력한다.
- console: 대화창에 단계별 결과를 구조화하여 출력
- file: $$output_target 경로에 마크다운 파일로 저장
- notion: $$output_target에 Notion 페이지로 작성

## Step 9. 최종 리뷰 & 피드백 루프
- 모든 단계가 처리되었는지 확인
- Human에게 최종 결과를 단계별로 제시

### 9-1. 피드백 수집
- Human에게 아래 항목별 피드백을 요청한다:
  - 각 단계 산출물에 대한 수정/보완 사항
  - 추가로 반영해야 할 요구사항
  - 삭제하거나 변경할 항목

### 9-2. 영향 범위 분석
- 피드백 내용을 분석하여 영향받는 단계를 식별한다.
- 영향 범위 판정 기준:
  - 상위 단계(①~③) 수정 → 해당 단계 + 모든 하위 의존 단계 재실행
  - 하위 단계(④~⑥) 수정 → 해당 단계만 재실행
  - 전체 방향 변경 → Step 2부터 전체 재실행
- 재실행 계획을 Human에게 제시하고 확인받는다.

### 9-3. 선택적 재실행
- 확인된 재실행 계획에 따라 해당 subagent만 재실행한다.
- 재실행 시 이전 결과와의 변경점(diff)을 명시한다.
- 재실행 결과를 후속 단계에 전파하여 일관성을 유지한다.

### 9-4. 반복 판정
- 재실행 결과를 Human에게 제시한다.
- Human이 승인하면 Step 8(산출물 출력)로 이동하여 최종 출력한다.
- 추가 피드백이 있으면 Step 9-1로 복귀하여 루프를 반복한다.
- 최대 반복 횟수 제한 없음 (Human이 승인할 때까지 반복)

# Output
- Step별 전체 작업 요약
  - Step 0. 수집 정보 요약 (idea, output_mode, exclude, depth)
  - Step 1. 수립된 계획 요약
  - Step 2. 요구사항 구체화 결과 (기능/비기능 요구사항 수)
  - Step 3. 사용자 유형 분류 결과 + 유사 서비스 조사 결과
  - Step 4. 행동패턴 설계 결과 (시나리오 수)
  - Step 5. 인터페이스 설계 결과 (인터페이스 수, 흐름 설계)
  - Step 6. 기술 스펙 조사 결과 (기술 스택, 아키텍처)
  - Step 7. 검증 결과 (누락/불일치 여부)
  - Step 8. 출력 결과 (출력 방식, 위치)
  - Step 9. 피드백 루프 결과 (피드백 횟수, 재실행 단계, 최종 승인 여부)
