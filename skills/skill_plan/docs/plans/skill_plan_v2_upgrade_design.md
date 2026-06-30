# skill_plan v2 — 설계 기록 (Design Record)

> 작성: 2026-06-29 · 상태: 적용 완료 · 근거: `contents-manager/docs/plans/v1` 역설계
> 본 문서는 skill_plan v2 업그레이드의 **이유와 최종 구조**를 보관한다. 실제 규약은 `references/`, agent 정의는 `agents/plan_*.md`, 오케스트레이션은 `SKILL.md`가 정본.

---

## 1. 왜 (Context)

v1(`contents-manager/docs/plans/v1`)은 14문서 체계(논리 서사 순 + 표준 골격 + ID 교차참조 + 추적성)지만, 이는 skill_plan이 만든 게 아니라 **사람이 v0(7 플랫 산출)를 수작업으로 갈아끼운 것**이었다. 재구성 로그의 대부분이 **"식별자 정합 / FR 33→34 / 카테고리 재편"** — 즉 **각 agent가 식별자를 병렬로 독립 생성해 어긋나는 것**이 반복 비용의 근원이었다.

v2의 목표: (a) v1 14문서 구조를 **자동 산출**, (b) 식별자 어긋남을 **예방형**으로 구조 차단.

## 2. 무엇이 바뀌었나 (4축)

```
[축1] 신규 producer   05 기능정의 · 11 테스트 · 12 로드맵 (신규 agent) + 01 개요·13 후속·INDEX (합성)
[축2] 인터페이스 분리  07(IA·화면)  +  08(API·DTO)
[축3] 표준 문서 골격   §0 개요 → §1 한눈에 → §2~ 상세 → 문서메타  (references/plan_doc_skeleton.md)
[축4] 식별자 + 추적성  FR/NFR/FN/UT/P/BS/JM/SC/ENT/RISK + 8공통카테고리 + 레지스트리 (references/plan_id_system.md)
```

agent 로스터: **7 → 11**. (신규 4: function_specifier·api_designer·test_strategist·roadmap_planner / interface_designer는 화면 전담으로 축소 / 기존 6 보강)

## 3. 핵심: 예방형 식별자 정합 (축4)

**단일 원천 레지스트리 + 직렬화 + 검증 게이트.**

- **레지스트리**: 04가 8카테고리 + FR/NFR을 확정해 freeze → 오케스트레이터가 보유하는 단일 원천. 각 agent엔 불변 슬라이스 `$$id_registry`로 전달, 산출에서 신규 ID만 회수해 append. **상위 ID 재번호 금지(참조 전용).**
- **직렬화**: `req_analyzer(04) → function_specifier(05)`. 05는 frozen FR을 입력으로만 받는다.
- **FR↔FN = 1:N + 전수 커버리지(불변식)**: 한 FR이 여러 FN으로 전개될 수 있고, **FN 없는 FR은 존재 불가**. 고아 FN도 금지. (사용자 확정 사항)
- **검증 게이트**(오케스트레이터, 출력 직전): 전수 커버리지·고아·중복·카테고리 정합·추적성 매트릭스 무결성 점검 → 결손 시 해당 agent만 재실행.

## 4. 파이프라인 (요약)

```
04 req(시드) → 05 fn(직렬) → {03 user, 02 market} → 06 behavior
   → 07 interface(SC) → 08 api → {09 db(ENT), 10 tech(RISK)}
   → {11 test, 12 roadmap} → [검증 게이트] → [합성 01·13·INDEX]
```

상세 DAG·의존·Step은 `SKILL.md`의 `### Pipeline`·`## Step 2~13` 참조.

## 5. 사용자 확정 사항 (의사결정 기록)

| # | 결정 |
|---|---|
| 인덱스 파일명 | `plan.md` 아님 → **`INDEX.md`** |
| agent 로스터/분리 | 채택 (신규 4 + interface 분리) |
| 골격·ID·추적성 규약 | 채택 (references 2벌) |
| FR↔FN 식별자 정합 | **예방형**(레지스트리+직렬화+게이트), 대응은 **1:N**, FN 없는 FR 불가 |
| depth 잔여 | light/standard에서 11·12는 골격, deep에서 full |
| 산출 위치 | `$$output_target`에 `INDEX.md`+`NN_*.md` 평면 (버전 폴더 강제 안 함) |
| v0 호환 | legacy 모드 없이 v2 대체 |
| 요구사항 정의 회의 | **하이브리드 3라운드**(Step 2) — 오케스트레이터 상세 회의(2-1) → agent 정형화(2-2) → 보완 질문 라운드(2-3). requirement_analyzer는 발명자→**정형화기**, `$$requirements_brief` 입력 + `CLARIFY`(확인 질문·가정) 반환 |

## 6. 구성 파일

```
references/plan_doc_skeleton.md      문서 4단 골격
references/plan_id_system.md         ID·카테고리·레지스트리·검증 게이트
agents/plan_requirement_analyzer.md  04 (레지스트리 시드)   [보강]
agents/plan_function_specifier.md    05 (FR→FN)             [신규]
agents/plan_user_classifier.md       03                     [보강]
agents/plan_competitor_researcher.md 02                     [보강]
agents/plan_behavior_designer.md     06                     [보강]
agents/plan_interface_designer.md    07 (화면 전담)         [보강·축소]
agents/plan_api_designer.md          08                     [신규]
agents/plan_db_modeler.md            09                     [보강]
agents/plan_tech_researcher.md       10                     [보강]
agents/plan_test_strategist.md       11                     [신규]
agents/plan_roadmap_planner.md       12                     [신규]
SKILL.md                             오케스트레이션          [개정]
```
