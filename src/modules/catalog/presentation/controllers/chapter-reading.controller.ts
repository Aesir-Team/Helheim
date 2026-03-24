import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetChapterForReadingUseCase } from '../../application/use-cases/get-chapter-for-reading.use-case';
import { ChapterForReadingResponseDto } from '../dto/chapter-for-reading-response.dto';
import { ChapterAccessForbiddenResponseDto } from '../dto/chapter-access-forbidden-response.dto';
import { ErrorResponseDto } from '../../../auth/presentation/dto/error-response.dto';
import { OptionalJwtAuthGuard } from '../../../auth/presentation/guards/optional-jwt-auth.guard';
import { NotFoundError } from '../../../../shared/domain/errors';
import type { OptionalAuthenticatedRequest } from '../../../auth/presentation/types/optional-authenticated-request';

@ApiTags('Catalog')
@Controller('chapters')
export class ChapterReadingController {
  constructor(
    private readonly getChapterForReading: GetChapterForReadingUseCase,
  ) {}

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({
    summary: 'Capítulo para leitura (páginas + prev/next)',
    description:
      'Capítulos **public** (faixa grátis): podem ser lidos **sem JWT**; não consomem cota semanal nem gravam progresso no servidor. ' +
      'Com **JWT**, aplica limite semanal do plano gratuito; roles VIP/ADMIN/MODERATOR e planos ilimitados ficam liberados. ' +
      'Capítulos **coin** exigem login (403 `authentication_required` sem token); com token, 403 `coin_chapter_not_available` no MVP até o fluxo de coins. ' +
      'Se enviar `Authorization: Bearer` inválido → 401. ' +
      'Com usuário autenticado e acesso concedido, grava progresso (capítulo atual, página 1); falha ao gravar não impede a resposta.',
  })
  @ApiResponse({ status: 200, type: ChapterForReadingResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ChapterAccessForbiddenResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getById(
    @Param('id') id: string,
    @Request() req: OptionalAuthenticatedRequest,
  ): Promise<ChapterForReadingResponseDto> {
    try {
      const u = req.user;
      return await this.getChapterForReading.execute({
        chapterId: id,
        user: u
          ? { userId: u.userId, role: u.role }
          : null,
      });
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
