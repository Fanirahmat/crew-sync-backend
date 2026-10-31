import { User, Prisma, UserDeviceToken } from '@prisma/client';
import { prisma } from '@/config/database';

export class UserRepository {
  async create(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByIdWithOrg(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subscriptionTier: true,
          },
        },
      },
    });
  }

  async findByIdAndOrg(id: string, organizationId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, organizationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subscriptionTier: true,
          },
        },
      },
    });
  }

  async findByIdentifier(identifier: string) {
    return prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: identifier },
          { email: identifier },
        ],
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subscriptionTier: true,
          },
        },
      },
    });
  }

  async findByPhoneInOrg(organizationId: string, phoneNumber: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        organizationId_phoneNumber: {
          organizationId,
          phoneNumber,
        },
      },
    });
  }

  async upsertDeviceToken(
    userId: string,
    fcmToken: string,
    platform: string
  ): Promise<UserDeviceToken> {
    return prisma.userDeviceToken.upsert({
      where: { fcmToken },
      update: {
        userId,
        platform,
      },
      create: {
        userId,
        fcmToken,
        platform,
      },
    });
  }

  async findDeviceTokensByUserId(userId: string): Promise<UserDeviceToken[]> {
    return prisma.userDeviceToken.findMany({
      where: { userId },
    });
  }

  async findUsersByOrg(organizationId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    // Invalidate existing tokens for this user first
    await prisma.passwordResetToken.deleteMany({
      where: { userId },
    });

    return prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async findPasswordResetToken(token: string) {
    return prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async deletePasswordResetToken(id: string) {
    return prisma.passwordResetToken.delete({
      where: { id },
    });
  }

  async deletePasswordResetTokensByUserId(userId: string) {
    return prisma.passwordResetToken.deleteMany({
      where: { userId },
    });
  }
}

export const userRepository = new UserRepository();
