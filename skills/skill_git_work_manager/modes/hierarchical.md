# mode: hierarchical (Parent–Sub 계층 정책)

> 본 문서는 skill_git_work_manager의 `hierarchical` 모드 운영 정의이다.
> skill.md에서 $$mode=hierarchical 일 때 본 파일의 Variables/Rules/Steps/Output을 적용한다.
> 팀 git 정책: 계층 구조(Parent–Sub) + GitHub Project + 모노레포 프리픽스 + 머지 전략 분리.

# Variables
- $$working_repo (필수, skill.md에서 위임)
- $$template_repo (필수, skill.md에서 위임, default: CrowsGear/.github)
- $$parent_issue_number (선택; 없으면 신규 생성)
- $$project_name (조건부 필수, enum: VUE | ELECTRON | NEST) — Parent 신규 생성 시 필수
- $$sub_issue_type (필수, enum: feature | bug | issue | study | blank)
- $$sub_label (필수) — Sub Issue 제목/브랜치 prefix
- $$user_initial (필수, default: "kbs")
- $$is_monorepo (자동감지, bool)
- $$mono_prefix (조건부 필수, enum: vue | electron) — $$is_monorepo=true일 때
- $$release_project (선택; Step 11에서만 사용)
- $$release_version (선택; Step 11에서만 사용)

# Rules

## 작업 금지 가드
- **Main / Dev / Parent 브랜치에 직접 커밋·작업 금지**
- 체크아웃 전 현재 브랜치가 Main/Dev/Parent 인지 확인하고, 해당 브랜치에서 사용자가 직접 수정 시도 시 경고/차단
- Parent Branch는 작업자 간 병합·dev 반영 전 테스트 외 개인 작업 금지 (역할 분리)

## 브랜치 정책
- **Parent Branch는 항상 base=dev**
- **Sub Branch는 항상 base=Parent Branch**
- 모노레포 자동 감지:
  - 시그널: 레포 루트에 `vue/` + `electron/` 디렉토리 동시 존재 OR 루트 `package.json`의 `workspaces` 필드 존재
  - 감지 시 $$is_monorepo=true로 설정하고, 사용자에게 $$mono_prefix(vue|electron) 확인
  - $$is_monorepo=true 면 Parent Branch 이름에 `vue/` 또는 `electron/` 프리픽스 강제 (예: `electron/auth`)

## 네이밍 규칙
- **Parent Branch 명**: 포괄적 기능명. 모노레포는 프리픽스 포함 (예: `electron/auth`, `vue/login-signup`)
- **Sub Issue 제목**: `[{LABEL}]{작업내용}` (LABEL은 $$sub_label)
- **Sub Branch 명**: `{Label}/{user_initial}/{ParentBranchName-작업내용}`
  - ex. `feature/kbs/electron/auth-login-form-widget`
  - ex. `feature/kbs/vue/login-signup-login-form-widget`

## Issue 정책
- **Parent Issue 생성**: `$$template_repo`의 `01_parent_issue.md` 템플릿 사용
- **Parent Issue Project 수동 설정 필수** (모노레포 한계):
  - Parent Issue 생성 직후, GitHub Project(VUE/ELECTRON/NEST) 수동 설정 안내
  - `01_parent_issue.md` 체크리스트의 `PROJECT 설정 (VUE, ELECTRON, NEST)` 항목 확인
- **Sub Issue 생성은 반드시 Parent에 sub로 연결** (A안 표준):
  - 일반 이슈로 생성한 뒤, 다음 호출로 Parent에 sub_issue 연결
  - `gh api -X POST /repos/{owner}/{repo}/issues/{parent_number}/sub_issues -f sub_issue_id={created_sub_issue_id}`
  - fallback: `yahsan2/gh-sub-issue` extension (`gh extension install yahsan2/gh-sub-issue` 후 `gh sub-issue create --parent {N}`) — 안내만, 표준 아님
- **Sub Issue 템플릿 매핑**:
  | $$sub_issue_type | template |
  |---|---|
  | feature | `03_sub_issue.md` |
  | blank | `03_sub_issue.md` |
  | bug | `02_bug.md` |
  | issue | `04_ISSUE.md` |
  | study | `05_study.md` |
- Sub Issue 의 Project는 Parent Issue 의 Project를 상속/위임 (자동/수동 모두 허용)

## 머지 전략
- **Sub → Parent**: `Squash and Merge`
  - PR title: `[{LABEL}]{작업내용} (#{sub_issue_number})`
  - PR body: `Closes #{sub_issue_number}`, `Parent: #{parent_issue_number}`
  - **Squash 머지된 Sub Branch에서 추가 작업 지양** (히스토리 불일치 → 경고 출력)
- **Parent → Dev**: `Merge Commit`
  - PR title: `{YYYY-MM-DD}/{ParentBranchName}`
  - ex. `2026-04-09/electron/auth`
- **Dev → Main**: `Merge Commit`
  - PR title: `{YYYY-MM-DD}/{프로젝트}-{버전}` (다중 프로젝트는 `/`로 구분)
  - ex. `2026-04-09/electron-0.5.100`
  - ex. `2026-04-09/electron-0.5.100/vue-1.0`

## Commit 규칙
- 커밋 메시지 형식: `[{LABEL}] {description} (#{issue_number})`
  - ex. `[FEAT] add login form widget (#32)`
