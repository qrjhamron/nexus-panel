import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { resolve } from 'path';
import { existsSync } from 'fs';

@Catch()
export class SpaFallbackFilter implements ExceptionFilter {
  private readonly indexPath: string;
  private readonly frontendBuilt: boolean;

  constructor() {
    this.indexPath = resolve(__dirname, '../../../../frontend/dist/index.html');
    this.frontendBuilt = existsSync(this.indexPath);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // For 404 GET requests to non-API paths, serve the SPA
    if (status === 404 && req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/health')) {
      if (this.frontendBuilt) {
        return res.sendFile(this.indexPath);
      }
      return res.status(200).send(
        '<html><body><h1>Frontend not built</h1><p>Run: <code>cd packages/frontend &amp;&amp; npm run build</code></p></body></html>',
      );
    }

    // For non-HTTP exceptions (real errors), log the stack trace
    if (!(exception instanceof HttpException)) {
      console.error('Unhandled exception:', exception);
    }

    // For all other exceptions, return JSON error
    let message = 'Internal server error';
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      message = typeof response === 'string' ? response : (response as any).message || message;
    }

    return res.status(status).json({
      statusCode: status,
      message,
    });
  }
}
