"use strict";
// src/types/currency.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrency = exports.getCurrencyByCode = exports.DEFAULT_CURRENCY = exports.CURRENCIES = void 0;
exports.CURRENCIES = [
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
exports.DEFAULT_CURRENCY = exports.CURRENCIES.find(c => c.code === 'NGN');
const getCurrencyByCode = (code) => {
    return exports.CURRENCIES.find(c => c.code === code) || exports.DEFAULT_CURRENCY;
};
exports.getCurrencyByCode = getCurrencyByCode;
const formatCurrency = (amount, currency, options) => {
    const currencyObj = typeof currency === 'string' ? (0, exports.getCurrencyByCode)(currency) : currency;
    const { showSymbol = true, showCode = false, compact = false } = options || {};
    let formattedAmount;
    if (compact) {
        if (Math.abs(amount) >= 1000000000) {
            formattedAmount = (amount / 1000000000).toFixed(1) + 'B';
        }
        else if (Math.abs(amount) >= 1000000) {
            formattedAmount = (amount / 1000000).toFixed(1) + 'M';
        }
        else if (Math.abs(amount) >= 1000) {
            formattedAmount = (amount / 1000).toFixed(1) + 'K';
        }
        else {
            formattedAmount = amount.toFixed(currencyObj.decimalPlaces);
        }
    }
    else {
        const parts = amount.toFixed(currencyObj.decimalPlaces).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currencyObj.thousandsSeparator);
        formattedAmount = parts.join(currencyObj.decimalSeparator);
    }
    if (showSymbol) {
        if (currencyObj.symbolPosition === 'before') {
            formattedAmount = currencyObj.symbol + formattedAmount;
        }
        else {
            formattedAmount = formattedAmount + ' ' + currencyObj.symbol;
        }
    }
    if (showCode) {
        formattedAmount = `${formattedAmount} ${currencyObj.code}`;
    }
    return formattedAmount;
};
exports.formatCurrency = formatCurrency;
//# sourceMappingURL=currency.js.map