declare module "aba-generator" {
    class ABA {
        CREDIT: number;
        DEBIT: number;
        PAY: number;

        constructor(options: AbaOptions);

        generate(transactions: Transaction[]): string;
    }

    interface AbaOptions {
        header?: {
            type: RecordTypeNumber; // Default is "0"
            bsb?: string; // Main account BSB. Should be ignored according to the specs.
            account?: string; // Main account number. Up to 9 chars. Should be ignored according to the specs.
            bank?: string; // Name of financial institution processing this file. 3 characters, like "ANZ", "WBC"
            user?: string; // How the user will be shown in the transactions of the third party banks.
            userNumber?: number; // The ID of the user supplying the file.
            description?: string; // Description of this file entries. Up to 12 chars.
            date?: Date | string | number; // Date to be processed.
            time?: Date | string | number; // Time to be processed. Should be ignored according to the specs.
            // for custom fields
            [x: string]: string | number | Date;
        };
        schemas?: { [key in RecordTypeNumber]?: RecordSchema };
        footer?: {
            type: RecordTypeNumber; // Default = "7" This is an auto-generated field. But you can override it with anything.
            bsb: string; // Default = "999999" This is an auto-generated field. But you can override it with anything.
            netTotal: string; // This is an auto-generated field. But you can override it with anything.
            creditTotal: string; // This is an auto-generated field. But you can override it with anything.
            debitTotal: string; // This is auto-generated field. But you can override it with anything.
            numberOfTransactions: string; // This is an auto-generated field. But you can override it with anything.
            // for custom fields
            [x: string]: string | number | Date;
        };
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
        // for custom fields
        [x: string]: string | number | Date;
    }

    type RecordTypeNumber = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

    type RecordType = "header" | "transaction" | "footer";

    interface RecordSchema {
        recordType: RecordType;
        fields: { name: string; boundaries: number[]; type: string }[];
    }

    export = ABA;
}
