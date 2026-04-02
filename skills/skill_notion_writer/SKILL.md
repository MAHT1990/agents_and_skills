---
name: skill_notion_writer
description: 마크다운 기술 문서를 Notion 템플릿 형식에 맞춰 구조화된 Notion 페이지로 변환·생성하는 스킬. 발동조건1. 마크다운/문서를 Notion에 정리 요청받은 경우. 발동조건2. 기술 문서의 Notion 페이지 생성을 요청받은 경우.
---

# Variables
- $$source_path: 소스 마크다운 문서 경로 (파일 또는 디렉토리, user input)
- $$parent_page: Notion 부모 페이지 이름 (user input)
- $$global_rule_page: Notion 템플릿 전역규칙 페이지명(user input, default: "TEMPLATEs>")
- $$template_page: Notion 템플릿 페이지명(user input, optional, default: "TEMPLATEs> STUDY")
- $$flowchart_page: mermaid 다이어그램 참고 페이지명(user input, default: "TEMPLATEs> FLOWCHART")
- $$page_title: 생성할 페이지 제목 (user input)

# References
- $$notion-enhanced-markdown = "./references/notion-enhanced-markdown.md"

# Rules
- Notion MCP 도구(notion-search, notion-fetch, notion-create-pages, notion-update-page)를 사용
- $$global_rule_page가 지정된 경우, 전역규칙을 반드시 따를 것
- $$template_page 가 지정된 경우, 템플릿의 섹션 구조를 반드시 따를 것
- 플로우차트 다이어그램 작정시, $$flowchart_page 지시사항을 반드시 따를 것 
- 소스 문서의 코드 블록, 다이어그램, 테이블 등은 $$notion-enhanced-markdown 스펙에 따라 변환
- 페이지 생성 전 사용자 확인(Q&A) 필수

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
- $$source_path: 소스 마크다운 문서 경로 (필수)
- $$parent_page: Notion 부모 페이지 이름 (필수)
- $$global_rule_page: Notion 템플릿 전역규칙 페이지명 (기본: "TEMPLATEs>")
- $$template_page: Notion 템플릿 페이지명 (선택, 기본: "TEMPLATEs> STUDY")
- $$flowchart_page: mermaid 다이어그램 참고 페이지명 (기본: "TEMPLATEs> FLOWCHART")
- $$page_title: 생성할 페이지 제목 (선택, 미지정 시 소스 문서 제목에서 추출)

### 0-2. 요구사항 구체화 회의
수집된 변수를 바탕으로 Human과 회의하여 아래 사항을 구체화한다.
Human이 최종 승인할 때까지 회의를 반복한다.
- Notion 페이지 생성의 목적과 대상 독자
- 템플릿 적용 여부 및 커스터마이즈 범위
- 단일 페이지 vs 다중 페이지 선호
- 소스 문서에서 특별히 강조할 내용

### 0-3. 최종 승인
확정된 요구사항을 요구사항 확인서 형식으로 Human에게 제시하고 **최종 승인**을 받는다.
승인 없이 다음 Step으로 진행하지 않는다.
"수정" 시, 0-2(회의)로 돌아가 재논의 후 다시 승인을 요청한다.

## Step 1. 소스 문서 분석
- $$source_path가 디렉토리면 하위 마크다운 전체 읽기
- $$source_path가 파일이면 해당 파일 읽기
- 핵심 내용, 구조, 다이어그램, 코드 블록 등 파악

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

# Output
스킬 완료 시, 아래 형식으로 요약:

## 요약 형식
```
## 작업 요약

### 입력 변수
- source_path: {$$source_path}
- parent_page: {$$parent_page}
- template_page: {$$template_page}
- page_title: {$$page_title}

### 결과
- 생성된 Notion 페이지 ID: {page_id}
- 페이지 URL: {page_url}

### 페이지 구조
{섹션 목록을 트리 형태로 표시}
```
