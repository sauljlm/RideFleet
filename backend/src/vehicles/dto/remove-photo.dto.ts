import { IsNotEmpty, IsString } from 'class-validator';

export class RemovePhotoDto {
  /**
   * URL exacta de la foto tal como está guardada en el vehículo. Se
   * identifica por URL y no por índice porque el índice cambia en cuanto
   * otra pestaña o petición agrega o quita fotos.
   */
  @IsString()
  @IsNotEmpty()
  url: string;
}
