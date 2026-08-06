import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { EmailService } from '../notifications/email.service';
import { GiftCardsService } from '../gift-cards/gift-cards.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: {} },
        { provide: AvailabilityService, useValue: {} },
        {
          provide: EmailService,
          useValue: {
            sendCustomerConfirmation: jest.fn(),
            sendStudioNotification: jest.fn(),
            sendGiftCardIssued: jest.fn(),
          },
        },
        { provide: GiftCardsService, useValue: { issueAfterPayment: jest.fn() } },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
