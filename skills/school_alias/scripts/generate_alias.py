#!/usr/bin/env python3
"""
학교명 줄임말 룩업 테이블 생성 스크립트
- 전국 고등학교에 대해 축약형 후보를 생성
- Input: school_origin.csv (EUC-KR)
- Output: 260225_school_alias.csv (UTF-8 with BOM)

Usage:
    python3 generate_alias.py <input_csv> <output_csv> [line_limit]

    line_limit: 처리할 학교 수 (0 = 전체, 기본값: 0)
"""

import csv
import sys

# ──────────────────────────────────────────────
# 1. 학교 유형 접미사 → 축약형 패턴 정의
#    (가장 구체적인 것부터 → 일반적인 것 순서)
# ──────────────────────────────────────────────
TYPE_PATTERNS = [
    # ── 사범대학 부속/부설 ──
    ("사범대학부속고등학교", ["대부고", "대부속고", "사대부고", "사대부속고"]),
    ("사범대학부설고등학교", ["대부고", "대부설고", "사대부고", "사대부설고"]),
    ("대학교부속고등학교",   ["대부고", "대부속고"]),

    # ── 과학기술 (compound) ──
    ("과학기술고등학교", ["과기고", "과학기술고"]),

    # ── 성별 ──
    ("여자고등학교", ["여고"]),
    ("남자고등학교", ["남고"]),

    # ── 전문/특수 유형 ──
    ("과학고등학교",       ["과고", "과학고"]),
    ("외국어고등학교",     ["외고", "외국어고"]),
    ("공업고등학교",       ["공고", "공업고"]),
    ("상업고등학교",       ["상고", "상업고"]),
    ("예술고등학교",       ["예고", "예술고"]),
    ("체육고등학교",       ["체고", "체육고"]),
    ("마이스터고등학교",   ["마이스터고"]),
    ("관광고등학교",       ["관광고"]),
    ("국제고등학교",       ["국제고"]),
    ("비즈니스고등학교",   ["비즈니스고"]),
    ("디자인고등학교",     ["디자인고"]),
    ("미디어고등학교",     ["미디어고"]),
    ("정보고등학교",       ["정보고"]),
    ("경영고등학교",       ["경영고"]),
    ("보건고등학교",       ["보건고"]),
    ("기술고등학교",       ["기술고"]),

    # ── 일반 고등학교 (가장 마지막) ──
    ("고등학교", ["고", "고교"]),
]


def is_korean_syllable(ch):
    """한글 완성형 음절인지 확인"""
    return '\uAC00' <= ch <= '\uD7A3'


def korean_len(text):
    """한글 음절 수 반환"""
    return sum(1 for ch in text if is_korean_syllable(ch))


def generate_proper_noun_abbrev(prefix, type_abbrev_suffix="고"):
    """
    고유명사 부분(prefix)에 대해 음절 축약 후보를 생성.

    패턴: 4음절 이상 고유명사는 2음절씩 끊어 각 첫 음절을 추출.
    예) 인천하늘 → 인+하 = 인하
        민족사관 → 민+사 = 민사
        인천포스코 → 인+포 = 인포
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


def generate_abbreviations(school_name):
    """학교명에 대한 모든 축약형 후보를 생성"""
    abbreviations = []
    seen = set()

    def add(name):
        if name not in seen and name != school_name:
            seen.add(name)
            abbreviations.append(name)

    matched_suffix = None
    matched_prefix = None

    for suffix, abbrev_suffixes in TYPE_PATTERNS:
        if school_name.endswith(suffix):
            prefix = school_name[:-len(suffix)]
            matched_suffix = suffix
            matched_prefix = prefix

            # (A) 유형 기반 축약: prefix + 축약접미사
            for ab in abbrev_suffixes:
                add(prefix + ab)

            # (B) 고등학교→고/고교 범용 축약 (이미 고등학교 패턴이면 스킵)
            if suffix != "고등학교":
                general_prefix = school_name[:-len("고등학교")]
                add(general_prefix + "고")
                add(general_prefix + "고교")

            break

    # (C) 대학교 접미 패턴 특수 처리 (XX대학교사범대학부속고등학교 → X대부고)
    if matched_prefix is not None and matched_prefix.endswith("대학교"):
        univ_name = matched_prefix[:-len("대학교")]  # "건국", "단국" 등
        if univ_name:
            syllables = [ch for ch in univ_name if is_korean_syllable(ch)]
            if syllables:
                # 첫 음절 + 각 축약접미사 (건+대부고 = 건대부고)
                for suffix, abbrev_suffixes in TYPE_PATTERNS:
                    if school_name.endswith(suffix):
                        for ab in abbrev_suffixes:
                            add(syllables[0] + ab)
                        break
                # 대학 이름 전체 + 축약접미사 (건국+대부고 = 건국대부고)
                if len(syllables) >= 2:
                    for suffix, abbrev_suffixes in TYPE_PATTERNS:
                        if school_name.endswith(suffix):
                            for ab in abbrev_suffixes:
                                add(univ_name + ab)
                            break

    # (D) 고유명사 축약 (3+ 음절, 대학교 패턴 제외)
    elif matched_prefix is not None and korean_len(matched_prefix) >= 3:
        if matched_suffix and matched_suffix != "고등학교":
            # 특수유형: "고"와 유형축약 모두 시도
            for suffix, abbrev_suffixes in TYPE_PATTERNS:
                if school_name.endswith(suffix):
                    for ab in abbrev_suffixes:
                        for pn in generate_proper_noun_abbrev(matched_prefix, ab):
                            add(pn)
                    break
            for ab in generate_proper_noun_abbrev(matched_prefix, "고"):
                add(ab)
        else:
            for ab in generate_proper_noun_abbrev(matched_prefix, "고"):
                add(ab)

    return abbreviations


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 generate_alias.py <input_csv> <output_csv> [line_limit]")
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
            if school_type != '고등학교':
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

    print(f"[완료] {len(results)}개 고등학교 처리")
    print(f"[출력] {output_file}")
    print(f"[칼럼] 원형 + 축약형 {max_abbrevs}개")

    # 미리보기
    print(f"\n── 미리보기 (상위 10건) ──")
    for name, abbrevs in results[:10]:
        print(f"  {name} → {', '.join(abbrevs)}")


if __name__ == '__main__':
    main()
