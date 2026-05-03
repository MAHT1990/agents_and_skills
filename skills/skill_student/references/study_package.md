# Reference: study_package
> $$DOMAIN = "PACKAGE" 인 경우 skill_student가 로드하는 도메인 가이드.
> 라이브러리 / 패키지 학습 노트의 차원·태도·구조·컨벤션을 정의한다.
>
> ⚠️ **STATUS: SKELETON** — 본 reference는 골격만 잡혀 있으며, 사용자가 실제 패키지 학습을 진행하면서 채워나가야 한다.
> 작성 가이드: 동일 디렉토리의 `study_lang.md`를 패러다임 모델로 참고할 것.

---

## 1. 학습 차원 (Dimensions)
패키지/라이브러리를 학습할 때 점검할 차원.
> TODO: 아래는 초안 후보. 실제 사용 후 적절히 추가/제거할 것.

| # | Dimension | 핵심 질문 |
|---|---|---|
| 1 | 정체성 / 문제 해결 영역 | 어떤 문제를 해결하기 위해 만들어졌나? 대안은? |
| 2 | 설치 / 의존성 | 설치 방법, peer dependency, 최소 환경 요구 |
| 3 | 핵심 API / Entry Point | 진입점은? 가장 자주 쓰는 API 5~10개는? |
| 4 | 아키텍처 / 내부 구조 | 어떤 디자인 패턴? 어떻게 동작하는가? |
| 5 | 설정 / 옵션 | 주요 설정 옵션, 기본값, 권장 프리셋 |
| 6 | 통합 패턴 | 다른 라이브러리/프레임워크와의 결합 방법 |
| 7 | 성능 / 한계 | 벤치마크, 트레이드오프, 적합 규모 |
| 8 | 마이그레이션 / 버전 호환성 | major 버전 간 변경, deprecation, upgrade path |

> TODO: 패키지 카테고리별로 차원이 달라질 수 있다 (UI 라이브러리 vs 빌드 도구 vs ORM). 카테고리별 분기 고려.

---

## 2. 학습 ATTITUDE
> 출처: Notion 페이지 "공부 ATTITUDE" (`21999e5fe8d74be5bcf1116eced20028`)
> study_lang과 공유하는 기본 원칙 + 패키지 학습 고유 원칙.

### 공통 원칙 (study_lang과 동일)
- 공식문서 최우선
- Project 중심 학습
- 다 정리하지 마라 — 핵심 + 헷갈리는 것만
- 이해 먼저, 노트는 그 다음
- 복붙 금지 — 테스트 + 왜
- 한 번에 다 X

### 패키지 학습 고유 원칙
> TODO: 채워야 함. 후보:
- **버전을 명시하라** — 패키지는 버전에 따라 API가 크게 달라진다. 모든 leaf 페이지에 학습 시점 버전 표기.
- **Why this package?** — 대안 라이브러리 1~2개와 비교한 채택 근거를 Tier 1 Cover에 명시.
- **공식 예제 → 자기 예제** — 공식문서 예제를 그대로 복사하지 말고, 본인 프로젝트 맥락으로 변형하여 정리.
- **Source code를 읽어라** (선택) — 핵심 API의 구현을 1~2개라도 직접 읽고 Diagrams로 정리.

---

## 3. 페이지 계층 구조 (3-tier)
> TODO: 패키지 카테고리(UI/build/ORM/유틸 등)별로 변형 가능. 아래는 일반형.

```
STUDY>
└── PKG: {패키지명}                            ← Tier 1: Cover
    ├── (옵션) OneLine + 정체성 + 채택 이유 + 버전
    ├── {패키지}: 정체성·문제해결영역
    ├── {패키지}: 설치/환경설정
    ├── {패키지}: 핵심 API>                    ← Tier 2: Container
    │   ├── API 1
    │   ├── API 2
    │   └── ...
    ├── {패키지}: 아키텍처/내부동작
    ├── {패키지}: 설정/옵션>
    ├── {패키지}: 통합패턴>                    ← Tier 2: Container
    │   ├── with {프레임워크 A}
    │   └── with {라이브러리 B}
    ├── {패키지}: 성능·한계
    └── {패키지}: 버전·마이그레이션
```

> TODO: 실제 패키지 학습 사례 2~3개를 정리한 후, 위 구조를 사용자의 패턴에 맞게 조정.

### Tier 정의 (study_lang과 동일)
| Tier | 역할 | 본문 구조 | TEMPLATE 적용 |
|---|---|---|---|
| 1 (Cover) | 패키지 표지 | OneLine + 채택 이유 + 버전 + 자식 링크 | ❌ |
| 2 (Container) | 카테고리 묶음 | 자식 페이지 링크 | ❌ |
| 3 (Leaf) | 실제 학습 단위 | TEMPLATE: STUDY 13 섹션 | ✅ 풀 적용 |

