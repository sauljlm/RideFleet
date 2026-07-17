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

  async create(dto: CreateVehicleDto): Promise<VehicleDocument> {
    const initialMileage = dto.currentMileage ?? 0;
    const vehicle = new this.vehicleModel({
      ...dto,
      currentMileage: initialMileage,
      mileageHistory: [{ date: new Date(), mileage: initialMileage }],
    });
    return vehicle.save();
  }

  findAll(): Promise<VehicleDocument[]> {
    return this.vehicleModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, populateDriver = false): Promise<VehicleDocument> {
    const query = this.vehicleModel.findById(id);
    if (populateDriver) {
      query.populate('currentDriverId', 'fullName phone status');
    }
    const vehicle = await query.exec();
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleDocument> {
    const vehicle = await this.vehicleModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  async remove(id: string): Promise<void> {
    const result = await this.vehicleModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  }

  async updateMileage(
    id: string,
    dto: UpdateMileageDto,
  ): Promise<VehicleDocument> {
    const vehicle = await this.findOne(id);

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
  ): Promise<void> {
    const vehicle = await this.findOne(id);
    if (mileage > vehicle.currentMileage) {
      vehicle.currentMileage = mileage;
      vehicle.mileageHistory.push({ date, mileage });
      await vehicle.save();
    }
  }

  async addPhotos(
    id: string,
    files: Express.Multer.File[],
  ): Promise<VehicleDocument> {
    const vehicle = await this.findOne(id);
    const urls = await this.uploadFiles(files, 'ridefleet/vehicles/photos');
    vehicle.photos.push(...urls);
    return vehicle.save();
  }

  async addDocuments(
    id: string,
    files: Express.Multer.File[],
  ): Promise<VehicleDocument> {
    const vehicle = await this.findOne(id);
    const urls = await this.uploadFiles(files, 'ridefleet/vehicles/documents');
    vehicle.documents.push(...urls);
    return vehicle.save();
  }

  async updateCurrentDriver(
    id: string,
    driverId: string | null,
  ): Promise<void> {
    const result = await this.vehicleModel
      .updateOne({ _id: id }, { currentDriverId: driverId })
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
