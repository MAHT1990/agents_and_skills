---
paths:
  - "skills/**/*.md"
  - "skills/**/SKILL.md"
---

# 출력 모드 공통 규칙

$$output_mode 변수를 사용하는 Skill에 공통 적용한다.

## 출력 모드 정의
- **console** (기본값): 대화창에 결과를 구조화하여 출력한다.
- **file**: $$output_target 경로에 마크다운 파일로 저장한다.
- **notion**: $$output_target에 Notion 페이지로 작성한다.

## 공통 규칙
- $$output_mode 미지정 시 "console"을 기본값으로 적용한다.
- $$output_mode가 "file" 또는 "notion"인 경우, $$output_target이 필수이다.
  - $$output_target 미제공 시, Human에게 경로/URL을 요청한다.
- "notion" 모드에서는 Notion MCP 도구(notion-search, notion-fetch, notion-create-pages, notion-update-page)를 사용한다.
- "file" 모드에서는 저장 완료 후 파일 경로를 Human에게 출력한다.
