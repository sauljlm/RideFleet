import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ProfitabilityQueryDto } from './dto/profitability-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('maintenance-alerts')
  getMaintenanceAlerts() {
    return this.dashboardService.getMaintenanceAlerts();
  }

  @Get('late-payments')
  getLatePayments() {
    return this.dashboardService.getLatePayments();
  }

  @Get('profitability')
  getProfitability(@Query() query: ProfitabilityQueryDto) {
    return this.dashboardService.getProfitability(
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }
}
