// src/utils/priceCalculator.ts
export class PriceCalculator {
    /**
     * Calculate total cost with markup
     */
    static calculateWithMarkup(
        costPerUnit: number,
        units: number,
        markupPercent: number
    ): {
        cost: number;
        markup: number;
        total: number;
    } {
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
    static calculateSavings(
        regularPrice: number,
        packagePrice: number
    ): {
        savings: number;
        savingsPercent: number;
    } {
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
    static applyDiscount(
        price: number,
        discountPercent: number
    ): {
        original: number;
        discount: number;
        final: number;
    } {
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
    static calculateRevenueSplit(
        totalAmount: number,
        platformPercent: number = 40
    ): {
        total: number;
        platformAmount: number;
        providerAmount: number;
    } {
        const platformAmount = totalAmount * (platformPercent / 100);
        const providerAmount = totalAmount - platformAmount;

        return {
            total: parseFloat(totalAmount.toFixed(2)),
            platformAmount: parseFloat(platformAmount.toFixed(2)),
            providerAmount: parseFloat(providerAmount.toFixed(2)),
        };
    }
}