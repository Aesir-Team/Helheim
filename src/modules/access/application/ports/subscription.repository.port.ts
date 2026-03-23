export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');

export interface ActiveSubscriptionDto {
  id: string;
  userId: string;
  planId: string;
  planSlug: string;
  planName: string;
  freeChaptersPerWeek: number | null;
}

export interface CreateSubscriptionInput {
  userId: string;
  planId: string;
  planName: string;
  priceInCents: number | null;
}

export interface SubscriptionRepositoryPort {
  findActiveByUserId(userId: string): Promise<ActiveSubscriptionDto | null>;
  create(data: CreateSubscriptionInput): Promise<{ id: string }>;
}
