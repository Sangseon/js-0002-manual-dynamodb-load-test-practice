import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { Worker } from "node:worker_threads";

function runWorker(index) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./execute.mjs", import.meta.url), {
      workerData: index,
    });

    let executeCnt;

    worker.once("message", (value) => {
      executeCnt = value;
    });

    worker.once("error", reject);

    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker ${index} exited with code ${code}`));
        return;
      }

      if (!Number.isSafeInteger(executeCnt) || executeCnt < 0) {
        reject(new Error(`Worker ${index} returned no valid count`));
        return;
      }

      resolve(executeCnt);
    });
  });
}

export const handler = async () => {
  const time1 = moment();
  console.log(`Start Lambda Time :: ${time1.format("YYYY-MM-DD HH:mm:ss")}`);

  const threadCnt = Number(process.env.WORKER_COUNT ?? 4);

  if (!Number.isSafeInteger(threadCnt) || threadCnt < 1) {
    throw new Error("Invalid WORKER_COUNT");
  }

  const results = await Promise.allSettled(
    Array.from({ length: threadCnt }, (_, i) => runWorker(i)),
  );

  let totalExecuteCnt = 0;
  let successWorkers = 0;
  let failedWorkers = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      totalExecuteCnt += result.value;
      successWorkers++;
    } else {
      failedWorkers++;
      console.error(`Worker ${index} failed:`, result.reason?.message);
    }
  });

  const time2 = moment();
  const duration = moment.duration(time2.diff(time1)).asSeconds();

  console.log(`End Lambda Time :: ${time2.format("YYYY-MM-DD HH:mm:ss")}`);
  console.log(`Execute Lambda Time asSeconds :: ${duration}`);
  console.log(`${uuidv4()}___::totalExecuteCnt:: ${totalExecuteCnt}`);

  return {
    statusCode: failedWorkers === 0 ? 200 : 500,
    body: JSON.stringify({
      StartLambdaTime: time1.toISOString(),
      EndLambdaTime: time2.toISOString(),
      StartEndDuration: duration,
      TotalExecuteCnt: totalExecuteCnt,
      SuccessWorkers: successWorkers,
      FailedWorkers: failedWorkers,
    }),
  };
};
