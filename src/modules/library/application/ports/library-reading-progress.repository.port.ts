import {
  READING_PROGRESS_REPOSITORY,
  type ReadingProgressRepositoryPort,
} from '../../../progress/application/ports/reading-progress.repository.port';

/** Alias de transição para boundary `library`. */
export const LIBRARY_READING_PROGRESS_REPOSITORY = READING_PROGRESS_REPOSITORY;
export type LibraryReadingProgressRepositoryPort =
  ReadingProgressRepositoryPort;
