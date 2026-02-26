#!/usr/bin/env python3
"""
중학교 학교명 줄임말 룩업 테이블 생성 스크립트
- 전국 중학교에 대해 축약형 후보를 생성
- Input: school_origin.csv (EUC-KR)
- Output: CSV (UTF-8 with BOM)

Usage:
    python3 generate_alias_middle.py <input_csv> <output_csv> [line_limit]

    line_limit: 처리할 학교 수 (0 = 전체, 기본값: 0)
"""

import csv
import sys

# ──────────────────────────────────────────────
# 1. 중학교 유형 접미사 → 축약형 패턴 정의
#    (가장 구체적인 것부터 → 일반적인 것 순서)
# ──────────────────────────────────────────────
TYPE_PATTERNS = [
    # ── 사범대학 부속/부설 ──
    ("사범대학부속중학교", ["대부중", "대부속중", "사대부중", "사대부속중"]),
    ("사범대학부설중학교", ["대부중", "대부설중", "사대부중", "사대부설중"]),
    ("대학교부속중학교",   ["대부중", "대부속중"]),

    # ── 성별 ──
    ("여자중학교", ["여중"]),
    ("남자중학교", ["남중"]),

    # ── 일반 중학교 (가장 마지막) ──
    ("중학교", ["중"]),
]

# ──────────────────────────────────────────────
# 2. 지역명 리스트 (긴 이름부터 매칭)
# ──────────────────────────────────────────────
REGION_NAMES = sorted([
    # 광역시/특별시/특별자치시
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    # 경기
    "수원", "성남", "고양", "용인", "안산", "안양", "남양주", "화성",
    "평택", "의정부", "시흥", "파주", "김포", "광명", "하남", "군포",
    "오산", "이천", "양주", "구리", "안성", "포천", "의왕", "여주",
    "동두천", "과천", "가평", "양평", "연천",
    # 강원
    "춘천", "원주", "강릉", "동해", "삼척", "속초", "태백",
    "홍천", "횡성", "영월", "정선", "철원", "화천", "양구", "인제",
    "고성", "양양",
    # 충북
    "청주", "충주", "제천", "보은", "옥천", "영동", "단양",
    # 충남
    "천안", "공주", "보령", "아산", "서산", "논산", "당진",
    "홍성", "예산", "태안", "부여",
    # 전북
    "전주", "군산", "익산", "정읍", "남원", "김제",
    "완주", "진안", "무주", "장수", "임실", "순창", "고창", "부안",
    # 전남
    "목포", "여수", "순천", "나주", "광양",
    "담양", "곡성", "구례", "화순", "장흥", "강진", "해남",
    "영암", "무안", "함평", "영광", "장성", "완도", "진도", "신안",
    # 경북
    "포항", "경산", "구미", "안동", "영주", "상주", "문경",
    "경주", "김천", "영천", "칠곡", "성주", "고령",
    "영양", "울진", "봉화", "영덕", "청도", "의성",
    # 경남
    "창원", "김해", "진주", "양산", "거제", "통영", "밀양",
    "사천", "함안", "창녕", "남해", "하동", "산청", "합천",
    "거창", "함양",
    # 제주
    "제주", "서귀포",
], key=lambda x: -len(x))


def is_korean_syllable(ch):
    """한글 완성형 음절인지 확인"""
    return '\uAC00' <= ch <= '\uD7A3'


def korean_len(text):
    """한글 음절 수 반환"""
    return sum(1 for ch in text if is_korean_syllable(ch))


def generate_proper_noun_abbrev(prefix, type_abbrev_suffix="중"):
    """
    고유명사 부분(prefix)에 대해 음절 축약 후보를 생성.

    패턴: 4음절 이상 고유명사는 2음절씩 끊어 각 첫 음절을 추출.
    예) 인천하늘 → 인+하 = 인하
        민족사관 → 민+사 = 민사
    """
    syllables = [ch for ch in prefix if is_korean_syllable(ch)]
    n = len(syllables)

    if n < 3:
        return []

    abbrevs = []

    # 4+ 음절: 2+2 분할 → 각 첫 음절
    if n >= 4:
        ab = syllables[0] + syllables[2] + type_abbrev_suffix
        abbrevs.append(ab)

    # 3 음절: 첫 글자 + 둘째 글자 + 접미사
    if n == 3:
        ab = syllables[0] + syllables[1] + type_abbrev_suffix
        abbrevs.append(ab)

    return abbrevs


def strip_region(prefix):
    """지역명 접두사를 제거. 전체가 지역명인 경우는 제외."""
    for region in REGION_NAMES:
        if prefix.startswith(region) and len(prefix) > len(region):
            return region, prefix[len(region):]
    return None, prefix