- 사용자가 명시하지 않는 한 자동 커밋 금지
- 작업은 Sub Branch 위에서만 수행

# Steps

## Step 1. Parent Issue/Branch 등록·확인
- $$parent_issue_number 존재 여부 확인
  - 존재 시: 이슈 내용 fetch 및 검증 (Project 설정 여부, 제목 패턴)
  - 미존재 시: `01_parent_issue.md` 템플릿으로 신규 Parent Issue 생성
    - 사용자에게 포괄 기능명 확인 (예: `auth`, `login-signup`)
    - $$is_monorepo 자동 감지 → true 면 $$mono_prefix 사용자 확인
    - $$project_name 사용자 확인 (VUE/ELECTRON/NEST)
- Parent Issue 생성 직후, **GitHub Project 수동 설정 안내** 및 체크리스트 확인 요청
- Parent Branch 생성 (base=dev)
  - 모노레포: `{mono_prefix}/{기능명}` (ex. `electron/auth`)
  - 단일 레포: `{기능명}`
  - `git push -u origin {parent_branch}`

## Step 2. Sub Issue/Branch 등록
- $$sub_issue_type 에 따라 템플릿 선택 (Rules 매핑 표 참조)
- Sub Issue 생성:
  - 제목: `[{$$sub_label}]{작업내용}`
  - body는 선택된 템플릿 형식 준수
- Parent에 sub로 연결:
  - `gh api -X POST /repos/{owner}/{repo}/issues/{parent}/sub_issues -f sub_issue_id={sub_id}`
  - 실패 시 fallback 안내 후 사용자 확인
- Sub Branch 생성 (base=Parent Branch)
  - 이름: `{$$sub_label}/{$$user_initial}/{ParentBranchName-작업내용}`
  - `git push -u origin {sub_branch}`

## Step 3. Sub Branch checkout
- 현재 브랜치가 Main/Dev/Parent 가 아닌지 가드 후 Sub Branch checkout

## Step 4. 사용자 작업 수행
- Sub Branch 위에서 작업 진행
- Test Scenario 작성 명시까지 대기
- 사용자가 Main/Dev/Parent로 이동 시도 시 경고

## Step 5. Test Scenario 작성
- skill: `skill_test_scenario` 호출
- Step 4 작업 내용에 대한 Test Scenario 도출

## Step 6. Test Scenario 에 따른 수정방안 제시
- Step 5 산출물 기반 수정 포인트 정리

## Step 7. 추가 사용자 작업 (Loop)
- Test 종료 명시까지 Step 4 ~ Step 6 반복

## Step 8. Guide 문서 작성
- skill: `skill_guide_doc` 호출
- 작업 내용에 대한 `/docs/guide` 문서 작성/수정

## Step 9. Sub → Parent Pull Request 생성
- base = Parent Branch, head = Sub Branch
- merge method: **Squash and Merge**
- title: `[{$$sub_label}]{작업내용} (#{sub_issue_number})`
- body:
  - `Closes #{sub_issue_number}`
  - `Parent: #{parent_issue_number}`
- 머지 후 사용자에게 "Sub Branch 추가 작업 지양" 경고 출력

## Step 10. (옵션) Parent → Dev 통합 PR
- 사용자가 명시 요청한 경우에만 진행
- base = dev, head = Parent Branch
- merge method: **Merge Commit**
- title: `{YYYY-MM-DD}/{ParentBranchName}` (오늘 날짜 자동)
- body: 본 Parent에 머지된 Sub PR/Issue 목록 정리

## Step 11. (옵션) Dev → Main 릴리스 PR
- 사용자가 명시 요청한 경우에만 진행
- $$release_project, $$release_version 사용자 입력
- base = main, head = dev
- merge method: **Merge Commit**
- title: `{YYYY-MM-DD}/{release_project}-{release_version}`
  - 다중 프로젝트는 `/`로 구분 (ex. `2026-04-09/electron-0.5.100/vue-1.0`)
- body: 릴리스 노트(포함된 Parent 목록) 정리

# Error Handling
- gh sub-issue API 호출 실패 시: fallback(`gh sub-issue` extension) 안내 후 사용자에게 재시도/스킵 확인
- 모노레포 감지 실패(시그널 모호) 시: 사용자에게 직접 확인 요청
- Parent Issue Project 미설정 감지 시: PR 생성 단계에서 경고 출력 후 진행 여부 확인
- Main/Dev/Parent 브랜치에서 직접 작업 시도 감지 시: 차단하고 Sub Branch 생성/이동 유도

# Output
- Step별 전체 작업 요약
  - Step 1. Parent Issue/Branch (번호, URL, branch명, project 설정 여부, mono_prefix)
  - Step 2. Sub Issue/Branch (번호, URL, branch명, 템플릿, sub_issue 연결 결과)
  - Step 3. checkout 결과
  - Step 4. (verbose) 사용자 작업 내역
  - Step 5. Test Scenario 산출물
  - Step 6. 수정방안
  - Step 7. Loop 횟수
  - Step 8. Guide 문서 경로
  - Step 9. Sub→Parent PR URL, merge 방식
  - Step 10. (옵션) Parent→Dev PR URL
  - Step 11. (옵션) Dev→Main 릴리스 PR URL
