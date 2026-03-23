import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ListMangasUseCase } from '../../application/use-cases/list-mangas.use-case';
import { GetMangaBySlugUseCase } from '../../application/use-cases/get-manga-by-slug.use-case';
import { ListChaptersUseCase } from '../../application/use-cases/list-chapters.use-case';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.use-case';
import { PaginatedMangasResponseDto } from '../dto/manga-summary-response.dto';
import { MangaDetailResponseDto } from '../dto/manga-detail-response.dto';
import { PaginatedChaptersResponseDto } from '../dto/chapter-summary-response.dto';
import { CategoryResponseDto } from '../dto/category-response.dto';
import { ErrorResponseDto } from '../../../auth/presentation/dto/error-response.dto';
import { NotFoundError } from '../../../../shared/domain/errors';

@ApiTags('Catalog')
@Controller()
export class CatalogController {
  constructor(
    private readonly listMangas: ListMangasUseCase,
    private readonly getMangaBySlug: GetMangaBySlugUseCase,
    private readonly listChapters: ListChaptersUseCase,
    private readonly listCategories: ListCategoriesUseCase,
  ) {}

  @Get('mangas')
  @ApiOperation({ summary: 'Listar mangás com paginação e filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['manga', 'manhwa', 'manhua'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ongoing', 'completed', 'cancelled'],
  })
  @ApiQuery({ name: 'categorySlug', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['lastChapterAt', 'views', 'rating', 'createdAt'],
  })
  @ApiQuery({ name: 'includeNsfw', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: PaginatedMangasResponseDto })
  async listMangasRoute(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('includeNsfw') includeNsfw?: string,
  ): Promise<PaginatedMangasResponseDto> {
    return this.listMangas.execute({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      type,
      status,
      categorySlug,
      search,
      sortBy: sortBy as
        | 'lastChapterAt'
        | 'views'
        | 'rating'
        | 'createdAt'
        | undefined,
      includeNsfw: includeNsfw === 'true' ? true : undefined,
    });
  }

  @Get('mangas/:slug')
  @ApiOperation({
    summary: 'Detalhe de um mangá por slug (sync se não existir no BD)',
  })
  @ApiResponse({ status: 200, type: MangaDetailResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getMangaBySlugRoute(
    @Param('slug') slug: string,
  ): Promise<MangaDetailResponseDto> {
    try {
      return await this.getMangaBySlug.execute(slug);
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Get('mangas/:slug/chapters')
  @ApiOperation({ summary: 'Listar capítulos de um mangá' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedChaptersResponseDto })
  async listChaptersRoute(
    @Param('slug') slug: string,
    @Query('order') order?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedChaptersResponseDto> {
    return this.listChapters.execute({
      mangaSlug: slug,
      order: order === 'asc' ? 'asc' : order === 'desc' ? 'desc' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar todas as categorias' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async listCategoriesRoute(): Promise<CategoryResponseDto[]> {
    return this.listCategories.execute();
  }
}
