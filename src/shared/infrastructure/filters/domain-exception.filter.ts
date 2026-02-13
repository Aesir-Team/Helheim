import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../domain/errors';

@Catch(ConflictError, NotFoundError, UnauthorizedError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(
    exception: ConflictError | NotFoundError | UnauthorizedError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status =
      exception instanceof ConflictError
        ? HttpStatus.CONFLICT
        : exception instanceof UnauthorizedError
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.NOT_FOUND;
    this.logger.warn(`${exception.name}: ${exception.message}`);
    res.status(status).json({
      statusCode: status,
      message: exception.message,
    });
  }
}
