import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Protege todo /api/admin/*. El cliente manda la clave en el header
 * x-admin-key; la comparamos contra ADMIN_API_KEY (env var). No hay
 * sesiones ni usuarios — es una sola clave compartida para el panel del
 * estudio, tratarla como una contraseña (por eso vive en la URL del panel,
 * /turnos/[code], no en un campo de login visible).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['x-admin-key'];

    if (!key || key !== process.env.ADMIN_API_KEY) {
      throw new UnauthorizedException('Clave de administración inválida');
    }

    return true;
  }
}
