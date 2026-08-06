import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {
            findAppointments: jest.fn(),
            updateAppointment: jest.fn(),
            createAvailabilityBlock: jest.fn(),
            listArtists: jest.fn(),
            createArtist: jest.fn(),
            updateArtist: jest.fn(),
            deleteArtist: jest.fn(),
            listServices: jest.fn(),
            createService: jest.fn(),
            updateService: jest.fn(),
            deleteService: jest.fn(),
            assignServiceToArtist: jest.fn(),
            unassignServiceFromArtist: jest.fn(),
            findGiftCardByCode: jest.fn(),
            listGiftCardTiers: jest.fn(),
            createGiftCardTier: jest.fn(),
            updateGiftCardTier: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
