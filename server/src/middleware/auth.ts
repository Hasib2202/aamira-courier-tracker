// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for API token in header (simple authentication as per requirements)
    const authHeader = req.headers.authorization;
    const apiToken = req.headers['x-api-token'] as string;
    
    // For demo purposes, accept simple API token
    if (apiToken === process.env.API_TOKEN || apiToken === 'demo-token-123') {
      req.user = {
        id: 'demo-user',
        role: 'courier',
        email: 'demo@aamira.com'
      };
      return next();
    }

    // Or JWT token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret') as any;
      
      req.user = {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email
      };
      return next();
    }

    // For development, allow requests without auth
    if (process.env.NODE_ENV === 'development') {
      req.user = {
        id: 'dev-user',
        role: 'courier',
        email: 'dev@aamira.com'
      };
      return next();
    }

    res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid API token or JWT token'
    });

  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid or expired'
    });
  }
};