---

## 4. TEMPLATE: STUDY 13 섹션
> 출처: Notion 페이지 "TEMPLATE: STUDY" (`2e9c9b468ca0809eb076cd68fd4b413e`)
> study_lang과 동일한 템플릿 사용. 패키지 학습에서는 **Basic Usage 섹션이 거의 항상 필수**가 된다 (API 위주이므로).

| 섹션 | 필수 | 비고 (패키지 학습 관점) |
|---|---|---|
| OneLine | ✅ | 패키지 정체성 한 줄 |
| Background | ✅ | 등장 배경 + 대안 + 채택 근거 |
| Prerequisites | ✅ | mermaid 트리 (선수 패키지/언어 지식) |
| Definition | ✅ | Terminologies (패키지 고유 용어) |
| Props | ✅ | 핵심 특성 (예: tree-shaking 지원, SSR 지원 등) |
| Basic Usage | **거의 필수** | API/SDK 중심이므로 카테고리 → API → 예제 구조 적극 활용 |
| FAQ / 흔한 오개념 | ✅ | 버전 관련 함정 등 |
| Diagrams | ✅ | 데이터 흐름, 라이프사이클 등 |
| Scenarios & Patterns | ✅ | 실무 사용 패턴 |
| 주의사항 | ✅ | 성능 함정, deprecation 경고 등 |
| Examples | ✅ | 본인 프로젝트 맥락 예제 |
| 추천 후속 학습 | ✅ | 관련 패키지·생태계 |
| References | ✅ | 공식문서 → GitHub → 권위 블로그 |

---

## 5. 제목·색상·아이콘 컨벤션
> TODO: study_lang의 컨벤션을 기본으로 하되, PKG 접두사로 변경.

### 제목 (제안)
- **Tier 1 표지**: `PKG: {패키지명}` (예: `PKG: React Query`, `PKG: Pydantic`)
- **Tier 2 컨테이너**: `{패키지}: {카테고리}>` (예: `React Query: 핵심 API>`)
- **Tier 3 leaf**:
  - 패키지 직속: `{패키지}: {카테고리}` (예: `React Query: 정체성·문제해결영역`)
  - 카테고리 하위: `{카테고리}: {세부}` (예: `핵심 API: useQuery`)

### 색상 (study_lang과 동일)
| 위치 | 색상 |
|---|---|
| Cover / 핵심 leaf H1 | `green_bg` |
| Diagrams | `orange_bg` |
| Scenarios & Patterns | `blue_bg` |
| 주의사항 | `red_bg` |
| Examples | `pink_bg` |
| 추천 후속 학습 | `purple_bg` |

### 아이콘
- Tier 1 표지: 패키지 공식 로고 (없으면 `icons/square-dashed_orange`).
- Tier 2/3: 카테고리별 아이콘.

---

## 6. 노트 생성 시 SKILL 동작 가이드
> TODO: study_lang Section 6을 기반으로, 패키지 학습 특수성을 반영하여 채울 것.

### Step 3 학습 계획 수립 시 — 채울 항목
- 패키지 카테고리 분류 (UI/Build/ORM/유틸 등)에 따른 차원 우선순위
- 1차 페이지 임계치 (현재 study_lang은 10개, 패키지는 더 작아도 됨)
- 버전 정보 수집 프로토콜

### Step 4 노트 생성 시 — 채울 항목
- Basic Usage 섹션 작성 가이드 (API 카테고리 → API → 예제 구조)
- 코드 예제 작성 시 본인 프로젝트 맥락 반영 방법

### Step 5 검증 체크리스트 (PACKAGE 고유) — 채울 항목
- [ ] Tier 1 Cover에 학습 시점 버전 명시
- [ ] Tier 1 Cover에 대안 패키지 1개 이상 비교 언급
- [ ] 핵심 API 5개 이상 Basic Usage에 정리
- [ ] (TODO) ...

---

## 7. 참조 Notion 페이지 (공통)

| 페이지 | ID |
|---|---|
| TEMPLATE: STUDY | `2e9c9b468ca0809eb076cd68fd4b413e` |
| 공부 ATTITUDE | `21999e5fe8d74be5bcf1116eced20028` |
| STUDY> (학습 노트 루트) | `537302f8d63e46d1977e1f16a26c1690` |
| (TODO) 공부: 패키지 — 사용자가 정리한 기준 페이지 | (TODO) |
| (TODO) 사례: 패키지 학습 노트 1~2개 | (TODO) |

> ⚠️ 위 TODO들을 채워나가며 study_package.md를 완성할 것. study_lang.md를 패턴 모델로 참고.
