import { Role, Prisma } from '@prisma/client';
import { userRepository, UserRepository } from '@/repositories/user.repository';
import { hashPassword, comparePassword } from '@/utils/password.util';
import { BadRequestError, NotFoundError, ConflictError } from '@/types/common';

export interface UpdateProfileDTO {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

export interface CreateOrgUserDTO {
  fullName: string;
  phoneNumber: string;
  email?: string;
  role?: Role;
  password?: string;
}

export interface UpdateOrgUserDTO {
  fullName?: string;
  role?: Role;
  phoneNumber?: string;
  email?: string;
}

export class UserService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async getProfile(userId: string) {
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

  async updateProfile(userId: string, data: UpdateProfileDTO) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatePayload: Prisma.UserUpdateInput = {};

    if (data.fullName !== undefined) {
      updatePayload.fullName = data.fullName;
    }

    if (data.avatarUrl !== undefined) {
      updatePayload.avatarUrl = data.avatarUrl;
    }

    if (data.email !== undefined && data.email !== user.email) {
      if (data.email) {
        const existing = await this.userRepo.findByIdentifier(data.email);
        if (existing && existing.id !== userId) {
          throw new ConflictError('This email address is already in use by another account');
        }
      }
      updatePayload.email = data.email || null;
    }

    if (data.phoneNumber !== undefined && data.phoneNumber !== user.phoneNumber) {
      const existing = await this.userRepo.findByPhoneInOrg(user.organizationId, data.phoneNumber);
      if (existing && existing.id !== userId) {
        throw new ConflictError('This phone number is already registered in your organization');
      }
      updatePayload.phoneNumber = data.phoneNumber;
    }

    const updated = await this.userRepo.update(userId, updatePayload);

    return {
      id: updated.id,
      fullName: updated.fullName,
      phoneNumber: updated.phoneNumber,
      email: updated.email,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      updatedAt: updated.updatedAt,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current password and new password are required');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('New password must be at least 6 characters long');
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.userRepo.update(userId, { passwordHash });

    return {
      message: 'Password has been updated successfully',
    };
  }

  async listOrgUsers(organizationId: string) {
    const users = await this.userRepo.findUsersByOrg(organizationId);
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      phoneNumber: u.phoneNumber,
      email: u.email,
      avatarUrl: u.avatarUrl,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  async createOrgUser(organizationId: string, data: CreateOrgUserDTO) {
    const existing = await this.userRepo.findByPhoneInOrg(organizationId, data.phoneNumber);
    if (existing) {
      throw new ConflictError('A user with this phone number already exists in your organization');
    }

    if (data.email) {
      const existingEmail = await this.userRepo.findByIdentifier(data.email);
      if (existingEmail) {
        throw new ConflictError('A user with this email address already exists');
      }
    }

    const plainPassword = data.password || 'CrewSync2026!';
    const passwordHash = await hashPassword(plainPassword);

    const user = await this.userRepo.create({
      organizationId,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      email: data.email || null,
      passwordHash,
      role: data.role || Role.CREW,
    });

    return {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
    };
  }

  async getOrgUser(organizationId: string, userId: string) {
    const user = await this.userRepo.findByIdAndOrg(userId, organizationId);
    if (!user) {
      throw new NotFoundError('User not found in your organization');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateOrgUser(organizationId: string, userId: string, data: UpdateOrgUserDTO) {
    const user = await this.userRepo.findByIdAndOrg(userId, organizationId);
    if (!user) {
      throw new NotFoundError('User not found in your organization');
    }

    const updatePayload: Prisma.UserUpdateInput = {};

    if (data.fullName !== undefined) updatePayload.fullName = data.fullName;
    if (data.role !== undefined) updatePayload.role = data.role;
    if (data.email !== undefined) updatePayload.email = data.email || null;
    if (data.phoneNumber !== undefined && data.phoneNumber !== user.phoneNumber) {
      const existing = await this.userRepo.findByPhoneInOrg(organizationId, data.phoneNumber);
      if (existing && existing.id !== userId) {
        throw new ConflictError('A user with this phone number already exists in your organization');
      }
      updatePayload.phoneNumber = data.phoneNumber;
    }

    const updated = await this.userRepo.update(userId, updatePayload);

    return {
      id: updated.id,
      fullName: updated.fullName,
      phoneNumber: updated.phoneNumber,
      email: updated.email,
      role: updated.role,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteOrgUser(organizationId: string, userId: string, requesterId: string) {
    if (userId === requesterId) {
      throw new BadRequestError('Cannot delete your own account');
    }

    const user = await this.userRepo.findByIdAndOrg(userId, organizationId);
    if (!user) {
      throw new NotFoundError('User not found in your organization');
    }

    if (user.role === Role.OWNER) {
      throw new BadRequestError('Cannot delete the organization Owner');
    }

    await this.userRepo.delete(userId);

    return {
      message: 'User removed from organization successfully',
    };
  }
}

export const userService = new UserService();
