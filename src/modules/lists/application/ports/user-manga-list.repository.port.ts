export const USER_MANGA_LIST_REPOSITORY = Symbol('USER_MANGA_LIST_REPOSITORY');

export interface UserMangaListSummaryDto {
  id: string;
  name: string;
  sortOrder: number;
  mangasReadCount: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMangaListItemWithMangaDto {
  itemId: string;
  mangaId: string;
  sortOrder: number;
  addedAt: Date;
  mangaTitle: string;
  mangaSlug: string;
  mangaCoverImage: string;
}

export interface UserMangaListDetailDto extends UserMangaListSummaryDto {
  items: UserMangaListItemWithMangaDto[];
}

export interface UserMangaListRepositoryPort {
  listSummariesForUser(userId: string): Promise<UserMangaListSummaryDto[]>;

  findDetailOwnedByUser(
    listId: string,
    userId: string,
  ): Promise<UserMangaListDetailDto | null>;

  create(userId: string, name: string): Promise<UserMangaListSummaryDto>;

  update(
    listId: string,
    userId: string,
    data: { name?: string; sortOrder?: number },
  ): Promise<UserMangaListSummaryDto | null>;

  deleteOwned(listId: string, userId: string): Promise<boolean>;

  listIdsForUserOrdered(userId: string): Promise<string[]>;

  applySortOrders(userId: string, orderedListIds: string[]): Promise<void>;

  addItem(
    listId: string,
    userId: string,
    mangaId: string,
  ): Promise<'created' | 'already_in_list' | 'list_not_found'>;

  removeItem(listId: string, userId: string, mangaId: string): Promise<boolean>;
}
