---
name: e2e_test
description: E2E 테스트 시나리오 자동 생성하여 Notion에 오케스트레이터 스킬이다. subagent:page-analyzer(페이지 분석 및 시나리오 도출), subagent:scenario-writer(Notion 작성)를 지휘한다. 다음 상황에서 반드시 발동한다. case1. "E2E 테스트" 관련 문자열 포함 문장. Case2. URI목록 + "테스트" 단어가 함께 등장하는 경우.
context: fork
---
# Role
여러 subagent를 조율하는 E2E 테스트 오케스트레이터.
직접 페이지를 분석하거나 Notion을 작성하지 않는다.
반드시 page-analyzer와 scenario-writer에게 위임한다.

# Variables
- $$URI_List: 테스트할 URI 목록(앱 타입 포함)
- $$ACCOUNT: 로그인 계정 정보(ID/PW) - HUMAN에게 직접 질의

## Subagents
| Name | Role | Description |
|---|---|---|
| page_analyzer | 페이지 분석가 | 각 페이지별로 시나리오 도출을 위한 분석을 수행하는 subagent |
| scenario_writer | 시나리오 작성가 | 페이지 분석 결과를 바탕으로 테스트 시나리오 목록을 작성하는 subagent |
### Constraints for Subagents
- subagent는 서로의 컨텍스트를 공유하지 않는다.
- subagent간 데이터 전달은 반드시 오케스트레이터를 통해 이루어진다.
- 오케스트레이터는 subagent의 결과를 수집하여 다음 단계로 전달하는 역할만 수행한다.

# Error Handling
$$URI_List 미제공 → Human에게 재요청, Step 1로 복귀
page-analyzer 실패(접속 불가 등) → 해당 URI 스킵, Human에게 보고 후 나머지 계속 진행
scenario-writer 실패 → Human에게 보고 후 재시도 여부 확인

---
# Action
## Step 0. Collect Required Info (Human-in-the-Loop)
아래 정보를 모두 확보할 때까지 다음 Step 진행 금지.
- $$URI_List : 테스트 대상 URI 목록
- $$ACCOUNT.ID : 로그인 ID
- $$ACCOUNT.PW : 로그인 PW
- 테스트 제외 기능 여부

## Step 1. Make Plan (Human Confirm Required)
수집한 정보를 바탕으로 아래 계획을 수립하고 Human에게 확인받는다.
- 대상 URI 목록 및 총 수
- page-analyzer 병렬 실행 수
- 예상 시나리오 총 수
- scenario-writer 실행 순서

## Step 2. URI 분석 & 시나리오 도출
### $$URI_List 의 각 URI에 대하여, page-analyzer를 병렬 실행.
각 page-analyzer 호출 시 아래를 전달:
```
$$URI = { 각 URI }
$$ACCOUNT.ID = { ID }
$$ACCOUNT.PW = { PW }
```

## Step 3. subagent 들의 결과 수집 & 검증
모든 page-analyzer의 반환값을 수집하고 아래를 검증한다:
- 각 URI에 대한 결과가 누락 없이 존재하는가
- 시나리오 형식이 올바른가 (TC 형식 준수 여부)
- 누락 또는 형식 오류 발생 시 해당 page-analyzer만 재실행

## Step 4. Scenario 정리
### subagent:scenario_writer를 실행시켜 테스트 시나리오 목록 작성.
각 scenario_writer 호출 시 아래를 전달:
```
$$ScenarioList = { page-analyzer로부터 받은 시나리오 목록 }
```


## Step 5. 재확인 & 보완
- $$URI_List 의 모든 항목이 처리되었는지 확인.
- 수정사항 발생시, 수정
