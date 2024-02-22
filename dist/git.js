"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebase = exports.push = exports.commit = exports.add = exports.checkout = exports.hasBranch = exports.fetchOrigin = exports.clone = exports.configureEmail = exports.configureName = exports.findTargetHash = void 0;
const logger_1 = require("./logger");
const helper_1 = require("./helper");
const findTargetHash = async (baseSha, headSha) => {
    logger_1.log.info(`base sha is ${baseSha}, head sha is ${headSha}`);
    await (0, helper_1.capture)('git', ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*']);
    await (0, helper_1.capture)('git', ['fetch', '--all']);
    const args = ['merge-base', '-a', `${baseSha}`, `${headSha}`];
    const res = await (0, helper_1.capture)('git', args);
    if (res.code !== 0) {
        throw new Error(`Command 'git ${args.join(' ')}' failed: ${JSON.stringify(res)}`);
    }
    const targetHash = res.stdout;
    return targetHash;
};
exports.findTargetHash = findTargetHash;
const configureName = async (name) => {
    await (0, helper_1.capture)('git', ['config', '--global', 'user.name', name]);
};
exports.configureName = configureName;
const configureEmail = async (email) => {
    await (0, helper_1.capture)('git', ['config', '--global', 'user.email', email]);
};
exports.configureEmail = configureEmail;
const clone = async (input, options = {}) => {
    return (0, helper_1.capture)('git', ['clone', input.repo, input.dist], options);
};
exports.clone = clone;
const fetchOrigin = async (input, options = {}) => {
    return (0, helper_1.capture)('git', ['fetch', '-u', 'origin', `${input.branch}:${input.branch}`], options);
};
exports.fetchOrigin = fetchOrigin;
const hasBranch = async (branch, options = {}) => {
    const res = await (0, helper_1.capture)('git', ['branch', '--list', branch], options);
    return res.stdout.trim() !== '';
};
exports.hasBranch = hasBranch;
const checkout = async (branch, orphan, options = {}) => {
    const args = orphan ? ['checkout', '--orphan', branch] : ['checkout', branch];
    return (0, helper_1.capture)('git', args, options);
};
exports.checkout = checkout;
const add = async (options = {}) => {
    return (0, helper_1.capture)('git', ['add', '-A', '.'], options);
};
exports.add = add;
const commit = async (message, options = {}) => {
    return (0, helper_1.capture)('git', ['commit', '-m', message], options);
};
exports.commit = commit;
const push = async (branch, options = {}) => {
    return (0, helper_1.capture)('git', ['push', 'origin', branch], options);
};
exports.push = push;
const rebase = async (branch, options = {}) => {
    return (0, helper_1.capture)('git', ['rebase', `origin/${branch}`], options);
};
exports.rebase = rebase;
//# sourceMappingURL=git.js.map