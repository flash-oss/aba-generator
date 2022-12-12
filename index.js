const defaultAbaSchemas = {
    0: {
        recordType: "header",
        fields: [
            { name: "type", boundaries: [0, 1], type: "string" },
            { name: "bsb", boundaries: [1, 8], type: "bsb" },
            { name: "account", boundaries: [8, 17], type: "string" },
            { name: "sequenceNumber", boundaries: [18, 20], type: "integer" },
            { name: "bank", boundaries: [20, 23], type: "string" },
            { name: "user", boundaries: [30, 56], type: "string", padding: "left" }, // L
            { name: "userNumber", boundaries: [56, 62], type: "string" },
            { name: "description", boundaries: [62, 74], type: "string", padding: "left" }, // L
            { name: "date", boundaries: [74, 80], type: "string" },
            { name: "time", boundaries: [80, 84], type: "string" },
            { name: "filler", boundaries: [84, 120], type: "string" }, // filler to match 120 char line size
        ],
    },
    1: {
        recordType: "transaction",
        fields: [
            { name: "transactionType", boundaries: [0, 1], type: "string" },
            { name: "bsb", boundaries: [1, 8], type: "bsb" },
            { name: "account", boundaries: [8, 17], type: "string" },
            { name: "tax", boundaries: [17, 18], type: "string" },
            { name: "transactionCode", boundaries: [18, 20], type: "integer" },
            { name: "amount", boundaries: [20, 30], type: "money" },
            { name: "accountTitle", boundaries: [30, 62], type: "string", padding: "left" }, // L
            { name: "reference", boundaries: [62, 80], type: "string", padding: "left" }, // L
            { name: "traceBsb", boundaries: [80, 87], type: "bsb" },
            { name: "traceAccount", boundaries: [87, 96], type: "string" },
            { name: "remitter", boundaries: [96, 112], type: "string", padding: "left" }, // L
            { name: "taxAmount", boundaries: [112, 120], type: "money" },
        ],
    },

    7: {
        recordType: "footer",
        fields: [
            { name: "type", boundaries: [0, 1], type: "string" },
            { name: "bsb", boundaries: [1, 8], type: "bsb" },
            { name: "netTotal", boundaries: [20, 30], type: "money" },
            { name: "creditTotal", boundaries: [30, 40], type: "money" },
            { name: "debitTotal", boundaries: [40, 50], type: "money" },
            { name: "numberOfTransactions", boundaries: [74, 80], type: "integer" },
            { name: "filler", boundaries: [80, 120], type: "string" }, // filler to match 120 char line size
        ],
    },
};

function reformatFieldType(fieldData, field) {
    const fieldLength = field.boundaries[1] - field.boundaries[0];

    if (field.type === "money") {
        // fill with left 0 nad to cents
        return toCents(fieldData).padStart(fieldLength, "0").substring(0, fieldLength);
    }

    fieldData = String(fieldData);

    if (field.type === "string") {
        if (field.padding === "left") {
            // expand with spaces
            return fieldData.padEnd(fieldLength, " ").substring(0, fieldLength);
        } else {
            // expand with spaces
            return fieldData.padStart(fieldLength, " ").substring(0, fieldLength);
        }
    }

    if (field.type === "integer") {
        // fill with left 0
        return fieldData.padStart(fieldLength, "0").substring(0, fieldLength);
    }

    if (field.type === "bsb") {
        // no expand need
        return formatBsb(fieldData).padStart(fieldLength, " ").substring(0, fieldLength);
    }

    return String(fieldData).padStart(fieldLength, " ").substring(0, fieldLength);
}

const toCents = (number = 0) => (Number(number) * 100).toFixed(0);
const sum = (totals = 0) => totals.reduce((p, v) => p + v, 0).toFixed(2);
const difference = (credit = 0, debit = 0) => Math.abs(credit - debit).toFixed(2);
const pad2 = (any) => String(any).padStart(2, "0").substring(0, 2); // printf("%04d", any);

const formatBsb = (bsb) => {
    const value = bsb.replace(/(\s|-)+/, "").trim();
    return value ? `${value.slice(0, 3)}-${value.slice(3, 6)}` : "";
};

