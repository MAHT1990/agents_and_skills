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

### 생성된 파일 목록
{생성된 파일의 전체 경로와 한 줄 설명을 목록으로 나열}

### 수정된 파일 목록
{기존 파일을 수정한 경우(INDEX.md 등) 경로와 변경 내용 요약}

### 디렉토리 구조
{생성된 파일의 트리 구조를 표시}
```
