# 기획서 SSOT 무결성 규약 (plan_ssot_integrity)

> skill_plan v2 공통 규약. 모든 plan_* agent + 오케스트레이터가 산출물을
> **생성(CREATE)·수정(UPDATE)**할 때 준수한다. skill_plan은 이 경로를 subagent에 전달한다.

본 문서는 "기획서를 어떤 자격의 문서로 다루는가"를 강제한다.
내용(무엇을 쓰는가)이 아니라 **원천성·참조 방향·이력 처리**의 계약이다.

---

## 0. SSOT 정의

- 기획서(INDEX + 01~13, 14문서)는 프로젝트의 **Single Source of Truth(SSOT)**다.
- `src` · `runbook` · `config` · `code` · `test` 등은 기획서로부터 **파생되는 하류 산출물**이다.
- SSOT는 파생물의 원천이다. 원천이 파생물에 종속되면 SSOT가 무너진다.

---

## 1. 원천성 · 단방향 참조 (P1·P2)

- 참조 방향은 **기획서 → 파생물** 단방향이다.
- **금지**: 기획서 본문·표·메타가 파생물(src/runbook/config/코드/테스트)의
  경로·파일명·심볼·내용을 참조·인용·역링크하는 것.
- UPDATE 시 파생물을 *근거로* 기획서를 고치는 것은 허용하나,
  그 파생물을 기획서에 **인용하지 말고** 기획서 언어(FR/FN/SC/ENT 등)로 재서술한다.

```
             SSOT boundary
   +-------------------------------+
   |  PLAN (14 docs)               |
   |  04 -> 05 -> 06 -> 07 -> ...  |  intra-plan: cite defined upstream (OK)
   +---------------+---------------+
                   | derive (one-way)
                   v
     src / runbook / config / code   <- derived (SSOT 밖)
                   |
                   +--X--> reference back into PLAN  (FORBIDDEN)
```
캡션: 화살표는 파생 방향. 파생물이 기획서를 참조하는 건 자유, 그 역은 금지.

---

## 2. 계층 준수 — 스파게티 참조 금지 (P3)

- intra-plan 참조는 **정의된 의존 경로(파이프라인 + 추적성 매트릭스)의 엣지 위에서만** 한다.
- **허용**: 하류 문서가 자기 upstream 입력 ID·문서를 참조
  (예: 07이 FR/FN/UT 참조, 08이 FR/FN/SC 참조). `plan_doc_skeleton §5` ID 참조 규칙.
- **금지**: DAG에 없는 임의 cross-link, 순환 참조,
  문서메타 "관련 문서"의 무분별한 상호 링크 남발.
- 문서메타 "관련 문서" 링크도 **DAG 엣지에 해당하는 문서로 한정**한다.

---

## 3. In-place 재작성 — 변경이력 본문 삽입 금지 (P4)

- 수정은 해당 섹션 내용을 **직접 교체**한다. 백지에 새로 쓰듯 **최종 상태만** 기술한다.
- **금지**(본문·표 어디에도):
  - changelog / "기존 X를 Y로 변경" / "(구)~(신)~" 병기
  - diff·취소선 이력 / "v2에서 추가됨" 류 변경 메타 주석
  - 이전 문장을 남긴 채 새 문장을 덧붙이는 방식
- **허용**: `문서메타`의 정형 **"버전 / 생성·갱신 일자"만** (`plan_doc_skeleton §6` 준수).
- 변경 이력·diff는 **git이 담당**한다. 기획서는 "현재 진실"만 담는다.

---

## 4. 산출 전 self-check (CREATE·UPDATE 공통)

- [ ] 파생물(src/runbook/config/code/test) 경로·파일명·인용 = 0
- [ ] 정의된 DAG 밖 cross-link·순환 참조 = 0
- [ ] 본문 changelog·diff·"X→Y 변경"·(구)(신) 병기 = 0
- [ ] 문서메타의 버전·일자 외 리비전 메타 = 0
- [ ] 문서메타 "관련 문서" 링크가 모두 DAG 엣지에 해당 = yes
