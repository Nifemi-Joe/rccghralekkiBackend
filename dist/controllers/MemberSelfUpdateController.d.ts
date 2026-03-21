import { Request, Response, NextFunction } from 'express';
export declare class MemberSelfUpdateController {
    private service;
    constructor();
    /**
     * Initiate update with OTP verification (for members with known contact)
     */
    initiateUpdate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Verify OTP and get update token
     */
    verifyOtp: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Lookup member by full name
     */
    lookupByName: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Lookup member by email
     */
    lookupByEmail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Confirm identity with new contact info
     */
    confirmIdentity: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get member data by update token
     */
    getMemberByToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Update member profile
     */
    updateMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Resend OTP
     */
    resendOtp: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Send share link (requires auth - called by admin)
     */
    sendShareLink: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get shareable link URL (requires auth - for copy functionality)
     */
    getShareLink: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=MemberSelfUpdateController.d.ts.map