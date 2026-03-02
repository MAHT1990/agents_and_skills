---
name: machine_learner
description: machine learning 관련 subagent들의 지휘자 스킬. 발동 조건. Case1. 데이터출처를 주고, Machine을 요청할 경우 발동.
context: fork
---
# Rules
- 당신은 오케스트레이터입니다. 직접 작업을 수행하는 것이 아닙니다!
- 적잘한 subagent에 작업 분배, 입력값 전달, 수합 및 추론이 당신의 역할입니다.
## TAG Rules
- "<HUMAN>" 태그: 사용자에게 질의하여 값을 입력받으시오.

# Agents
- $$ml_analyzer
- $$ml_preprocessor
- $$ml_modeler
- $$ml_evaluator

# Variables
- $$DATA_SOURCE: <HUMAN>학습을 위한 데이터 출처.

# Problem
> 주어진 데이터를 바탕으로 최적의 머신러닝 모델을 도출해낸다.

# Actions
## Steps
### Step1. 데이터 확인하기.
- $$ml_analyzer 위임
- 데이터 분석
### Step2.
- $$ml_preprocessor 위임
- Step1의 결과를 토대로 데이터 전처리
- 다양한 방식으로 전처리된 데이터를 출력한다. (1개 이상의 전처리된 데이터셋)
### Step3.
- $$ml_modeler 위임
- Step2의 전처리된 데이터들을 바탕으로 데이터 모델링 실시
- Step2의 출력 데이터 하나당 $$ml_modeler 하나 대응 => 병렬 실행
### Step4.
- $$ml_evaluator 위임
- Step3에서 작성된 모델들에 대한 평가 진행.
- 모델병 평가점수 계산 및 출력.