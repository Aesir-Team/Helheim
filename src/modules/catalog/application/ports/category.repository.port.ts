export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  type: string;
  isNsfw: boolean;
}

export interface CategoryRepositoryPort {
  listAll(): Promise<CategoryDto[]>;
}
