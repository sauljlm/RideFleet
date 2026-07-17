import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 10;

/**
 * Opciones de Multer compartidas por todos los endpoints de subida de
 * fotos/documentos (vehículos, conductores, mantenimientos): solo
 * imágenes, hasta 10 MB por archivo.
 */
export const imageUploadOptions: MulterOptions = {
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(
        new BadRequestException('Solo se permiten archivos de imagen'),
        false,
      );
      return;
    }
    callback(null, true);
  },
};
