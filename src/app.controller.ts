import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Verifica se a API está em execução.',
  })
  @ApiResponse({
    status: 200,
    description: 'API está saudável',
    schema: { type: 'string', example: 'OK' },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
