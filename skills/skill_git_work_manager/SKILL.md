---
name: skill_git_work_manager
description: 모든 git 작업에 대한 매니저 스킬. -발동조건1. git 작업을 명시한 경우
---

# Variables
- $$working_repo = (user input)
- $$template_repo = (user input)
- $$sub_issue_type = (user input)
  - bug_report 
  - feature
  - issue/opinion
  - study
  - blank
- $$user_prefix = (user input, default: "kbs")

# Rules
- git 작업 명시 확인
- git cli, gh cli 를 이용하여 git 및 github 작업 수행
- Step1, Step2 issue 등록전 필요한 label이 없는 경우, 자동 생성 가능 (사용자 확인)

## Commit 규칙
- 커밋은 Step 진행 중 수시로 발생할 수 있음 (사용자 직접 커밋 또는 요청에 의한 커밋)
- 커밋 메시지 형식: "[{LABEL}] {description} (#{issue_number})"
  - ex. [FEAT] add test module (#32)
  - ex. [BUG] fix login error (#45)
- 사용자가 커밋을 명시하지 않는 한, 자동으로 커밋하지 않음

## PR 규칙
- PR base branch: Step2에서 생성한 daily_job branch (ex. `2026-03-10`)
- PR head branch: Step3에서 생성한 sub_issue branch (ex. `feature/kbs/add_test_module`)
- PR title 형식: "[{LABEL}] {issue_title} (#{sub_issue_number})"
- PR body에 관련 issue 참조 포함: `Closes #{sub_issue_number}`, `Parent: #{daily_job_issue_number}`

## Issue 연결 규칙
- sub_issue는 daily_job issue에 귀속됨을 명시해야 함
- sub_issue 본문의 "관련 Daily Job" 항목에 daily_job issue 번호를 체크리스트로 기입
  - ex. `- [x] #31`
- daily_job issue에도 sub_issue 목록을 tasklist로 추가하여 추적 가능하게 함
  - ex. `- [ ] #{sub_issue_number} {sub_issue_title}`

# Actions
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

## Steps
## Step1. user input 확인
- $$working_repo 확인
  - 없는 경우, 사용자 입력 요구
- $$template_repo 확인
  - 없는 경우, 사용자 입력 요구
  - 확인된 경우, 사용 가능 TEMPLATE 나열 정리
## Step2. daily_job issue 등록/확인
- daily_job issue 등록 여부 사용자 문답
  - issue 등록시, $$template_repo 내 daily_job template 형식에 따라 issue 등록
  - issue 존재시, issue 내용 확인
- daily_job issue 에 의한 branch 생성
  - branch title: "YYYY-MM-DD"
    - ex. 2029-03-10
## Step3. sub_issue 등록
- Step 2 의 daily_job issue 에 귀속된 sub_issue 등록/확인
  - sub_issue 등록시, sub_issue 유형 사용자 문답 
  - 작업 내용 사용자 문답- 사용자 문답 결과에 따라 sub_issue 등록
- Step2 의 daily_job issue branch 를 부모로 하여, sub_issue branch 생성
  - branch title: "{issue_type}/{user_prefix}/{issue_title}"
    - ex. feature/kbs/add_order_api
    - ex. issue/kbs/add_order_api
    - ex. study/kbs/add_order_api
    - ex. fix/kbs/add_order_api
## Step4. checkout
- Step3 의 sub_issue branch 에 checkout

## Step5. 사용자 작업 수행
- Test Scenario 작성 작업을 명시할 때까지 대기.

## Step6. Test Scenario 작성
- Step5 의 작업 내용에 대한 Test Scenario 작성
- skill: skill_test_scenario 사용

## Step7. Test Scenario에 따른 수정방안 제시
- Step6 의 Test Scenario 에 따른 수정방안 제시

## Step8. 추가 사용자 작업
- Test 종료 명시할 때까지 Step5 ~ Step8 Loop

## Step9. 작업 LOOP 종료. Guide 문서 작성 with skill: skill_guide_doc
- Test 종료 명시
- 작업 내용에 대한 /docs/guide 문서 수정
- skill: skill_guide_doc 사용

## Step10. Pull Request 생성
- Step9 의 작업 내용에 대한 Pull Request 생성

# Output
- Step별 전체 작업 요약
  - Step1. 작업 Repo, Template Repo +alpha
  - Step2. Daily Job Issue +alpha
  - Step3. sub_issue 등록 +alpha
  - Step4. checkout +alpha
  - Step5. (verbose) 사용자 작업 수행 +alpha
  - Step6. Test Scenario 작성 +alpha
  - Step7. Test Scenario에 따른 수정방안 제시 +alpha
  - Step8. 추가 사용자 작업 +alpha
  - Step9. 작업 LOOP 종료. Guide 문서 작성 +alpha
  - Step10. Pull Request 생성 +alpha