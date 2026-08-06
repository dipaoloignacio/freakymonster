import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GiftCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateGiftCardCode, giftCardExpiryFrom } from '../common/gift-card-code';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';

/**
 * Cuántas veces se reintenta la generación del código ante una colisión con
 * uno ya emitido. Con 24 caracteres y 8 posiciones el espacio es de ~1.1e11,
 * así que una colisión es anecdótica; el reintento existe para que, si pasa,
 * sea un no-evento y no una compra pagada que falla.
 */
const CODE_GENERATION_ATTEMPTS = 5;

@Injectable()
export class GiftCardsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Solo los montos vigentes: es la vista pública del catálogo. */
  async listActiveTiers() {
    return this.prisma.giftCardTier.findMany({
      where: { active: true },
      orderBy: { amount: 'asc' },
      select: { id: true, amount: true, label: true },
    });
  }

  /**
   * Crea la gift card en PENDING, antes de pagar.
   *
   * La fila tiene que existir de antemano porque el external_reference de la
   * preferencia de Mercado Pago necesita apuntar a algo: es lo único que
   * vuelve en el webhook para saber qué se pagó.
   *
   * Una card PENDING es inerte: no tiene código, así que no hay nada que
   * canjear ni que mostrar. Tampoco reserva nada (a diferencia de un turno,
   * que ocupa un horario), así que no necesita expiración ni cron de limpieza.
   */
  async create(dto: CreateGiftCardDto) {
    const tier = await this.prisma.giftCardTier.findUnique({ where: { id: dto.tierId } });
    if (!tier) {
      throw new NotFoundException('Monto de gift card no encontrado');
    }
    if (!tier.active) {
      // Pasa si alguien deja la página abierta y el estudio da de baja el
      // monto mientras tanto.
      throw new BadRequestException('Ese monto ya no está disponible');
    }

    return this.prisma.giftCard.create({
      data: {
        // Snapshot: si mañana el tier cambia de precio, esta card sigue
        // valiendo lo que se pagó.
        amount: tier.amount,
        status: GiftCardStatus.PENDING,
        purchaserName: dto.purchaserName,
        purchaserEmail: dto.purchaserEmail,
        recipientName: dto.recipientName ?? null,
        recipientEmail: dto.recipientEmail ?? null,
        message: dto.message ?? null,
      },
    });
  }

  async findById(id: string) {
    const giftCard = await this.prisma.giftCard.findUnique({ where: { id } });
    if (!giftCard) {
      throw new NotFoundException('Gift card no encontrada');
    }
    return giftCard;
  }

  /**
   * Emite la card: le pone código, vigencia y estado ACTIVE. La llama el
   * webhook de Mercado Pago cuando el pago queda approved.
   *
   * Idempotente: MP reintenta el webhook, así que una card que ya está ACTIVE
   * devuelve null y no se re-emite (sería un código nuevo y un segundo email
   * para la misma compra).
   */
  async issueAfterPayment(id: string, mpPaymentId: string) {
    const giftCard = await this.prisma.giftCard.findUnique({ where: { id } });
    if (!giftCard) {
      return null;
    }
    if (giftCard.status !== GiftCardStatus.PENDING) {
      return null;
    }

    for (let attempt = 1; attempt <= CODE_GENERATION_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.giftCard.update({
          where: { id },
          data: {
            code: generateGiftCardCode(),
            status: GiftCardStatus.ACTIVE,
            // La vigencia arranca cuando la card existe de verdad, no cuando
            // se abrió el checkout.
            expiresAt: giftCardExpiryFrom(),
            mpPaymentId,
          },
        });
      } catch (error) {
        const isDuplicateCode =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!isDuplicateCode || attempt === CODE_GENERATION_ATTEMPTS) {
          throw error;
        }
        // Colisión con un código ya emitido: se reintenta con otro.
      }
    }

    return null;
  }
}