def generate_abbreviations(school_name):
    """학교명에 대한 모든 축약형 후보를 생성"""
    abbreviations = []
    seen = set()

    def add(name):
        if name not in seen and name != school_name:
            seen.add(name)
            abbreviations.append(name)

    # ── 1단계: TYPE_PATTERNS 매칭 탐색 ──
    matched_suffix = None
    matched_prefix = None
    matched_abbrev_suffixes = None

    for suffix, abbrev_suffixes in TYPE_PATTERNS:
        if school_name.endswith(suffix):
            matched_suffix = suffix
            matched_prefix = school_name[:-len(suffix)]
            matched_abbrev_suffixes = abbrev_suffixes
            break

    # ── (D) 지역명 생략 축약형 (앞에 배치) ──
    if matched_prefix is not None and not matched_prefix.endswith("대학교"):
        region, stripped = strip_region(matched_prefix)
        if region is not None:
            # 유형 접미사 축약
            for ab in matched_abbrev_suffixes:
                add(stripped + ab)
            # 범용 중 축약 (비-중학교 패턴일 때)
            if matched_suffix != "중학교":
                stripped_general = school_name[:-len("중학교")][len(region):]
                add(stripped_general + "중")

    # ── (A) 유형 기반 축약: prefix + 축약접미사 ──
    if matched_prefix is not None:
        for ab in matched_abbrev_suffixes:
            add(matched_prefix + ab)

        # ── (B) 중학교→중 범용 축약 (이미 중학교 패턴이면 스킵) ──
        if matched_suffix != "중학교":
            general_prefix = school_name[:-len("중학교")]
            add(general_prefix + "중")

    # (C) 대학교 접미 패턴 특수 처리 (XX대학교사범대학부속중학교 → X대부중)
    if matched_prefix is not None and matched_prefix.endswith("대학교"):
        univ_name = matched_prefix[:-len("대학교")]  # "건국", "단국" 등
        if univ_name:
            syllables = [ch for ch in univ_name if is_korean_syllable(ch)]
            if syllables:
                # 첫 음절 + 각 축약접미사 (건+대부중 = 건대부중)
                for suffix, abbrev_suffixes in TYPE_PATTERNS:
                    if school_name.endswith(suffix):
                        for ab in abbrev_suffixes:
                            add(syllables[0] + ab)
                        break
                # 대학 이름 전체 + 축약접미사 (건국+대부중 = 건국대부중)
                if len(syllables) >= 2:
                    for suffix, abbrev_suffixes in TYPE_PATTERNS:
                        if school_name.endswith(suffix):
                            for ab in abbrev_suffixes:
                                add(univ_name + ab)
                            break

    # (E) 고유명사 축약 (3+ 음절, 대학교 패턴 제외)
    elif matched_prefix is not None and korean_len(matched_prefix) >= 3:
        if matched_suffix and matched_suffix != "중학교":
            # 특수유형: "중"과 유형축약 모두 시도
            for suffix, abbrev_suffixes in TYPE_PATTERNS:
                if school_name.endswith(suffix):
                    for ab in abbrev_suffixes:
                        for pn in generate_proper_noun_abbrev(matched_prefix, ab):
                            add(pn)
                    break
            for ab in generate_proper_noun_abbrev(matched_prefix, "중"):
                add(ab)
        else:
            for ab in generate_proper_noun_abbrev(matched_prefix, "중"):
                add(ab)

    return abbreviations


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 generate_alias_middle.py <input_csv> <output_csv> [line_limit]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    line_limit = int(sys.argv[3]) if len(sys.argv) > 3 else 0

    # CSV 읽기 (EUC-KR)
    rows = []
    with open(input_file, 'r', encoding='euc-kr', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            school_type = row.get('학교종류명', '').strip()
            if school_type != '중학교':
                continue
            school_name = row.get('학교명', '').strip()
            if not school_name:
                continue
            rows.append(school_name)

    # 중복 제거 및 정렬
    unique_names = sorted(set(rows))

    if line_limit > 0:
        unique_names = unique_names[:line_limit]

    # 축약형 생성
    results = []
    max_abbrevs = 0

    for name in unique_names:
        abbrevs = generate_abbreviations(name)
        results.append((name, abbrevs))
        if len(abbrevs) > max_abbrevs:
            max_abbrevs = len(abbrevs)

    # CSV 출력 (UTF-8 with BOM)
    header = ['원형'] + [f'축약형{i+1}' for i in range(max_abbrevs)]

    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for name, abbrevs in results:
            padded = [name] + abbrevs + [''] * (max_abbrevs - len(abbrevs))
            writer.writerow(padded)

    print(f"[완료] {len(results)}개 중학교 처리")
    print(f"[출력] {output_file}")
    print(f"[칼럼] 원형 + 축약형 {max_abbrevs}개")

    # 미리보기
    print(f"\n── 미리보기 (상위 10건) ──")
    for name, abbrevs in results[:10]:
        print(f"  {name} → {', '.join(abbrevs)}")


if __name__ == '__main__':
    main()
