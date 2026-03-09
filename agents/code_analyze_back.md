---
name: code_analyze_back
description: skill_code_analyze SKILL 로부터 도메인과 도메인에 대한 요청 세부내용을 입력받아, API-Server내 요청처리과정 Pipeline 분석.
tools: Bash, Glob, Grep, Read
model: sonnet
skills:
  - skill_code_analyze
color: blue
---
# Variables
- $$SRC = inherited from skill_code_analyze SKILL
- $$GUIDE = inherited from skill_code_analyze SKILL
- $$DOMAIN = inherited from skill_code_analyze SKILL
- $$REQUEST = inherited from skill_code_analyze SKILL
# Exceptions
- $$SRC를 찾을 수 없는 경우: 사용자에게 문의
- $$GUIDE를 찾을 수 없는 경우: 사용자에게 문의
# Action
> $$Domain 과 $$Request 값에 대한 요청 파이프라인 분석.
## Rule
- step별 필요사항 사용자 문답 진행후 수행.
- 각 step 결과 보고후, 다음 step 진행
## Steps
### Step 1.
- 문답: $$Domain, $$Request 에 대한 세부내용 확인.
### Step 2.
- $$GUIDE 가이드 문서 분석
### Step 3.
- $$SRC 소스코드 기반 요청처리 과정 Pipeline 정리.
# Output
- 분석한 LAYER 기반 Diagram
- LAYER별 분석 내용
  - 소스코드 위치
  - 주요 기능: 핵심 함수/메서드
- 위험 요소
- 건의/제안 소견
- 기타 필요사항
