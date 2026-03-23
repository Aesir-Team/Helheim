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
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../domain/errors';

@Catch(ConflictError, ForbiddenError, NotFoundError, UnauthorizedError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(
    exception:
      | ConflictError
      | ForbiddenError
      | NotFoundError
      | UnauthorizedError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status =
      exception instanceof ConflictError
        ? HttpStatus.CONFLICT
        : exception instanceof UnauthorizedError
          ? HttpStatus.UNAUTHORIZED
          : exception instanceof ForbiddenError
            ? HttpStatus.FORBIDDEN
            : HttpStatus.NOT_FOUND;
    this.logger.warn(`${exception.name}: ${exception.message}`);
    if (exception instanceof ForbiddenError) {
      res.status(status).json({
        statusCode: status,
        message: exception.message,
        reason: exception.reasonCode,
      });
      return;
    }
    res.status(status).json({
      statusCode: status,
      message: exception.message,
    });
  }
}
