import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt.util';
import { UnauthorizedError } from '@/types/common';

export const authenticateJWT = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authorization token is missing or malformed');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Bearer token not provided');
  }

  const payload = verifyToken(token);
  req.user = payload;
  next();
};
