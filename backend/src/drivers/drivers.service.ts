import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver, DriverDocument } from './schemas/driver.schema';

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(Driver.name)
    private readonly driverModel: Model<DriverDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  create(dto: CreateDriverDto, ownerId: string): Promise<DriverDocument> {
    const driver = new this.driverModel({ ...dto, ownerId });
    return driver.save();
  }

  findAll(ownerId: string): Promise<DriverDocument[]> {
    return this.driverModel.find({ ownerId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, ownerId: string): Promise<DriverDocument> {
    const driver = await this.driverModel.findOne({ _id: id, ownerId }).exec();
    if (!driver) {
      throw new NotFoundException('Conductor no encontrado');
    }
    return driver;
  }

  async update(
    id: string,
    dto: UpdateDriverDto,
    ownerId: string,
  ): Promise<DriverDocument> {
    const driver = await this.driverModel
      .findOneAndUpdate({ _id: id, ownerId }, dto, { new: true })
      .exec();
    if (!driver) {
      throw new NotFoundException('Conductor no encontrado');
    }
    return driver;
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const result = await this.driverModel
      .findOneAndDelete({ _id: id, ownerId })
      .exec();
    if (!result) {
      throw new NotFoundException('Conductor no encontrado');
    }
  }

  async setPhoto(
    id: string,
    file: Express.Multer.File,
    ownerId: string,
  ): Promise<DriverDocument> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const driver = await this.findOne(id, ownerId);
    const previousPhoto = driver.photo;
    const result = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      'ridefleet/drivers/photos',
    );
    driver.photo = result.secure_url;
    await driver.save();
    // La foto anterior ya no se puede ver desde ningún lado, así que se
    // borra de Cloudinary en vez de dejarla ocupando espacio.
    if (previousPhoto) {
      await this.cloudinaryService.destroyByUrl(previousPhoto);
    }
    return driver;
  }

  /**
   * Quita la foto de perfil del conductor y la borra de Cloudinary.
   */
  async removePhoto(id: string, ownerId: string): Promise<DriverDocument> {
    const driver = await this.findOne(id, ownerId);
    const previousPhoto = driver.photo;
    if (!previousPhoto) {
      return driver;
    }
    driver.photo = null;
    await driver.save();
    await this.cloudinaryService.destroyByUrl(previousPhoto);
    return driver;
  }

  async addContractPhotos(
    id: string,
    files: Express.Multer.File[],
    ownerId: string,
  ): Promise<DriverDocument> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const driver = await this.findOne(id, ownerId);
    const results = await Promise.all(
      files.map((file) =>
        this.cloudinaryService.uploadBuffer(
          file.buffer,
          'ridefleet/drivers/contracts',
        ),
      ),
    );
    driver.contractPhotos.push(...results.map((r) => r.secure_url));
    return driver.save();
  }
}
