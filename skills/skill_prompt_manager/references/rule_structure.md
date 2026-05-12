---
name: rule_structure
description: RULE.md(글로벌 ~/.claude/rules/) 파일 골격 및 섹션 컨벤션. skill_prompt_manager가 RULE CREATE/UPDATE 시 자동 로드.
type: reference
---

# RULE.md 골격 가이드

> RULE은 자동 적용되는 횡단 정책이다. paths에 매칭되는 파일 작업 시 SKILL/AGENT 동작에 자동으로 합쳐진다.

## 1. 필수/선택 섹션

| 섹션 | 필수 | 역할 |
|---|---|---|
| frontmatter | 필수 | name, description, paths |
| `# {Rule 제목}` | 필수 | 적용 대상·시점 1~2줄 |
| `## 적용 컨텍스트` | 권장 | RULE이 발동하는 상황 |
| `## 스킵 컨텍스트` | 권장 | RULE을 건너뛰는 상황 |
| `## 규칙` | 필수 | 핵심 규칙 항목 |
| `## 형식` | 선택 | 출력 포맷이 있는 경우 |
| `## 예외` | 권장 | SKILL/AGENT 개별 정의가 우선하는 경우 |

## 2. frontmatter

```yaml
---
name: rule_xxx
description: 한 줄 설명 (자동 적용 조건 또는 정책 요약)
paths:
  - "skills/**/*.md"
  - "skills/**/SKILL.md"
  - "agents/**/*.md"
  - "rules/**/*.md"
  - "**/*"
---
```

### 2-1. name
- `rule_` 접두 + snake_case
- 정책 영역을 식별할 수 있는 명사형 이름

### 2-2. description
- RULE이 무엇을 강제·가이드하는지 1줄
- "~할 때 ~를 적용한다" 형식 권장

### 2-3. paths
- 적용 범위를 glob 패턴 배열로 명시
- 흔한 패턴:

| 적용 범위 | paths |
|---|---|
| 전체 코드 | `"**/*"` |
| SKILL.md만 | `"skills/**/SKILL.md"` |
| SKILL 전체 마크다운 | `"skills/**/*.md"` |
| AGENT 전체 | `"agents/**/*.md"` |
| prompt 메타 전체 | 위 3개 조합 |

## 3. 제목 + 도입

- `# {Rule 제목}` 한 줄
- 도입 1~2줄 문장식: 적용 대상·시점을 짧게 명시

## 4. 적용 / 스킵 컨텍스트 (권장)

- 어떤 상황에서 발동하고, 어떤 상황에서 건너뛰는지 명시
- 형식:
  ```markdown
  ## 적용 컨텍스트
  - {상황 1}
  - {상황 2}

  ## 스킵 컨텍스트
  - {스킵 상황 1}
  - {스킵 상황 2}
  ```

## 5. 규칙 섹션

- 핵심 규칙을 개조식으로 명시
- 하위 카테고리가 있으면 `###` 서브 헤더 사용
- 형식:
  ```markdown
  ## 규칙

  ### {카테고리 1}
  - 규칙 1
  - 규칙 2

  ### {카테고리 2}
  - ...
  ```

## 6. 형식 섹션 (출력 포맷 있는 RULE만)

- RULE이 특정 출력 포맷을 강제하면 코드블록으로 형식 명시
- 예시 출력 1~2개 첨부 권장
- 형식:
  ```markdown
  ## 형식

  ### {포맷 이름}
  ```
  {코드블록 예시}
  ```
  ```

## 7. 예외 섹션

- SKILL.md 또는 AGENT.md에 별도 정책이 명시된 경우 우선순위 명시
- 형식:
  ```markdown
  ## 예외
  - SKILL.md에 별도 정책 명시 시 SKILL.md 우선
  - {기타 예외 조건} → {우선 적용 정책}
  ```

## 8. 글로벌 RULE vs SKILL 내부 references/ 구분

| 위치 | 적용 방식 | 적합 케이스 |
|---|---|---|
| `~/.claude/rules/` | paths 매칭 자동 적용 | 횡단 정책 (모든 SKILL/AGENT 공통) |
| `skills/{skill}/references/` | SKILL.md `# References`에서 명시 로드 | SKILL 1개 한정 가이드·정책 |

- **자동 적용 hook이 필요하면** → 글로벌 RULE
- **SKILL 1개에서만 참조하면** → SKILL 내부 `references/`

## 9. 안티패턴

- paths 누락 → 자동 적용 안 됨
- 적용 컨텍스트 없이 무조건 적용 (오작동 위험)
- SKILL.md에 인라인으로 들어가도 될 수준의 SKILL-국소 규칙을 RULE로 빼냄
- description이 너무 추상적 → 트리거 매칭 모호
- 다른 RULE과 중복·충돌하는 정책 (정책 충돌 시 우선순위 명시 필수)
- paths가 너무 광범위 (`"**/*"`) 인데 적용 컨텍스트 미명시
