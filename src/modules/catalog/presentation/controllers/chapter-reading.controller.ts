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
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { NotFoundError } from '../../../../shared/domain/errors';
import type { AuthenticatedRequest } from '../../../auth/presentation/types/authenticated-request';

@ApiTags('Catalog')
@Controller('chapters')
export class ChapterReadingController {
  constructor(
    private readonly getChapterForReading: GetChapterForReadingUseCase,
  ) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({
    summary: 'Capítulo para leitura (páginas + prev/next)',
    description:
      'Requer JWT. Aplica limite semanal do plano gratuito (capítulos public); ' +
      'roles VIP/ADMIN/MODERATOR e planos com leitura ilimitada ficam liberados. ' +
      'Capítulos por coins retornam 403 no MVP até o fluxo de coins existir.',
  })
  @ApiResponse({ status: 200, type: ChapterForReadingResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ChapterAccessForbiddenResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ChapterForReadingResponseDto> {
    try {
      return await this.getChapterForReading.execute({
        chapterId: id,
        userId: req.user.userId,
        role: req.user.role,
      });
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
