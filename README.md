# ABA generator

Generate ABA Files from Node.js

## Usage

Installation

```shell script
npm i -S aba-generator
```

Example

```js
const ABA = require("aba-generator");

const aba = new ABA({
    bank: "ANZ",
    user: "Allowasa Pertolio Accounting&Tax",
    userNumber: 1234,
    description: "Creditors Of The Wooloomooloo"
});

const transaction = {
    bsb: "061021",
    transactionCode: ABA.DEBIT,
    account: "123456",
    amount: 12.0,
    accountTitle: "Georgian Council of New South Wales",
    reference: "1234",
    traceBsb: "061123",
    traceAccount: "1234567",
    remitter: "1235",
    taxAmount: 12
};

const file = aba.generate([transaction]);

console.log(file);
```

Should print:

```
0                 01ANZ       Allowasa Pertolio Accounti001234Creditors Of180320
1061-021   123456 130000001200Georgian Council of New South Wa1234              061-123  12345671235            00001200
7999-999            000000120000000000000000001200                        000001
```

which is a fully valid ABA file. (There should be spaces in the end of the first and last rows, but are not rendered in Markdown).

Every line in the ABA file must be 120 chars. So data like `user`, `description`, `accountTitle`, etc are truncated if too long.

## Note

Even though the format is standardised, bank typically mandate some of the fields to be hardcoded.

## ABA file specification

1. http://ddkonline.blogspot.com/2009/01/aba-bank-payment-file-format-australian.html
1. https://www.cemtexaba.com/aba-format/cemtex-aba-file-format-details

## API

### new ABA(options)

Constructor options:

```
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
```

### .generate(transactions)

Transactions schema. Most of the params are required as yo ucan see.

```
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
```
