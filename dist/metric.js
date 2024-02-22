"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricToTd = exports.compareMetrics = exports.isSameMetric = exports.sortMetricsFunc = exports.parseMetricsFile = exports.isComparedMetric = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const isComparedMetric = (n) => n.type === 'compared-metric';
exports.isComparedMetric = isComparedMetric;
const parseMetricsFile = (path) => {
    const fileContents = JSON.parse((0, fs_1.readFileSync)(path, 'utf8'));
    const metrics = [];
    for (const metricName in fileContents) {
        metrics.push({
            type: 'metric',
            fileName: (0, path_1.basename)(path),
            metricName,
            value: fileContents[metricName],
        });
    }
    return metrics;
};
exports.parseMetricsFile = parseMetricsFile;
const sortMetricsFunc = (a, b) => {
    if (a.fileName === b.fileName) {
        return a.metricName < b.metricName ? -1 : 1;
    }
    return a.fileName < b.fileName ? -1 : 1;
};
exports.sortMetricsFunc = sortMetricsFunc;
const isSameMetric = (a, b) => {
    return a.fileName === b.fileName && a.metricName === b.metricName;
};
exports.isSameMetric = isSameMetric;
const compareMetrics = (expected, actual) => {
    const diff = actual.value - expected.value;
    const diffStr = numberToStr(diff, 1);
    const threshold = 1; // TODO use config.
    return {
        type: 'compared-metric',
        fileName: actual.fileName,
        metricName: actual.metricName,
        actualStr: numberToStr(actual.value, 2), // TODO get digit by config.
        expectedStr: numberToStr(expected.value, 2), // TODO get digit by config.
        diffStr: diff > 0 ? `+${diffStr}` : `-${diffStr}`,
        within: Math.abs(diff) <= threshold,
        actual,
        expected,
    };
};
exports.compareMetrics = compareMetrics;
const numberToStr = (value, digit) => {
    if (digit > 0) {
        const str = Math.floor(value * 10 * digit).toString();
        return str.slice(0, str.length - digit) + '.' + str.slice(-1 * digit);
    }
    return Math.floor(value).toString();
};
const metricToTd = (m) => {
    return `| ${m.fileName} | ${m.metricName} | ${(0, exports.isComparedMetric)(m) ? `${m.actualStr}(${m.diffStr})` : m.value} |`;
};
exports.metricToTd = metricToTd;
//# sourceMappingURL=metric.js.map