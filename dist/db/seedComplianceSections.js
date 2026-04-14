"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedComplianceSections = void 0;
const db_1 = require("../config/db");
const schema_1 = require("./schema");
const seedComplianceSections = async () => {
    await db_1.db.insert(schema_1.complianceSections).values([
        {
            code: "Compliance with Sections 109 & 110 CAMA",
            title: "Register of Members and Location",
        },
        {
            code: "Compliance with Sections 111 CAMA",
            title: "Index of Members and Location",
        },
        { code: "Compliance with Sections 119 CAMA", title: "PSC Register" },
        { code: "Compliance with Sections 216 CAMA", title: "Register of Charges" },
        { code: "Compliance with Sections 268 & 269 CAMA", title: "Minute Books" },
        {
            code: "Compliance with Sections 301 CAMA",
            title: "Register of Directors’ Shareholding, etc.",
        },
        {
            code: "Compliance with Sections 304 CAMA",
            title: "Particulars of Directors on Business Letters, Show Cards, Trade Circulars",
        },
        {
            code: "Compliance with Sections 318 & 319 CAMA",
            title: "Register of Directors",
        },
        {
            code: "Compliance with Sections 320 CAMA",
            title: "Register of Directors’ Residential Addresses",
        },
        {
            code: "Compliance with Sections 330 & 339 CAMA",
            title: "Register of Secretaries (PLCs) and Notification of Change",
        },
        {
            code: "Compliance with Sections 374 & 376 CAMA",
            title: "Accounting Records",
        },
        {
            code: "Compliance with Sections 728 CAMA",
            title: "Notice of Change of Registered or Head Office Address",
        },
        {
            code: "Compliance with Sections 729 CAMA",
            title: "Display of Name & RC No. Outside Office or Place of Business",
        },
        {
            code: "Compliance with Sections 733 CAMA",
            title: "Conspicuous Display of Statement of Affairs by Banks, Insurances Houses, PMIs, etc.",
        },
    ]);
    console.log("Compliance sections seeded successfully");
};
exports.seedComplianceSections = seedComplianceSections;
