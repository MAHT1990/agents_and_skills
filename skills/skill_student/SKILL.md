---
name: skill_student
description: 학습 분야(LANG/PACKAGE/...)별 references/study_{domain}.md를 동적으로 참조하여, 해당 분야 고유의 학습 차원·태도·노트 구조·컨벤션에 맞춰 학습 노트를 생성·정리하는 일반화 학습 SKILL. 다음 상황에서 반드시 발동한다. case1. "학습 노트", "공부 노트", "study note" 관련 요청. case2. "{언어/패키지/프레임워크/개념} 공부", "{대상} 정리" 요청. case3. Notion STUDY> 트리에 노트 생성·정리 요청.
---
# Role
학습 분야별 reference를 로드하여 학습 계획·노트 트리를 설계하고, Notion 또는 file/console에 노트를 생성하는 학습 오케스트레이터.
직접 분석을 수행하지 않고, reference에 정의된 학습 차원·구조·ATTITUDE를 따른다.

# Variables
- $$DOMAIN: 학습 분야 (필수)
  - LANG: 프로그래밍 언어 (C, Python, JavaScript 등)
  - PACKAGE: 라이브러리/패키지 (React, Express, NumPy 등)
  - (확장 예정) FRAMEWORK, CONCEPT 등
- $$TARGET: 학습 대상 이름 (필수)
  - LANG의 경우: 언어명 (예: "Rust", "Go")
  - PACKAGE의 경우: 패키지명 (예: "Pydantic", "TanStack Query")
- $$output_mode: 출력 방식 (선택, 기본값: console)
  - console: 대화창에 학습 트리·노트 미리보기 출력
  - file: 마크다운 파일로 저장
  - notion: Notion 페이지로 작성 (STUDY> 하위)
- $$output_target: 출력 대상 (output_mode가 file/notion인 경우 필수)
  - file: 저장 디렉토리 경로
  - notion: 부모 페이지 ID 또는 URL (기본: STUDY> = `537302f8d63e46d1977e1f16a26c1690`)
- $$scope: 학습 범위 (선택, 기본값: full)
  - full: 도메인 reference의 모든 학습 차원·구조 적용
  - partial: 특정 차원/주제만 선별 (Step 0-2에서 구체화)

# References
- $$study_lang     = "./references/study_lang.md"
- $$study_package  = "./references/study_package.md"
- (확장) $$study_{domain} = "./references/study_{domain}.md"

# 참조 Notion 페이지 (LANG 도메인 기본 소스)
- TEMPLATE: STUDY    = `2e9c9b468ca0809eb076cd68fd4b413e`
- 공부 ATTITUDE      = `21999e5fe8d74be5bcf1116eced20028`
- STUDY> (학습 루트) = `537302f8d63e46d1977e1f16a26c1690`

# Error Handling
- $$DOMAIN 미지원 (대응 references/study_{domain}.md 없음)
  → Human에게 보고, 지원 도메인 목록 안내, 신규 study_{domain}.md 생성 여부 확인
- $$TARGET 미제공 → Human에게 재요청, Step 0로 복귀
- TEMPLATE: STUDY 페이지 fetch 실패 → Human에게 보고, $$output_mode를 file로 fallback 제안
- Notion 페이지 생성 실패 → 실패 페이지만 스킵, 나머지 계속 진행, Human에게 개별 보고
- "다 정리하지 마라" ATTITUDE 위반 위험 (페이지 수 과다)
  → Step 3 계획 단계에서 페이지 수 임계치(기본 10개) 초과 시 Human에게 우선순위 재선별 요청

---
# Action

## Step 0. 요구사항 회의 (Human-in-the-Loop)

### 0-1. 변수 수집
아래 정보를 모두 확보할 때까지 회의 단계로 진행하지 않는다.
- $$DOMAIN: 학습 분야 (필수)
- $$TARGET: 학습 대상 이름 (필수)
- $$output_mode: 출력 방식 (기본 console)
- $$output_target: 출력 대상 (file/notion 시 필수)
- $$scope: 학습 범위 (기본 full)

### 0-2. 요구사항 구체화 회의
수집된 변수를 바탕으로 Human과 회의하여 아래 사항을 구체화한다.
- 학습 동기·목적 (왜 이 대상을 학습하는가, 어떤 프로젝트/문제와 연결되는가)
- 학습자의 사전 지식 수준 (선수지식 보강 필요성 판단)
- 학습 차원 우선순위 (도메인 reference의 학습 차원 중 어디부터/어디까지)
- 시간 예산 (한 번에 다 하지 않는다 — 어디서 끊을지)
- 노트 톤 (공식문서 인용 비중, 코드 예제 분량, 다이어그램 비중 등)

### 0-3. 최종 승인
확정된 요구사항을 요구사항 확인서로 Human에게 제시하고 **최종 승인**을 받는다.
승인 없이 다음 Step으로 진행하지 않는다.

## Step 1. Domain Reference 로드
- $$DOMAIN에 매핑되는 references/study_{domain}.md 파일을 읽는다.
- 다음 정보를 추출하여 Step 3 계획 수립의 입력으로 사용한다:
  - 학습 차원 목록 (Dimension)
  - ATTITUDE (학습 태도·원칙)
  - 페이지 계층 구조 (Tier 정의)
  - 제목·색상 컨벤션
  - TEMPLATE 적용 범위 (어느 Tier에 풀 적용)
- references/study_{domain}.md가 없으면 Error Handling에 따라 처리.

