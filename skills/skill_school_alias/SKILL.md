---
name: skill_school_alias
description: 학교명에 대한 줄임말 후보 생성 SKILL. 다음 상황에서 반드시 발동한다. case1. "학교명", "줄임말" 포함 Prompt 요청.
---

# school_alias

학교명 공식 명칭에 대한 **축약형 후보 룩업 테이블**을 생성한다.
사용자가 엑셀 업로드 시 학교명을 다양한 줄임말로 입력하는 문제를 해결하기 위해,
원형(공식명칭) → 축약형 후보 목록을 CSV로 출력한다.

## Input

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `$$SCHOOL_LIST_FILE` | 원본 학교 목록 CSV (EUC-KR, 칼럼: `학교명`, `학교종류명`) | 필수 |
| `$$LINE_LIMIT` | 처리할 학교 수 (0 = 전체) | `0` |
| `$$OUTPUT_FILE` | 출력 CSV 경로 | 필수 |

## References

축약 패턴 정의는 아래 레퍼런스 파일을 참조한다. 패턴 추가·수정 시 해당 파일을 편집한다.

| 파일 | 설명 |
|------|------|
| `references/pattern_highschool.md` | 고등학교 축약 패턴 (유형접미사, 대학교접미, 고유명사축약, Edge Case) |
| `references/pattern_middleschool.md` | 중학교 축약 패턴 (고등학교 패턴에서 유추) |

## Scripts

| 파일                               | 설명                  | 사용법                                                                            |
|----------------------------------|---------------------|--------------------------------------------------------------------------------|
| `scripts/generate_alias_high.py` | 고등학교 축약형 후보 생성 스크립트 | `python3 scripts/generate_alias_high.py <input_csv> <output_csv> [line_limit]` |
| `scripts/generate_alias_middle.py` | 중학교 축약형 후보 생성 스크립트 | `python3 scripts/generate_alias_middle.py <input_csv> <output_csv> [line_limit]` |

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

### Step 1. 패턴 레퍼런스 로드

- `references/pattern_highschool.md` 또는 `references/pattern_middleschool.md`를 읽어 적용할 패턴을 확인한다.

### Step 2. 스크립트 실행

```bash
python3 scripts/generate_alias_<school_type>.py "$$SCHOOL_LIST_FILE" "$$OUTPUT_FILE" $$LINE_LIMIT
```

### Step 3. 결과 검증

출력 CSV를 열람하여 축약형 후보가 올바른지 확인한다. 특히 아래 Edge Case를 점검:

1. **1:N 모호성** — 동일 축약형이 복수 학교에 매핑되는 경우 (168건 확인됨)
2. **잘못된 역확장** — `부여고`를 `부+여자고등학교`로 해석하지 않는지 확인

## Output

- UTF-8 (BOM) CSV 파일
- 칼럼: `원형, 축약형1, 축약형2, ...`

## 축약 로직 요약

> 상세 규칙은 `references/pattern_highschool.md`과 `references/pattern_middleschool.md` 참조.

### A. 유형 접미사 치환

학교명 끝의 `[유형]고등학교`를 축약 접미사로 치환. 구체적 접미사 우선 매칭.

```
여자고등학교 → 여고      과학고등학교 → 과고, 과학고
남자고등학교 → 남고      외국어고등학교 → 외고, 외국어고
공업고등학교 → 공고      예술고등학교 → 예고, 예술고
상업고등학교 → 상고      체육고등학교 → 체고, 체육고
고등학교     → 고, 고교   (범용 — 항상 추가 생성)
```

### B. 대학교 접미 패턴

`XX대학교사범대학부속고등학교` → 대학명 첫 음절 + `대부고`
- 건국대학교사범대학부속고등학교 → 건대부고
  `XX대학교사범대학부속고등학교` → 대학명 첫 음절 + `대사대부고`
- 건국대학교사범대학부속고등학교 → 건대사대부고

### C. 고유명사 축약

고유명사부 3음절 이상 시, 2음절씩 끊어 각 첫 음절 추출 + `고`
- 인천하늘고등학교 → 인하고 (인천+하늘 → 인+하)
- 민족사관고등학교 → 민사고 (민족+사관 → 민+사)

### D. 지역명 생략

지역명 + 고유명사부 + 고등학교 → 고유명사부 + 고
- 고양동산고등학교 → 동산고 (지역명 생략)

### E. Edge Case 경고

- **1:N 모호성**: 하나의 축약형이 복수 학교에 매핑
- **역확장 오류 주의**: 부여고≠부+여자고등학교, 경남고≠경+남자고등학교
