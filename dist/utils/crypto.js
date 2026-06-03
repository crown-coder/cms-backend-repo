"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptSecret = exports.encryptSecret = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const getKey = () => {
    const encodedKey = process.env.TWO_FACTOR_ENCRYPTION_KEY;
    if (!encodedKey) {
        throw new Error("TWO_FACTOR_ENCRYPTION_KEY is not configured");
    }
    const key = Buffer.from(encodedKey, "base64");
    if (key.length !== 32) {
        throw new Error("TWO_FACTOR_ENCRYPTION_KEY must be 32 bytes (base64)");
    }
    return key;
};
const encryptSecret = (plainText) => {
    const key = getKey();
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plainText, "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
};
exports.encryptSecret = encryptSecret;
const decryptSecret = (payload) => {
    const key = getKey();
    const [ivPart, tagPart, dataPart] = payload.split(".");
    if (!ivPart || !tagPart || !dataPart) {
        throw new Error("Invalid encrypted secret format");
    }
    const iv = Buffer.from(ivPart, "base64");
    const tag = Buffer.from(tagPart, "base64");
    const data = Buffer.from(dataPart, "base64");
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
};
exports.decryptSecret = decryptSecret;
