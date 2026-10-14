import { Role } from '@prisma/client';

export interface AuthUserPayload {
  userId: string;
  organizationId: string;
  role: Role;
  phoneNumber?: string;
  email?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
