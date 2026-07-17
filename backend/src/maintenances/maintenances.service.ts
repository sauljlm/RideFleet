import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { Maintenance, MaintenanceDocument } from './schemas/maintenance.schema';

@Injectable()
export class MaintenancesService {
  constructor(
    @InjectModel(Maintenance.name)
    private readonly maintenanceModel: Model<MaintenanceDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async create(dto: CreateMaintenanceDto): Promise<MaintenanceDocument> {
    await this.vehiclesService.findOne(dto.vehicleId);

    const maintenance = new this.maintenanceModel(dto);
    await maintenance.save();

    await this.vehiclesService.syncMileageIfHigher(
      dto.vehicleId,
      dto.mileageAtService,
      new Date(dto.date),
    );

    return maintenance;
  }

  findAll(): Promise<MaintenanceDocument[]> {
    return this.maintenanceModel.find().sort({ date: -1 }).exec();
  }

  findByVehicle(vehicleId: string): Promise<MaintenanceDocument[]> {
    return this.maintenanceModel.find({ vehicleId }).sort({ date: -1 }).exec();
  }

  async findOne(id: string): Promise<MaintenanceDocument> {
    const maintenance = await this.maintenanceModel.findById(id).exec();
    if (!maintenance) {
      throw new NotFoundException('Mantenimiento no encontrado');
    }
    return maintenance;
  }

  async update(
    id: string,
    dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceDocument> {
    const maintenance = await this.maintenanceModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!maintenance) {
      throw new NotFoundException('Mantenimiento no encontrado');
    }
    return maintenance;
  }

  async remove(id: string): Promise<void> {
    const result = await this.maintenanceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Mantenimiento no encontrado');
    }
  }

  async addPhotos(
    id: string,
    files: Express.Multer.File[],
  ): Promise<MaintenanceDocument> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const maintenance = await this.findOne(id);
    const results = await Promise.all(
      files.map((file) =>
        this.cloudinaryService.uploadBuffer(
          file.buffer,
          'ridefleet/maintenances/photos',
        ),
      ),
    );
    maintenance.photos.push(...results.map((r) => r.secure_url));
    return maintenance.save();
  }
}
