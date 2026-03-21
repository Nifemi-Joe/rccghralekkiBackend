export interface Currency {
    code: string;
    name: string;
    symbol: string;
    symbolPosition: 'before' | 'after';
    decimalSeparator: string;
    thousandsSeparator: string;
    decimalPlaces: number;
}
export declare const CURRENCIES: Currency[];
export declare const DEFAULT_CURRENCY: Currency;
export declare const getCurrencyByCode: (code: string) => Currency;
export declare const formatCurrency: (amount: number, currency: Currency | string, options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    compact?: boolean;
}) => string;
//# sourceMappingURL=currency.d.ts.map