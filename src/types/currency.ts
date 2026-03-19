// src/types/currency.ts

export interface Currency {
    code: string;
    name: string;
    symbol: string;
    symbolPosition: 'before' | 'after';
    decimalSeparator: string;
    thousandsSeparator: string;
    decimalPlaces: number;
}

export const CURRENCIES: Currency[] = [
    {
        code: 'NGN',
        name: 'Nigerian Naira',
        symbol: '₦',
        symbolPosition: 'before',
        decimalSeparator: '.',
        thousandsSeparator: ',',
        decimalPlaces: 2,
    },
    {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        symbolPosition: 'before',
        decimalSeparator: '.',
        thousandsSeparator: ',',
        decimalPlaces: 2,
    },
    {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        symbolPosition: 'before',
        decimalSeparator: '.',
        thousandsSeparator: ',',
        decimalPlaces: 2,
    },
    {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        symbolPosition: 'before',
        decimalSeparator: ',',
        thousandsSeparator: '.',
        decimalPlaces: 2,
    },
    {
        code: 'GHS',
        name: 'Ghanaian Cedi',
        symbol: 'GH₵',
        symbolPosition: 'before',
        decimalSeparator: '.',
        thousandsSeparator: ',',
        decimalPlaces: 2,
    },
    {
        code: 'KES',
        name: 'Kenyan Shilling',
        symbol: 'KSh',
        symbolPosition: 'before',
        decimalSeparator: '.',
        thousandsSeparator: ',',
        decimalPlaces: 2,
    },
    {
        code: 'ZAR',
        name: 'South African Rand',
        symbol: 'R',
        symbolPosition: 'before',
        decimalSeparator: '.',
        thousandsSeparator: ',',
        decimalPlaces: 2,
    },
    {
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        symbolPosition: 'before',
        decimalSeparator: '.',
        thousandsSeparator: ',',
        decimalPlaces: 2,
    },
    {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'CA$',
        symbolPosition: 'before',
        decimalSeparator: '.',
        thousandsSeparator: ',',
        decimalPlaces: 2,
    },
    {
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        symbolPosition: 'before',
        decimalSeparator: '.',
        thousandsSeparator: ',',
        decimalPlaces: 2,
    },
    {
        code: 'XOF',
        name: 'West African CFA Franc',
        symbol: 'CFA',
        symbolPosition: 'after',
        decimalSeparator: ',',
        thousandsSeparator: ' ',
        decimalPlaces: 0,
    },
    {
        code: 'XAF',
        name: 'Central African CFA Franc',
        symbol: 'FCFA',
        symbolPosition: 'after',
        decimalSeparator: ',',
        thousandsSeparator: ' ',
        decimalPlaces: 0,
    },
];

export const DEFAULT_CURRENCY: Currency = CURRENCIES.find(c => c.code === 'NGN')!;

export const getCurrencyByCode = (code: string): Currency => {
    return CURRENCIES.find(c => c.code === code) || DEFAULT_CURRENCY;
};

export const formatCurrency = (
    amount: number,
    currency: Currency | string,
    options?: {
        showSymbol?: boolean;
        showCode?: boolean;
        compact?: boolean;
    }
): string => {
    const currencyObj = typeof currency === 'string' ? getCurrencyByCode(currency) : currency;
    const { showSymbol = true, showCode = false, compact = false } = options || {};

    let formattedAmount: string;

    if (compact) {
        if (Math.abs(amount) >= 1000000000) {
            formattedAmount = (amount / 1000000000).toFixed(1) + 'B';
        } else if (Math.abs(amount) >= 1000000) {
            formattedAmount = (amount / 1000000).toFixed(1) + 'M';
        } else if (Math.abs(amount) >= 1000) {
            formattedAmount = (amount / 1000).toFixed(1) + 'K';
        } else {
            formattedAmount = amount.toFixed(currencyObj.decimalPlaces);
        }
    } else {
        const parts = amount.toFixed(currencyObj.decimalPlaces).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currencyObj.thousandsSeparator);
        formattedAmount = parts.join(currencyObj.decimalSeparator);
    }

    if (showSymbol) {
        if (currencyObj.symbolPosition === 'before') {
            formattedAmount = currencyObj.symbol + formattedAmount;
        } else {
            formattedAmount = formattedAmount + ' ' + currencyObj.symbol;
        }
    }

    if (showCode) {
        formattedAmount = `${formattedAmount} ${currencyObj.code}`;
    }

    return formattedAmount;
};