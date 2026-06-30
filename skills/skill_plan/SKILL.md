---
name: skill_plan
description: 기획팀 역할을 수행하는 오케스트레이터 스킬. 러프한 아이디어를 입력받아 11개의 subagent를 단계적으로 지휘하여 v1 14문서 기획 산출물(논리 서사 순 + 표준 골격 + 식별자 추적성)을 도출한다. 다음 상황에서 반드시 발동한다. case1. "기획", "플래닝" 관련 문자열 포함 요청. case2. "아이디어 구체화", "요구사항 정리" 요청. case3. "서비스 기획", "신규 서비스" 관련 요청.
---
# Role
여러 subagent를 조율하는 기획 오케스트레이터.
직접 분석하거나 상세 산출물을 작성하지 않는다. 단, **레지스트리 관리·검증 게이트·합성 문서(01·13·INDEX)**는 오케스트레이터가 수행한다.
반드시 각 단계에 해당하는 subagent에게 위임한다.

# 공통 규약 (산출물 형태·식별자)
모든 산출물은 아래 2개 reference 규약을 따른다. subagent에게도 이 경로를 전달한다.
- `references/plan_doc_skeleton.md` — 문서 4단 표준 골격(§0 개요 / §1 한눈에 / §2~ 상세 / 문서메타)
- `references/plan_id_system.md` — ID 네임스페이스 10종 · 8공통카테고리(FR↔FN 공유) · 레지스트리 운영 · 추적성 매트릭스 · 검증 게이트

# Variables
- $$idea: 사용자의 러프한 아이디어 텍스트 (user input, 필수)
- $$output_mode: 출력 방식 (user input, default: "console") — console / file / notion
- $$output_target: 출력 대상 (file path 또는 Notion URL, file·notion 시 필수)
- $$exclude: 제외할 기획 단계 (agent 번호 또는 이름, default: 없음)
- $$depth: 기획 깊이 (user input, default: "standard") — light / standard / deep
- $$requirements_brief: **(내부 상태)** Step 2-1 오케스트레이터 상세 회의에서 사용자와 합의한 요구사항 브리프. Step 2-2에서 requirement_analyzer의 정형화 1차 근거로 전달.
- $$id_registry: **(내부 상태, 오케스트레이터 보유)** 8공통카테고리 + 발번된 전 ID의 단일 원천. Step 2에서 시드, 이후 각 단계 산출에서 신규 ID를 회수해 append. 하위 agent에는 관련 슬라이스를 **불변 입력**으로 전달.

## Subagents
| # | Name | 문서 | 역할 | 발번 ID |
|---|---|---|---|---|
| 1 | plan_requirement_analyzer | 04 | 요구사항 FR/NFR + 8카테고리·레지스트리 시드 | FR·NFR·카테고리 |
| 2 | plan_function_specifier | 05 | FR/NFR→FN 전개 (1:N, FR 전수 커버리지) | FN |
| 3 | plan_user_classifier | 03 | 사용자 유형·페르소나 (RBAC 권한 조합) | UT·P |
| 4 | plan_competitor_researcher | 02 | 시장 분석 · Build vs Buy | — |
| 5 | plan_behavior_designer | 06 | 행동 시나리오 · Journey Map | BS·JM |
| 6 | plan_interface_designer | 07 | IA · 화면 명세 · 흐름 · UX | SC |
| 7 | plan_api_designer | 08 | REST API · DTO 계약 | — |
| 8 | plan_db_modeler | 09 | ERD · 엔티티 · 동적 스키마 | ENT |
| 9 | plan_tech_researcher | 10 | 기술 스택 · 아키텍처 · 리스크 · PoC | RISK |
| 10 | plan_test_strategist | 11 | 테스트 · QA 전략 | — |
| 11 | plan_roadmap_planner | 12 | 실행 로드맵 · 일정 | — |

> 합성 문서(오케스트레이터 직접): `01_overview` · `13_followups` · `INDEX.md`.

