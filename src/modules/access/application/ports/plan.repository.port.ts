export const PLAN_REPOSITORY = Symbol('PLAN_REPOSITORY');

export interface PlanDto {
  id: string;
  slug: string;
  name: string;
  freeChaptersPerWeek: number | null;
  isActive: boolean;
}

export interface PlanRepositoryPort {
  findBySlug(slug: string): Promise<PlanDto | null>;
}
