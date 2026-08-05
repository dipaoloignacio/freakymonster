import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

// TODO: este spec ESTÁ ROTO y es el único que falla en `npm test` (11/12
// pasan). EmailService hace `new Resend(process.env.RESEND_API_KEY)` en su
// constructor, y jest no carga el .env, así que Resend tira "Missing API key"
// apenas Nest instancia el provider.
//
// No se arregla poniendo la key en el entorno de test: eso deja un cliente
// real de Resend en los tests. Las salidas razonables son mockear el módulo
// `resend` acá (jest.mock), o inyectar el cliente en EmailService para poder
// pasar un doble. La segunda es la que además hace testeable el envío en sí,
// que hoy no tiene cobertura.
describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
