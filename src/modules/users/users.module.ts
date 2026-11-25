import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './presentation/http/users.controller';
import { ManageEmpleadosUseCase } from './application/use-cases/manage-empleados.use-case';
import { ManageGrupoFamiliarUseCase } from './application/use-cases/manage-grupo-familiar.use-case';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [ManageEmpleadosUseCase, ManageGrupoFamiliarUseCase],
})
export class UsersModule {}