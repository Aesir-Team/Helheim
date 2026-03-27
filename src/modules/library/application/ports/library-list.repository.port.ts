import {
  USER_MANGA_LIST_REPOSITORY,
  type UserMangaListRepositoryPort,
} from '../../../lists/application/ports/user-manga-list.repository.port';

/** Alias de transição para boundary `library`. */
export const LIBRARY_LIST_REPOSITORY = USER_MANGA_LIST_REPOSITORY;
export type LibraryListRepositoryPort = UserMangaListRepositoryPort;
