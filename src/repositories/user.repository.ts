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

  async findByIdAndOrg(id: string, organizationId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, organizationId },
    });
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: identifier },
          { email: identifier },
        ],
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
}

export const userRepository = new UserRepository();
