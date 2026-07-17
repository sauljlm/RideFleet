import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { Assignment, AssignmentDocument } from './schemas/assignment.schema';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name)
    private readonly assignmentModel: Model<AssignmentDocument>,
    private readonly vehiclesService: VehiclesService,
    private readonly driversService: DriversService,
  ) {}

  async create(dto: CreateAssignmentDto): Promise<AssignmentDocument> {
    await this.vehiclesService.findOne(dto.vehicleId);
    await this.driversService.findOne(dto.driverId);

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

    // Cierra la asignación activa anterior de este vehículo, si existe.
    await this.assignmentModel.updateMany(
      { vehicleId: dto.vehicleId, endDate: null },
      { endDate: startDate },
    );

    // Si el conductor ya tenía otro vehículo activo, cierra esa asignación
    // y libera el currentDriverId del vehículo anterior, para mantener la
    // relación 1 a 1 conductor-vehículo.
    const driverPreviousActive = await this.assignmentModel
      .findOne({
        driverId: dto.driverId,
        endDate: null,
        vehicleId: { $ne: dto.vehicleId },
      })
      .exec();

    if (driverPreviousActive) {
      await this.assignmentModel.updateOne(
        { _id: driverPreviousActive._id },
        { endDate: startDate },
      );
      await this.vehiclesService.updateCurrentDriver(
        driverPreviousActive.vehicleId.toString(),
        null,
      );
    }

    const assignment = new this.assignmentModel({
      vehicleId: dto.vehicleId,
      driverId: dto.driverId,
      startDate,
      endDate: null,
    });
    await assignment.save();

    await this.vehiclesService.updateCurrentDriver(dto.vehicleId, dto.driverId);

    return assignment;
  }

  findByVehicle(vehicleId: string): Promise<AssignmentDocument[]> {
    return this.assignmentModel
      .find({ vehicleId })
      .sort({ startDate: -1 })
      .populate('driverId', 'fullName phone status')
      .exec();
  }

  findByDriver(driverId: string): Promise<AssignmentDocument[]> {
    return this.assignmentModel
      .find({ driverId })
      .sort({ startDate: -1 })
      .populate('vehicleId', 'brand model plate status')
      .exec();
  }

  findActiveByDriver(driverId: string): Promise<AssignmentDocument | null> {
    return this.assignmentModel.findOne({ driverId, endDate: null }).exec();
  }
}
