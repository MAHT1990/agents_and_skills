---
name: skill_guide_doc
description: 주어진 소스코드를 분석하여, guide docs를 작성하는 스킬. 발동조건은 소스코드 path를 입력받고, 문서 작성 요청을 받은 경우 발동한다.
---
# Variable
- $$src_path = <the path of source code> (user input)
- $$guide_path = <the path of guide docs> (default: $$src_path/docs)
- $$scope: 분석 범위
  - 프론트엔드: "FRONT", "front", "프론트", "프론트엔드"
  - 백엔드: "BACK", "back", "백", "백엔드"
# References
- $$api-server-scaffolding = "./references/api-server-scaffoling.md"
- $$client-scaffolding = "./references/client-scaffoling.md"

# Action
## Step1. 변수 확인
- $$src_path를 확인하고, 사용자에게 입력받으시오.
- $$guide_path를 확인하고, 사용자에게 입력받으시오.
- $$scope를 확인하고, 사용자에게 입력받으시오.
## Step2. Scope에 따른 작성 영역 결정
- 프론트엔드일 경우, $$client-scaffolding 을 참고하여 작성하시오.
- 백엔드일 경우, $$api-server-scaffolding 을 참고하여 작성하시오.
- 둘 다일 경우, 두 문서를 참고하여 작성하시오.