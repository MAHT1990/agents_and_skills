# mode: daily (legacy daily_job 흐름)

> 본 문서는 skill_git_work_manager의 `daily` 모드 운영 정의이다.
> skill.md에서 $$mode=daily 일 때 본 파일의 Variables/Rules/Steps/Output을 적용한다.

# Variables
- $$working_repo (필수, skill.md에서 위임)
- $$template_repo (필수, skill.md에서 위임)
- $$sub_issue_type (필수)
  - bug_report
  - feature
  - issue/opinion
  - study
  - blank
- $$user_prefix (필수, default: "kbs")

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

# Steps
## Step 1. user input 확인
- $$working_repo 확인
  - 없는 경우, 사용자 입력 요구
- $$template_repo 확인
  - 없는 경우, 사용자 입력 요구
  - 확인된 경우, 사용 가능 TEMPLATE 나열 정리

## Step 2. daily_job issue 등록/확인
- daily_job issue 등록 여부 사용자 문답
  - issue 등록시, $$template_repo 내 daily_job template 형식에 따라 issue 등록
  - issue 존재시, issue 내용 확인
- daily_job issue 에 의한 branch 생성
  - branch title: "YYYY-MM-DD"
    - ex. 2029-03-10
  - 생성 후 remote에 push하여 upstream 연결: `git push -u origin {branch_name}`

## Step 3. sub_issue 등록
- Step 2 의 daily_job issue 에 귀속된 sub_issue 등록/확인
  - sub_issue 등록시, sub_issue 유형 사용자 문답
  - 작업 내용 사용자 문답- 사용자 문답 결과에 따라 sub_issue 등록
- Step2 의 daily_job issue branch 를 부모로 하여, sub_issue branch 생성
  - branch title: "{issue_type}/{user_prefix}/{issue_title}"
    - ex. feature/kbs/add_order_api
    - ex. issue/kbs/add_order_api
    - ex. study/kbs/add_order_api
    - ex. fix/kbs/add_order_api
  - 생성 후 remote에 push하여 upstream 연결: `git push -u origin {branch_name}`

## Step 4. checkout
- Step3 의 sub_issue branch 에 checkout

## Step 5. 커밋 · push (sub_issue branch)
- Step3 의 sub_issue branch 위에서만 수행한다
- 사용자 또는 루프 세션의 지시가 있을 때만 수행한다
- 지시에는 범위(파일 목록)와 커밋 메시지가 반드시 포함되어야 한다. 없으면 수행하지 않고 지시자에게 재요청한다
- 커밋 전 `git status --short` 로 워킹트리 변경을 지시 범위와 대조한다
  - 범위 밖 변경이 있으면 커밋하지 않고, 범위 밖 파일 목록을 보고한다
- 지시 범위의 파일만 stage 한다 (`git add -A` · `git add .` 사용 금지)
- 커밋 메시지 형식: `[{LABEL}] {description} (#{issue_number})`
  - 지시에 포함된 추가 줄(Co-Authored-By 등)은 그대로 포함한다
- `git push` 후 결과를 보고한다
  - 커밋 해시 · 커밋된 파일 수 · push 결과 · 워킹트리 clean 여부
- 금지: `git rebase` · `git push --force` / `--force-with-lease` · `git reset --hard`

## Step 6. Pull Request 생성
- Step5 에서 커밋 · push 한 작업에 대한 Pull Request 생성 (PR 규칙 참조)

# Output
- Step별 전체 작업 요약
  - Step1. 작업 Repo, Template Repo +alpha
  - Step2. Daily Job Issue +alpha
  - Step3. sub_issue 등록 +alpha
  - Step4. checkout +alpha
  - Step5. 커밋 · push 결과 (커밋 해시, 파일 수, push 결과, 워킹트리 clean 여부, 범위 밖 파일 목록)
  - Step6. Pull Request 생성 +alpha
