import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type {
  CategoryDto,
  CategoryRepositoryPort,
} from '../../application/ports/category.repository.port';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<CategoryDto[]> {
    const rows = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      type: r.type,
      isNsfw: r.isNsfw,
    }));
  }
}
