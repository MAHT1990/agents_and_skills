---
name: skill_structure
description: SKILL.md 파일 골격 및 섹션 컨벤션. skill_prompt_manager가 SKILL CREATE/UPDATE 시 자동 로드.
type: reference
---

# SKILL.md 골격 가이드

> SKILL은 오케스트레이터다. Step 흐름 정의, 변수 수집, subagent 위임, 산출물 검증을 담당한다.

## 1. 필수/선택 섹션

| 섹션 | 필수 | 역할 |
|---|---|---|
| frontmatter | 필수 | name, description (트리거 매칭용) |
| `# Goal` 또는 `# Role` | 필수 | SKILL의 존재 이유 1~2줄 |
| `# Variables` | 필수 | 입력 변수 정의 |
| `# References` | 선택 | 참조 문서 매핑 (있는 경우만) |
| `# Subagents` / `## Subagents` | 선택 | subagent 위임 시 정의 |
| `# Action` 또는 `## Steps` | 필수 | Step 흐름 |
| `# Error Handling` | 필수 | SKILL 고유 에러 처리 |
| `# Output` | 필수 | 산출물 명세 |
| `# Next Skills` | 선택 | 후속 SKILL 매핑 |

## 2. frontmatter

```yaml
---
name: skill_xxx
description: {핵심 역할 1줄} + {발동 트리거 case1./case2./case3.}
---
```

- `name`: `skill_` 접두 + snake_case
- `description`: 자연어 트리거 매칭용, 발동 case를 `case1./case2./case3.` 형태로 명시
- LLM이 트리거 매칭 시 이 description을 본다

## 3. Goal / Role 섹션

- 1~2줄 문장식 (`>` 인용 블록 허용)
- "이 SKILL이 무엇이고 왜 존재하는가"만 명시
- 상세 동작은 Action/Steps에서 기술

## 4. Variables 섹션

- 변수 prefix `$$` 사용 (예: `$$TYPE`, `$$output_mode`)
- 각 변수: 설명 + 필수/선택 + 기본값 + 유형
- 형식:
  ```markdown
  - $$VAR_NAME: 설명 (필수/선택, 기본: 값)
    - 옵션1: 의미
    - 옵션2: 의미
  ```

## 5. References 섹션 (선택)

- 참조 reference 파일을 변수로 매핑
- 정적 매핑 형식:
  ```markdown
  # References
  - $$ref_name = "./references/file.md"
  ```
- 동적 치환 패턴: `$$ref_{var}` (예: `$$study_{domain}`)
- Step 흐름에서 reference 로드 시점을 명시할 것

## 6. Subagents 섹션 (선택)

- subagent에게 위임하는 SKILL은 반드시 포함
- 표 형식으로 Name / Scope / Role / Description 명시
- Constraints for Subagents: subagent 간 직접 통신 금지, 오케스트레이터 경유 강제

## 7. Steps 섹션

### 7-1. Step 0 패턴 (필수)
- **0-1. 변수 수집**: 필수 변수 확보
- **0-2. 요구사항 구체화 회의**: Human-in-the-Loop 루프
- **0-3. 최종 승인**: 요구사항 확인서 제시

### 7-2. Step N 패턴 (N≥1)
- 헤더 직후 1줄 문장식 도입 (선택)
- 본문은 개조식
- Human 확인 필요 Step은 `(Human Confirm Required)` 명시
- subagent 위임 시 전달 정보·기대 결과 명시

### 7-3. 최종 Step 패턴
- 산출물 검증 Step (SKILL 고유 검증 항목)
- 피드백 루프 Step (글로벌 `rule_feedback_loop`가 N-1~N-4 자동 적용)

## 8. 글로벌 rules 자동 적용 영역 — 인라인 작성 금지

신규 SKILL 생성 시 아래는 SKILL.md에 인라인으로 작성하지 않는다. 글로벌 rules가 자동 적용한다.

| 영역 | 담당 rule |
|---|---|
| Quick Help 출력 | `rule_skill_execution_protocol` |
| Step 결과 보고 형식 | `rule_skill_execution_protocol` |
| 진행/수정/중단 제어 | `rule_skill_execution_protocol` |
| 피드백 루프 N-1~N-4 | `rule_feedback_loop` |
| `$$output_mode` 공통 분기 | `rule_output_mode` |
| Step 0 변수 수집 일반 규칙 | `rule_variable_collection` |
| 산출물 검증 일반 체크리스트 | `rule_verification_checklist` |
| 후속 Skill 추천 | `rule_follow_up_recommendation` |
| 시각화 가이드 | `rule_visualization_guide` |
| 공통 에러 핸들링 | `rule_error_handling_common` |
| 코드 변경 설명 | `rule_code_change_explanation` |

단, SKILL 고유 검증 항목·피드백 항목·에러는 SKILL.md에 명시한다.

## 9. Output 섹션

- Step별 산출물 요약
- 형식:
  ```markdown
  # Output
  - Step N. {산출물 요약}
  ```

## 10. Next Skills 섹션 (선택)

- 표 형식으로 후속 SKILL 매핑
- 형식:
  ```markdown
  # Next Skills
  | 후속 Skill | 조건 | 입력 매핑 |
  |---|---|---|
  | skill_xxx | 실행 조건 | 산출물 → $$변수 |
  ```

## 11. 디렉토리 구조

```
skills/skill_xxx/
├── SKILL.md              ← 필수
├── references/           ← 선택 (참조 문서)
│   ├── INDEX.md          ← 선택 (다수 reference 시)
│   └── {도메인}.md
└── templates/            ← 선택 (출력 템플릿)
```

## 12. 안티패턴

- 글로벌 rules에서 커버하는 공통 규칙 인라인 복제
- Variables 없이 Step부터 시작
- Error Handling 누락
- description에 트리거 case 누락
- Step 사이에 검증·승인 게이트 없음
- subagent 위임 SKILL인데 `# Subagents` 섹션 없음
