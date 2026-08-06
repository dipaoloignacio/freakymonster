import { Body, Controller, Get, Post } from '@nestjs/common';
import { GiftCardsService } from './gift-cards.service';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';

// Público, sin AdminGuard: lo consume la página de compra. El equivalente de
// administración (montos activos e inactivos, alta y edición) vive en
// AdminController bajo /admin/gift-card-tiers.
@Controller()
export class GiftCardsController {
  constructor(private readonly giftCardsService: GiftCardsService) {}

  @Get('gift-card-tiers')
  findActiveTiers() {
    return this.giftCardsService.listActiveTiers();
  }

  // Crea la card en PENDING. El código y la vigencia los pone el webhook de
  // Mercado Pago al confirmarse el pago — ver GiftCardsService.
  @Post('gift-cards')
  create(@Body() dto: CreateGiftCardDto) {
    return this.giftCardsService.create(dto);
  }
}
