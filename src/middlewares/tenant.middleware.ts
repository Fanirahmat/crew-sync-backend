import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '@/types/common';

export const requireTenant = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user || !req.user.organizationId) {
    throw new UnauthorizedError('Organization tenant context is missing');
  }
  next();
};
