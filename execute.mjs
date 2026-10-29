import AWS from "aws-sdk";
import moment from "moment";
import { workerData, parentPort } from "worker_threads";

class WK {
  ddbClient;
  threadNumber;

  constructor(_threadNumber) {
    this.ddbClient = new AWS.DynamoDB.DocumentClient({
      region: "ap-northeast-2",
      apiVersion: "2012-08-10",
    });

    this.threadNumber = _threadNumber;
  }

  async selectToken() {
    const time1 = moment();
    console.log(
      `[${this.threadNumber}]Start Worker Time :: ${moment(time1).format("YYYY-MM-DD hh:mm:ss.SSS")}`,
    );

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        token: "token",
      },
    };

    let count = 0;
    let time2 = moment();
    try {
      while (true) {
        const result = await this.ddbClient.get(params).promise();

        count++;

        time2 = moment();
        const duration = moment.duration(time2.diff(time1)).asSeconds();

        if (duration >= 2) {
          console.log(
            `[${this.threadNumber}] count=${count}, itemFound=${!!result?.Item}`,
          );
          break;
        }
      }

      console.log(
        `[${this.threadNumber}]End Worker Time :: ${moment(time2).format("YYYY-MM-DD hh:mm:ss.SSS")}`,
      );
      console.log(`[${this.threadNumber}]execute count:: ${count}`);
    } catch (e) {
      console.error(`[${this.threadNumber}] DynamoDB Error:`, e.code ?? e.name);
      throw e;
    }

    return count;
  }
}

const wk = new WK(workerData);

const count = await wk.selectToken();

parentPort?.postMessage(count);

console.log(`Thread[${wk.threadNumber}]`, `ExecuteCount[${count}]`);
