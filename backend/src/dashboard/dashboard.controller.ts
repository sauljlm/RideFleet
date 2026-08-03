import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../auth/strategies/jwt.strategy';
import { DashboardService } from './dashboard.service';
import { ProfitabilityQueryDto } from './dto/profitability-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: JwtPayloadUser) {
    return this.dashboardService.getSummary(user.userId);
  }

  @Get('maintenance-alerts')
  getMaintenanceAlerts(@CurrentUser() user: JwtPayloadUser) {
    return this.dashboardService.getMaintenanceAlerts(user.userId);
  }

  @Get('upcoming-payments')
  getUpcomingPayments(@CurrentUser() user: JwtPayloadUser) {
    return this.dashboardService.getUpcomingPayments(user.userId);
  }

  @Get('profitability')
  getProfitability(
    @Query() query: ProfitabilityQueryDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.dashboardService.getProfitability(
      new Date(query.startDate),
      new Date(query.endDate),
      user.userId,
    );
  }
}