### Pipeline
```
[사용자 입력: $$idea] ─▶ [Step 2 요구사항 정의 — 하이브리드 3라운드]
                         2-1 오케스트레이터 상세 회의 ─(요구사항 브리프)─┐
                         2-2 ① requirement_analyzer (04) 정형화 ◀────────┘
                               ├─ 8 카테고리 FREEZE · FR/NFR ─── REGISTRY SEED
                               └─ 확인 질문·가정 ─▶ 2-3 보완 라운드 ─▶ 확정
                                      │  [직렬화: FN은 frozen FR을 입력으로만]
                                      ▼
                          ② function_specifier (05)  FR→FN(1:N), 모든 FR ≥1 FN
                                      │  registry += FN
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                          │  (FR/FN 카테고리 무관 → 병렬)
   ③ user_classifier (03)   ④ competitor (02)                    │
      registry += UT/P                                            │
            └─────────────┬───────────────────────────────────────┘
                          ▼
                  ⑤ behavior_designer (06)   registry += BS/JM
                          ▼
                  ⑥ interface_designer (07)  registry += SC   (참조: FR/FN/UT)
                          ▼
                  ⑦ api_designer (08)        (참조: FR/FN/SC)
            ┌─────────────┴─────────────┐
            ▼                           ▼
   ⑧ db_modeler (09)            ⑨ tech_researcher (10)
      registry += ENT                registry += RISK
            └─────────────┬─────────────┘
            ┌─────────────┴─────────────┐
            ▼                           ▼
   ⑩ test_strategist (11)       ⑪ roadmap_planner (12)
            └─────────────┬─────────────┘
                          ▼
        오케스트레이터:
        [검증 게이트] ID 무결성(전수커버리지·고아·중복·카테고리·추적성) → 결손 시 해당 agent만 재실행
        [합성] 01_overview · 13_followups · INDEX.md (+ 추적성 매트릭스 SC·ENT 열 완성)
```

### Constraints for Subagents
- subagent는 서로의 컨텍스트를 공유하지 않는다. 데이터 전달은 반드시 오케스트레이터를 통한다.
- **레지스트리 불변 규칙**: 어떤 subagent도 상위 ID를 재번호·재배정하지 않는다(참조 전용). 자기 네임스페이스의 신규 ID만 발번하고 `REGISTRY_APPEND` 블록으로 반환한다.
- **직렬 의존**: `requirement_analyzer(04) → function_specifier(05)`는 데이터 의존으로 직렬화. 05는 frozen FR을 입력으로만 받는다.
- $$depth 값은 모든 subagent에 전달되어 상세 수준을 결정한다. `light/standard`에서 11·12는 골격(skeleton)으로, `deep`에서 full로 산출한다.

# Error Handling
- 공통 규칙은 `rules/rule_error_handling_common.md`를 따른다.
- $$idea 미제공 → 재요청, Step 0 복귀.
- $$exclude로 후속 agent 입력 부족 → Human 보고 후 진행 여부 확인.
- subagent 실패 → 해당 단계 스킵, 보고 후 진행. 병렬 일부 실패 → 성공분만 수집, 실패 보고.
- **검증 게이트 실패**(전수 커버리지 결손·고아 참조 등) → 원인 agent만 재실행 후 재검증.

---
# Action
## Rules
- skill 발동 즉시 frontmatter·Variables·Steps를 파싱하여 Quick Help(`rules/rule_skill_execution_protocol.md` 형식)로 출력 후 첫 Step 진행.
- 각 Step 완료 시 결과를 Step 결과 보고 형식으로 요약 제시.
- Human의 "진행 / 수정 / 중단" 확인 후 다음 Step 진행. "수정"은 해당 Step 내 수정 후 재요약, "중단"은 현재까지 Output 정리 후 종료.

## Step 0. 요구사항 회의 (Human-in-the-Loop)
`rules/rule_variable_collection.md`에 따라 $$idea·$$output_mode·$$output_target·$$exclude·$$depth를 수집하고, 목적·범위·타겟·제약을 구체화해 요구사항 확인서로 **최종 승인**을 받는다.

## Step 1. Make Plan (Human Confirm)
$$idea 요약 · 실행 subagent 목록($$exclude 반영) · 파이프라인 순서·병렬·직렬·레지스트리 흐름 · $$depth 산출 수준 · 출력 방식을 제시하고 확인받는다.

## Step 2. 요구사항 정의 (하이브리드 회의) + 레지스트리 시드
요구사항은 **오케스트레이터 상세 회의 → agent 정형화 → 보완 질문 라운드**의 3-라운드로 확정한다. (요구사항 정의는 자동 생성이 아니라 사용자와의 회의로 도출한다.)

### 2-1. 오케스트레이터 상세 회의 (Human-in-the-Loop)
이 세션(오케스트레이터)이 사용자와 직접 **세밀한 요구사항 Q&A 회의**를 진행한다. 핵심 기능을 **하나씩** 짚고 범위 경계·우선순위(MoSCoW)·주요 엣지·제약을 구체화한다(Step 0의 방향성 합의보다 기능 단위로 깊게). 사용자가 승인하는 **요구사항 브리프**($$requirements_brief)를 만든다.
- $$depth 연동: light=핵심 기능 위주 1~2회, standard=주요 기능 라운드, deep=전 기능·엣지·제약 철저히.

### 2-2. agent 정형화
- `plan_requirement_analyzer`(04)에 위임. 전달: $$idea, **$$requirements_brief**, $$depth.
- agent는 브리프를 **FR/NFR/8카테고리로 정형화**(발명이 아닌 정형화)하고, 도메인 리서치로 빈틈을 보완하며, **확인 필요 질문·가정**을 함께 반환한다.
- 산출의 `REGISTRY_SEED`로 **$$id_registry를 시드**한다.

