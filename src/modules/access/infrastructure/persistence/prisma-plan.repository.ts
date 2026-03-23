import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type {
  PlanDto,
  PlanRepositoryPort,
} from '../../application/ports/plan.repository.port';

@Injectable()
export class PrismaPlanRepository implements PlanRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string): Promise<PlanDto | null> {
    const row = await this.prisma.plan.findFirst({
      where: { slug, isActive: true },
    });

    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      freeChaptersPerWeek: row.freeChaptersPerWeek,
      isActive: row.isActive,
    };
  }
}
