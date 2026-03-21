export declare class PriceCalculator {
    /**
     * Calculate total cost with markup
     */
    static calculateWithMarkup(costPerUnit: number, units: number, markupPercent: number): {
        cost: number;
        markup: number;
        total: number;
    };
    /**
     * Calculate package savings
     */
    static calculateSavings(regularPrice: number, packagePrice: number): {
        savings: number;
        savingsPercent: number;
    };
    /**
     * Apply discount
     */
    static applyDiscount(price: number, discountPercent: number): {
        original: number;
        discount: number;
        final: number;
    };
    /**
     * Calculate revenue split (Platform vs Provider)
     */
    static calculateRevenueSplit(totalAmount: number, platformPercent?: number): {
        total: number;
        platformAmount: number;
        providerAmount: number;
    };
}
//# sourceMappingURL=priceCalculator.d.ts.map