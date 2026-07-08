// Central export for middlewares
import { errorHandler, notFoundHandler } from './errorHandler.js';
import { authenticate, optionalAuth } from './auth.js';

export { errorHandler, notFoundHandler, authenticate, optionalAuth };
