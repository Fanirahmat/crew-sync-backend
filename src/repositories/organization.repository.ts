import { Organization, Prisma } from '@prisma/client';
import { prisma } from '@/config/database';

export class OrganizationRepository {
  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return prisma.organization.create({ data });
  }

  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({ where: { id } });
  }
}

export const organizationRepository = new OrganizationRepository();
