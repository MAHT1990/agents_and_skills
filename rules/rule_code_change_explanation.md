---
name: rule_code_change_explanation
description: 코드 수정(Edit/Write/NotebookEdit) 또는 인라인 코드 제시 시, 핵심 동작·문법적 특징·활용 패턴을 즉시 설명. 디폴트는 짧은 양식, verbose 요청 시 라벨형 3블록으로 확장.
paths:
  - "**/*"
---

# 코드 변경 설명 규칙

코드 수정 직후, 변경 의도를 즉시 파악할 수 있도록 설명을 함께 제시한다.

## 적용 컨텍스트
- `Edit` / `Write` / `NotebookEdit` 도구 호출 직후
- 응답 본문에 인라인 코드 블록을 제시한 경우

## 스킵 컨텍스트
- 메모리 파일(`memory/*.md`) 단순 갱신 — 메모리 자체가 자기설명적
- prompt 관리 메타 파일 편집(`skills/**/SKILL.md`, `agents/**/*.md`, `rules/**/*.md`) — skill_prompt_manager가 별도 보고
- 사용자가 명시적으로 설명 생략 요청 ("조용히", "설명 생략", "no comment" 등)
- 단순 typo·whitespace·formatting 수정 (의미 변경 없음)

## 규칙

### 발동 시점
- 도구 호출 직후 **별도 텍스트 라인**으로 출력
- end-of-turn 요약에 통합 금지 (변경-설명 시간 분리 시 추적 곤란)

### 디폴트 양식 (짧은 양식)
- 한 줄 헤더로 식별: `{file:line 또는 식별자}`
- 본문은 개조식 1~3 bullet:
  - 핵심 동작: 의미 전달에 필요한 만큼 verbose 허용 (1줄 압축 강제 X)
  - 문법적 특징: 1줄
  - 활용 패턴: 1줄
- 변경 의미가 사소하면 핵심 동작 1 bullet만 작성 가능

### verbose 양식 (사용자가 "verbose / 자세히 / 상세히" 요청 시)
- 라벨형 3블록 구조:
  - **핵심 동작**
    - 입력 → 처리 → 출력
    - 사이드이펙트, 호출 컨텍스트
    - 변경 전/후 차이
  - **문법적 특징**
    - 사용된 언어/프레임워크 문법 포인트 (타입 추론, async/await, 데코레이터, 매크로, 제네릭 등)
  - **활용 패턴**
    - 디자인 패턴·관용구·아키텍처적 의미 (Strategy, DI, Higher-order, Memoization, Fail-fast 등)
- 필요 시 Before/After diff 요약 1~2 bullet 추가 가능

### 다중 변경 처리
- 파일/위치별 **각 변경 직후마다** 짧은 양식 설명 부착
- 동일 파일 내 연속 Edit가 한 의도로 묶이면 마지막 Edit 직후 1회로 통합 가능

### 톤·형식
- 개조식 우선, 문장식 회피
- 군더더기 도입부 ("이 변경은…", "여기서는…") 생략
- 사용자 메모리(`feedback_*`)의 간결성·자율성 선호 존중

## 형식

### 짧은 양식 예시
```
rules/rule_X.md:12
- 핵심 동작: paths 필드를 단일 경로에서 와일드카드 배열로 확장하여 모든 마크다운 파일에 rule이 자동 적용되도록 변경
- 문법적 특징: YAML frontmatter 배열 문법
- 활용 패턴: glob 패턴으로 적용 범위 일괄 지정
```
```
src/auth.ts:34
- 핵심 동작: 요청 헤더의 Bearer 토큰을 추출, jose 라이브러리로 서명·만료 검증 후 payload 반환. 검증 실패 시 throw로 상위 미들웨어에 위임
- 문법적 특징: async/await + try-catch
- 활용 패턴: 인증 게이트, Fail-fast
```

### verbose 양식 예시
```
src/auth.ts:34 (verifyToken)

핵심 동작
- Authorization 헤더에서 "Bearer " prefix 제거 후 토큰 추출
- jose.jwtVerify(token, JWKS)로 서명·만료·issuer 검증
- 검증 성공 시 JWTPayload 반환, 실패 시 UnauthorizedError throw
- 호출 컨텍스트: Express 미들웨어 체인의 인증 게이트
- 변경 전: 단순 secret 검증 / 변경 후: JWKS 기반 비대칭 키 검증

문법적 특징
- TypeScript Promise<JWTPayload> 반환 타입
- jose 라이브러리의 비동기 검증 API
- 사용자 정의 Error 클래스 throw

활용 패턴
- 미들웨어 체인의 인증 게이트
- Fail-fast: 예외를 상위로 위임하여 응답 분기 단순화
- JWKS rotation 대응 (비대칭 키 검증)
```

## 예외
- 본 RULE이 정의된 메타 영역(`skills/skill_prompt_manager/**`, `rules/**`) 내부 작업은 skill_prompt_manager 보고 형식 우선
- skill·agent 정의에서 별도 코드 변경 보고 정책을 명시한 경우 해당 정책 우선
