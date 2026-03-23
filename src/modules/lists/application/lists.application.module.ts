import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/infrastructure/prisma/prisma.module';
import { AuthApplicationModule } from '../../auth/application/auth.application.module';
import { CatalogApplicationModule } from '../../catalog/application/catalog.application.module';
import { USER_MANGA_LIST_REPOSITORY } from './ports/user-manga-list.repository.port';
import { PrismaUserMangaListRepository } from '../infrastructure/persistence/prisma-user-manga-list.repository';
import { ListUserMangaListsUseCase } from './use-cases/list-user-manga-lists.use-case';
import { CreateUserMangaListUseCase } from './use-cases/create-user-manga-list.use-case';
import { GetUserMangaListUseCase } from './use-cases/get-user-manga-list.use-case';
import { UpdateUserMangaListUseCase } from './use-cases/update-user-manga-list.use-case';
import { DeleteUserMangaListUseCase } from './use-cases/delete-user-manga-list.use-case';
import { ReorderUserMangaListsUseCase } from './use-cases/reorder-user-manga-lists.use-case';
import { AddMangaToListUseCase } from './use-cases/add-manga-to-list.use-case';
import { RemoveMangaFromListUseCase } from './use-cases/remove-manga-from-list.use-case';
import { UserListsController } from '../presentation/controllers/user-lists.controller';

@Module({
  imports: [PrismaModule, AuthApplicationModule, CatalogApplicationModule],
  controllers: [UserListsController],
  providers: [
    {
      provide: USER_MANGA_LIST_REPOSITORY,
      useClass: PrismaUserMangaListRepository,
    },
    ListUserMangaListsUseCase,
    CreateUserMangaListUseCase,
    GetUserMangaListUseCase,
    UpdateUserMangaListUseCase,
    DeleteUserMangaListUseCase,
    ReorderUserMangaListsUseCase,
    AddMangaToListUseCase,
    RemoveMangaFromListUseCase,
  ],
})
export class ListsApplicationModule {}
