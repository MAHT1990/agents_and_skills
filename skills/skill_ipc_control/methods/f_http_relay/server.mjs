/*
server.mjs - 디바이스간 IPC 미니 중계 서버
라운드1: 봉투(envelope) + id 커서
  - 저장 단위를 raw text → { id, ts, from, to, body } 로 승격 (method A·B의 inbox.log 라인과 동형)
  - recv 커서를 '줄 수 산술' → '마지막 본 id' 기준으로 교체 (멀티라인 본문 안전)
*/

import http from "node:http";

/*
메모리 inbox
서버 종료시 사라짐 (내구성은 후속 라운드)
각 원소: { id, ts, from, to, body }
*/
const msgs = [];
let seq = 0;            // id 발급용 단조 증가 카운터 (서버가 단일 소스로 부여)

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");   // 경로+쿼리 파싱용 더미 base

  /*
  POST /send  (본문 = JSON { from, to, body })
  서버가 id·ts 부여 → 배열 append → 발급 id·ts 회신
  */
  if (req.method === "POST" && url.pathname === "/send") {
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      let env;
      try {
        env = JSON.parse(body || "{}");
      } catch {
        res.statusCode = 400;
        res.end("bad json");
        return;
      }
      const msg = {
        id: `msg_${String(seq).padStart(6, "0")}`,   // 서버 부여, 이 프로세스 생존중 유일
        ts: new Date().toISOString(),
        from: env.from ?? "unknown",
        to: env.to ?? "all",                          // 약속어: <single> | all | <a,b,c>
        body: env.body ?? "",
      };
      seq += 1;
      msgs.push(msg);
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ id: msg.id, ts: msg.ts }));
    });
    return;
  }

  /*
  GET /recv?since=<id>
  <id> 이후 메시지만 JSON Lines(한 줄=한 객체)로 반환
    - since 없음/모르는 id  → 전부 반환 (재시작 후 조용히 죽는 것을 방지)
    - 새 메시지 없음        → 빈 문자열
  서버는 to로 거르지 않는다(순수 파이프) — 매칭은 수신 클라가 수행
  */
  if (req.method === "GET" && url.pathname === "/recv") {
    const since = url.searchParams.get("since");
    let start = 0;
    if (since) {
      const idx = msgs.findIndex(m => m.id === since);
      start = idx === -1 ? 0 : idx + 1;   // 모르는 id → 0부터 전부
    }
    res.setHeader("content-type", "text/plain; charset=utf-8");   // NDJSON, 클라가 줄단위 파싱
    res.end(msgs.slice(start).map(m => JSON.stringify(m)).join("\n"));
    return;
  }

  res.statusCode = 404;
  res.end("no");
}).listen(8787, () => console.log("relay on :8787 (모든 인터페이스, 봉투+id 커서)"));
