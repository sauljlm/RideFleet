export interface PopulatedVehicleRef {
  _id: string;
  brand: string;
  model: string;
  plate: string;
  status: string;
}

export interface PopulatedDriverRefBasic {
  _id: string;
  fullName: string;
  phone: string;
  status: string;
}

export interface Assignment {
  _id: string;
  vehicleId: string | PopulatedVehicleRef;
  driverId: string | PopulatedDriverRefBasic;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentInput {
  vehicleId: string;
  driverId: string;
  startDate?: string;
}
