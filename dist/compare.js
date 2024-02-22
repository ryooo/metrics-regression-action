"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compare = void 0;
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = require("./logger");
const path_1 = require("./path");
const glob_1 = require("glob");
const constants_1 = require("./constants");
const metric_1 = require("./metric");
const path_2 = require("path");
const compare = async (_config) => {
    const result = {
        overThresholdMetrics: [],
        withinThresholdMetrics: [],
        newMetrics: [],
        deletedMetrics: [],
    };
    const expectedFiles = (0, glob_1.globSync)((0, path_2.join)((0, path_1.workspace)(), constants_1.EXPECTED_DIR_NAME, '**/*.json'));
    const actualFiles = (0, glob_1.globSync)((0, path_2.join)((0, path_1.workspace)(), constants_1.ACTUAL_DIR_NAME, '**/*.json'));
    const expectedMetrics = expectedFiles
        .map(path => (0, metric_1.parseMetricsFile)(path))
        .flat()
        .sort(metric_1.sortMetricsFunc);
    const actualMetrics = actualFiles
        .map(path => (0, metric_1.parseMetricsFile)(path))
        .flat()
        .sort(metric_1.sortMetricsFunc);
    for (const actual of actualMetrics) {
        const expected = expectedMetrics.find(e => (0, metric_1.isSameMetric)(e, actual));
        if (expected) {
            const compared = (0, metric_1.compareMetrics)(expected, actual);
            if (compared.within) {
                result.withinThresholdMetrics.push(compared);
            }
            else {
                result.overThresholdMetrics.push(compared);
            }
        }
        else {
            result.newMetrics.push(actual);
        }
    }
    for (const expected of expectedMetrics) {
        const actual = actualMetrics.find(e => (0, metric_1.isSameMetric)(e, expected));
        if (!actual) {
            result.deletedMetrics.push(expected);
        }
    }
    logger_1.log.info('Comparison Complete');
    logger_1.log.info(chalk_1.default.red(`   Within threshold items: ${result.withinThresholdMetrics.length}`));
    logger_1.log.info(chalk_1.default.red(`   Over threshold items: ${result.overThresholdMetrics.length}`));
    logger_1.log.info(chalk_1.default.cyan(`   New items: ${result.newMetrics.length}`));
    logger_1.log.info(chalk_1.default.redBright(`   Deleted items: ${result.deletedMetrics.length}`));
    return result;
};
exports.compare = compare;
//# sourceMappingURL=compare.js.map