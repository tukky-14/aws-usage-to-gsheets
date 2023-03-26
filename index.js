// GetCostAndUsage
// https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html

const AWS = require('aws-sdk');
const ce = new AWS.CostExplorer({ region: 'us-east-1' });
const { monthStart, today } = require('./lib/date.js');
const { writeMonthlyCostDataToSheet } = require('./lib/sheet.js');

exports.handler = async (event, context) => {
    // 料金の取得方法
    const monthlyParams = {
        TimePeriod: {
            Start: monthStart,
            End: today,
        },
        Granularity: 'MONTHLY',
        GroupBy: [
            {
                Type: 'DIMENSION',
                Key: 'SERVICE',
            },
        ],
        Metrics: ['UnblendedCost'],
    };
    const dateParams = { ...monthlyParams, Granularity: 'DAILY' };

    try {
        // AWSの料金を取得
        const monthlyResults = await ce.getCostAndUsage(monthlyParams).promise();
        const dailyResults = await ce.getCostAndUsage(dateParams).promise();
        const results = [...monthlyResults.ResultsByTime, ...dailyResults.ResultsByTime];

        // スプレッドシートに書き込むために整形
        const costDataArray = results.map((result) => {
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

        console.log(JSON.stringify(costDataArray));

        const response = await writeMonthlyCostDataToSheet(costDataArray);
        return response;
    } catch (err) {
        console.error(err);
        throw err;
    }
};
