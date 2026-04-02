---
name: rule_skill_execution_protocol
description: Skill 발동 시 Quick Help 출력, Step 완료 결과 보고, 진행/수정/중단 제어를 정의하는 실행 프로토콜
paths:
  - "skills/**/*.md"
  - "skills/**/SKILL.md"
---

# Skill 실행 프로토콜

Skill 발동부터 종료까지의 실행 흐름을 제어한다.

## 규칙

### Quick Help 출력
- **skill 발동 즉시, 해당 파일의 frontmatter(name, description), Variables, Steps 섹션을 파싱하여 아래 Quick Help 형식으로 Human에게 출력한 후 첫 Step부터 진행한다.**

### Step 완료 시 결과 보고
- 각 Step 완료 시, 해당 Step의 결과를 형식 섹션의 Step 결과 보고 형식으로 요약하여 Human에게 제시한다.

### 진행 제어
- Human의 확인("진행", "수정", "중단")을 받은 후에만 다음 Step으로 진행한다.
- "수정" 요청 시, 해당 Step 내에서 수정을 완료한 후 재요약하여 확인받는다.
- "중단" 요청 시, 현재까지의 결과를 Output 형식으로 정리하여 종료한다.

## 형식

### Quick Help
```
{name} — {description 첫 문장}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ 입력값
  {Variables 섹션의 각 $$변수를 "$$변수명 : 설명 (필수/선택, 기본: 값)" 형태로 나열}

▶ 진행 단계
  {Steps 섹션의 각 Step을 "Step N. 제목" 형태로 나열}

💡 각 Step 완료 후 "진행" / "수정" / "중단"으로 응답하세요.
```

### Step 결과 보고
```
--- Step N 결과 요약 ---
• 수행 내용: {이번 Step에서 수행한 작업 요약}
• 산출물: {생성/수집/분석된 결과물}
• 특이사항: {이슈, 경고, 참고 사항}
--- 다음 Step: {Step N+1 제목} ---
```
