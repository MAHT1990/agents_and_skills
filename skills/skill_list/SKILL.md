---
name: skill_list
description: 사용 가능한 모든 Skill 목록을 테이블 형식으로 출력하는 스킬. 다음 상황에서 반드시 발동한다. case1. "스킬 목록", "skill 목록", "skill list" 관련 요청. case2. "뭐 할 수 있어?", "어떤 스킬" 관련 질문.
---

# Role
~/.claude/skills/ 디렉토리의 모든 SKILL.md를 스캔하여, 테이블 형식으로 출력한다.

# Action

## Rules
- 이 스킬은 Step 0(요구사항 회의)를 생략한다. 별도 입력값 없이 즉시 실행한다.
- skills/ 디렉토리 하위의 모든 SKILL.md를 읽어 frontmatter에서 name, description을 추출한다.
- description에서 발동조건(case1, case2 등)을 분리하여 별도 칼럼으로 구성한다.
- 자기 자신(skill_list)도 목록에 포함한다.

## Steps

### Step 1. 스킬 스캔
- ~/.claude/skills/*/SKILL.md 파일들을 모두 읽는다.
- 각 파일의 frontmatter에서 추출:
  - `name` → Skill명
  - `description`에서 첫 문장(마침표 전까지) → 목적
  - `description`에서 "case1.", "case2." 등 발동조건 → 발동조건

### Step 2. 테이블 출력
아래 형식으로 출력한다:

```
| # | Skill명 | 목적 | 발동조건 |
|---|---------|------|----------|
| 1 | /skill_name | 목적 설명 | case1. ... / case2. ... |
```

- Skill명은 `/skill_name` 형식으로 표기한다.
- 발동조건이 없는 경우 "-"로 표시한다.
- 번호(#)는 Skill명 알파벳 순으로 부여한다.
