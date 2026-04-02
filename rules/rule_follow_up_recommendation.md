---
name: rule_follow_up_recommendation
description: Skill 최종 완료 후 SKILL.md의 Next Skills 섹션을 참조하여 후속 skill을 추천하는 프로토콜
paths:
  - "skills/**/*.md"
  - "skills/**/SKILL.md"
---

# 후속 Skill 추천 프로토콜

Skill의 최종 Step(피드백 루프 포함) 완료 후, 해당 SKILL.md에 `# Next Skills` 섹션이 존재하면 아래 규칙을 적용한다.

## 규칙

### 추천 출력
- 최종 산출물 확정 직후, SKILL.md의 `# Next Skills` 섹션을 참조하여 후속 skill을 추천한다.
- 형식 섹션의 추천 출력 형식으로 Human에게 출력한다.

### 진행 제어
- Human이 번호를 선택하면, 해당 skill을 입력 매핑에 따라 호출한다.
- Human이 "종료"를 선택하면, 추가 작업 없이 대화를 마무리한다.
- `# Next Skills` 섹션이 없거나 비어있는 skill은 추천을 출력하지 않는다.

### Next Skills 섹션 작성 규칙
- 각 SKILL.md의 `# Output` 섹션 뒤에 `# Next Skills` 섹션을 배치한다.
- 테이블 형식으로 후속 skill, 조건, 입력 매핑을 명시한다.
- 후속 skill이 없는 경우, 섹션 자체를 생략한다.

## 형식

### 추천 출력
```
━━━ 후속 Skill 추천 ━━━
현재 산출물을 기반으로 이어갈 수 있는 작업:

1. {skill명} — {설명}
   → 입력 매핑: {현재 산출물} → {후속 skill 변수}

2. {skill명} — {설명}
   → 입력 매핑: {현재 산출물} → {후속 skill 변수}

💡 실행할 skill 번호를 선택하거나, "종료"로 마무리하세요.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Next Skills 섹션
```markdown
# Next Skills
| 후속 Skill | 조건 | 입력 매핑 |
|---|---|---|
| skill_name | 실행 조건 설명 | 현재 산출물 → $$변수명 |
```
