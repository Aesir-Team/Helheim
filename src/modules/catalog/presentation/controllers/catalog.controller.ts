import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ListMangasUseCase } from '../../application/use-cases/list-mangas.use-case';
import { GetHomeFeedUseCase } from '../../application/use-cases/get-home-feed.use-case';
import { GetMangaSyncStatusUseCase } from '../../application/use-cases/get-manga-sync-status.use-case';
import { GetMangaBySlugUseCase } from '../../application/use-cases/get-manga-by-slug.use-case';
import { ListChaptersUseCase } from '../../application/use-cases/list-chapters.use-case';
import { GetChapterSummaryByMangaSlugAndNumberUseCase } from '../../application/use-cases/get-chapter-summary-by-manga-slug-and-number.use-case';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.use-case';
import { PaginatedMangasResponseDto } from '../dto/manga-summary-response.dto';
import { MangaDetailResponseDto } from '../dto/manga-detail-response.dto';
import { PaginatedChaptersResponseDto } from '../dto/chapter-summary-response.dto';
import { CategoryResponseDto } from '../dto/category-response.dto';
import { ErrorResponseDto } from '../../../auth/presentation/dto/error-response.dto';
import { NotFoundError } from '../../../../shared/domain/errors';
import { HomeFeedResponseDto } from '../dto/home-feed-response.dto';
import { MangaSyncStatusResponseDto } from '../dto/manga-sync-status-response.dto';

@ApiTags('Catalog')
@Controller()
export class CatalogController {
  constructor(
    private readonly getHomeFeed: GetHomeFeedUseCase,
    private readonly getMangaSyncStatus: GetMangaSyncStatusUseCase,
    private readonly listMangas: ListMangasUseCase,
    private readonly getMangaBySlug: GetMangaBySlugUseCase,
    private readonly listChapters: ListChaptersUseCase,
    private readonly getChapterSummaryByMangaSlugAndNumber: GetChapterSummaryByMangaSlugAndNumberUseCase,
    private readonly listCategories: ListCategoriesUseCase,
  ) {}

  @Get('home')
  @ApiOperation({
    summary: 'Home agregada do catálogo',
    description:
      'Monta os blocos da home (trending, recomendados e últimas atualizações). Busca trending na Nexustoons, faz upsert no catálogo e responde com dados locais.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'includeNsfw', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: HomeFeedResponseDto })
  async homeRoute(
    @Query('limit') limit?: string,
    @Query('includeNsfw') includeNsfw?: string,
  ): Promise<HomeFeedResponseDto> {
    return this.getHomeFeed.execute({
      limit: limit ? parseInt(limit, 10) : undefined,
      includeNsfw: includeNsfw === 'true' ? true : undefined,
    });
  }

  @Get('mangas')
  @ApiOperation({
    summary: 'Listar mangás com paginação e filtros',
    description:
      'Com `search` preenchido, consulta a Nexustoons, faz upsert dos resultados no catálogo e devolve a página a partir do banco (falha na fonte externa não bloqueia a listagem local).',
  })
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
    summary: 'Detalhe de um mangá por slug',
    description:
      'Consulta a Nexustoons, upsert do mangá no catálogo, resposta a partir do banco; em seguida agenda sync de capítulos/páginas em background (com cooldown de 24h após sync completo). Falha na fonte não bloqueia detalhe local.',
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

  @Get('mangas/:slug/chapters/by-number/:number')
  @ApiOperation({
    summary: 'Capítulos a partir de um número (deep link, ordem asc)',
    description:
      'Localiza o capítulo **publicado** com aquele `number` e devolve **`data` em ordem ascendente natural** a partir dele (inclusive), com **paginação** sobre esse subconjunto (`page`, `limit` — mesmos defaults/máx. da listagem). Para páginas/leitura use `GET /chapters/:id` com o `id` de cada item.',
  })
  @ApiParam({ name: 'slug', example: 'solo-leveling' })
  @ApiParam({
    name: 'number',
    description:
      'Valor do campo `number` do capítulo (ex.: `1`, `12`, `12.5`). Codifique caracteres especiais na URL quando necessário.',
    example: '1',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedChaptersResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getChapterByMangaSlugAndNumberRoute(
    @Param('slug') slug: string,
    @Param('number') number: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedChaptersResponseDto> {
    try {
      return await this.getChapterSummaryByMangaSlugAndNumber.execute({
        mangaSlug: slug,
        chapterNumber: number,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Get('mangas/:slug/chapters')
  @ApiOperation({
    summary: 'Listar capítulos de um mangá (paginado)',
    description:
      'Lista **paginada** de capítulos publicados (`public` e `coin`): `page` (default 1), `limit` (default 50, máx. 200), `order` asc/desc por número natural. Use `isLocked`/`accessLevel` na UI; conteúdo continua protegido em `GET /chapters/:id`.',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Ordem natural por número do capítulo. Padrão: asc (1, 2, 3…).',
  })
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

  @Get('mangas/:slug/sync-status')
  @ApiOperation({
    summary: 'Status da sincronização de capítulos',
    description:
      'Retorna progresso recente da sincronização para a UI da primeira carga (loading/progresso).',
  })
  @ApiResponse({ status: 200, type: MangaSyncStatusResponseDto })
  async getMangaSyncStatusRoute(
    @Param('slug') slug: string,
  ): Promise<MangaSyncStatusResponseDto> {
    return this.getMangaSyncStatus.execute(slug);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar todas as categorias' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async listCategoriesRoute(): Promise<CategoryResponseDto[]> {
    return this.listCategories.execute();
  }
}
