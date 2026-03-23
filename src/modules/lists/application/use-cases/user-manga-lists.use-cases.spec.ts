import { ConflictError, NotFoundError } from '../../../../shared/domain/errors';
import type { MangaRepositoryPort } from '../../../catalog/application/ports/manga.repository.port';
import type { UserMangaListRepositoryPort } from '../ports/user-manga-list.repository.port';
import { ListUserMangaListsUseCase } from './list-user-manga-lists.use-case';
import { CreateUserMangaListUseCase } from './create-user-manga-list.use-case';
import { GetUserMangaListUseCase } from './get-user-manga-list.use-case';
import { UpdateUserMangaListUseCase } from './update-user-manga-list.use-case';
import { DeleteUserMangaListUseCase } from './delete-user-manga-list.use-case';
import { ReorderUserMangaListsUseCase } from './reorder-user-manga-lists.use-case';
import { AddMangaToListUseCase } from './add-manga-to-list.use-case';
import { RemoveMangaFromListUseCase } from './remove-manga-from-list.use-case';

const SUMMARY = {
  id: 'list-1',
  name: 'Favs',
  sortOrder: 0,
  mangasReadCount: 0,
  itemCount: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

function makeListRepo(
  overrides?: Partial<UserMangaListRepositoryPort>,
): UserMangaListRepositoryPort {
  return {
    listSummariesForUser: jest.fn().mockResolvedValue([SUMMARY]),
    findDetailOwnedByUser: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(SUMMARY),
    update: jest.fn().mockResolvedValue(null),
    deleteOwned: jest.fn().mockResolvedValue(false),
    listIdsForUserOrdered: jest.fn().mockResolvedValue([]),
    applySortOrders: jest.fn().mockResolvedValue(undefined),
    addItem: jest.fn().mockResolvedValue('created' as const),
    removeItem: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function makeMangaRepo(
  overrides?: Partial<MangaRepositoryPort>,
): MangaRepositoryPort {
  return {
    findBySlug: jest.fn(),
    findByIdForListItem: jest.fn().mockResolvedValue({
      id: 'm1',
      title: 'T',
      slug: 't',
      coverImage: 'c',
    }),
    list: jest.fn(),
    upsertBySlug: jest.fn(),
    linkCategories: jest.fn(),
    getSyncStatus: jest.fn(),
    setSyncStatus: jest.fn(),
    ...overrides,
  };
}

describe('User manga lists use cases (PRODUTO §3.5)', () => {
  describe('ListUserMangaListsUseCase', () => {
    it('should return summaries for user', async () => {
      const repo = makeListRepo();
      const sut = new ListUserMangaListsUseCase(repo);
      const out = await sut.execute('u1');
      expect(out).toEqual([SUMMARY]);
      expect(repo.listSummariesForUser).toHaveBeenCalledWith('u1');
    });
  });

  describe('CreateUserMangaListUseCase', () => {
    it('should trim name and create', async () => {
      const repo = makeListRepo({
        create: jest.fn().mockResolvedValue(SUMMARY),
      });
      const sut = new CreateUserMangaListUseCase(repo);
      await sut.execute({ userId: 'u1', name: '  Nova  ' });
      expect(repo.create).toHaveBeenCalledWith('u1', 'Nova');
    });
  });

  describe('GetUserMangaListUseCase', () => {
    it('should throw NotFoundError when not owned', async () => {
      const repo = makeListRepo({
        findDetailOwnedByUser: jest.fn().mockResolvedValue(null),
      });
      const sut = new GetUserMangaListUseCase(repo);
      await expect(sut.execute('x', 'u1')).rejects.toThrow(NotFoundError);
    });

    it('should return detail when owned', async () => {
      const detail = {
        ...SUMMARY,
        items: [
          {
            itemId: 'i1',
            mangaId: 'm1',
            sortOrder: 0,
            addedAt: new Date(),
            mangaTitle: 'T',
            mangaSlug: 't',
            mangaCoverImage: 'c',
          },
        ],
      };
      const repo = makeListRepo({
        findDetailOwnedByUser: jest.fn().mockResolvedValue(detail),
      });
      const sut = new GetUserMangaListUseCase(repo);
      const out = await sut.execute('list-1', 'u1');
      expect(out.items).toHaveLength(1);
    });
  });

  describe('UpdateUserMangaListUseCase', () => {
    it('should throw ConflictError when no fields', async () => {
      const sut = new UpdateUserMangaListUseCase(makeListRepo());
      await expect(
        sut.execute({
          listId: 'l',
          userId: 'u',
          name: undefined,
          sortOrder: undefined,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should throw NotFound when update returns null', async () => {
      const repo = makeListRepo({
        update: jest.fn().mockResolvedValue(null),
      });
      const sut = new UpdateUserMangaListUseCase(repo);
      await expect(
        sut.execute({ listId: 'l', userId: 'u', name: 'A' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('DeleteUserMangaListUseCase', () => {
    it('should throw when deleteOwned false', async () => {
      const sut = new DeleteUserMangaListUseCase(makeListRepo());
      await expect(sut.execute('l', 'u')).rejects.toThrow(NotFoundError);
    });
  });

  describe('ReorderUserMangaListsUseCase', () => {
    it('should throw on duplicate ids', async () => {
      const sut = new ReorderUserMangaListsUseCase(makeListRepo());
      await expect(
        sut.execute({ userId: 'u', orderedListIds: ['a', 'a'] }),
      ).rejects.toThrow(ConflictError);
    });

    it('should throw when permutation size mismatch', async () => {
      const repo = makeListRepo({
        listIdsForUserOrdered: jest.fn().mockResolvedValue(['a', 'b']),
      });
      const sut = new ReorderUserMangaListsUseCase(repo);
      await expect(
        sut.execute({ userId: 'u', orderedListIds: ['a'] }),
      ).rejects.toThrow(ConflictError);
    });

    it('should call applySortOrders when valid', async () => {
      const repo = makeListRepo({
        listIdsForUserOrdered: jest.fn().mockResolvedValue(['a', 'b']),
        applySortOrders: jest.fn().mockResolvedValue(undefined),
      });
      const sut = new ReorderUserMangaListsUseCase(repo);
      await sut.execute({ userId: 'u', orderedListIds: ['b', 'a'] });
      expect(repo.applySortOrders).toHaveBeenCalledWith('u', ['b', 'a']);
    });
  });

  describe('AddMangaToListUseCase', () => {
    it('should throw NotFound when manga missing', async () => {
      const mangaRepo = makeMangaRepo({
        findByIdForListItem: jest.fn().mockResolvedValue(null),
      });
      const sut = new AddMangaToListUseCase(makeListRepo(), mangaRepo);
      await expect(
        sut.execute({ userId: 'u', listId: 'l', mangaId: 'm' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFound when list not owned', async () => {
      const listRepo = makeListRepo({
        addItem: jest.fn().mockResolvedValue('list_not_found' as const),
      });
      const sut = new AddMangaToListUseCase(listRepo, makeMangaRepo());
      await expect(
        sut.execute({ userId: 'u', listId: 'l', mangaId: 'm' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when duplicate item', async () => {
      const listRepo = makeListRepo({
        addItem: jest.fn().mockResolvedValue('already_in_list' as const),
      });
      const sut = new AddMangaToListUseCase(listRepo, makeMangaRepo());
      await expect(
        sut.execute({ userId: 'u', listId: 'l', mangaId: 'm' }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('RemoveMangaFromListUseCase', () => {
    it('should throw when removeItem false', async () => {
      const sut = new RemoveMangaFromListUseCase(makeListRepo());
      await expect(
        sut.execute({ userId: 'u', listId: 'l', mangaId: 'm' }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
