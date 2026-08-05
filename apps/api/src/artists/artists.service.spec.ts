import { Test, TestingModule } from '@nestjs/testing';
import { ArtistsService } from './artists.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ArtistsService', () => {
  let service: ArtistsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArtistsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<ArtistsService>(ArtistsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
