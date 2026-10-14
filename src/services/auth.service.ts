import { Role } from '@prisma/client';
import { userRepository, UserRepository } from '@/repositories/user.repository';
import { organizationRepository, OrganizationRepository } from '@/repositories/organization.repository';
import { hashPassword, comparePassword } from '@/utils/password.util';
import { generateToken } from '@/utils/jwt.util';
import { BadRequestError, UnauthorizedError, ConflictError } from '@/types/common';

export interface RegisterDTO {
  organizationName: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  password: string;
}

export interface LoginDTO {
  identifier: string;
  password: string;
}

export interface FcmTokenDTO {
  fcmToken: string;
  platform: string;
}

export class AuthService {
  constructor(
    private userRepo: UserRepository = userRepository,
    private orgRepo: OrganizationRepository = organizationRepository
  ) {}

  async register(data: RegisterDTO) {
    // Check if user with identifier already exists
    const existingUser = await this.userRepo.findByIdentifier(data.phoneNumber);
    if (existingUser) {
      throw new ConflictError('A user with this phone number already exists');
    }

    if (data.email) {
      const existingEmail = await this.userRepo.findByIdentifier(data.email);
      if (existingEmail) {
        throw new ConflictError('A user with this email address already exists');
      }
    }

    // 1. Create Organization
    const organization = await this.orgRepo.create({
      name: data.organizationName,
      subscriptionTier: 'free',
    });

    // 2. Hash Password
    const passwordHash = await hashPassword(data.password);

    // 3. Create Owner User
    const user = await this.userRepo.create({
      organizationId: organization.id,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      email: data.email || null,
      passwordHash,
      role: Role.OWNER,
    });

    // 4. Generate JWT
    const token = generateToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      phoneNumber: user.phoneNumber,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
      organization: {
        id: organization.id,
        name: organization.name,
      },
    };
  }

  async login(data: LoginDTO) {
    if (!data.identifier || !data.password) {
      throw new BadRequestError('Identifier (phone number or email) and password are required');
    }

    const user = await this.userRepo.findByIdentifier(data.identifier);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = generateToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      phoneNumber: user.phoneNumber,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    };
  }

  async registerFcmToken(userId: string, data: FcmTokenDTO) {
    if (!data.fcmToken) {
      throw new BadRequestError('FCM token is required');
    }

    const platform = data.platform?.toLowerCase() || 'android';
    const deviceToken = await this.userRepo.upsertDeviceToken(userId, data.fcmToken, platform);

    return {
      id: deviceToken.id,
      platform: deviceToken.platform,
      updatedAt: deviceToken.updatedAt,
    };
  }
}

export const authService = new AuthService();
