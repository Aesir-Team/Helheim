import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../auth/presentation/types/authenticated-request';
import { ErrorResponseDto } from '../../../auth/presentation/dto/error-response.dto';
import { ListUserMangaListsUseCase } from '../../application/use-cases/list-user-manga-lists.use-case';
import { CreateUserMangaListUseCase } from '../../application/use-cases/create-user-manga-list.use-case';
import { GetUserMangaListUseCase } from '../../application/use-cases/get-user-manga-list.use-case';
import { UpdateUserMangaListUseCase } from '../../application/use-cases/update-user-manga-list.use-case';
import { DeleteUserMangaListUseCase } from '../../application/use-cases/delete-user-manga-list.use-case';
import { ReorderUserMangaListsUseCase } from '../../application/use-cases/reorder-user-manga-lists.use-case';
import { AddMangaToListUseCase } from '../../application/use-cases/add-manga-to-list.use-case';
import { RemoveMangaFromListUseCase } from '../../application/use-cases/remove-manga-from-list.use-case';
import { CreateUserMangaListDto } from '../dto/create-user-manga-list.dto';
import { UpdateUserMangaListDto } from '../dto/update-user-manga-list.dto';
import { ReorderUserMangaListsDto } from '../dto/reorder-user-manga-lists.dto';
import { AddMangaToListDto } from '../dto/add-manga-to-list.dto';
import {
  UserMangaListDetailResponseDto,
  UserMangaListSummaryResponseDto,
} from '../dto/user-manga-list-response.dto';
import type {
  UserMangaListDetailDto,
  UserMangaListSummaryDto,
} from '../../application/ports/user-manga-list.repository.port';

function toSummaryResponse(
  row: UserMangaListSummaryDto,
): UserMangaListSummaryResponseDto {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    mangasReadCount: row.mangasReadCount,
    itemCount: row.itemCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDetailResponse(
  row: UserMangaListDetailDto,
): UserMangaListDetailResponseDto {
  return {
    ...toSummaryResponse(row),
    items: row.items.map((it) => ({
      itemId: it.itemId,
      mangaId: it.mangaId,
      sortOrder: it.sortOrder,
      addedAt: it.addedAt,
      mangaTitle: it.mangaTitle,
      mangaSlug: it.mangaSlug,
      mangaCoverImage: it.mangaCoverImage,
    })),
  };
}

@ApiTags('Lists')
@Controller('users/me/lists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('Bearer')
export class UserListsController {
  constructor(
    private readonly listUserLists: ListUserMangaListsUseCase,
    private readonly createList: CreateUserMangaListUseCase,
    private readonly getList: GetUserMangaListUseCase,
    private readonly updateList: UpdateUserMangaListUseCase,
    private readonly deleteList: DeleteUserMangaListUseCase,
    private readonly reorderLists: ReorderUserMangaListsUseCase,
    private readonly addManga: AddMangaToListUseCase,
    private readonly removeManga: RemoveMangaFromListUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar minhas listas de mangás' })
  @ApiResponse({ status: 200, type: [UserMangaListSummaryResponseDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async list(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserMangaListSummaryResponseDto[]> {
    const rows = await this.listUserLists.execute(req.user.userId);
    return rows.map(toSummaryResponse);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar lista' })
  @ApiResponse({ status: 201, type: UserMangaListSummaryResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateUserMangaListDto,
  ): Promise<UserMangaListSummaryResponseDto> {
    const row = await this.createList.execute({
      userId: req.user.userId,
      name: dto.name,
    });
    return toSummaryResponse(row);
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reordenar listas',
    description:
      'Envie todos os IDs das suas listas na ordem desejada (permutação completa).',
  })
  @ApiResponse({ status: 204, description: 'Ordem atualizada' })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  async reorder(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ReorderUserMangaListsDto,
  ): Promise<void> {
    await this.reorderLists.execute({
      userId: req.user.userId,
      orderedListIds: dto.listIds,
    });
  }

  @Get(':listId')
  @ApiOperation({ summary: 'Detalhe da lista com itens' })
  @ApiResponse({ status: 200, type: UserMangaListDetailResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getById(
    @Request() req: AuthenticatedRequest,
    @Param('listId', ParseUUIDPipe) listId: string,
  ): Promise<UserMangaListDetailResponseDto> {
    const row = await this.getList.execute(listId, req.user.userId);
    return toDetailResponse(row);
  }

  @Patch(':listId')
  @ApiOperation({ summary: 'Renomear ou ajustar ordem da lista' })
  @ApiResponse({ status: 200, type: UserMangaListSummaryResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  async patch(
    @Request() req: AuthenticatedRequest,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: UpdateUserMangaListDto,
  ): Promise<UserMangaListSummaryResponseDto> {
    if (dto.name === undefined && dto.sortOrder === undefined) {
      throw new BadRequestException('Informe name e/ou sortOrder');
    }
    const row = await this.updateList.execute({
      listId,
      userId: req.user.userId,
      name: dto.name,
      sortOrder: dto.sortOrder,
    });
    return toSummaryResponse(row);
  }

  @Delete(':listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir lista (itens em cascata)' })
  @ApiResponse({ status: 204, description: 'Lista removida' })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async remove(
    @Request() req: AuthenticatedRequest,
    @Param('listId', ParseUUIDPipe) listId: string,
  ): Promise<void> {
    await this.deleteList.execute(listId, req.user.userId);
  }

  @Post(':listId/items')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Adicionar mangá à lista' })
  @ApiResponse({ status: 204, description: 'Mangá adicionado' })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  async addItem(
    @Request() req: AuthenticatedRequest,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: AddMangaToListDto,
  ): Promise<void> {
    await this.addManga.execute({
      userId: req.user.userId,
      listId,
      mangaId: dto.mangaId,
    });
  }

  @Delete(':listId/items/:mangaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover mangá da lista' })
  @ApiResponse({ status: 204, description: 'Item removido' })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async removeItem(
    @Request() req: AuthenticatedRequest,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
  ): Promise<void> {
    await this.removeManga.execute({
      userId: req.user.userId,
      listId,
      mangaId,
    });
  }
}
