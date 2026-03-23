import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type {
  ActiveSubscriptionDto,
  CreateSubscriptionInput,
  SubscriptionRepositoryPort,
} from '../../application/ports/subscription.repository.port';

@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByUserId(
    userId: string,
  ): Promise<ActiveSubscriptionDto | null> {
    const row = await this.prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      include: { plan: true },
      orderBy: { startedAt: 'desc' },
    });

    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      planId: row.planId,
      planSlug: row.plan.slug,
      planName: row.plan.name,
      freeChaptersPerWeek: row.plan.freeChaptersPerWeek,
    };
  }

  async create(data: CreateSubscriptionInput): Promise<{ id: string }> {
    const row = await this.prisma.subscription.create({
      data: {
        userId: data.userId,
        planId: data.planId,
        status: 'active',
        planNameAtSubscription: data.planName,
        priceInCentsAtSubscription: data.priceInCents,
      },
    });

    return { id: row.id };
  }
}
