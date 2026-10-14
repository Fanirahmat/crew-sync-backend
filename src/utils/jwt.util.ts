import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '@/config/env';
import { AuthUserPayload } from '@/types/express';
import { UnauthorizedError } from '@/types/common';

export const generateToken = (payload: AuthUserPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as unknown as number,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyToken = (token: string): AuthUserPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
};
