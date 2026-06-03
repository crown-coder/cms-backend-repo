"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reset = exports.disable = exports.verifyLogin = exports.verifySetup = exports.beginSetup = void 0;
const twoFactor_service_1 = require("./twoFactor.service");
const beginSetup = async (req, res) => {
    try {
        const result = await (0, twoFactor_service_1.setupTwoFactor)(req.user.id);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.beginSetup = beginSetup;
const verifySetup = async (req, res) => {
    try {
        const { otp } = req.body;
        if (!otp) {
            throw new Error("Authentication code is required");
        }
        const result = await (0, twoFactor_service_1.verifyTwoFactorSetup)(req.user.id, otp);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.verifySetup = verifySetup;
const verifyLogin = async (req, res) => {
    try {
        const { token, otp, recoveryCode, rememberDevice } = req.body;
        if (!token) {
            throw new Error("2FA token is required");
        }
        const result = await (0, twoFactor_service_1.verifyTwoFactorLogin)({
            token,
            otp,
            recoveryCode,
            rememberDevice,
        });
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.verifyLogin = verifyLogin;
const disable = async (req, res) => {
    try {
        const { password, otp, recoveryCode } = req.body;
        if (!password) {
            throw new Error("Password is required");
        }
        const result = await (0, twoFactor_service_1.disableTwoFactor)(req.user.id, {
            password,
            otp,
            recoveryCode,
        });
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.disable = disable;
const reset = async (req, res) => {
    try {
        const { password, recoveryCode } = req.body;
        if (!password || !recoveryCode) {
            throw new Error("Password and recovery code are required");
        }
        const result = await (0, twoFactor_service_1.resetTwoFactor)(req.user.id, {
            password,
            recoveryCode,
        });
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.reset = reset;
