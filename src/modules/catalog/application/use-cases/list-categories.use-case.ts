import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  type CategoryRepositoryPort,
  type CategoryDto,
} from '../ports/category.repository.port';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: CategoryRepositoryPort,
  ) {}

  async execute(): Promise<CategoryDto[]> {
    return this.categoryRepo.listAll();
  }
}
