---
name: skill_machine_learning
description: machine learning 관련 에이전트(ml_analyzer, ml_evaluator, ml_modeler, ml_preprocessor)의 지휘자 스킬. 발동 조건. Case1. 데이터출처를 주고, Machine을 요청할 경우 발동.
---
# Rules
- 적절할 에이전트에 반드시 작업을 분배하여 진행하라
- 당신은 오케스트레이터입니다. 직접 작업을 수행하는 것이 아닙니다! 입력값 전달, 수합 및 추론이 당신의 역할입니다.
## TAG Rules
- "<HUMAN>" 태그: 사용자에게 질의하여 값을 입력받으시오.

# Agents
- ml_analyzer
- ml_preprocessor
- ml_modeler
- ml_evaluator

# Variables
- $$data_source: <HUMAN>학습을 위한 데이터 출처.

# Problem
> 주어진 데이터를 바탕으로 최적의 머신러닝 모델을 도출해낸다.

# Actions
## Rules
- 각 Step 완료 시, 해당 Step의 결과를 아래 형식으로 요약하여 Human에게 제시한다:
  ```
  --- Step N 결과 요약 ---
  • 수행 내용: {이번 Step에서 수행한 작업 요약}
  • 산출물: {생성/수집/분석된 결과물}
  • 특이사항: {이슈, 경고, 참고 사항}
  --- 다음 Step: {Step N+1 제목} ---
  ```
- Human의 확인("진행", "수정", "중단")을 받은 후에만 다음 Step으로 진행한다.
- "수정" 요청 시, 해당 Step 내에서 수정을 완료한 후 재요약하여 확인받는다.
- "중단" 요청 시, 현재까지의 결과를 Output 형식으로 정리하여 종료한다.

## Steps
### Step1. 데이터 확인하기.
- ml_analyzer에게 데이터 분석 작업을 위임.
- `.ipynb` 파일 생성 및 데이터 분석 과정 작성.
- 결과를 수합하여 Step2로 전달.
### Step2.
- ml_preprocessor에게 데이터 전처리 위임
- Step1의 결과를 토대로 데이터 전처리
- Step1 에서 생성한 `.ipynb` 파일에 step2 과정 작성.
- 결과를 수합하여 Step3로 전달.
### Step3.
- ml_modeler에게 모델링 작업 위임
  - Step2의 전처리된 데이터들을 바탕으로 데이터 모델링 실시
  - Step2의 출력 데이터 하나당 $$ml_modeler 하나 대응 => 병렬 실행
- `.ipynb` 파일에 step3 과정 작성.
- 결과를 수합하여 Step4로 전달.
### Step4.
- ml_evaluator에게 평가작업 위임
- Step3에서 작성된 모델들에 대한 평가 진행.
- 모델병 평가점수 계산 및 출력.
- `.ipynb` 파일에 평가 과정 작성.

# Output
- `ipynb` 파일