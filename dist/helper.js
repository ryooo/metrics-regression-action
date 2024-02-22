"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capture = exports.copyFiles = void 0;
const glob_1 = require("glob");
const exec_1 = require("@actions/exec");
const logger_1 = require("./logger");
const path_1 = require("path");
const copyFiles = async (from, to) => {
    const fromPaths = (0, glob_1.globSync)(from);
    for (const fromPath of fromPaths) {
        const fileName = (0, path_1.basename)(fromPath);
        await (0, exports.capture)('cp', [fromPath, (0, path_1.join)(to, fileName)]);
    }
};
exports.copyFiles = copyFiles;
const capture = async (cmd, args, options = {}) => {
    const res = {
        stdout: '',
        stderr: '',
        code: null,
    };
    try {
        const code = await (0, exec_1.exec)(cmd, args, {
            ...options,
            listeners: {
                stdout(data) {
                    res.stdout += data.toString();
                },
                stderr(data) {
                    res.stderr += data.toString();
                },
            },
        });
        res.code = code;
        return res;
    }
    catch (err) {
        const msg = `Command '${cmd}' failed with args '${args.join(' ')}': ${res.stderr}: ${err}`;
        logger_1.log.debug(`@actions/exec.exec() threw an error: ${msg}`);
        throw new Error(msg);
    }
};
exports.capture = capture;
//# sourceMappingURL=helper.js.map