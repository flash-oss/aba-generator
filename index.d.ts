declare module "aba-generator" {
    class ABA {
        CREDIT: number;
        DEBIT: number;
        PAY: number;

        constructor(options: AbaOptions);

        generate(transactions: Transaction[]): string;
    }

    interface AbaOptions {
        bsb?: string; // Main account BSB. Should be ignored according to the specs.
        account?: string; // Main account number. Up to 9 chars. Should be ignored according to the specs.
        bank: string; // Name of financial institution processing this file. 3 characters, like "ANZ", "WBC"
        user: string; // How the user will be shown in the transactions of the third party banks.
        userNumber: number; // The ID of the user supplying the file.
        description: string; // Description of this file entries. Up to 12 chars.
        date?: Date | string | number; // Date to be processed.
        time?: Date | string | number; // Time to be processed. Should be ignored according to the specs.
    }

    interface Transaction {
        bsb: string; // The third party account BSB
        tax?: "N" | "W" | "X" | "Y" | " " | "";
        transactionCode: number; // Debit or credit? ABA.CREDIT or ABA.DEBIT
        account: string; // The third party account number
        amount: number;
        accountTitle: string; // The third party (recipient) account name. Up to 32 chars.
        reference: string; // Payment reference, e.g. "Invoice # 123". Up to 18 chars.
        traceBsb: string; // The transacting account BSB
        traceAccount: string; // The transacting account number
        remitter: string; // The transacting company name.
        taxAmount?: number;
    }

    export = ABA;
}
