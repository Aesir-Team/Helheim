import { Module } from '@nestjs/common';
import { ListsApplicationModule } from '../../lists/application/lists.application.module';
import { ProgressApplicationModule } from '../../progress/application/progress.application.module';

/**
 * Boundary de transição para o domínio "library" (listas + progresso).
 * Mantém módulos atuais e permite migração gradual sem big bang.
 */
@Module({
  imports: [ListsApplicationModule, ProgressApplicationModule],
  exports: [ListsApplicationModule, ProgressApplicationModule],
})
export class LibraryApplicationModule {}
