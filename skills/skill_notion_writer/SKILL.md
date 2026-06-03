---
name: skill_notion_writer
description: 마크다운 기술 문서(파일/디렉토리)·외부 기술 문서 URL을 요약·변환(summarize 모드)하거나, 특정 개념/주제와 요구사항을 받아 자료를 조사·검색(research 모드)하여, Notion 템플릿 형식에 맞춰 구조화된 Notion 페이지로 생성하는 스킬. 발동조건1. 마크다운/문서를 Notion에 정리 요청받은 경우. 발동조건2. 기술 문서의 Notion 페이지 생성을 요청받은 경우. 발동조건3. 외부 URL(기술 문서/공식 문서/튜토리얼)을 Notion에 정리 요청받은 경우. 발동조건4. 특정 개념/주제와 요구사항을 받아 자료를 조사하여 Notion 페이지로 정리 요청받은 경우.
---

# Variables

## 분기 변수 (최우선 수집)
- $$mode: 작업 모드 (필수, Step 0-1 에서 가장 먼저 확정)
  - summarize: 마크다운 파일/디렉토리·외부 URL 문서를 요약·변환
  - research: 특정 개념/주제 + 요구사항을 조사·검색하여 TEMPLATE 형식으로 작성
  - 하위호환: $$mode 미지정 + $$source_input 이 파일/URL 이면 summarize 자동 추론

## 공통 변수 (모드 무관)
- $$parent_page: Notion 부모 페이지 이름 (필수, user input)
- $$page_title: 생성할 페이지 제목 (선택, 미지정 시 소스 문서 제목·$$research_topic 에서 추출)
- $$global_rule_page: Notion 템플릿 전역규칙 페이지명 (선택, default: "TEMPLATEs>")
- $$template_page: Notion 템플릿 페이지명 (선택, default: "TEMPLATEs> STUDY") — '정해진 TEMPLATE'의 출처
- $$flowchart_page: mermaid 다이어그램 참고 페이지명 (선택, default: "TEMPLATEs> FLOWCHART")

## 모드별 변수
- $$mode 확정 후 로드되는 `$$mode_ref` 에 정의됨 (Progressive Disclosure)
  - summarize → `mode_summarize.md`: $$source_input, $$source_type, $$target_tech
  - research → `mode_research.md`: $$research_topic, $$research_requirements

# References
- $$notion-enhanced-markdown = "./references/notion-enhanced-markdown.md"
- $$mode_ref = "./references/mode_{$$mode}.md" — Progressive Disclosure. $$mode 확정 직후 Step 0-1 에서 로드하여 모드별 변수·Step 1 절차·규칙·Error·검증 항목을 적용한다.

# Rules

## 공통 규칙 (전 모드)
- Notion MCP 도구(notion-search, notion-fetch, notion-create-pages, notion-update-page)를 사용
- $$global_rule_page 가 지정된 경우, 전역규칙을 반드시 따를 것
- $$template_page 가 지정된 경우, 템플릿의 섹션 구조를 반드시 따를 것
- 플로우차트 다이어그램 작성 시, $$flowchart_page 지시사항을 반드시 따를 것
- 소스의 코드 블록, 다이어그램, 테이블 등은 $$notion-enhanced-markdown 스펙에 따라 변환
- 페이지 생성/수정 전 MCP 리소스 `notion://docs/enhanced-markdown-spec`를 권위 스펙으로 확인 (로컬 $$notion-enhanced-markdown 보다 우선, 충돌 시 MCP 스펙 적용). callout=`<callout>` 태그, toggle=`<details>`/`{toggle="true"}` 헤딩+자식 들여쓰기, 코드블록 밖 특수문자 이스케이프 준수
- 페이지 생성 전 사용자 확인(Q&A) 필수
- 코드 syntax / API 시그니처 / 함수 파라미터는 원형 그대로 보존하며 임의 축약/번역 금지
- 버전 정보(릴리스 버전, 호환 버전, deprecated 표기)는 원문에 존재할 경우 반드시 페이지에 보존
- 한국어로 설명을 작성하되, 기술 용어/식별자는 원어(영문)를 유지

## 모드별 규칙
- $$mode_ref 의 `## 규칙` 섹션을 로드하여 추가 적용 (summarize: WebFetch·URL 출처 / research: 조사 도구·사실검증·출처 명시)

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
아래 정보를 모두 확보할 때까지 회의 단계로 진행하지 않는다.

**(1) $$mode 확정 (분기 기준, 최우선)**
- $$mode: summarize / research 중 하나
  - 미지정 시: $$source_input 이 파일/URL 이면 summarize 자동 추론, 그 외 사용자에게 질의

**(2) $$mode_ref 로드 (Progressive Disclosure)**
- `./references/mode_{$$mode}.md` 를 읽어 모드별 변수·절차·규칙·Error·검증 항목을 확보

**(3) 공통 변수 수집**
- $$parent_page: Notion 부모 페이지 이름 (필수, 능동 수집)
- $$page_title: 생성할 페이지 제목 (선택)
- $$global_rule_page / $$template_page / $$flowchart_page: default 보유 → 미지정 시 자동 적용 (능동 질의 안 함)

