import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { storage } from './storage';
import { sitePasswordVerificationSchema } from '@shared/schema';

export { sitePasswordVerificationSchema };
export type SitePasswordVerificationRequest = z.infer<typeof sitePasswordVerificationSchema>;

// Site password service
export class SitePasswordService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private static readonly DEFAULT_SITE_PASSWORD = 'fEkr,&:9w+/%u8aV*496e}f]46OB.g69'; // Default password for initialization

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async initializeDefaultPassword(): Promise<void> {
    try {
      // Check if any site password exists
      const existingPassword = await storage.getActiveSitePassword();
      
      if (!existingPassword) {
        // Create default site password
        const passwordHash = await this.hashPassword(this.DEFAULT_SITE_PASSWORD);
        await storage.createSitePassword({
          passwordHash,
          isActive: true,
        });
        console.log('Default site password initialized');
      }
    } catch (error) {
      console.error('Failed to initialize default site password:', error);
    }
  }

  static async verifyAttemptLimit(ipAddress: string): Promise<boolean> {
    const recentAttempts = await storage.getRecentSitePasswordAttempts(
      ipAddress, 
      this.RATE_LIMIT_WINDOW
    );
    
    const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
    return failedAttempts.length < this.MAX_ATTEMPTS;
  }

  static async recordAttempt(ipAddress: string, userAgent: string | undefined, success: boolean): Promise<void> {
    await storage.recordSitePasswordAttempt({
      ipAddress,
      userAgent: userAgent || null,
      success,
    });
  }

  static async verifySitePassword(data: SitePasswordVerificationRequest, ipAddress: string, userAgent?: string): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
    try {
      // Check rate limiting
      const withinRateLimit = await this.verifyAttemptLimit(ipAddress);
      if (!withinRateLimit) {
        await this.recordAttempt(ipAddress, userAgent, false);
        return { 
          success: false, 
          error: 'Too many failed attempts. Please try again later.' 
        };
      }

      // Get active site password
      const sitePassword = await storage.getActiveSitePassword();
      if (!sitePassword) {
        await this.recordAttempt(ipAddress, userAgent, false);
        return { 
          success: false, 
          error: 'Site password not configured.' 
        };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(data.password, sitePassword.passwordHash);
      
      // Record attempt
      await this.recordAttempt(ipAddress, userAgent, isValidPassword);

      if (!isValidPassword) {
        return { 
          success: false, 
          error: 'Incorrect site password.' 
        };
      }

      // Create session token
      const sessionToken = randomUUID();
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

      await storage.createSitePasswordSession({
        sessionToken,
        ipAddress,
        userAgent: userAgent || null,
        expiresAt,
      });

      return { success: true, sessionToken };
    } catch (error) {
      console.error('Site password verification error:', error);
      await this.recordAttempt(ipAddress, userAgent, false);
      return { 
        success: false, 
        error: 'Verification failed. Please try again.' 
      };
    }
  }

  static async verifySitePasswordSession(sessionToken: string): Promise<boolean> {
    try {
      const session = await storage.getSitePasswordSession(sessionToken);
      return session !== undefined;
    } catch (error) {
      console.error('Site password session verification error:', error);
      return false;
    }
  }

  static async invalidateSitePasswordSession(sessionToken: string): Promise<void> {
    try {
      await storage.deleteSitePasswordSession(sessionToken);
    } catch (error) {
      console.error('Site password session invalidation error:', error);
    }
  }

  static async cleanupExpiredSessions(): Promise<void> {
    try {
      await storage.deleteExpiredSitePasswordSessions();
    } catch (error) {
      console.error('Site password session cleanup error:', error);
    }
  }
}

// Middleware to require site password verification
export const requireSitePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sitePasswordToken = req.cookies?.sitePasswordToken || req.headers['x-site-password-token'];
    
    if (!sitePasswordToken) {
      return res.status(403).json({ 
        error: 'Site password verification required',
        requiresSitePassword: true 
      });
    }

    const isValid = await SitePasswordService.verifySitePasswordSession(sitePasswordToken);
    if (!isValid) {
      return res.status(403).json({ 
        error: 'Invalid or expired site password session',
        requiresSitePassword: true 
      });
    }

    next();
  } catch (error) {
    console.error('Site password middleware error:', error);
    res.status(500).json({ 
      error: 'Site password verification failed',
      requiresSitePassword: true 
    });
  }
};

// Optional site password middleware (doesn't fail if no verification)
export const optionalSitePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sitePasswordToken = req.cookies?.sitePasswordToken || req.headers['x-site-password-token'];
    
    if (sitePasswordToken) {
      const isValid = await SitePasswordService.verifySitePasswordSession(sitePasswordToken);
      req.sitePasswordVerified = isValid;
    } else {
      req.sitePasswordVerified = false;
    }

    next();
  } catch (error) {
    console.error('Optional site password middleware error:', error);
    req.sitePasswordVerified = false;
    next();
  }
};

// Extend Express Request type to include site password verification
declare global {
  namespace Express {
    interface Request {
      sitePasswordVerified?: boolean;
    }
  }
}

// Initialize default password on service load
SitePasswordService.initializeDefaultPassword();