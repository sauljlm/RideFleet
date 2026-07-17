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

  create(dto: CreateDriverDto): Promise<DriverDocument> {
    const driver = new this.driverModel(dto);
    return driver.save();
  }

  findAll(): Promise<DriverDocument[]> {
    return this.driverModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<DriverDocument> {
    const driver = await this.driverModel.findById(id).exec();
    if (!driver) {
      throw new NotFoundException('Conductor no encontrado');
    }
    return driver;
  }

  async update(id: string, dto: UpdateDriverDto): Promise<DriverDocument> {
    const driver = await this.driverModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!driver) {
      throw new NotFoundException('Conductor no encontrado');
    }
    return driver;
  }

  async remove(id: string): Promise<void> {
    const result = await this.driverModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Conductor no encontrado');
    }
  }

  async setPhoto(
    id: string,
    file: Express.Multer.File,
  ): Promise<DriverDocument> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const driver = await this.findOne(id);
    const result = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      'ridefleet/drivers/photos',
    );
    driver.photo = result.secure_url;
    return driver.save();
  }

  async addContractPhotos(
    id: string,
    files: Express.Multer.File[],
  ): Promise<DriverDocument> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const driver = await this.findOne(id);
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
