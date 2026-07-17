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
}
