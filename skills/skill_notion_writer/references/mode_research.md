---
name: mode_research
description: skill_notion_writer 의 research 모드 상세 reference. $$mode=research 확정 시 Step 0-1 에서 로드. 특정 개념/주제+요구사항을 조사·검색하여 TEMPLATE 형식으로 작성한다.
type: reference
---

# research 모드 (skill_notion_writer)

> 특정 개념/주제와 요구사항을 받아 자료를 능동 조사·선별하여 $$template_page 구조로 작성한다. $$mode=research 확정 시 본 reference 를 로드하여 변수·절차·규칙·검증을 적용한다.

## 변수
- $$research_topic: 조사 대상 특정 개념/주제 (필수, user input)
- $$research_requirements: 조사 시 충족할 요구사항·범위·강조점 (필수, user input)

## Step 1 절차 (자료 조사)
$$research_topic 과 $$research_requirements 를 기준으로 자료를 능동 조사·선별한다. SKILL.md 1-C 공통 추출 전략을 적용한다.

- 조사 계획 수립
  - $$research_requirements 를 충족할 하위 질문·조사 항목으로 분해
  - $$template_page 섹션 구조를 미리 파악하여 섹션별로 필요한 자료 항목 도출
- 자료 조사 (도구)
  - context7 MCP: 라이브러리·프레임워크·SDK 공식 문서 조회 (기술 스택 주제)
  - WebSearch + WebFetch: 일반 웹 자료 검색 후 본문 retrieve (범용 주제·보강)
  - 도구 선택: 기술 스택이면 context7 우선, 그 외/보강은 WebSearch+WebFetch
- 자료 선별·검증
  - 1-C 추출 전략(Prioritize·Summarize·Preserve·Highlight) 적용
  - 출처가 확인된 사실만 채택, 미확인 내용은 추측으로 채우지 않음
  - 상충 자료는 양시각 병기 또는 1차 출처 우선
  - 채택 자료의 출처(URL·문서명)를 항목별로 보존 → 페이지 "참고 자료" 섹션에 명시
- 산출: $$template_page 섹션 구조에 매핑할 조사 결과 묶음

## 규칙
- 자료 조사는 context7 MCP·WebSearch·WebFetch 로 수행 (기술 스택이면 context7 우선, 그 외/보강은 WebSearch+WebFetch)
- 출처가 확인된 사실만 채택하며 추측·창작으로 내용을 채우지 않음 (자료 부족 시 Error Handling 절차)
- 생성된 페이지에는 반드시 조사 출처(URL·문서명)를 "참고 자료" 섹션에 항목별 명시

## Error Handling
- **조사 결과 빈약** (자료 부족·검색 0건): 사용자에게 보고 후 (a) $$research_topic·$$research_requirements 구체화, (b) 추가 출처/키워드 제공, (c) 확보된 범위만 우선 작성 중 선택. 추측으로 보간 금지.
- **조사 자료 상충**: 출처 간 충돌을 사용자에게 보고하고 1차 출처 우선 또는 양시각 병기 여부 확인.

## Completeness 추가 항목 (Step 5)
- [ ] 조사 출처(URL·문서명)가 "참고 자료" 섹션에 항목별 명시되었는가?
- [ ] 추측·창작 없이 확인된 사실만으로 작성되었는가?
