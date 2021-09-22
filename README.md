# ABA generator

Generate ABA Files from Node.js and browser.

Notable:

* The minified version of this module is 2.4KB.
* The only dependency is [printf](https://www.npmjs.com/package/printf), which can be minified to 8.2KB
* The source code of `aba-generator` is quite easy to read, understand, and amend. We welcome any changes. 

## Usage

Installation

```shell script
npm i -S aba-generator
```

Minimal example of sending money from your account:

```js
const ABA = require("aba-generator");

const aba = new ABA({
  bank: "ANZ", // The bank processing this file
  user: "Allowasa Pertolio Accounting&Tax", // Your (money sender) company name
  userNumber: 1234, // Your ID in the bank system, often hardcoded to some number. Consult with your bank
  description: "Credits Of The Wooloomooloo" // Description of the transactions within the file

// Optional
// bsb: String, // Main account BSB. Not in the ABA spec, but required by ANZ
// account: String, // Main account number. Not in the ABA spec, but required by ANZ
// date: Date|String|Number, // The date to be processed, default is now
// time: Date|String|Number, // The time to be processed. Not in the ABA spec, but required by ANZ
});

const transaction = {
  bsb: "061021", // recipient's account BSB
  transactionCode: ABA.CREDIT, 
        // indicates "you are sending money (debit), they are receiving (credit)". ABA.PAY works in the same way but with code 53 
  account: "123456", // recipient's account number
  amount: 12.0, // Number|String sending amount the recipient will see in their bank account
  accountTitle: "Georgian Council of New South Wales", // recipient account name
  reference: "Invoice # 1234", // payment reference, will be visible to the recipient
  traceBsb: "061123", // your (sender) bank account BSB
  traceAccount: "1234567", // your (sender) bank account number
  remitter: "Acme Inc" // Your (sender) company name
  
// Optional
// tax: "N"|"W"|"X"|"Y"|" "|"", // Tax withholding indicator. Typically blank, meaning no tax. See ABA specification.
// taxAmount: Number|String, // Tax amount. Typically 0.
};

const file = aba.generate([transaction]);

console.log(file);
```

Should print:

```
0                 01ANZ       Allowasa Pertolio Accounti001234Credits Of T180320                                        
1061-021   123456 500000001200Georgian Council of New South WaInvoice # 1234    061-123  1234567Acme Inc        00000000
7999-999            000000120000000012000000000000                        000001                                        
```

which is a fully valid ABA file. Note spaces in the end of the first and last lines.

Every line in the ABA file must be 120 chars. So data like `user`, `description`, `accountTitle`, etc are truncated if too long.

## Note

Even though the format is standardised, banks typically mandate some fields to be hardcoded.

## ABA file specification

1. http://ddkonline.blogspot.com/2009/01/aba-bank-payment-file-format-australian.html
1. https://www.cemtexaba.com/aba-format/cemtex-aba-file-format-details
1. https://github.com/mjec/aba/blob/master/sample-with-comments.aba

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

Transactions schema. Most of the params are required as you can see.

```
 * Generate ABA file of these transactions.
 * @param transactions {Object[]} Transactions in the file
 * @param transactions[].bsb {String} The third party account BSB
 * @param [transactions[].tax=" "] {"N"|"W"|"X"|"Y"|" "|""}
 * @param transactions[].transactionCode {Number|ABA.CREDIT|ABA.DEBIT|ABA.PAY} Debit or credit? ABA.CREDIT or ABA.DEBIT or ABA.PAY
 * @param transactions[].account {String} The third party account number
 * @param transactions[].amount {String|Number}
 * @param transactions[].accountTitle {String} The third party (recipient) account name. Up to 32 chars.
 * @param [transactions[].reference] {String} Payment reference, e.g. "Invoice # 123". Up to 18 chars.
 * @param transactions[].traceBsb {String} The transacting account BSB
 * @param transactions[].traceAccount {String} The transacting account number
 * @param transactions[].remitter {String} The transacting company name.
 * @param [transactions[].taxAmount=0] {Number}
 * @return {String} The ABA file contents as a string.
```

# TODO

* Input data validation

# Credits

The module is based on this excellent work: https://github.com/ordermentum/aba

Changes: removed `Bignumber.js` and `moment` dependencies, added documentation and examples, simplified code infrastructure, fixed few bugs, implement max length limit of variable data fields.
