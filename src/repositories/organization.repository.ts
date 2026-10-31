import { Organization, Prisma, EventStatus } from '@prisma/client';
import { prisma } from '@/config/database';

export class OrganizationRepository {
  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return prisma.organization.create({ data });
  }

  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({ where: { id } });
  }

  async findAll() {
    return prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            events: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdWithDetails(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
    });
  }

  async updateSubscription(id: string, subscriptionTier: string): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data: { subscriptionTier },
    });
  }

  async getPlatformStats() {
    const [totalOrganizations, totalUsers, totalEvents, activeEvents] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.event.count(),
      prisma.event.count({
        where: { status: EventStatus.ONGOING },
      }),
    ]);

    return {
      totalOrganizations,
      totalUsers,
      totalEvents,
      activeEvents,
    };
  }
}

export const organizationRepository = new OrganizationRepository();
