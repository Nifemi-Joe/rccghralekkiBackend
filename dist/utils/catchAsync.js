"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapAsync = exports.catchAsync = void 0;
exports.asyncHandler = asyncHandler;
/**
 * Wrapper function to catch async errors in Express route handlers
 * This eliminates the need for try-catch blocks in every async controller
 *
 * @param fn - Async function to wrap
 * @returns Express middleware function
 *
 * @example
 * router.get('/users', catchAsync(async (req, res) => {
 *   const users = await User.find();
 *   res.json({ success: true, data: users });
 * }));
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.catchAsync = catchAsync;
/**
 * Alternative implementation with better TypeScript support
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
/**
 * Utility to wrap multiple middleware functions
 *
 * @example
 * router.post('/users',
 *   wrapAsync([
 *     authenticate,
 *     authorize('admin'),
 *     createUser
 *   ])
 * );
 */
const wrapAsync = (middlewares) => {
    return middlewares.map(middleware => (0, exports.catchAsync)(middleware));
};
exports.wrapAsync = wrapAsync;
// Export default
exports.default = exports.catchAsync;
//# sourceMappingURL=catchAsync.js.map