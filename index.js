// GetCostAndUsage
// https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html

const AWS = require('aws-sdk');
const ce = new AWS.CostExplorer({ region: 'us-east-1' });
const { monthStart, today } = require('./lib/date.js');
const { writeMonthlyCostDataToSheet } = require('./lib/sheet.js');

exports.handler = async (event, context) => {
    // 料金の取得方法
    const params = {
        TimePeriod: {
            Start: monthStart,
            End: today,
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
        // スプレッドシートに書き込むために整形
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

        const response = await writeMonthlyCostDataToSheet(costDataArray);
        return response;
    } catch (err) {
        console.error(err);
        throw err;
    }
};
