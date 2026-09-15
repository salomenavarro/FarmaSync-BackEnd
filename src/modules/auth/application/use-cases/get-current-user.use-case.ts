import { Inject, Injectable } from "@nestjs/common";
import { InvalidCredentialsError } from "../../domain/errors/auth.errors";
import { USER_REPOSITORY, UserRepositoryPort } from "../../domain/ports/user-repository.port";

@Injectable()
export class GetCurrentUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort) {}

  async execute(userId: number) {
    const user = await this.userRepository.findById(userId);

    // En la práctica no debería pasar (si el JWT es válido, el
    // usuario existía al momento del login), pero cubre el caso de
    // que el usuario se haya borrado después de emitido el token.
    if (!user) {
      throw new InvalidCredentialsError("Usuario no encontrado.");
    }

    return user;
  }
}
