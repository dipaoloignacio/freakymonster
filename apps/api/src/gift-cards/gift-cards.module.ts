import { Module } from '@nestjs/common';
import { GiftCardsController } from './gift-cards.controller';
import { GiftCardsService } from './gift-cards.service';

@Module({
  controllers: [GiftCardsController],
  providers: [GiftCardsService],
  // Lo usa PaymentsService para emitir la card cuando entra el webhook.
  exports: [GiftCardsService],
})
export class GiftCardsModule {}
