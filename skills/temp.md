# Prblm
- API-GATEWAY 학습중.
- 기초적인 수준으로 API-GATEWAY를 구현해보고자 함.

# Skill-set
- nginx
- Vanilla Node.js

# API-GATEWAY 기능
- 라우팅
- 인증/인가 (JWT 등)
- Rate Limiting
- Logging
- Monitoring

# Architecture
| Layer          |Tool| Role                                                    |
|----------------|---|---------------------------------------------------------|
| Reverse Proxy  |Nginx| 80 포트로 들어오는 요청을 Gateway로 넘기는 리버스프록시 설정 & Rate Limiting |
| Gateway Server |Vanilla Node.js| Routing, 인증, 로깅 |
|인증|JWT|JWT 검증 미들웨어|
|Rate Limiting|Vanilla Node.js|Rate Limiting 미들웨어|
|Logging|Vanilla Node.js|로깅 미들웨어|
|Monitoring|Vanilla Node.js|모니터링 미들웨어|
```
api-gateway/
├── docker-compose.yml
├── generate-token.js          ← 테스트용 JWT 발급
├── nginx/
│   └── nginx.conf             ← 리버스프록시 + Rate Limit
├── gateway/
│   ├── Dockerfile
│   ├── index.js               ← 미들웨어 체인 + 프록시
│   ├── config/
│   │   └── routes.js          ← 라우팅 테이블
│   └── middlewares/
│       ├── auth.js            ← JWT 검증 (Vanilla, 외부 라이브러리 없음)
│       ├── rateLimit.js       ← Sliding Window Rate Limit
│       └── logger.js          ← 요청/응답 로깅
└── services/
    ├── service1/              ← Echo 서버 (포트 4001, 인증 필요)
    ├── service2/              ← Echo 서버 (포트 4002, 인증 필요)
    └── service3/              ← Echo 서버 (포트 4003, 인증 bypass)
```

# Action
> 사용자 문답을 통해 API-GATEWAY의 기능과 구현 방법에 대해 학습 및 실습.

## Steps
### Step1. 프로젝트 구조 잡기
- Vanilla node.js를 통해 구현한 백엔드 더미 서비스 2~3개 생성
- Gateway가 프록싱하는 구조
### Step2. Nginx
- 80 포트로 들어오는 요청을 Gateway(ex. 3000)로 넘기는 리버스프록시 설정.
- Rate Limit 처리
### Step3. Gateway Server
- Routing Table을 Config 파일로 처리.
- /api/service1 -> Service1
- /api/service2 -> Service2
- ...
### Step4. 인증/인가
- JWT 기반 인증 미들웨어 구현
- Authorization 헤더 파싱
- 토큰 검증
- 실패시 401 반환. 특정 경로는 bypass 처리
### Step5. Rate Limiting
- IP 기반 Rate Limiting 미들웨어 구현
- Endpoint 별로 Rate Limit 설정 가능하도록
### Step6. Logging
- 요청/응답 로깅 미들웨어 구현

