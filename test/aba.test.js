const moment = require("moment");
const { expect } = require("chai");
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
    remitter: "Vault"
};

describe("ABA", () => {
    describe("class", () => {
        it("throws error on empty data", () => {
            const aba = new ABA();
            expect(() => aba.generate([])).to.throw();
        });

        it("generates file", () => {
            const aba = new ABA({
                bank: "ANZ",
                user: "Mr Allowasa Pertolio Branchagovkiy",
                userNumber: 1234,
                description: "Creditors Of The Wooloomooloo",
                time: new Date("2014-07-05T00:08:00.000Z")
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
                taxAmount: 12
            };
            const file = aba.generate([transaction]);
            expect(file).not.equal(undefined);
            const lines = file.split("\r\n");
            expect(lines[1].slice(0, 3)).equal("106");
            for (const line of lines) {
                expect(line.length).to.equal(120);
            }
        });
    });

    describe(".generate", () => {
        it("must return header in ABA format", () => {
            const aba = new ABA({
                bank: "ANZ",
                user: "Company",
                userNumber: 1337,
                description: "Creditors"
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
                "                                    " // Reserved
            ].join("");
            expect(header.length).to.equal(120);

            const rows = aba.generate([PAYMENT]).split(/\r\n/);
            expect(rows[0]).to.equal(header);
        });

        it("must return payment rows in ABA format", () => {
            const aba = new ABA({
                bank: "ANZ",
                user: "Company",
                userNumber: 1337,
                description: "Creditors",
                time: new Date("2014-07-05T00:08:00.000Z")
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
                "00000000" // Tax amount
            ].join("");
            expect(row.length).to.equal(120);

            const payment = {
                bsb: "013-999",
                account: "123456",
                transactionCode: 50,
                amount: 1337.42,
                accountTitle: "French Coffee",
                reference: "Order 132",
                traceBsb: "013-666",
                traceAccount: "567890",
                remitter: "Vault"
            };

            const rows = aba.generate([payment]).split(/\r\n/);
            expect(rows[1]).to.equal(row);
        });

        it("must return footer in ABA format", () => {
            const aba = new ABA({
                bank: "ANZ",
                user: "Company",
                userNumber: 1337,
                description: "Creditors",
                time: new Date("2014-07-05T00:08:00.000Z")
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
                "                                        " // Reserved
            ].join("");
            expect(footer.length).to.equal(120);

            const payment = { ...PAYMENT, amount: 0 };
            const payments = [payment, payment, payment];
            const rows = aba.generate(payments).split(/\r\n/);
            expect(rows[4]).to.equal(footer);
        });

        it("must use given BSB and account", () => {
            const aba = new ABA({
                bsb: "013-999",
                account: "123456",
                bank: "ANZ",
                user: "Company",
                userNumber: 1337,
                description: "Creditors"
            });

            const rows = aba.generate([PAYMENT]).split(/\r\n/);
            expect(rows[0].slice(1, 17)).to.equal("013-999   123456");
        });

        it("must leave time blank if only date given", () => {
            const aba = new ABA({
                bank: "ANZ",
                user: "Company",
                userNumber: 1337,
                description: "Creditors",
                date: new Date(2007, 5, 18)
            });

            const rows = aba.generate([PAYMENT]).split(/\r\n/);
            expect(rows[0].slice(74, 84)).to.equal("180607    ");
        });

        it("must use current date if not given", () => {
            const aba = new ABA({
                bank: "ANZ",
                user: "Company",
                userNumber: 1337,
                description: "Creditors"
            });

            const rows = aba.generate([PAYMENT]).split(/\r\n/);
            expect(rows[0].slice(74, 84)).to.equal(moment().format("DDMMYY    "));
        });

        it("must use given time", () => {
            const time = new Date("2014-07-05T00:08:00.000Z");

            const aba = new ABA({
                bank: "ANZ",
                user: "Company",
                userNumber: 1337,
                description: "Creditors",
                time
            });

            const rows = aba.generate([PAYMENT]).split(/\r\n/);
            expect(rows[0].slice(74, 84)).to.equal(moment(time).format("DDMMYYHHmm"));
        });

        it("must use given tax and tax amount", () => {
            const aba = new ABA({
                bank: "ANZ",
                user: "Company",
                userNumber: 1337,
                description: "Creditors",
                time: new Date("2014-07-05T00:08:00.000Z")
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
                taxAmount: 666.13
            };

            const rows = aba.generate([payment]).split(/\r\n/);
            expect(rows[1].slice(17, 18)).to.equal("X");
            expect(rows[1].slice(112, 120)).to.equal("00066613");
        });

        it("must sum up credit and debit totals", () => {
            const aba = new ABA({
                bank: "ANZ",
                user: "Company",
                userNumber: 1337,
                description: "Creditors",
                time: new Date("2014-07-05T00:08:00.000Z")
            });

            const defaults = {
                bsb: "666-133",
                account: "123456",
                accountTitle: "Transfer",
                reference: "Order 132",
                traceBsb: "013-666",
                traceAccount: "567890",
                remitter: "Vault"
            };

            const creditA = { ...defaults, amount: 1337.42, transactionCode: 50 };
            const creditB = { ...defaults, amount: 512.64, transactionCode: 50 };
            const debitA = { ...defaults, amount: 666.69, transactionCode: 13 };
            const debitB = { ...defaults, amount: 616.66, transactionCode: 13 };
            const payments = [creditA, debitA, creditB, debitB];

            let footer = [
                "0000056671", // Credit minus debit total
                "0000185006", // Credit total
                "0000128335" // Debit total
            ].join("");

            const rows = aba.generate(payments).split(/\r\n/);
            expect(rows[5].substr(20, 30)).to.equal(footer);
        });

        it("must return a negative net as positive", () => {
            const aba = new ABA({
                bank: "ANZ",
                user: "Company",
                userNumber: 1337,
                description: "Creditors",
                time: new Date("2014-07-05T00:08:00.000Z")
            });

            const payments = [
                { ...PAYMENT, transactionCode: ABA.CREDIT, amount: 666.66 },
                { ...PAYMENT, transactionCode: ABA.DEBIT, amount: 1337.42 }
            ];

            const footer = aba._getFooter(payments);
            expect(footer.length).to.equal(2);
            expect(footer.credit).to.equal("66666");
            expect(footer.debit).to.equal("133742");
            expect(footer.net).to.equal("67076");

            let result = [
                "0000067076", // Credit minus debit total
                "0000066666", // Credit total
                "0000133742" // Debit total
            ].join("");

            const rows = aba.generate(payments).split(/\r\n/);
            expect(rows[3].substr(20, 30)).to.equal(result);
        });
    });
});
