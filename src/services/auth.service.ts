import crypto from 'crypto';
import { Role } from '@prisma/client';
import { userRepository, UserRepository } from '@/repositories/user.repository';
import { organizationRepository, OrganizationRepository } from '@/repositories/organization.repository';
import { hashPassword, comparePassword } from '@/utils/password.util';
import { generateToken } from '@/utils/jwt.util';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '@/types/common';

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

export interface ForgotPasswordDTO {
  identifier: string;
}

export interface ResetPasswordDTO {
  identifier: string;
  token: string;
  newPassword: string;
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

  async getMe(userId: string) {
    const user = await this.userRepo.findByIdWithOrg(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      organization: user.organization,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async forgotPassword(data: ForgotPasswordDTO) {
    if (!data.identifier) {
      throw new BadRequestError('Phone number or email is required');
    }

    const user = await this.userRepo.findByIdentifier(data.identifier);
    if (!user) {
      throw new NotFoundError('No user found with the provided phone number or email');
    }

    // Generate 6-digit numeric OTP token
    const token = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    await this.userRepo.createPasswordResetToken(user.id, token, expiresAt);

    console.log(`🔑 [PASSWORD_RESET] Generated token for user ${user.id} (${data.identifier}): ${token}`);

    return {
      message: 'Password reset token has been generated successfully',
      resetToken: token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async resetPassword(data: ResetPasswordDTO) {
    if (!data.identifier || !data.token || !data.newPassword) {
      throw new BadRequestError('Identifier, reset token, and new password are required');
    }

    if (data.newPassword.length < 6) {
      throw new BadRequestError('New password must be at least 6 characters long');
    }

    const resetTokenRecord = await this.userRepo.findPasswordResetToken(data.token);
    if (!resetTokenRecord) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    if (new Date() > resetTokenRecord.expiresAt) {
      await this.userRepo.deletePasswordResetToken(resetTokenRecord.id);
      throw new BadRequestError('Reset token has expired. Please request a new token.');
    }

    const matchesUser =
      resetTokenRecord.user.phoneNumber === data.identifier ||
      (resetTokenRecord.user.email && resetTokenRecord.user.email.toLowerCase() === data.identifier.toLowerCase());

    if (!matchesUser) {
      throw new BadRequestError('Reset token does not match the provided identifier');
    }

    const passwordHash = await hashPassword(data.newPassword);
    await this.userRepo.update(resetTokenRecord.userId, { passwordHash });
    await this.userRepo.deletePasswordResetToken(resetTokenRecord.id);

    return {
      message: 'Password has been reset successfully. You can now login with your new password.',
    };
  }
}

export const authService = new AuthService();
