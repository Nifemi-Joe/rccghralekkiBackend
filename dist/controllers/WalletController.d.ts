import { Request, Response, NextFunction } from 'express';
export declare class WalletController {
    private walletService;
    private pricingService;
    constructor();
    createPricing: (req: Request, res: Response, next: NextFunction) => void;
    getWallet: (req: Request, res: Response, next: NextFunction) => void;
    exportTransactions: (req: Request, res: Response, next: NextFunction) => void;
    getAllBalances: (req: Request, res: Response, next: NextFunction) => void;
    getBalance: (req: Request, res: Response, next: NextFunction) => void;
    getTransactions: (req: Request, res: Response, next: NextFunction) => void;
    getAnalytics: (req: Request, res: Response, next: NextFunction) => void;
    refundTransaction: (req: Request, res: Response, next: NextFunction) => void;
    getAllPricing: (req: Request, res: Response, next: NextFunction) => void;
    getPricingByChannel: (req: Request, res: Response, next: NextFunction) => void;
    updatePricing: (req: Request, res: Response, next: NextFunction) => void;
    calculateCost: (req: Request, res: Response, next: NextFunction) => void;
    getAllPackages: (req: Request, res: Response, next: NextFunction) => void;
    getPackageById: (req: Request, res: Response, next: NextFunction) => void;
    createPackage: (req: Request, res: Response, next: NextFunction) => void;
    updatePackage: (req: Request, res: Response, next: NextFunction) => void;
    deletePackage: (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=WalletController.d.ts.map