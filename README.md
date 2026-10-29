# DynamoDB Load Test Practice

> **AWS SDK 버전 안내**
>
> 이 Repository는 **AWS SDK for JavaScript v2 (`aws-sdk`)** 기반의 과거 실습 코드다. v2는 **2025년 9월 8일 지원이 종료**되었으며, 현재는 v3 사용이 권장된다.
>
> **AWS SDK v3 환경에서 사용하려면** DynamoDB 클라이언트 생성과 조회 호출부 등을 v3 API에 맞게 **수정(마이그레이션)**해야 한다.
>
> 기존 코드를 실행하려면 v2 패키지를 별도로 설치할 수 있지만, 지원이 종료된 버전이므로 신규 환경에서는 v3로 전환하는 것이 좋다.

> **이전 실습 코드 정리**
>
> 과거 AWS Lambda에서 DynamoDB에 조회 요청이 집중되는 상황을 가정하고, 동시 요청 시 처리량과 실행 양상을 확인하기 위해 작성했던 JavaScript 실습 코드를 정리한 Repository다.
>
> 운영 환경에 적용하는 부하 테스트 도구가 아니라, Lambda와 DynamoDB의 동시 조회 동작을 살펴보기 위한 실험 기록이다. 실제 성능 측정 결과나 최대 처리량 수치는 포함하지 않는다.

