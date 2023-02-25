// https://day.js.org/docs/en/installation/installation

const dayjs = require('dayjs');

const month = dayjs().format('YYYYMM');
const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
const today = dayjs().format('YYYY-MM-DD');

module.exports = {
    month,
    monthStart,
    today,
};
