"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEvent = void 0;
const fs_1 = require("fs");
const logger_1 = require("./logger");
const readEvent = () => {
    try {
        if (process.env.GITHUB_EVENT_PATH) {
            return JSON.parse((0, fs_1.readFileSync)(process.env.GITHUB_EVENT_PATH, 'utf8'));
        }
    }
    catch (e) {
        // noop
    }
};
const getEvent = () => {
    const event = readEvent();
    logger_1.log.debug(`event = `, event);
    if (!event) {
        throw new Error('Failed to get github event.json.');
    }
    return event;
};
exports.getEvent = getEvent;
//# sourceMappingURL=event.js.map