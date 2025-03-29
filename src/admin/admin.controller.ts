import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService, AdminStats } from './admin.service';
import { DiscountCode } from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('discount/active')
  @HttpCode(HttpStatus.OK)
  async getActiveDiscount(): Promise<{ activeDiscount: DiscountCode | null }> {
    const activeCode = await this.adminService.getActiveDiscountCode();
    return { activeDiscount: activeCode };
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats(): Promise<AdminStats> {
    return this.adminService.getStatistics();
  }
}
