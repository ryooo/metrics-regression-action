"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspace = void 0;
const path_1 = require("path");
const constants_1 = require("./constants");
const workspace = () => {
    return (0, path_1.join)('./', constants_1.WORKSPACE_DIR_NAME);
};
exports.workspace = workspace;
//# sourceMappingURL=path.js.map