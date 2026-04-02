---
name: skill_db_schema_to_notion
description: prisma.schema 등의 Database 정도를 가진 문서를 토대로, 구조화된 notion page를 생성한다. 
---

# Problem
- 신규 기획을 추가하기 위해서는 기존의 DataBase 구조파악이 필수.
- 기획은 Notion Page 들을 기반으로 함. 그러므로, DataBase 구조에 대한 Notion Page 필요.

# Input
- $$schema_path: DB Schema 관련 문서 경로.(사용자 입력)
- $$db_main_page: notion_page Named "TEMPLATE: DATABASE"
- $$db_domain_page: notion_page Names $$db_main_page > "{Domain name}"
- $$agnt_analyzer"

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
- $$schema_path: DB Schema 관련 문서 경로 (필수)
- $$db_main_page: Notion 메인 페이지명 (기본: "TEMPLATE: DATABASE")
- $$db_domain_page: 도메인별 하위 페이지 구조

### 0-2. 요구사항 구체화 회의
수집된 변수를 바탕으로 Human과 회의하여 아래 사항을 구체화한다.
Human이 최종 승인할 때까지 회의를 반복한다.
- Schema 분석의 목적과 대상 독자
- 기존 Notion 페이지 존재 여부 (신규 작성 vs 수정)
- 도메인 분류 기준 및 범위
- 메타데이터에 포함할 항목

### 0-3. 최종 승인
확정된 요구사항을 요구사항 확인서 형식으로 Human에게 제시하고 **최종 승인**을 받는다.
승인 없이 다음 Step으로 진행하지 않는다.
"수정" 시, 0-2(회의)로 돌아가 재논의 후 다시 승인을 요청한다.

## Description
- Schema를 분석하여, 주요 METADATA를 $$db_main_page 형식에 따라 신규 페이지 생성(기존 페이지 존재시 수정)
- 기존 페이지 존재여부 확인.
  - Case. 신규 작성시
    - 각 도메인에 대한 분석내용을 $$db_domain_page 형식에 따라 생성
        - $$db_main_page 이하 도메인별 페이지 생성
        - 분석 내용을 $$db_domain_page 형식에 따라 작성
  - Case. 수정시
    - 기존 페이지 존재시, 기존 페이지 분석
    - 기존 내용과 분석 내용 대조
    - 수정사항 발생시, 수정

## Step 1. Schema 분석
- $$schema_path 제공된 Schema 분석
- $$schema_path 재귀적으로 Schema 분석

## Step 2. 메타데이터 페이지(메인 페이지) 작성/수정
- $$db_main_page 에 주요 METADATA 작성

## Step 3. 도메인별 하위 페이지 작성/수정
- 도메인별, $$db_main_page 이하에 페이지 생성.
- 분석 내용을 $$db_domain_page 형식에 맞게 작성.

## Step 4. 재확인
- Schema 본문과, 작성된 내용 재확인
- 수정사항 발생시, 수정

## Constraint

