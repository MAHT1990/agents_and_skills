# Reference: study_lang
> $$DOMAIN = "LANG" 인 경우 skill_student가 로드하는 도메인 가이드.
> 프로그래밍 언어 학습 노트의 차원·태도·구조·컨벤션을 정의한다.

---

## 1. 학습 차원 (Dimensions)
프로그래밍 언어를 학습할 때 반드시 점검하는 8개 차원.
$$scope=full이면 전체, $$scope=partial이면 0-2 회의에서 선별한 차원만 다룬다.

| # | Dimension | 핵심 질문 |
|---|---|---|
| 1 | 컴파일 / 인터프리팅 | 소스코드가 어떤 과정으로 프로세스가 되는가? (전처리/컴파일/링크/실행) |
| 2 | Runtime 초기화 | Runtime 핵심 구성요소와 부팅 과정은? |
| 3 | 메모리 관리 | 할당 방식, GC, 자료형별 메모리 위치 (Stack/Heap, 불변/가변) |
| 4 | 의존성 처리 | 모듈/패키지 시스템, import 메커니즘, 의존성 해결 |
| 5 | Process / Thread | 동시성 모델, 멀티스레딩 지원 방식 |
| 6 | 비동기 / I/O | 비동기 프로그래밍 구현 방식, 이벤트 루프 등 |
| 7 | 문법적 특징 | 일급 함수, 다중 상속, 패턴 매칭 등 언어 고유 기능 |
| 8 | 적합 / 부적합 케이스 | 어떤 도메인에서 강점·약점을 보이는가, 그 이유는? |

> 매핑 원칙: 각 차원은 Tier 2(컨테이너) 또는 Tier 3(leaf) 페이지로 매핑한다.
> 차원 #1·#2·#3은 보통 `{언어}: 원리: {주제}` leaf로, #7은 `{언어}: 문법>` 컨테이너로 들어간다.

---

## 2. 학습 ATTITUDE (절대 원칙)
> 출처: Notion 페이지 "공부 ATTITUDE" (`21999e5fe8d74be5bcf1116eced20028`)
> skill_student가 노트를 생성할 때 반드시 준수.

- **공식문서 최우선** — 자료 정리도 공식문서 link를 기반으로. References 섹션에 공식문서 링크를 1순위로 배치.
- **Project 중심 학습** — "만들고 싶은 것"을 상상해놓고 그것에 필요한 부분만 학습. 0-2 회의에서 학습 동기를 반드시 확인.
- **다 정리하지 마라** — 핵심 작동원리 + 헷갈리는 부분만 정리한다. 예시 위주. 페이지 수 과다 시 Step 3에서 우선순위 재선별.
- **이해 먼저, 노트는 그 다음** — 노트 생성 전에 OneLine + Background를 먼저 확정.
- **복붙 금지** — 코드 예제는 반드시 테스트 가능해야 하고, "왜 그렇게 작성됐는지" Diagrams/Scenarios에 설명을 동반.
- **한 번에 다 X** — 도메인별로 끊어서 진행. 1차(필수) / 2차(선택) 페이지로 분리.

---

## 3. 페이지 계층 구조 (3-tier)

```
STUDY> (Notion 학습 루트, 537302f8d63e46d1977e1f16a26c1690)
└── LANG: {언어명}                            ← Tier 1: Cover
    ├── (옵션) OneLine + 사용처 + 정체성
    ├── {언어}: 역사
    ├── {언어}: 원리: {주제}                   ← Tier 3: Leaf (TEMPLATE 풀 적용)
    │      예) 원리: Compile 동작
    │           원리: CallByValue/CallByAddress
    │           원리: 메모리관리
    ├── {언어}: Install/Setting/Compile>       ← Tier 2: Container (`>` 접미사)
    ├── {언어}: 문법>                          ← Tier 2: Container
    │   ├── 예약어/built-in/Convention
    │   ├── 주석
    │   ├── 자료형>          ← 중첩 Container 가능
    │   ├── 변수 / 상수 / 연산자
    │   ├── 제어문 / 함수
    │   ├── 구조체(클래스)>
    │   ├── 메모리관리(built-in)
    │   └── Header / Macro / Module
    ├── {언어}: Library/Module / package/framework
    └── {언어}: 한계점
```

### Tier 정의
| Tier | 역할 | 본문 구조 | TEMPLATE 적용 |
|---|---|---|---|
| 1 (Cover) | 언어 표지 | OneLine + 사용처 + 자식 페이지 링크 | ❌ |
| 2 (Container) | 카테고리 묶음 | 자식 페이지 링크만 (선택: 짧은 OneLine) | ❌ |
| 3 (Leaf) | 실제 학습 단위 | TEMPLATE: STUDY 13 섹션 | ✅ 풀 적용 |

---

## 4. TEMPLATE: STUDY 13 섹션
> 출처: Notion 페이지 "TEMPLATE: STUDY" (`2e9c9b468ca0809eb076cd68fd4b413e`)
> Tier 3 (Leaf) 페이지의 골격.

| 섹션 | 필수 | 비고 |
|---|---|---|
| OneLine | ✅ | 페이지 한 줄(문단) 요약 |
| Background | ✅ | 역사 / 기술 / 문제정의 → 요구사항 → 솔루션 흐름 |
| Prerequisites | ✅ | mermaid 트리 + 선수지식 목록 |
| Definition | ✅ | Terminologies 필수 / Structure & Components 선택 |
| Props | ✅ | 핵심 속성·특성 |
| Basic Usage | 조건부 | API/SDK/Class 등 인터페이스인 경우만 (카테고리 → API → 예제) |
| FAQ / 흔한 오개념 | ✅ | |
| Diagrams | ✅ | mermaid 1개 이상 + 단계별 상세 설명 (필수) |
| Scenarios & Patterns & Conventions | ✅ | 실무 연결 포인트 포함 |
| 주의사항 | ✅ | 🚫 MustNOT (Situation+MustNot), ⚠️ Warning (Situation+MustNot) |
| Examples | ✅ | 난이도 태그 (초급/중급/고급), 발문 + Solution toggle |
| 추천 후속 학습 | ✅ | mermaid 트리 + 로드맵 표 (순서/주제/연결포인트/우선순위) |
| References | ✅ | 공식문서 링크 우선 |

