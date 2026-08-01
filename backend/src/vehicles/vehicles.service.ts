import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateMileageDto } from './dto/update-mileage.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle, VehicleDocument } from './schemas/vehicle.schema';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    dto: CreateVehicleDto,
    ownerId: string,
  ): Promise<VehicleDocument> {
    const initialMileage = dto.currentMileage ?? 0;
    const vehicle = new this.vehicleModel({
      ...dto,
      ownerId,
      currentMileage: initialMileage,
      mileageHistory: [{ date: new Date(), mileage: initialMileage }],
    });
    return vehicle.save();
  }

  findAll(ownerId: string): Promise<VehicleDocument[]> {
    return this.vehicleModel.find({ ownerId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(
    id: string,
    ownerId: string,
    populateDriver = false,
  ): Promise<VehicleDocument> {
    const query = this.vehicleModel.findOne({ _id: id, ownerId });
    if (populateDriver) {
      query.populate('currentDriverId', 'fullName phone status');
    }
    const vehicle = await query.exec();
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  async update(
    id: string,
    dto: UpdateVehicleDto,
    ownerId: string,
  ): Promise<VehicleDocument> {
    const vehicle = await this.vehicleModel
      .findOneAndUpdate({ _id: id, ownerId }, dto, { new: true })
      .exec();
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const result = await this.vehicleModel
      .findOneAndDelete({ _id: id, ownerId })
      .exec();
    if (!result) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  }

  async updateMileage(
    id: string,
    dto: UpdateMileageDto,
    ownerId: string,
  ): Promise<VehicleDocument> {
    const vehicle = await this.findOne(id, ownerId);

    if (dto.mileage < vehicle.currentMileage) {
      throw new BadRequestException(
        `El kilometraje no puede ser menor al actual (${vehicle.currentMileage} km)`,
      );
    }

    vehicle.currentMileage = dto.mileage;
    vehicle.mileageHistory.push({ date: new Date(), mileage: dto.mileage });
    return vehicle.save();
  }

  async syncMileageIfHigher(
    id: string,
    mileage: number,
    date: Date,
    ownerId: string,
  ): Promise<void> {
    const vehicle = await this.findOne(id, ownerId);
    if (mileage > vehicle.currentMileage) {
      vehicle.currentMileage = mileage;
      vehicle.mileageHistory.push({ date, mileage });
      await vehicle.save();
    }
  }

  async addPhotos(
    id: string,
    files: Express.Multer.File[],
    ownerId: string,
  ): Promise<VehicleDocument> {
    const vehicle = await this.findOne(id, ownerId);
    const urls = await this.uploadFiles(files, 'ridefleet/vehicles/photos');
    vehicle.photos.push(...urls);
    return vehicle.save();
  }

  async addDocuments(
    id: string,
    files: Express.Multer.File[],
    ownerId: string,
  ): Promise<VehicleDocument> {
    const vehicle = await this.findOne(id, ownerId);
    const urls = await this.uploadFiles(files, 'ridefleet/vehicles/documents');
    vehicle.documents.push(...urls);
    return vehicle.save();
  }

  async updateCurrentDriver(
    id: string,
    driverId: string | null,
    ownerId: string,
  ): Promise<void> {
    const result = await this.vehicleModel
      .updateOne({ _id: id, ownerId }, { currentDriverId: driverId })
      .exec();
    if (result.matchedCount === 0) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  }

  private async uploadFiles(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const results = await Promise.all(
      files.map((file) =>
        this.cloudinaryService.uploadBuffer(file.buffer, folder),
      ),
    );
    return results.map((result) => result.secure_url);
  }
}
