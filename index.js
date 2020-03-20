const printf = require("printf");

const toCents = (number = 0) => (Number(number) * 100).toFixed(0);
const sum = totals => totals.reduce((p, v) => p + v, 0).toFixed(2);
const difference = (credit, debit) => Math.abs(credit - debit).toFixed(2);
const pad2 = any => printf("%02d", any);

const formatBsb = bsb => {
    const value = bsb.replace(/(\s|-)+/, "").trim();
    return value ? `${value.slice(0, 3)}-${value.slice(3, 6)}` : "";
};

const PAYMENT_FORMAT = [
    "1",
    "%(bsb)7s",
    "%(account)9s",
    "%(tax)1s",
    "%(transactionCode)02d",
    "%(amount)010d",
    "%(accountTitle)-32.32s",
    "%(reference)-18.18s",
    "%(traceBsb)7s",
    "%(traceAccount)9s",
    "%(remitter)-16.16s",
    "%(taxAmount)08d"
].join("");

const HEADER_FORMAT = [
    "0",
    "%(bsb)7s",
    "%(account)9s",
    " ",
    "01",
    "%(bank)-3s",
    " ".repeat(7),
    "%(user)-26.26s",
    "%(userNumber)06d",
    "%(description)-12.12s",
    "%(date)6s",
    "%(time)4s",
    " ".repeat(36)
].join("");

const FOOTER_FORMAT = [
    "7",
    "999-999",
    " ".repeat(12),
    "%(net)010d",
    "%(credit)010d",
    "%(debit)010d",
    " ".repeat(24),
    "%(length)06d",
    " ".repeat(40)
].join("");

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
     */
    constructor(options) {
        this.options = { ...ABA.HEADER_DEFAULTS, ...options };
    }

    /**
     * @private
     */
    formatTransaction(transaction) {
        return printf(PAYMENT_FORMAT, {
            ...transaction,
            amount: toCents(transaction.amount),
            bsb: formatBsb(transaction.bsb),
            account: transaction.account.trim(),
            traceBsb: formatBsb(transaction.traceBsb),
            taxAmount: toCents(transaction.taxAmount)
        });
    }

    /**
     * @private
     */
    formatHeader() {
        const time = new Date(this.options.time || this.options.date || new Date());

        return printf(HEADER_FORMAT, {
            ...this.options,
            date: pad2(time.getDate()) + pad2(time.getMonth() + 1) + pad2(time.getFullYear() % 100), // DDMMYY
            bsb: formatBsb(this.options.bsb),
            time: this.options.time ? pad2(time.getHours()) + pad2(time.getMinutes()) : "" // HHmm
        });
    }

    /**
     * @private
     */
    formatFooter(transactions) {
        return printf(FOOTER_FORMAT, this._getFooter(transactions));
    }

    /**
     * @private
     */
    _getFooter(transactions) {
        const credits = transactions.filter(p => p.transactionCode === ABA.CREDIT);
        const debits = transactions.filter(p => p.transactionCode === ABA.DEBIT);
        const credit = sum(credits.map(c => c.amount));
        const debit = sum(debits.map(d => d.amount));

        return {
            // According to spec the net total was supposed to be an unsigned value of
            // credit minus debit (with no mention of underflow), but turns out they
            // really meant merely the difference between credit and debit.
            net: toCents(difference(credit, debit)),
            credit: toCents(credit),
            debit: toCents(debit),
            length: transactions.length
        };
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
     * @param transactions[].reference {String} Payment reference, e.g. "Invoice # 123". Up to 18 chars.
     * @param transactions[].traceBsb {String} The transacting account BSB
     * @param transactions[].traceAccount {String} The transacting account number
     * @param transactions[].remitter {String} The transacting company name.
     * @param [transactions[].taxAmount=0] {Number}
     * @return {String} The ABA file contents as a string.
     */
    generate(transactions = []) {
        // ABA requires at least one detail record.
        if (!transactions.length) {
            throw new Error("Please pass in at least one payment");
        }
        const formatted = transactions.map(payment => this.formatTransaction({ ...ABA.PAYMENT_DEFAULTS, ...payment }));
        return [this.formatHeader(), ...formatted, this.formatFooter(transactions)].join("\r\n");
    }
}

ABA.PAYMENT_DEFAULTS = {
    tax: "",
    taxAmount: 0
};

ABA.CREDIT = 50;
ABA.DEBIT = 13;

ABA.HEADER_DEFAULTS = {
    bsb: "",
    account: "",
    description: "",
    time: ""
};

module.exports = ABA;