---

## 5. 제목·색상·아이콘 컨벤션

### 제목
- **Tier 1 표지**: `LANG: {언어}` (예: `LANG: C`, `LANG: PYTHON`, `LANG: JavaScript & TypeScript`)
- **Tier 2 컨테이너**: `{언어}: {카테고리}>` — 끝에 반드시 `>` 접미사 (예: `C: 문법>`, `PYTHON: 반복문>`)
- **Tier 3 원리 leaf**: `{언어}: 원리: {주제}` (예: `C: 원리: Compile 동작`)
- **Tier 3 일반 leaf**:
  - 언어 직속: `{언어}: {카테고리}` (예: `C: 역사`, `C: 한계점`)
  - 카테고리 하위: `{카테고리}: {세부}` (예: `반복문: for문`)

### 색상 (Notion `color="..._bg"`)
| 위치 | 색상 |
|---|---|
| Cover 페이지 H1 / 원리 leaf H1 | `green_bg` |
| Diagrams 섹션 H1 | `orange_bg` |
| Scenarios & Patterns 섹션 H1 | `blue_bg` |
| 주의사항 섹션 H1 | `red_bg` |
| Examples 섹션 H1 | `pink_bg` |
| 추천 후속 학습 섹션 H1 | `purple_bg` |

### 아이콘
- Tier 1 표지: 언어 공식 아이콘 (예: C 로고, Python 로고). 없으면 `icons/square-dashed_{color}`.
- Tier 2 컨테이너: `icons/circle_green` 또는 도메인별 색.
- Tier 3 leaf: `icons/circle_green` (원리), `icons/first-aid_orange` (문법) 등 카테고리별.

---

## 6. 노트 생성 시 SKILL 동작 가이드

### Step 3 학습 계획 수립 시
1. 위 8개 학습 차원을 체크리스트로 사용. 누락 차원 확인.
2. $$TARGET 언어의 특성에 따라 차원별 우선순위 조정 (예: Python은 #6 비동기 비중 ↑, C는 #3 메모리관리 비중 ↑↑).
3. 1차 페이지 ≤ 10개 권장 ("다 정리하지 마라" ATTITUDE).
4. 트리 출력 형식:
   ```
   📚 LANG: {TARGET} 학습 트리 (1차 N개 / 2차 M개)
   └── LANG: {TARGET}                    [Tier 1]
       ├── {TARGET}: 역사                [Tier 3, 1차]
       ├── {TARGET}: 원리: 컴파일        [Tier 3, 1차]
       ├── {TARGET}: 문법>               [Tier 2]
       │   ├── 자료형                    [Tier 3, 1차]
       │   └── 함수                      [Tier 3, 1차]
       └── ...
   ```

### Step 4 노트 생성 시
- Tier 1 → Tier 2 → Tier 3 순서로 부모 우선 생성.
- Tier 3 leaf 본문 작성 규칙:
  - OneLine은 30~80자 권장.
  - Background는 역사 1~2문장 + 기술 배경 1~2문장 + 문제정의→요구사항→솔루션 흐름.
  - Diagrams는 최소 1개 mermaid + 단계별 상세 설명. 흐름은 `flowchart`, 상태는 `stateDiagram-v2`, 시간은 `sequenceDiagram` 활용.
  - 코드 예제는 직접 컴파일/실행 가능한 형태. 출력 결과 포함.
  - References는 공식문서 → 표준 스펙 → 권위 있는 튜토리얼 순.

### Step 5 검증 체크리스트 (LANG 고유)
- [ ] Tier 1 표지에 언어 정체성 한 줄 (OneLine) 존재
- [ ] 8개 학습 차원 중 핵심 3개 이상 leaf로 매핑됨
- [ ] 모든 leaf의 References에 공식문서 링크 1개 이상
- [ ] 모든 leaf에 mermaid 다이어그램 1개 이상
- [ ] 1차 페이지 수 ≤ 10 (초과 시 2차로 강등 권유)
- [ ] 제목 컨벤션 (`LANG:` 접두, `>` 접미) 준수

---

## 7. 참조 Notion 페이지 (소스 of truth)

| 페이지 | ID |
|---|---|
| TEMPLATE: STUDY | `2e9c9b468ca0809eb076cd68fd4b413e` |
| 공부 ATTITUDE | `21999e5fe8d74be5bcf1116eced20028` |
| 공부: 언어 (학습 차원 정의) | `249c9b468ca0802092daf39daee80eae` |
| STUDY> (학습 노트 루트) | `537302f8d63e46d1977e1f16a26c1690` |
| 사례: LANG: C | `249c9b468ca080a6adabdbebcec6c64c` |
| 사례: LANG: PYTHON | `fc46023f776741b8a548067dc9c17c71` |
| 사례: LANG: JavaScript & TypeScript | `e84b33711bbd428e9acb31f930e6d488` |

새 언어 학습 시 위 사례 3개 중 가장 가까운 패러다임을 골라 참조 (절차형→C, 동적/스크립트→Python, 웹/JIT→JS&TS).
