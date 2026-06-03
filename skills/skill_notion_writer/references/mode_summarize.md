---
name: mode_summarize
description: skill_notion_writer 의 summarize 모드 상세 reference. $$mode=summarize 확정 시 Step 0-1 에서 로드. 마크다운 파일/디렉토리·외부 URL 문서를 요약·변환한다.
type: reference
---

# summarize 모드 (skill_notion_writer)

> 마크다운 파일/디렉토리·외부 URL 문서를 읽어 요약·변환한다. $$mode=summarize 확정 시 본 reference 를 로드하여 변수·절차·규칙·검증을 적용한다.

## 변수
- $$source_input: 소스 입력 (마크다운 파일/디렉토리 경로 또는 외부 URL, 필수)
- $$source_type: 입력 종류 (markdown_file / url, $$source_input 으로부터 자동 판별 — http/https 로 시작하면 url, 아니면 markdown_file)
- $$target_tech: 학습/정리 대상 기술명 (url 서브모드 필수, markdown_file 서브모드 선택)
- (하위호환) $$source_path: 기존 변수명. 입력 시 자동으로 $$source_input 에 매핑.

## Step 1 절차 (소스 분석)
$$source_type 에 따라 분기한다. SKILL.md 1-C 공통 추출 전략을 적용한다.

### markdown_file 서브모드
- $$source_input 이 디렉토리면 하위 마크다운 전체 읽기
- $$source_input 이 파일이면 해당 파일 읽기
- 핵심 내용, 구조, 다이어그램, 코드 블록 등 파악

### url 서브모드
- WebFetch 로 $$source_input 본문 retrieve
- 문서 유형 식별: API reference / tutorial / specification / conceptual / release notes / blog post 중 분류
- 핵심 섹션 추출:
  - Title & Overview (제목·개요)
  - Background & Philosophy (배경·철학, $$target_tech 의 존재 이유)
  - Key concepts and definitions (핵심 개념·정의)
  - QuickStart (빠른 시작 / 설치 / 첫 예제)
  - Core Components & 원리 (주요 컴포넌트·구성 요소)
  - Code examples and snippets (코드 예제)
  - Configuration options or parameters (설정·파라미터)
  - Best practices and warnings (모범 사례·경고·주의점)
  - Related resources and links (관련 리소스)

## 규칙
- $$source_type=url 인 경우 WebFetch 도구로 본문을 retrieve 한다 (대안 fetch 도구 부재 시 WebFetch 가 1차 선택)
- url 서브모드로 생성된 페이지에는 반드시 원본 URL 을 명시 (상단 메타 또는 "원본 출처" 섹션)

## Error Handling
- **URL 접근 불가** ($$source_type=url, WebFetch 실패): 사용자에게 즉시 알리고, (a) 대체 URL, (b) 캐시된 마크다운 파일, (c) 수동으로 붙여넣은 본문 중 선택을 요청. 임의 보간/추측 금지.
- **대용량 문서**: 토큰 한계로 단일 페이지에 전부 담기 어려운 경우 사용자 확인 후 (a) 다중 페이지(챕터/섹션 분할), (b) 핵심 섹션만 우선 정리 중 선택. 임의 절단 금지.

## Completeness 추가 항목 (Step 5)
- [ ] (url) 원본 문서 URL 이 페이지에 포함되어 있는가?
