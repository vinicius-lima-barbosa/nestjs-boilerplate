import { Prisma } from '@/generated/prisma/client';
import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    let mappedError: HttpException;

    switch (exception.code) {
      case 'P2002': {
        mappedError = new ConflictException('Resource already exists');
        break;
      }
      case 'P2025': {
        mappedError = new NotFoundException('Resource not found');
        break;
      }
      default: {
        mappedError = new ConflictException('Database operation failed');
      }
    }

    response.status(mappedError.getStatus()).json({
      success: false,
      statusCode: mappedError.getStatus(),
      timestamp: new Date().toISOString(),
      message: mappedError.message,
    });
  }
}
