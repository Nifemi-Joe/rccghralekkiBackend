"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceCalculator = void 0;
// src/utils/priceCalculator.ts
class PriceCalculator {
    /**
     * Calculate total cost with markup
     */
    static calculateWithMarkup(costPerUnit, units, markupPercent) {
        const cost = costPerUnit * units;
        const markup = cost * (markupPercent / 100);
        const total = cost + markup;
        return {
            cost: parseFloat(cost.toFixed(2)),
            markup: parseFloat(markup.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
        };
    }
    /**
     * Calculate package savings
     */
    static calculateSavings(regularPrice, packagePrice) {
        const savings = regularPrice - packagePrice;
        const savingsPercent = (savings / regularPrice) * 100;
        return {
            savings: parseFloat(savings.toFixed(2)),
            savingsPercent: parseFloat(savingsPercent.toFixed(2)),
        };
    }
    /**
     * Apply discount
     */
    static applyDiscount(price, discountPercent) {
        const discount = price * (discountPercent / 100);
        const final = price - discount;
        return {
            original: parseFloat(price.toFixed(2)),
            discount: parseFloat(discount.toFixed(2)),
            final: parseFloat(final.toFixed(2)),
        };
    }
    /**
     * Calculate revenue split (Platform vs Provider)
     */
    static calculateRevenueSplit(totalAmount, platformPercent = 40) {
        const platformAmount = totalAmount * (platformPercent / 100);
        const providerAmount = totalAmount - platformAmount;
        return {
            total: parseFloat(totalAmount.toFixed(2)),
            platformAmount: parseFloat(platformAmount.toFixed(2)),
            providerAmount: parseFloat(providerAmount.toFixed(2)),
        };
    }
}
exports.PriceCalculator = PriceCalculator;
//# sourceMappingURL=priceCalculator.js.map