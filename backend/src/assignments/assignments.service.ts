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

  async create(
    dto: CreateAssignmentDto,
    ownerId: string,
  ): Promise<AssignmentDocument> {
    await this.vehiclesService.findOne(dto.vehicleId, ownerId);
    await this.driversService.findOne(dto.driverId, ownerId);

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

    // Cierra la asignación activa anterior de este vehículo, si existe.
    await this.assignmentModel.updateMany(
      { vehicleId: dto.vehicleId, ownerId, endDate: null },
      { endDate: startDate },
    );

    // Si el conductor ya tenía otro vehículo activo, cierra esa asignación
    // y libera el currentDriverId del vehículo anterior, para mantener la
    // relación 1 a 1 conductor-vehículo.
    const driverPreviousActive = await this.assignmentModel
      .findOne({
        driverId: dto.driverId,
        ownerId,
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
        ownerId,
      );
    }

    const assignment = new this.assignmentModel({
      ownerId,
      vehicleId: dto.vehicleId,
      driverId: dto.driverId,
      startDate,
      endDate: null,
    });
    await assignment.save();

    await this.vehiclesService.updateCurrentDriver(
      dto.vehicleId,
      dto.driverId,
      ownerId,
    );

    return assignment;
  }

  findByVehicle(
    vehicleId: string,
    ownerId: string,
  ): Promise<AssignmentDocument[]> {
    return this.assignmentModel
      .find({ vehicleId, ownerId })
      .sort({ startDate: -1 })
      .populate('driverId', 'fullName phone status')
      .exec();
  }

  findByDriver(
    driverId: string,
    ownerId: string,
  ): Promise<AssignmentDocument[]> {
    return this.assignmentModel
      .find({ driverId, ownerId })
      .sort({ startDate: -1 })
      .populate('vehicleId', 'brand model plate status')
      .exec();
  }

  findActiveByDriver(
    driverId: string,
    ownerId: string,
  ): Promise<AssignmentDocument | null> {
    return this.assignmentModel
      .findOne({ driverId, ownerId, endDate: null })
      .exec();
  }

  async unassignVehicle(
    vehicleId: string,
    ownerId: string,
  ): Promise<{ success: true }> {
    await this.vehiclesService.findOne(vehicleId, ownerId);

    await this.assignmentModel.updateMany(
      { vehicleId, ownerId, endDate: null },
      { endDate: new Date() },
    );
    await this.vehiclesService.updateCurrentDriver(vehicleId, null, ownerId);
    return { success: true };
  }

  async unassignDriver(
    driverId: string,
    ownerId: string,
  ): Promise<{ success: true }> {
    await this.driversService.findOne(driverId, ownerId);

    const active = await this.findActiveByDriver(driverId, ownerId);
    if (active) {
      await this.assignmentModel.updateOne(
        { _id: active._id },
        { endDate: new Date() },
      );
      await this.vehiclesService.updateCurrentDriver(
        active.vehicleId.toString(),
        null,
        ownerId,
      );
    }
    return { success: true };
  }
}
