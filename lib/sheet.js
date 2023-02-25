// GoogleSpreadsheet
// https://theoephraim.github.io/node-google-spreadsheet/#/classes/google-spreadsheet

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { month } = require('./date.js');

/**
 * Googleスプレッドシートへデータを書き込む
 * @param {*} costDataArray
 * @returns
 */
const writeMonthlyCostDataToSheet = async (costDataArray) => {
    try {
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SHEET_CLIENT_EMAIL || '',
            private_key: (process.env.GOOGLE_SHEET_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();

        // シートが存在しない場合は作成する
        let sheet;
        const sheetExists = doc.sheetsByTitle[month] !== undefined;
        if (sheetExists) {
            sheet = doc.sheetsByTitle[month];
        } else {
            sheet = await doc.addSheet({
                title: month,
                headerValues: ['AWS Service', 'Monthly Cost'],
            });
        }
        await sheet.loadCells();

        const [monthlyCost, ...dailyCost] = costDataArray;

        // 料金データを編集する
        const costData = monthlyCost.Groups.map((group) => {
            return {
                service: group.service,
                monthlyCost: group.cost,
                dailyCost: dailyCost.map((daily) => {
                    return {
                        date: daily.timePeriod,
                        cost: daily.Groups.find((obj) => obj.service === group.service)?.cost || '0',
                    };
                }),
            };
        });

        console.log('costData', JSON.stringify(costData));

        // 月額料金を書き込み
        costData.forEach((data, i) => {
            const cell_A = sheet.getCell(i + 1, 0);
            const cell_B = sheet.getCell(i + 1, 1);
            cell_A.value = data.service;
            cell_B.value = Number(data.monthlyCost);
            cell_B.valueType = 'numberValue';
            data.dailyCost.forEach((daily, j) => {
                const cellNext = sheet.getCell(i + 1, j + 2);
                cellNext.value = daily.cost;
                cellNext.valueType = 'numberValue';
            });
        });

        // // 合計金額を算出
        const totalCostCell_A = sheet.getCell(costDataArray[0].Groups.length + 1, 0);
        totalCostCell_A.value = 'Total Cost';
        const totalCostCell_B = sheet.getCell(costDataArray[0].Groups.length + 1, 1);
        totalCostCell_B.value = `=SUM(B2:B${costDataArray[0].Groups.length + 1})`;

        // // セル情報を保存
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

module.exports = { writeMonthlyCostDataToSheet };