**(4) 모드별 변수 수집**
- $$mode_ref 의 `## 변수` 에 정의된 필수 변수만 능동 수집 (타 모드 변수는 질의하지 않음)

### 0-2. 요구사항 구체화 회의
수집된 변수를 바탕으로 Human과 회의하여 아래 사항을 구체화한다.
Human이 최종 승인할 때까지 회의를 반복한다.
- Notion 페이지 생성의 목적과 대상 독자
- 템플릿 적용 여부 및 커스터마이즈 범위
- 단일 페이지 vs 다중 페이지 선호
- 소스/조사 결과에서 특별히 강조할 내용

### 0-3. 최종 승인
확정된 요구사항을 요구사항 확인서 형식으로 Human에게 제시하고 **최종 승인**을 받는다.
승인 없이 다음 Step으로 진행하지 않는다.
"수정" 시, 0-2(회의)로 돌아가 재논의 후 다시 승인을 요청한다.

## Step 1. 소스 분석/조사
> $$mode_ref 의 `## Step 1 절차` 를 수행하고, 아래 1-C 공통 추출 전략을 적용한다.

- $$mode = summarize → `mode_summarize.md` 의 markdown_file / url 서브모드 절차
- $$mode = research → `mode_research.md` 의 자료 조사·선별 절차

### 1-C. 콘텐츠 추출 전략 (전 모드 공통)
- **Prioritize**: 가장 가치 있고 실행 가능한(actionable) 정보를 우선 선별
- **Summarize**: 장황한 설명은 기술적 정확성을 보존한 채 응축
- **Preserve**: 코드 예제 / API 시그니처 / 설정 디테일은 원형 유지(번역/축약 금지)
- **Highlight**: 중요 경고, deprecation 안내, best practice 는 별도 강조 블록으로 표시

## Step 2. Notion 페이지 탐색
- notion-search로 $$parent_page 검색 → ID 확보
- $$global_rule_page 지정 시, notion-search + notion-fetch로 전역규칙 파악
- $$template_page 지정 시, notion-search + notion-fetch로 템플릿 구조 파악
- $$flowchart_page 지정 시, notion-search + notion-fetch로 다이어그램 템플릿 파악
- 동일 제목 기존 페이지 존재 여부 확인

## Step 3. 사용자 Q&A
- 페이지 제목 확인
- 단일 페이지 vs 다중 페이지(챕터별) 선택
- 템플릿 섹션별 매핑 계획 제시 및 확인
- 기존 페이지 존재 시 덮어쓰기/수정/신규 선택

## Step 4. 콘텐츠 매핑 및 페이지 생성
- $$notion-enhanced-markdown 스펙에 따라 콘텐츠 변환
- 템플릿 구조에 맞춰 섹션 매핑
- notion-create-pages로 페이지 생성
- 기존 페이지 수정 시 notion-update-page 사용

## Step 5. 검증
- 생성된 페이지 notion-fetch로 확인
- 누락 섹션 또는 깨진 포맷 확인 및 수정
- 아래 공통 Checklist + $$mode_ref 의 `## Completeness 추가 항목` 을 모두 통과해야 완료 처리한다.

### Completeness Checklist (공통)
- [ ] 핵심 개념(Key concepts)이 누락 없이 모두 추출되었는가?
- [ ] 중요한 코드 예시가 원형(syntax/시그니처) 그대로 포함되었는가?
- [ ] 경고사항/주의점/deprecation 표기가 명시되었는가?
- [ ] 버전 정보가 원문에 존재하는 경우 페이지에 보존되었는가?
- [ ] 템플릿 섹션 구조($$template_page)에 매핑이 누락 없이 적용되었는가?
- [ ] Notion 페이지가 $$parent_page 하위에 올바르게 생성되었는가?

# Error Handling

## 공통
- **Notion 연결 문제** (notion-* MCP 호출 실패): MCP 연결 상태 확인 안내, 재시도 정책 제시 후 사용자 확인.
- **템플릿/전역규칙 페이지 미발견**: 검색 결과 0건이면 사용자에게 페이지명 재확인 또는 템플릿 미적용 진행 여부 질의.
- **$$mode 미확정** ($$source_input·$$research_topic 모두 모호): 사용자에게 summarize/research 중 선택 질의. 임의 추정 금지.

## 모드별
- $$mode_ref 의 `## Error Handling` 섹션을 로드하여 적용 (summarize: URL 접근 불가·대용량 / research: 조사 빈약·자료 상충)

# Output
스킬 완료 시, 아래 형식으로 요약:

## 요약 형식
```
## 작업 요약

### 입력 변수
- mode: {$$mode}
- (summarize) source_input: {$$source_input} / source_type: {$$source_type}
- (research) research_topic: {$$research_topic} / research_requirements: {$$research_requirements}
- parent_page: {$$parent_page}
- template_page: {$$template_page}
- page_title: {$$page_title}

### 결과
- 생성된 Notion 페이지 ID: {page_id}
- 페이지 URL: {page_url}

### 페이지 구조
{섹션 목록을 트리 형태로 표시}
```
