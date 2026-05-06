# mode: simple (순수 git CLI 단발 수행)

> 본 문서는 skill_git_work_manager의 `simple` 모드 운영 정의이다.
> skill.md에서 $$mode=simple 일 때 본 파일의 Variables/Rules/Steps/Output을 적용한다.
> issue/PR/Project 등 메타 작업을 동반하지 않는 단발 git 명령에 사용한다.

# Variables
- $$working_repo (선택, default: 현재 working tree의 repo) — 작업 대상 레포
- $$git_action (필수, enum) — 수행할 git 작업 유형
  - `create_branch` — 신규 브랜치 생성
  - `checkout` — 기존 브랜치/ref 체크아웃
  - `delete_branch` — 브랜치 삭제 (로컬/원격)
  - `merge` — 브랜치 병합
  - `tag` — 태그 생성
  - `push` — 원격 푸시
  - `custom` — 위 enum에 없는 자유 git 명령
- $$branch_name (조건부 필수) — `create_branch` / `checkout` / `delete_branch` 시 대상 브랜치명
- $$base_ref (선택, default: 현재 HEAD) — `create_branch` 시 분기 시작점
- $$push_upstream (선택, default: false) — 브랜치 생성/체크아웃 후 origin upstream 등록 여부
- $$custom_command (조건부 필수) — `$$git_action=custom` 시 실행할 git 명령 전체

# Rules
- **git cli 만 사용**한다 (gh cli 미사용)
- 단발 명령으로 끝난다. issue/PR/project/template 등 GitHub 메타 작업을 수행하지 않는다
- 커밋 메시지 포맷을 강제하지 않는다 (커밋 자체를 simple 모드에서 자동으로 만들지 않는다)
- 모든 명령은 Step 2의 미리보기 + 사용자 승인을 거친 후 실행한다
- 파괴적 작업(`delete_branch`, `merge` with conflicts, `push --force` 등)은 미리보기 단계에서 명시적으로 경고한다
- $$git_action=custom 인 경우, $$custom_command 이 `git ` 로 시작하는지 검증한다

## $$git_action 별 명령 패턴
| action | 기본 명령 | $$push_upstream=true 시 추가 |
|---|---|---|
| create_branch | `git checkout -b {$$branch_name} [{$$base_ref}]` | `git push -u origin {$$branch_name}` |
| checkout | `git checkout {$$branch_name}` | (해당 없음) |
| delete_branch | `git branch -d {$$branch_name}` (로컬) / 원격 삭제 시 `git push origin --delete {$$branch_name}` | (해당 없음) |
| merge | `git merge {$$branch_name}` | (해당 없음) |
| tag | `git tag {$$branch_name}` (annotated 시 `-a`) | `git push origin {$$branch_name}` |
| push | `git push [origin {$$branch_name}]` | (해당 없음) |
| custom | $$custom_command | (해당 없음) |

# Steps

## Step 1. 변수 수집 + 현재 git 상태 점검
- $$working_repo 확인 (미지정 시 현재 working tree 사용)
- $$git_action 및 조건부 필수 변수 수집
- 현재 git 상태 점검:
  - `git status --short` — working tree 상태 확인
  - `git branch --show-current` — 현재 브랜치 확인
  - `git rev-parse --short HEAD` — 현재 커밋 확인
- 충돌 가능성 점검:
  - `create_branch`: $$branch_name이 이미 존재하는지 확인
  - `checkout`: 작업 트리에 uncommitted 변경이 있는지 경고
  - `delete_branch`: 현재 체크아웃된 브랜치는 삭제 불가 — 사전 차단
  - `merge`: 현재 브랜치와 머지 대상 브랜치 확인
- 점검 결과를 Human에게 요약 제시

## Step 2. 명령 미리보기 + 승인
- Rules의 명령 패턴 표에 따라 실제 실행될 git 명령을 조립
- 다음 형식으로 출력:
  ```
  ── 실행 예정 명령 ──
  $ git ...
  $ git ...   (push_upstream=true 인 경우)

  ⚠️ 주의사항: (파괴적 작업이거나 비가역 작업인 경우 명시)
  ```
- Human에게 "진행" / "수정" / "중단" 응답 요청
- "수정" 시 변수를 갱신하고 미리보기 재생성
- "중단" 시 종료
- "진행" 응답을 받기 전까지 Step 3로 넘어가지 않는다

## Step 3. 명령 실행
- Step 2에서 확정된 명령을 순차 실행
- 각 명령의 stdout / stderr / exit code를 수집
- 실행 중 에러 발생 시 즉시 중단하고 Human에게 보고

## Step 4. 결과 보고
- 실행 결과 요약:
  - 실행한 명령 목록
  - 변경 전/후 git 상태 (브랜치, HEAD, 원격 추적 상태)
  - push 결과 (해당 시)
- `git status --short` 와 `git branch --show-current` 재출력으로 최종 상태 검증

# Error Handling
- $$git_action 이 enum 외 값인 경우 → Human에게 재요청
- $$git_action 이 branch 관련인데 $$branch_name 미제공 → Human에게 재요청
- $$git_action=custom 인데 $$custom_command 미제공 또는 `git `로 시작하지 않음 → Human에게 재요청
- create_branch 시 $$branch_name 이 이미 존재 → Human에게 보고하고 checkout 전환 여부 확인
- delete_branch 시 대상이 현재 체크아웃된 브랜치 → 사전 차단, Human에게 다른 브랜치 체크아웃 요청
- 명령 실행 실패 → stderr 와 exit code 를 Human에게 보고, 후속 명령 중단
- working tree dirty 상태에서 checkout/merge 요청 → Human에게 stash/commit 여부 확인

# Output
- Step별 요약
  - Step 1. 사전 점검 결과 (현재 브랜치 / HEAD / working tree 상태 / 충돌 점검)
  - Step 2. 미리보기 명령 목록 + 사용자 승인
  - Step 3. 실행한 명령 + 각 명령의 결과
  - Step 4. 최종 git 상태 (브랜치 / HEAD / 원격 추적)