### 2-3. 보완 질문 라운드 & 확정
- agent가 반환한 **확인 필요 질문·가정**을 사용자에게 제시(AskUserQuestion/대화)하고 답을 받는다.
- 답이 FR/NFR에 영향을 주면 04를 패치(필요 시 agent 재실행)해 반영하고, 사용자 **최종 승인**으로 요구사항을 확정한다. (승인 전 다음 Step 진행 금지)

## Step 3. 기능 정의 (직렬)
- `plan_function_specifier`(05)에 위임. 전달: 04 결과(frozen FR/NFR), $$id_registry 슬라이스(categories·FR·NFR), $$depth.
- 결과: FN(FR 전수 커버리지). `REGISTRY_APPEND`(FN)를 회수해 레지스트리에 추가.

## Step 4. 사용자 유형 분류 + 시장 조사 (병렬)
- 4-A `plan_user_classifier`(03): $$idea, 04, $$id_registry, $$depth → UT/P. (registry += UT/P)
- 4-B `plan_competitor_researcher`(02): $$idea, 04, $$depth → 시장 분석.

## Step 5. 행동패턴 설계
- `plan_behavior_designer`(06): 04, 03(UT/P), 05(FN), $$id_registry, $$depth → BS/JM. (registry += BS/JM)

## Step 6. 인터페이스 — IA·화면
- `plan_interface_designer`(07): 04, 05, 03, 06, $$id_registry, $$depth → IA·SC·흐름·UX. (registry += SC) FR 커버리지 확인.

## Step 7. API·DTO 계약
- `plan_api_designer`(08): 04, 05, 07(SC), $$id_registry, $$depth → REST·DTO.

## Step 8. DB 모델링 + 기술 스펙 (병렬)
- 8-A `plan_db_modeler`(09): 04, 05, 07, 08, $$id_registry, $$depth → ERD·ENT. (registry += ENT) FR 커버리지.
- 8-B `plan_tech_researcher`(10): 04, 07, 09, $$id_registry, $$depth → 스택·RISK. (registry += RISK) NFR 검증.

## Step 9. 테스트 + 로드맵 (병렬)
- 9-A `plan_test_strategist`(11): 04(AC), 05, 06, 07, $$depth → 테스트·QA.
- 9-B `plan_roadmap_planner`(12): 04, 05, 09, 10(RISK), $$depth → 로드맵·일정(FR 전수 매핑).

## Step 10. 검증 게이트 (오케스트레이터)
`plan_id_system.md §7` 체크리스트로 ID 무결성을 점검한다:
- FR 전수 커버리지(FN 없는 FR 0)·고아 FN 0(FR·NFR 둘 다 없는 FN)·(FR 소급분) FR↔FN 카테고리 일치·FR/NFR 재번호 0·고아 참조 0·중복 0·FR↔SC/ENT 커버리지·추적성 매트릭스 행 누락 0.
- 결손 시 원인 agent만 재실행 후 재검증. (`rules/rule_verification_checklist.md` 병행)

## Step 11. 합성 (오케스트레이터)
- `01_overview`: 핵심 컨셉 N축·범위·제약·성공기준 합성.
- `13_followups`: 각 agent가 남긴 미결·PoC 권고 취합 + FR/NFR 매핑.
- `INDEX.md`: 한 줄 정의·핵심 컨셉·문서 구성표·권장 읽기 순서·요약 지표·문서 메타. **추적성 매트릭스(05 §2)의 SC·ENT 열을 07·09 결과로 완성**한다.

## Step 12. 산출물 출력
$$output_mode에 따라 14문서(`INDEX.md` + `01~13`)를 출력한다. (`rules/rule_output_mode.md`)
- console: 단계별 구조화 출력 / file: $$output_target에 `INDEX.md`+`NN_*.md` 저장 / notion: Notion 페이지.

## Step 13. 최종 리뷰 & 피드백 루프
`rules/rule_feedback_loop.md`에 따라 피드백 수집 → 영향 범위 분석 → 선택적 재실행(레지스트리·추적성 일관성 전파) → 반복 판정. Human 승인 시 확정.

# Output
- Step별 작업 요약 + 14문서 산출 결과.
- 핵심 지표: FR/NFR 수, FN 수, UT/P, BS/JM, SC, ENT, RISK 수, **FR 전수 커버리지·추적성 매트릭스 무결성**, 출력 위치.

# Next Skills
| 후속 Skill | 조건 | 입력 매핑 |
|---|---|---|
| skill_build | 기획 산출물 완성 시 | 산출 디렉토리 → $$planning_path |
| skill_sampler | 샘플 프로젝트 필요 시 | 산출 디렉토리 → $$plan_path |
