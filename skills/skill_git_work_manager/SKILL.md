---
name: skill_git_work_manager
description: 모든 git 작업에 대한 매니저 스킬. -발동조건1. git 작업을 명시한 경우
---

# Variables
- $$working_repo (필수) — 작업 대상 레포 (owner/repo)
- $$template_repo (필수, default: CrowsGear/.github) — issue/PR 템플릿 레포
- $$mode (필수, enum: hierarchical | daily | simple, default: simple) — 운영 모드 선택
  - hierarchical: 신규 팀 정책 (Parent–Sub 계층 + GitHub Project + 모노레포 프리픽스 + 머지 전략 분리)
  - daily: 기존 daily_job 흐름 (legacy, 언제든 재사용 가능)
  - simple: 메타 작업(issue/PR/project) 없이 순수 git CLI 명령만 단발 수행

# Rules
- git cli, gh cli 를 이용하여 git 및 github 작업 수행
- 본 skill.md는 라우터 역할만 수행한다. 실제 Variables/Rules/Steps/Output은 `modes/{$$mode}.md` 파일을 위임 로드하여 적용한다.
- mode 별 운영 정의 파일:
  | $$mode | 위임 파일 |
  |---|---|
  | hierarchical | `modes/hierarchical.md` |
  | daily | `modes/daily.md` |
  | simple | `modes/simple.md` |
- mode 파일 미존재 또는 로드 실패 시 Human에게 보고하고 중단한다.

# Steps

## Step 0. 변수 수집 및 mode 결정
- rule_variable_collection 에 따라 $$working_repo, $$template_repo, $$mode 를 수집한다.
- $$mode 미지정 시 default(`simple`)를 적용한다.
- 결정된 $$mode 를 Human에게 확인받는다.

## Step 1. mode 위임
- `modes/{$$mode}.md` 파일을 로드한다.
- 해당 파일의 Variables / Rules / Steps / Output 정의를 그대로 적용하여 실행한다.
- 위임 파일의 추가 변수가 필요한 경우, 해당 시점에 Human에게 수집한다.

# Error Handling
- $$mode 가 enum(hierarchical|daily|simple) 외 값인 경우 → Human에게 재요청
- `modes/{$$mode}.md` 파일 미존재 → Human에게 보고하고 중단
- 위임 실행 중 발생한 에러는 위임 파일의 Error Handling 또는 공통 rule_error_handling_common 에 따른다

# Output
- 위임된 mode 파일의 Output을 그대로 전달한다.
- 라우터 단계 추가 정보:
  - 선택된 $$mode
  - 위임 파일 경로
