// GetCostAndUsage
// https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html
// GoogleSpreadsheet
// https://theoephraim.github.io/node-google-spreadsheet/#/classes/google-spreadsheet

const AWS = require('aws-sdk');
const ce = new AWS.CostExplorer({ region: 'us-east-1' });
const { GoogleSpreadsheet } = require('google-spreadsheet');

exports.handler = async (event, context) => {
    const params = {
        TimePeriod: {
            Start: '2023-02-01',
            End: '2023-02-28',
        },
        // Granularity: 'DAILY',
        Granularity: 'MONTHLY',
        GroupBy: [
            {
                Type: 'DIMENSION',
                Key: 'SERVICE',
            },
        ],
        Metrics: ['UnblendedCost'],
    };

    try {
        const results = await ce.getCostAndUsage(params).promise();
        const costDataArray = results.ResultsByTime.map((result) => {
            return {
                timePeriod: result.TimePeriod.Start,
                Groups: result.Groups.map((group) => {
                    return {
                        service: group.Keys[0],
                        cost: group.Metrics.UnblendedCost.Amount,
                    };
                }),
            };
        });
        console.log(costDataArray);

        const response = await writeCostDataToSheet(costDataArray);
        return response;
    } catch (err) {
        console.error(err);
        throw err;
    }
};

/**
 * Googleスプレッドシートへデータを書き込む
 * @param {*} costDataArray
 * @returns
 */
const writeCostDataToSheet = async (costDataArray) => {
    try {
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SHEET_CLIENT_EMAIL || '',
            private_key: (process.env.GOOGLE_SHEET_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();

        // シートが存在しない場合は作成する
        let sheet;
        const sheetExists = doc.sheetsByTitle['202201'] !== undefined;
        if (sheetExists) {
            sheet = doc.sheetsByTitle['202201'];
        } else {
            sheet = await doc.addSheet({ title: '202201', headerValues: ['AWS Service', 'Monthly Cost'] });
        }
        await sheet.loadCells();

        // 月額料金を書き込み
        costDataArray[0].Groups.forEach((group, index) => {
            const cell_A = sheet.getCell(index + 1, 0);
            const cell_B = sheet.getCell(index + 1, 1);
            cell_A.value = group.service;
            cell_B.value = Number(group.cost);
            cell_B.valueType = 'numberValue';
        });

        // 合計金額を算出
        const totalCostCell_A = sheet.getCell(costDataArray[0].Groups.length + 1, 0);
        totalCostCell_A.value = 'Total Cost';
        const totalCostCell_B = sheet.getCell(costDataArray[0].Groups.length + 1, 1);
        totalCostCell_B.value = `=SUM(B2:B${costDataArray[0].Groups.length + 1})`;

        // セル情報を保存
        await sheet.saveUpdatedCells();

        const response = {
            statusCode: 200,
            body: JSON.stringify('Success!'),
        };
        return response;
    } catch (err) {
        console.error(err);
        throw err;
    }
};
