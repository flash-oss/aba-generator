const moment = require("moment");
const assert = require("node:assert");
const { describe, it } = require("node:test");

const ABA = require("../");

const PAYMENT = {
    bsb: "013-999",
    account: "123456",
    transactionCode: 50,
    amount: 1337.42,
    accountTitle: "French Coffee",
    reference: "Order 132",
    traceBsb: "013-666",
    traceAccount: "567890",
    remitter: "Vault",
};

describe("ABA", () => {
    describe("class", () => {
        it("throws error on empty data", () => {
            const aba = new ABA();
            assert.throws(() => aba.generate([]));
        });

        it("generates file", () => {
            const aba = new ABA({
                header: {
                    bank: "ANZ",
                    user: "Mr Allowasa Pertolio Branchagovkiy",
                    userNumber: 1234,
                    description: "Creditors Of The Wooloomooloo",
                    time: new Date("2014-07-05T00:08:00.000Z"),
                },
            });

            const transaction = {
                bsb: "061021",
                transactionCode: ABA.DEBIT,
                account: "123456",
                amount: 12.0,
                accountTitle: "Ukrainian Council of New South Wales",
                traceBsb: "061123",
                traceAccount: "1234567",
                remitter: "1235",
                taxAmount: 12,
            };
            const file = aba.generate([transaction]);
            assert.notEqual(file, undefined);
            const lines = file.split("\r\n");
            assert.equal(lines[1].slice(0, 3), "106");
            for (const line of lines) {
                assert.equal(line.length, 120);
            }
        });

        it("generate file with custom data", () => {
            const aba = new ABA({
                header: {
                    bank: "ANZ",
                    user: "Mr Allowasa Pertolio Branchagovkiy",
                    userNumber: 1234,
                    description: "Creditors Of The Wooloomooloo",
                    time: new Date("2014-07-05T00:08:00.000Z"),
                },
                schemas: {
                    2: {
                        recordType: "transaction",
                        fields: [
                            { name: "transactionType", boundaries: [0, 1], type: "string" },
                            { name: "account", boundaries: [8, 17], type: "string" },
                            { name: "transactionCode", boundaries: [18, 20], type: "integer" },
                            { name: "amount", boundaries: [20, 30], type: "money" },
                            { name: "customRight", boundaries: [40, 70], type: "string", padding: "right" },
                            { name: "customLeft", boundaries: [70, 120], type: "string", padding: "left" },
                        ],
                    },
                },
            });

            const transaction = {
                transactionType: "2",
                bsb: "061021",
                transactionCode: ABA.DEBIT,
                account: "123456",
                amount: 12.0,
                accountTitle: "Ukrainian Council of New South Wales",
                traceBsb: "061123",
                traceAccount: "1234567",
                remitter: "1235",
                taxAmount: 12,
                customRight: "right padding test",
                customLeft: "left padding test",
            };

            const file = aba.generate([transaction]);

            assert.notEqual(file, undefined);
            const lines = file.split("\r\n");

            assert.equal(
                lines[1],
                "2          123456 130000001200                      right padding testleft padding test                                 "
            );
        });
    });

    describe(".generate", () => {
        it("must return header in ABA format", () => {
            const aba = new ABA({
                header: { bank: "ANZ", user: "Company", userNumber: 1337, description: "Creditors" },
            });

            const header = [
                "0",
                "       ", // Optional Bank/State/Branch
                "         ", // Optional account
                " ", // Reserved
                "01", // Static sequence number
                "ANZ", // Financial institution
                "       ", // Reserved
                "Company                   ", // User preferred name
                "001337", // User id number
                "Creditors   ", // Description of payments
                moment().format("DDMMYY"), // Date to be processed
                "    ", // Time to be processed
                "                                    ", // Reserved
            ].join("");
            assert.equal(header.length, 120);

            const rows = aba.generate([PAYMENT]).split(/\r\n/);
            assert.equal(rows[0], header);
        });

        it("must return payment rows in ABA format", () => {
            const aba = new ABA({
                header: {
                    bank: "ANZ",
                    user: "Company",
                    userNumber: 1337,
                    description: "Creditors",
                    time: new Date("2014-07-05T00:08:00.000Z"),
                },
            });

            const row = [
                "1",
                "013-999", // Bank/State/Branch
                "   123456", // Account
                " ", // Optional tax
                "50", // Transaction code
                "0000133742", // Amount
                "French Coffee                   ", // Account title
                "Order 132         ", // Reference
                "013-666", // Trace bank/state/branch
                "   567890", // Trace account
                "Vault           ", // Remitter
                "00000000", // Tax amount
            ].join("");
            assert.equal(row.length, 120);

            const payment = {
                bsb: "013-999",
                account: "123456",
                transactionCode: 50,
                amount: 1337.42,
                accountTitle: "French Coffee",
                reference: "Order 132",
                traceBsb: "013-666",
                traceAccount: "567890",
                remitter: "Vault",
            };

            const rows = aba.generate([payment]).split(/\r\n/);
            assert.equal(rows[1], row);
        });

        it("must return footer in ABA format", () => {
            const aba = new ABA({
                header: {
                    bank: "ANZ",
                    user: "Company",
                    userNumber: 1337,
                    description: "Creditors",
                    time: new Date("2014-07-05T00:08:00.000Z"),
                },
            });

            const footer = [
                "7",
                "999-999", // Reserved
                "            ", // Reserved
                "0000000000", // Credit minus debit total
                "0000000000", // Credit total
                "0000000000", // Debit total
                "                        ", // Reserved
                "000003", // Payment count
                "                                        ", // Reserved
            ].join("");
            assert.equal(footer.length, 120);

            const payment = { ...PAYMENT, amount: 0 };
            const payments = [payment, payment, payment];
            const rows = aba.generate(payments).split(/\r\n/);
            assert.equal(rows[4], footer);
        });

        it("must use given BSB and account", () => {
            const aba = new ABA({
                header: {
                    bsb: "013-999",
                    account: "123456",
                    bank: "ANZ",
                    user: "Company",
                    userNumber: 1337,
                    description: "Creditors",
                },
            });

            const rows = aba.generate([PAYMENT]).split(/\r\n/);
            assert.equal(rows[0].slice(1, 17), "013-999   123456");
        });

        it("must leave time blank if only date given", () => {
            const aba = new ABA({
                header: {
                    bank: "ANZ",
                    user: "Company",
                    userNumber: 1337,
                    description: "Creditors",
                    date: new Date(2007, 5, 18),
                },
            });

            const rows = aba.generate([PAYMENT]).split(/\r\n/);
            assert.equal(rows[0].slice(74, 84), "180607    ");
        });

        it("must use current date if not given", () => {
            const aba = new ABA({
                header: {
                    bank: "ANZ",
                    user: "Company",
                    userNumber: 1337,
                    description: "Creditors",
                },
            });

            const rows = aba.generate([PAYMENT]).split(/\r\n/);
            assert.equal(rows[0].slice(74, 84), moment().format("DDMMYY    "));
        });

        it("must use given time", () => {
            const time = new Date("2014-07-05T00:08:00.000Z");

            const aba = new ABA({
                header: {
                    bank: "ANZ",
                    user: "Company",
                    userNumber: 1337,
                    description: "Creditors",
                    time,
                },
            });

            const rows = aba.generate([PAYMENT]).split(/\r\n/);
            assert.equal(rows[0].slice(74, 84), moment(time).format("DDMMYYHHmm"));
        });

        it("must use given tax and tax amount", () => {
            const aba = new ABA({
                header: {
                    bank: "ANZ",
                    user: "Company",
                    userNumber: 1337,
                    description: "Creditors",
                    time: new Date("2014-07-05T00:08:00.000Z"),
                },
            });

            const payment = {
                bsb: "013-999",
                account: "123456",
                transactionCode: 50,
                amount: 1337.42,
                accountTitle: "French Coffee",
                reference: "Order 132",
                traceBsb: "013-666",
                traceAccount: "567890",
                remitter: "Vault",
                tax: "X",
                taxAmount: 666.13,
            };

            const rows = aba.generate([payment]).split(/\r\n/);
            assert.equal(rows[1].slice(17, 18), "X");
            assert.equal(rows[1].slice(112, 120), "00066613");
        });

        it("must sum up credit and debit totals", () => {
            const aba = new ABA({
                header: {
                    bank: "ANZ",
                    user: "Company",
                    userNumber: 1337,
                    description: "Creditors",
                    time: new Date("2014-07-05T00:08:00.000Z"),
                },
            });

            const defaults = {
                bsb: "666-133",
                account: "123456",
                accountTitle: "Transfer",
                reference: "Order 132",
                traceBsb: "013-666",
                traceAccount: "567890",
                remitter: "Vault",
            };



            const payments = [
                { ...defaults, amount: 1337.42, transactionCode: 50 }, //credit 1
                { ...defaults, amount: 1.01, transactionCode: 51 }, //credit 2
                { ...defaults, amount: 1.01, transactionCode: 52 }, //credit 3
                { ...defaults, amount: 1.01, transactionCode: 53 }, //credit 4
                { ...defaults, amount: 1.01, transactionCode: 54 }, //credit 5
                { ...defaults, amount: 1.01, transactionCode: 55 }, //credit 6
                { ...defaults, amount: 1.01, transactionCode: 56 }, //credit 7
                { ...defaults, amount: 1.01, transactionCode: 57 }, //credit 8
                { ...defaults, amount: 666.69, transactionCode: 13 }, //debit 1
                { ...defaults, amount: 512.64, transactionCode: 50 }, //credit 9
                { ...defaults, amount: 616.66, transactionCode: 13 }, // debit 2
            ];

            let footer = [
                "0000057378", // Credit minus debit total
                "0000185713", // Credit total
                "0000128335", // Debit total
            ].join("");

            const rows = aba.generate(payments).split(/\r\n/);

            assert.equal(rows[rows.length-1].substr(20, 30), footer);
        });

        it("must return a negative net as positive", () => {
            const aba = new ABA({
                header: {
                    bank: "ANZ",
                    user: "Company",
                    userNumber: 1337,
                    description: "Creditors",
                    time: new Date("2014-07-05T00:08:00.000Z"),
                },
            });
            const payments = [
                { ...PAYMENT, transactionCode: ABA.CREDIT, amount: 111.11 },
                { ...PAYMENT, transactionCode: ABA.PAY, amount: 555.55 },
                { ...PAYMENT, transactionCode: ABA.DEBIT, amount: 1337.42 },
            ];
            let result = [
                "0000067076", // Credit minus debit total
                "0000066666", // Credit total
                "0000133742", // Debit total
            ].join("");

            const rows = aba.generate(payments).split(/\r\n/);

            assert.equal(rows[4].substr(20, 30), result);
        });
    });
});