README 작성 기준: [Repository README Convention](https://github.com/Sangseon/00-conventions/blob/master/docs/repository-readme.md)

## Overview

AWS Lambda에서 Node.js Worker Threads를 이용해 여러 Worker를 생성하고, 각 Worker가 DynamoDB의 동일한 항목을 일정 시간 반복 조회하도록 구성한 실습 프로젝트.

다수의 읽기 요청이 특정 데이터에 집중될 때의 처리량과 실행 시간을 관찰하기 위한 코드를 작성했다.

### Topics

- aws-lambda
- dynamodb
- worker-threads
- load-testing

## Focus

- Lambda 환경에서 Worker Threads를 이용한 동시 조회 요청 생성
- 동일 DynamoDB Key에 대한 반복 조회와 요청 횟수 집계
- Worker별 실행 시간 및 전체 작업 소요 시간 기록
- 조회 오류와 Worker 비정상 종료 처리
- Lambda 자원 한계와 DynamoDB 요청 처리량을 구분하여 해석할 필요성

## Tech Stack

- JavaScript (ES Modules)
- Node.js (`node:worker_threads`)
- AWS Lambda
- Amazon DynamoDB
- AWS SDK for JavaScript v2 (`aws-sdk`)
- `moment`, `uuid`

## Scope

| 구분          | 구현 내용                                          |
| ------------- | -------------------------------------------------- |
| Worker 실행   | 설정된 수만큼 Worker 생성                          |
| DynamoDB 조회 | 각 Worker에서 동일한 Key를 `GetItem`으로 반복 조회 |
| 실행 시간     | Worker별 약 2초간 조회하고 전체 실행 시간 기록     |
| 결과 집계     | 정상 종료한 Worker의 조회 완료 횟수 합산           |
| 오류 처리     | DynamoDB 오류 전파 및 Worker 실패 구분             |
| 실행 설정     | 테이블명과 Worker 수를 환경변수로 설정             |

다음은 현재 실습의 측정 범위에 포함되지 않는다.

- 요청별 응답 시간 및 p95/p99 지연 시간 측정
- DynamoDB Throttling 횟수 및 재시도 횟수의 별도 집계
- 지속 부하, 단계적 부하 증가 및 최대 처리량 자동 탐색
- AWS CloudWatch 지표와 측정 결과의 상관 분석

## Implementation

### 실행 구조

```text
AWS Lambda (index.mjs)
    |
    +-- Worker 1 ------+
    +-- Worker 2 ------+--> DynamoDB (동일 Key 반복 조회)
    +-- Worker N ------+
    |
    +-- Worker별 실행 결과 및 실패 수집
    +-- 전체 조회 횟수와 소요 시간 기록
```

### `index.mjs`

- `WORKER_COUNT`에 따라 Worker를 생성한다.
- 각 Worker의 조회 횟수 또는 실패 결과를 수집한다.
- 모든 Worker의 종료를 기다린 후 전체 실행 시간과 집계 결과를 반환한다.

### `execute.mjs`

- `DYNAMODB_TABLE_NAME`으로 지정된 테이블의 동일한 Key를 조회한다.
- 각 Worker는 조회 요청을 순차적으로 반복하고, 약 2초 경과 후 종료한다.
- 오류 없이 완료된 조회 요청 횟수를 부모 스레드에 전달한다.
- DynamoDB 조회 중 오류가 발생하면 해당 오류를 상위로 전파한다.

`GetItem` 요청이 정상 완료되었다는 것과 해당 Key의 항목이 실제로 존재한다는 것은 별개다. 또한 SDK의 자동 재시도가 발생하면 코드에서 집계한 완료 횟수와 실제 서비스 요청 횟수가 다를 수 있다.

## What I Learned

- Node.js Worker Threads를 이용해 Lambda 실행 환경에서 여러 조회 작업을 병렬로 시작하는 구조를 실습했다.
- Worker별 요청 완료 횟수와 Lambda 전체 실행 시간은 서로 다른 지표임을 확인할 수 있다.
- 특정 Key에 대한 요청 집중을 실험할 때는 DynamoDB 자체의 처리 한계뿐 아니라 Lambda의 메모리·CPU·스레드 자원 사용도 고려해야 한다.
- 실제 처리 한계를 판단하려면 조회 횟수 외에 오류율, 재시도, 응답 시간 등의 측정이 추가로 필요하다.

## AI Usage

Mode: manual

과거 실습 코드는 직접 작성했다.

기존 코드를 GitHub에 정리하면서 AI를 코드 검토, 오류 처리 및 비동기 실행 구조의 개선 방향 확인, README 작성에 활용했다.

## How to Run

### 사전 준비

- Node.js 실행 환경
- AWS 자격 증명 및 DynamoDB `GetItem` 권한
- `ap-northeast-2` 리전에 준비한 별도의 테스트용 DynamoDB 테이블
- DynamoDB 테이블의 문자열 파티션 키 `token`

현재 `execute.mjs`는 `Key: { token: "token" }`으로 조회한다. 실제 항목 존재 여부를 확인하려면 같은 Key를 가진 테스트 데이터를 미리 생성한다.

운영 테이블에 실행하지 않도록 주의한다. Worker 수에 따라 DynamoDB 요청량과 AWS 사용 비용이 증가할 수 있다.

### 의존성 설치

`package.json`에 의존성이 정의되어 있다면 다음 명령을 사용한다.

```bash
npm install
```

의존성을 별도로 구성해야 하는 경우 사용된 패키지는 `aws-sdk`(v2), `moment`, `uuid`다.

### 환경변수 설정

```bash
export DYNAMODB_TABLE_NAME="YOUR_TEST_TABLE_NAME"
export WORKER_COUNT=4
```

위 예시는 Bash 환경 기준이다. AWS 자격 증명은 코드나 README에 기록하지 않고, 실행 환경의 AWS 인증 설정을 사용한다.

### 로컬 실행

```bash
node -e "import('./index.mjs').then(({ handler }) => handler()).then(console.log).catch(console.error)"
```

AWS Lambda에 배포하는 경우 Handler는 `index.handler`로 지정하고, `execute.mjs`와 필요한 패키지를 함께 배포한다.

### 측정 시 유의사항

- 각 Worker의 약 2초는 Worker별 시작 시점 기준이며, 전체 Lambda 실행 시간과 동일하지 않다.
- 완료된 조회 횟수는 정확한 RPS나 최대 처리 가능 TPS를 직접 의미하지 않는다.
- Worker 수를 과도하게 늘리면 DynamoDB의 한계보다 Lambda 실행 환경의 자원 제한이 먼저 나타날 수 있다.

## References

- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [Amazon DynamoDB GetItem API](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html)
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)
- [AWS SDK for JavaScript v2 Documentation](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/welcome.html)
- [AWS SDK for JavaScript v3 Migration Guide](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating.html)
