import {
  BadRequestException,
  Controller,
  Get,
  Patch,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../auth/presentation/types/authenticated-request';
import { ErrorResponseDto } from '../../../auth/presentation/dto/error-response.dto';
import { SaveReadingProgressUseCase } from '../../application/use-cases/save-reading-progress.use-case';
import { GetContinueReadingUseCase } from '../../application/use-cases/get-continue-reading.use-case';
import { SaveReadingProgressDto } from '../dto/save-reading-progress.dto';
import {
  ContinueReadingEntryResponseDto,
  ReadingProgressSavedResponseDto,
} from '../dto/reading-progress-response.dto';
import type {
  ContinueReadingEntryDto,
  ReadingProgressRowDto,
} from '../../application/ports/reading-progress.repository.port';

function toSavedResponse(
  row: ReadingProgressRowDto,
): ReadingProgressSavedResponseDto {
  return {
    id: row.id,
    userId: row.userId,
    mangaId: row.mangaId,
    chapterId: row.chapterId,
    pageNumber: row.pageNumber,
    chaptersReadCount: row.chaptersReadCount,
    lastReadAt: row.lastReadAt,
  };
}

function toContinueResponse(
  row: ContinueReadingEntryDto,
): ContinueReadingEntryResponseDto {
  return {
    progressId: row.progressId,
    mangaId: row.mangaId,
    mangaTitle: row.mangaTitle,
    mangaSlug: row.mangaSlug,
    mangaCoverImage: row.mangaCoverImage,
    chaptersCount: row.chaptersCount,
    chapterId: row.chapterId,
    chapterNumber: row.chapterNumber,
    chapterTitle: row.chapterTitle,
    pageNumber: row.pageNumber,
    chaptersReadCount: row.chaptersReadCount,
    lastReadAt: row.lastReadAt,
  };
}

@ApiTags('Progress')
@Controller('users/me/reading-progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('Bearer')
export class ReadingProgressController {
  constructor(
    private readonly saveProgress: SaveReadingProgressUseCase,
    private readonly continueReading: GetContinueReadingUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Continuar lendo',
    description: 'Ordenado por última leitura.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Máximo de itens (1–100; padrão 20)',
    example: 20,
  })
  @ApiResponse({ status: 200, type: [ContinueReadingEntryResponseDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async list(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limitParam?: string,
  ): Promise<ContinueReadingEntryResponseDto[]> {
    let limit: number | undefined;
    if (limitParam != null && limitParam !== '') {
      const n = Number.parseInt(limitParam, 10);
      if (Number.isNaN(n)) {
        throw new BadRequestException('limit inválido');
      }
      limit = n;
    }
    const rows = await this.continueReading.execute(req.user.userId, limit);
    return rows.map(toContinueResponse);
  }

  @Patch()
  @ApiOperation({
    summary: 'Salvar progresso de leitura',
    description:
      'Upsert por (usuário, mangá). Valida que o capítulo pertence ao mangá. Idempotente se os dados forem iguais.',
  })
  @ApiResponse({ status: 200, type: ReadingProgressSavedResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  async save(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SaveReadingProgressDto,
  ): Promise<ReadingProgressSavedResponseDto> {
    const row = await this.saveProgress.execute({
      userId: req.user.userId,
      mangaId: dto.mangaId,
      chapterId: dto.chapterId,
      pageNumber: dto.pageNumber,
    });
    return toSavedResponse(row);
  }
}
