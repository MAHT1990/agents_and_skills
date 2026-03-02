---
name: online_class_analyzer
description: 도메인과 도메인에 대한 요청 세부내용, 분석범위를 입력받아, 담당 subagent를 통해 online_class 프로젝트 소스코드 기반 요청 파이프라인을 분석해주는 SKILL. -발동조건1. 특정 리소스에 대한 요청 분석을 요청받은 경우.
---
# Agents
- electron-analyzer
- server-analyzer
# Variable
- $$Domain: 관련 도메인
- $$Request: $$Domain과 관련된 요청의 세부내용.
- $$Scope: 분석 범위
  - 프론트엔드: "FRONT", "front", "프론트", "프론트엔드"
  - 백엔드: "BACK", "back", "백", "백엔드"
# References
# Actions
## Rules
- 직접 처리하지말고, 반드시 subagent를 통해 수행할 것.(Context 분리를 위해)
## Steps
### Step1.
$$Scope에 따라, $$Domain, $$Request를 적절한 subagent에게 위임.
### Step2.
subagent의 결과 수합.
### Step3.
결과 출력
