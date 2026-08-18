import { Inject, Injectable } from '@nestjs/common';
import { UploadApiResponse, v2 } from 'cloudinary';
import * as streamifier from 'streamifier';
import { CLOUDINARY } from './cloudinary.provider';

@Injectable()
export class CloudinaryService {
  constructor(@Inject(CLOUDINARY) private readonly cloudinary: typeof v2) {}

  uploadBuffer(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error || !result) {
            return reject(
              new Error(
                error?.message ?? 'Error subiendo el archivo a Cloudinary',
              ),
            );
          }
          resolve(result);
        },
      );
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  /**
   * Borra en Cloudinary el archivo al que apunta una URL suya, para que al
   * quitar una foto de un vehículo o de un conductor no quede huérfana
   * ocupando espacio en la cuenta.
   *
   * Es "best effort": si la URL no tiene el formato esperado o Cloudinary
   * falla, no se propaga el error. Lo que importa para el usuario es que la
   * foto desaparezca de su ficha, y esa parte la controla la base de datos.
   */
  async destroyByUrl(url: string): Promise<void> {
    const publicId = extractPublicId(url);
    if (!publicId) {
      return;
    }
    try {
      await this.cloudinary.uploader.destroy(publicId);
    } catch {
      // Silencioso a propósito: ver comentario del método.
    }
  }
}

/**
 * De una URL como
 * https://res.cloudinary.com/<cloud>/image/upload/v123/ridefleet/x/abc.png
 * extrae el identificador que espera la API de Cloudinary:
 * "ridefleet/x/abc" (sin la versión ni la extensión).
 */
function extractPublicId(url: string): string | null {
  const match = /\/upload\/(?:v\d+\/)?(.+)$/.exec(url);
  if (!match) {
    return null;
  }
  return match[1].replace(/\.[^./]+$/, '');
}