class ABA {
    /**
     * Specify the header of the ABA file.
     * @param options {Object} Header data.
     * @param [options.bsb=""] {String} Main account BSB. Should be ignored according to the specs.
     * @param [options.account=""] {String} Main account number. Up to 9 chars. Should be ignored according to the specs.
     * @param options.bank {String} Name of financial institution processing this file. 3 characters, like "ANZ", "WBC"
     * @param options.user {String} How the user will be shown in the transactions of the third party banks.
     * @param options.userNumber {Number} The ID of the user supplying the file.
     * @param options.description {String} Description of this file entries. Up to 12 chars.
     * @param [options.date=Date.now()] {Date|String|Number} Date to be processed.
     * @param [options.time] {Date|String|Number} Time to be processed. Should be ignored according to the specs.
     * @param [options.schemas] {Object} Custom schemas
     * @param [options.customHeaderData] {Object} Custom data for custom header, warning, will overwrite standard field if name will be the same
     * @param [options.customFooterData] {Object} Custom data for custom footer, warning, will overwrite standard field if name will be the same

     */
    constructor(options) {
        this.schemas = defaultAbaSchemas;
        this.schemas = Object.assign(this.schemas, options?.schemas);
        this.options = { ...ABA.HEADER_DEFAULTS, ...options };
    }

    // Parse any provided lines with schemas
    /**
     * @private
     */
    _generateLine(recordData, recordSchema) {
        let generateResult = [];
        let pointer = 0;
        for (const field of recordSchema.fields) {
            if (field.boundaries[0] - pointer < 0) {
                throw Error("Custom schema error, please provide field boundaries in grow order");
            }
            let filler = " ".repeat(field.boundaries[0] - pointer);
            generateResult.push(filler + reformatFieldType(recordData[field.name] || "", field));
            pointer = field.boundaries[1];
        }
        return generateResult.join("");
    }

    /**
     * Generate ABA file of these transactions.
     * @param transactions {Object[]} Transactions in the file
     * @param transactions[].bsb {String} The third party account BSB
     * @param [transactions[].tax=" "] {"N"|"W"|"X"|"Y"|" "|""}
     * @param transactions[].transactionCode {Number|ABA.CREDIT|ABA.DEBIT} Debit or credit? ABA.CREDIT or ABA.DEBIT
     * @param transactions[].account {String} The third party account number
     * @param transactions[].amount {String|Number}
     * @param transactions[].accountTitle {String} The third party (recipient) account name. Up to 32 chars.
     * @param [transactions[].reference] {String} Payment reference, e.g. "Invoice # 123". Up to 18 chars.
     * @param transactions[].traceBsb {String} The transacting account BSB
     * @param transactions[].traceAccount {String} The transacting account number
     * @param transactions[].remitter {String} The transacting company name.
     * @param [transactions[].taxAmount=0] {Number}
     * @return {String} The ABA file contents as a string.
     */
    generate(transactions = []) {
        if (!transactions.length) {
            throw new Error("Please pass in at least one payment");
        }
        const formatted = transactions.map((payment) =>
            this._generateLine(
                { ...ABA.PAYMENT_DEFAULTS, ...payment },
                this.schemas[payment.transactionType || ABA.PAYMENT_DEFAULTS.transactionType]
            )
        );
        return [this.formatHeader(), ...formatted, this.formatFooter(transactions)].join("\r\n");
    }

    /**
     * @private
     */
    formatHeader() {
        const time = new Date(this.options.time || this.options.date || new Date());

        const headerData = {
            ...this.options, // breaking change this.options.header
            date: pad2(time.getDate()) + pad2(time.getMonth() + 1) + pad2(time.getFullYear() % 100), // DDMMYY
            bsb: this.options.bsb,
            time: this.options.time ? pad2(time.getHours()) + pad2(time.getMinutes()) : "", // HHmm
            ...this.options?.customHeaderData,
        };

        return this._generateLine(headerData, this.schemas[headerData.type]);
    }

    /**
     * @private
     */
    formatFooter(transactions) {
        return this._generateLine(this._getFooter(transactions), this.schemas["7"]);
    }

    /**
     * @private
     */
    _getFooter(transactions) {
        const credits = transactions.filter((p) => p.transactionCode === ABA.CREDIT || p.transactionCode === ABA.PAY);
        const debits = transactions.filter((p) => p.transactionCode === ABA.DEBIT);
        const credit = sum(credits.map((c) => c.amount));
        const debit = sum(debits.map((d) => d.amount));

        return {
            type: "7",
            bsb: "999999",
            netTotal: difference(credit, debit),
            creditTotal: credit,
            debitTotal: debit,
            numberOfTransactions: transactions.length,
            ...this.options?.customFooterData,
        };
    }
}

ABA.PAYMENT_DEFAULTS = {
    tax: "",
    taxAmount: 0,
    transactionType: "1",
};

ABA.CREDIT = 50;
ABA.DEBIT = 13;
ABA.PAY = 53;
ABA.HEADER_DEFAULTS = {
    type: "0",
    sequenceNumber: 1,
    bsb: "",
    account: "",
    description: "",
    time: "",
};

module.exports = ABA;
