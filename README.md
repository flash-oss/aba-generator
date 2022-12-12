# ABA generator

Generate ABA Files from Node.js and browser.

Notable:

- The minified version of this module is 10.0KB. No dependencies.
- The source code of `aba-generator` is quite easy to read, understand, and amend. We welcome any changes.

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
  description: "Credits Of The Wooloomooloo", // Description of the transactions within the file

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
  remitter: "Acme Inc", // Your (sender) company name

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
 * @param [options.schemas] { [key in RecordTypeNumber]?: RecordSchema } custom schemas
 * @param [options.customHeaderData] {key: data} custom data for custom header, warning, will overwrite standard field if name will be the same
 * @param [options.customFooterData] {key: data} custom data for custom footer, warning, will overwrite standard field if name will be the same
```

### Custom transaction generating

You can add multiple custom schemas or replace default schemas to generate non-standard ABA files or those extended by a particular bank.

#### Keys description

`N` - is a string key with one character, that represents the first character in the ABA record,
for default schemas ("0" - Descriptive Record (header), "1" - Detail Record (transaction), and "7" - File Total Record (footer))

`type` - same as `N`

`recordType` - a string that identifies the batch's record type.
Descriptive Record -> header; Detail Record -> transaction; File Total Record -> footer

`name` - the name of a field (amount, tax, etc.).

`boundaries` - array with 2 numbers, that specify the start and end of the field in the record string.

`padding` - Alignment within field size, can be `left` or `right`, and only for type `string`, default alignment is to the right

`type` - type of the field, provide the desired type to reformat the field.

#### Possible types:

`string` – trim spaces and return the string

`money` - convert cents to dollars and return the number.

`integer` - trim all `0` in the start and return the number

`bsb` - remove "-" and return the string

`""` – retrieve the original string

```js
customSchemas = {
  N: {
    recordType: "header" | "transaction" | "footer",
    fields: [
      {
        name: "string",
        boundaries: [number, number],
        type: "string" | "money" | "integer" | "bsb" | "",
        padding: "left",
      },
    ],
  },
};

const aba = new ABA({ ...headerData, schemas: customSchemas });
```

### Attention!In order for generator to generate standard footer, you must have at least this transaction fields

```js
  fields: [
    { name: "transactionType", boundaries: [0, 1], type: "string" },
    { name: "transactionCode", boundaries: [18, 20], type: "integer" },
    { name: "amount", boundaries: [20, 30], type: "money" },
  ]
```

In other way you can provide final data manually using `customFooterData`


### Custom schema use example

```js
const customSchemas = {
  "5": {
    recordType: "transaction",
    fields: [
      { name: "transactionType", boundaries: [0, 1], type: "string" },
      { name: "bsb", boundaries: [1, 8], type: "bsb" },
      { name: "account", boundaries: [8, 17], type: "string" },
      { name: "transactionCode", boundaries: [18, 20], type: "integer" },
      { name: "amount", boundaries: [20, 30], type: "money" },
      { name: "traceBsb", boundaries: [80, 87], type: "bsb" },
      { name: "customString", boundaries: [120, 135], type: "string" },
      { name: "customInt", boundaries: [135, 140], type: "integer" },
      { name: "customBsb", boundaries: [140, 145], type: "bsb" },
      { name: "custom", boundaries: [145, 150], type: "" },
      { name: "customBsb", boundaries: [155, 160], type: "bsb" },
      { name: "customMoney", boundaries: [165, 170], type: "money" },
    ],
  },
  "6": {
    recordType: "header",
    fields: [
      { name: "type", boundaries: [0, 1], type: "string" },
      { name: "bsb", boundaries: [1, 8], type: "bsb" },
      { name: "account", boundaries: [8, 17], type: "string" },
      { name: "custom", boundaries: [145, 150], type: "" },
    ],
  },
};

const aba = new ABA({...headerData, schemas: customSchemas, customHeaderData: {type: "6", custom: "any"} });

const batches = aba.generate([transactions]);
```

### Default schemas

Here the list of standard schemas, you can rewrite them with custom types by using the same key

```js
const defaultAbaSchemas = {
  0: {
    recordType: "header",
    fields: [
      { name: "type", boundaries: [0, 1], type: "string" },
      { name: "bsb", boundaries: [1, 8], type: "bsb" },
      { name: "account", boundaries: [8, 17], type: "string" },
      { name: "sequenceNumber", boundaries: [18, 20], type: "integer" },
      { name: "bank", boundaries: [20, 23], type: "string" },
      { name: "user", boundaries: [30, 56], type: "string", padding: "left" },
      { name: "userNumber", boundaries: [56, 62], type: "string" },
      { name: "description", boundaries: [62, 74], type: "string", padding: "left" },
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
      { name: "accountTitle", boundaries: [30, 62], type: "string", padding: "left" },
      { name: "reference", boundaries: [62, 80], type: "string", padding: "left" },
      { name: "traceBsb", boundaries: [80, 87], type: "bsb" },
      { name: "traceAccount", boundaries: [87, 96], type: "string" },
      { name: "remitter", boundaries: [96, 112], type: "string", padding: "left" },
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
```

In the end your code can look like this

```js
const { ABA } = require("aba-generator");
const options = {
  schemas: { customSchema, customSchema },
  
};
const aba = new ABA(options);
const batch = aba.generate([transactions]);
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

- Input data validation

# Credits

The module is based on this excellent work: https://github.com/ordermentum/aba

Changes: removed `Bignumber.js` and `moment` dependencies, added documentation and examples, simplified code infrastructure, fixed few bugs, implement max length limit of variable data fields.
