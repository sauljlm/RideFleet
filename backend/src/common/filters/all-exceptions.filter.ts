import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { MulterError } from 'multer';

interface MongoDuplicateKeyError {
  code: number;
}

function isDuplicateKeyError(
  exception: unknown,
): exception is MongoDuplicateKeyError {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    'code' in exception &&
    (exception as { code?: unknown }).code === 11000
  );
}

/**
 * Filtro global de excepciones: garantiza que cualquier error que salga de
 * la API tenga una respuesta consistente y en español, incluso los que no
 * son HttpException (IDs con formato inválido, duplicados de índice único,
 * límites de Multer, o cualquier otro error inesperado).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      // @nestjs/platform-express convierte el error de Multer por tamaño
      // excedido en un HttpException 413 (Payload Too Large) con mensaje en
      // inglés antes de que llegue aquí como MulterError crudo; lo
      // traducimos por código de estado en vez de por tipo.
      const PAYLOAD_TOO_LARGE = 413;
      if (status === PAYLOAD_TOO_LARGE) {
        response.status(status).json({
          statusCode: status,
          error: 'Payload Too Large',
          message: 'El archivo es demasiado grande (máximo 10 MB)',
        });
        return;
      }
      response.status(status).json(exception.getResponse());
      return;
    }

    if (exception instanceof MongooseError.CastError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'El identificador proporcionado no es válido',
      });
      return;
    }

    if (isDuplicateKeyError(exception)) {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Ya existe un registro con ese valor (dato duplicado)',
      });
      return;
    }

    if (exception instanceof MulterError) {
      const message =
        exception.code === 'LIMIT_FILE_SIZE'
          ? 'El archivo es demasiado grande (máximo 10 MB)'
          : 'No se pudo procesar el archivo subido';
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message,
      });
      return;
    }

    this.logger.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Ocurrió un error interno en el servidor',
    });
  }
}
