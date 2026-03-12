---
name: skill_guide_doc
description: 주어진 소스코드를 분석하여, guide docs를 작성하는 스킬. 발동조건은 소스코드 path를 입력받고, 문서 작성 요청을 받은 경우 발동한다.
---
# Variable
- $$src_path = <the path of source code> (user input)
- $$guide_path = <the path of guide docs> (default: "src_path/docs")
- $$scope: 분석 범위
  - 프론트엔드: "FRONT", "front", "프론트", "프론트엔드"
  - 백엔드: "BACK", "back", "백", "백엔드"
- $$mode: 작성 모드
  - guide: "guide", "가이드", "문서" (기본값)
  - pipe-line: "pipe-line", "pipeline", "파이프라인", "분석"
- $$pipe_line_name: 파이프라인 이름 (pipe-line 모드 시, kebab-case, user input)
- $$pipe_line_target: 분석 대상 프로세스 설명 (pipe-line 모드 시, user input)
# References
- $$api-server-scaffolding = "./references/api-server-scaffolding.md"
- $$client-scaffolding = "./references/client-scaffolding.md"
- $$pipe-line-scaffolding = "./references/pipe-line-scaffolding.md"

# Action
## Step1. 변수 확인
- $$src_path를 확인하고, 사용자에게 입력받으시오.
- $$guide_path를 확인하고, 사용자에게 입력받으시오.
- $$scope를 확인하고, 사용자에게 입력받으시오.
- $$mode를 확인하고, 사용자에게 입력받으시오.
- $$mode가 pipe-line인 경우,
  - $$pipe_line_name, $$pipe_line_target을 추가로 입력받으시오.
## Step2. Mode에 따른 분기
### guide 모드
- Step3-guide로 이동
### pipe-line 모드
- Step3-pipeline으로 이동

## Step3-guide. Scope에 따른 Guide 작성
- 프론트엔드일 경우, $$client-scaffolding 을 참고하여 작성하시오.
- 백엔드일 경우, $$api-server-scaffolding 을 참고하여 작성하시오.
- 둘 다일 경우, 두 문서를 참고하여 작성하시오.

## Step3-pipeline. Pipeline 분석 작성
- $$pipe-line-scaffolding 을 참고하여 작성하시오.
- 출력 경로: $$guide_path/guides/pipe-line/$$pipe_line_name/
- 기존 guide docs($$guide_path/guides/)가 존재하면 convention/*.md를 참조 컨텍스트로 활용한다.
- 기존 guide docs가 없으면, 먼저 Step3-guide를 실행하여 guide docs를 생성한 뒤 pipeline을 작성한다.
- 완료 후 $$guide_path/guides/INDEX.md에 pipeline 섹션을 추가 또는 업데이트한다.

# Error Handling
- $$src_path 미제공 또는 존재하지 않는 경로 → Human에게 재요청
- scaffolding 참조 파일 로드 실패 → Human에게 보고 후 진행 여부 확인
- 파일 생성/수정 실패 → 실패 파일 목록과 원인을 Human에게 보고

## Step4. 산출물 검증
생성/수정된 문서에 대해 아래 항목을 자체 검증한다:
- scaffolding 템플릿의 필수 섹션이 모두 포함되어 있는가
- 생성된 파일 경로가 scaffolding 규칙에 부합하는가
- (pipe-line 모드) INDEX.md에 새 pipeline 항목이 정상 반영되었는가
- (guide 모드) 소스코드 구조 대비 문서 커버리지가 충분한가
- 검증 결과를 체크리스트 형태로 Human에게 출력한다.

## Step5. 피드백 루프

### 5-1. 피드백 수집
- Human에게 아래 항목별 피드백을 요청한다:
  - 생성된 문서의 구조/목차가 적절한가
  - 누락된 섹션이나 추가 설명이 필요한 부분이 있는가
  - 문서 표현/톤이 적절한가

### 5-2. 영향 범위 분석
- 피드백 내용을 분석하여 수정 범위를 판정한다:
  - 특정 섹션 보완 → 해당 파일만 수정
  - 구조/목차 변경 → 영향받는 파일 전체 재생성
  - scope 또는 mode 변경 → Step 2부터 재실행
- 수정 계획을 Human에게 제시하고 확인받는다.

### 5-3. 선택적 재실행
- 확인된 수정 계획에 따라 해당 문서만 수정/재생성한다.
- 수정 시 이전 내용과의 변경점(diff)을 명시한다.

### 5-4. 반복 판정
- 수정 결과를 Human에게 제시한다.
- Human이 승인하면 최종 산출물을 확정하고 종료한다.
- 추가 피드백이 있으면 Step 5-1로 복귀하여 루프를 반복한다.
- 최대 반복 횟수: 3회 (초과 시 Human에게 알리고 현재 결과로 확정)

# Output
스킬 완료 시, 아래 형식으로 전체 작업 내용을 요약 정리하여 사용자에게 출력한다.

## 요약 형식
```
## 작업 요약

### 입력 변수
- src_path: {$$src_path}
- guide_path: {$$guide_path}
- scope: {$$scope}
- mode: {$$mode}
- (pipe-line 모드 시) pipe_line_name: {$$pipe_line_name}
- (pipe-line 모드 시) pipe_line_target: {$$pipe_line_target}

### 검증 결과
{Step4 검증 체크리스트 결과}

### 생성된 파일 목록
{생성된 파일의 전체 경로와 한 줄 설명을 목록으로 나열}

### 수정된 파일 목록
{기존 파일을 수정한 경우(INDEX.md 등) 경로와 변경 내용 요약}

### 디렉토리 구조
{생성된 파일의 트리 구조를 표시}

### 피드백 루프 결과
- 피드백 횟수: {N}회
- 수정된 파일: {수정 파일 목록}
- 최종 승인 여부: {승인/미승인}
```
