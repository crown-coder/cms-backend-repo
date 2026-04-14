"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = exports.removeUser = exports.createSuperAdmin = exports.fetchUsers = exports.registerUser = exports.login = void 0;
const auth_service_1 = require("./auth.service");
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await (0, auth_service_1.loginUser)(email, password);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.login = login;
const registerUser = async (req, res) => {
    try {
        const user = await (0, auth_service_1.createUser)(req.user, req.body);
        res.json({ message: "User created successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.registerUser = registerUser;
const fetchUsers = async (req, res) => {
    try {
        const users = await (0, auth_service_1.getAllUsers)(req.user);
        res.json(users);
    }
    catch (error) {
        res.status(403).json({ message: error.message });
    }
};
exports.fetchUsers = fetchUsers;
const createSuperAdmin = async (req, res) => {
    try {
        const result = await (0, auth_service_1.bootstrapSuperAdmin)(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createSuperAdmin = createSuperAdmin;
const removeUser = async (req, res) => {
    try {
        const result = await (0, auth_service_1.deleteUser)(req.user, Number(req.params.id));
        res.json(result);
    }
    catch (error) {
        res.status(403).json({ message: error.message });
    }
};
exports.removeUser = removeUser;
const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await (0, auth_service_1.updateUserPassword)(req.user, currentPassword, newPassword);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updatePassword = updatePassword;
