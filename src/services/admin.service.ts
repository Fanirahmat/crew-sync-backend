import { organizationRepository, OrganizationRepository } from '@/repositories/organization.repository';
import { NotFoundError, BadRequestError } from '@/types/common';

export class AdminService {
  constructor(private orgRepo: OrganizationRepository = organizationRepository) {}

  async getPlatformStats() {
    return this.orgRepo.getPlatformStats();
  }

  async listOrganizations() {
    const orgs = await this.orgRepo.findAll();
    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      subscriptionTier: org.subscriptionTier,
      totalUsers: org._count.users,
      totalEvents: org._count.events,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    }));
  }

  async getOrganizationDetails(id: string) {
    const org = await this.orgRepo.findByIdWithDetails(id);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return {
      id: org.id,
      name: org.name,
      subscriptionTier: org.subscriptionTier,
      totalEvents: org._count.events,
      users: org.users,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  async updateSubscription(id: string, subscriptionTier: string) {
    const allowedTiers = ['free', 'starter', 'pro', 'enterprise', 'suspended'];
    if (!allowedTiers.includes(subscriptionTier.toLowerCase())) {
      throw new BadRequestError(`Invalid subscription tier. Allowed tiers: ${allowedTiers.join(', ')}`);
    }

    const org = await this.orgRepo.findById(id);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    const updated = await this.orgRepo.updateSubscription(id, subscriptionTier.toLowerCase());

    return {
      id: updated.id,
      name: updated.name,
      subscriptionTier: updated.subscriptionTier,
      updatedAt: updated.updatedAt,
    };
  }
}

export const adminService = new AdminService();