## Step 2. TEMPLATE 확보
- $$output_mode가 notion인 경우, TEMPLATE: STUDY 페이지를 Notion MCP(notion-fetch)로 조회.
- $$output_mode가 file/console인 경우, study_{domain}.md에 인용된 TEMPLATE 13 섹션 정의를 그대로 사용.
- TEMPLATE 13 섹션 (필수 골격):
  OneLine, Background, Prerequisites, Definition, Props, Basic Usage(조건부),
  FAQ/오개념, Diagrams, Scenarios & Patterns, 주의사항, Examples, 추천 후속학습, References

## Step 3. 학습 계획 수립 (Human Confirm Required)
study_{domain}.md의 페이지 계층 구조에 따라, $$TARGET의 학습 노트 트리를 설계한다.

### 3-1. Tier 트리 설계
- **Tier 1 (Cover)**: `{DOMAIN}: {TARGET}` 페이지 — OneLine, 사용처/정체성, 자식 링크
- **Tier 2 (Container)**: `{TARGET}: {카테고리}>` 페이지들 — 자식 링크만, 끝에 `>` 접미사
- **Tier 3 (Leaf)**: `{TARGET}: {주제}` 또는 `{카테고리}: {세부}` — TEMPLATE 풀 적용

### 3-2. 학습 차원 매핑
- study_{domain}.md의 학습 차원 각각을 Tier 2 컨테이너 또는 Tier 3 leaf에 매핑.
- $$scope=partial인 경우, 0-2 회의에서 선별된 차원만 매핑.

### 3-3. 우선순위 산정
- ATTITUDE "한 번에 다 X" 원칙 적용.
- 1차 학습 노트(필수)와 2차 확장 노트(선택)로 분리.
- 1차 페이지 수가 임계치(기본 10개) 초과 시, Human에게 재선별 요청.

### 3-4. 계획 확정
- 트리 구조와 페이지 목록을 Human에게 제시하고 승인받는다.
- 출력 예시:
  ```
  📚 {TARGET} 학습 트리 (1차 N개, 2차 M개)
  └── {DOMAIN}: {TARGET}
      ├── {TARGET}: 역사
      ├── {TARGET}: 원리: {주제}
      ├── {TARGET}: 문법>
      │   ├── ...
      └── ...
  ```

## Step 4. 노트 생성 ($$output_mode 분기)

### 4-1. notion 모드
- $$output_target(부모 페이지) 하위에 Tier 1 → Tier 2 → Tier 3 순서로 페이지 생성.
- Tier 3 leaf는 TEMPLATE 13 섹션을 골격으로 채우되, ATTITUDE에 따라:
  - 모든 섹션을 다 채우지 않고, 핵심 작동원리·헷갈리는 부분 위주
  - 공식문서 link를 References에 우선 배치
  - 코드 예제는 직접 테스트 가능한 형태로
- 다이어그램은 mermaid (rule_visualization_guide 적용).
- Tier별 색상 컨벤션 적용 (study_{domain}.md 정의에 따라).

### 4-2. file 모드
- $$output_target 디렉토리에 Tier 트리를 폴더 + 마크다운으로 매핑.
- Container는 폴더 + index.md, Leaf는 단일 .md 파일.
- 다이어그램은 mermaid 코드블록.

### 4-3. console 모드
- 학습 트리 + 각 leaf의 OneLine·Background·Prerequisites·Definition만 미리보기 출력.
- 전체 노트 본문은 출력하지 않음 (대화 가독성 유지).
- 후속 작업이 필요한 경우 file/notion 모드로 재실행 안내.

## Step 5. 검증 + 피드백 루프
### SKILL 고유 검증 항목
- 생성된 페이지/파일의 제목이 study_{domain}.md 컨벤션을 따르는가
- Tier 색상이 컨벤션과 일치하는가 (notion 모드)
- ATTITUDE 위반이 없는가 (페이지 수 과다, 공식문서 link 누락, 다이어그램 누락 등)
- TEMPLATE 필수 섹션이 leaf 페이지에 존재하는가 (조건부 섹션 제외)

### SKILL 고유 피드백 항목
- 학습 차원 선별이 적절했는가
- 페이지 분량 분배가 ATTITUDE에 부합하는가
- 추가/삭제/병합할 페이지가 있는가
- 다른 도메인(study_{domain}.md) 신규 생성 요청이 있는가

# Output
- Step별 작업 요약
  - Step 0. 수집 변수 (DOMAIN, TARGET, output_mode, scope) + 회의 결과
  - Step 1. 로드된 reference 요약 (학습 차원 수, ATTITUDE 핵심 원칙)
  - Step 2. 확보된 TEMPLATE 출처 (notion 페이지 ID 또는 study_{domain}.md 인용)
  - Step 3. 확정된 학습 트리 (Tier별 페이지 수, 1차/2차 분리)
  - Step 4. 생성 결과 (페이지/파일 목록, 출력 위치)
  - Step 5. 검증 체크리스트 + 피드백 루프 횟수

# Next Skills
| 후속 Skill | 조건 | 입력 매핑 |
|---|---|---|
| skill_notion_writer | file 모드로 생성 후 Notion 이전 시 | 생성된 마크다운 → $$source_path |
| skill_sangmin | 생성된 학습 노트로 토론·검증 학습 진행 시 | 학습 주제 → $$topic |
| skill_prompt_manager | 신규 도메인(study_{domain}.md) 추가 시 | 도메인 정의 → UPDATE 모드 |
