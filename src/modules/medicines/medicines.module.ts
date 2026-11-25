import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MedicinesController } from './presentation/http/medicines.controller';
import { SearchMedicinesUseCase } from './application/use-cases/search-medicines.use-case';
import { UpdateStockUseCase } from './application/use-cases/update-stock.use-case';
import { ManageStockAlertsUseCase } from './application/use-cases/manage-stock-alerts.use-case';

@Module({
  imports: [AuthModule],
  controllers: [MedicinesController],
  providers: [
    SearchMedicinesUseCase,
    UpdateStockUseCase,
    ManageStockAlertsUseCase,
  ],
  exports: [SearchMedicinesUseCase, UpdateStockUseCase],
})
export class MedicinesModule {}
