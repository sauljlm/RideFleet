import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../auth/strategies/jwt.strategy';
import {
  imageUploadOptions,
  MAX_FILES_PER_UPLOAD,
} from '../common/image-upload.options';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateMileageDto } from './dto/update-mileage.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.vehiclesService.create(createVehicleDto, user.userId);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayloadUser) {
    return this.vehiclesService.findAll(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.vehiclesService.findOne(id, user.userId, true);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.vehiclesService.update(id, updateVehicleDto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.vehiclesService.remove(id, user.userId);
  }

  @Patch(':id/mileage')
  updateMileage(
    @Param('id') id: string,
    @Body() updateMileageDto: UpdateMileageDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.vehiclesService.updateMileage(
      id,
      updateMileageDto,
      user.userId,
    );
  }

  @Post(':id/photos')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, imageUploadOptions),
  )
  addPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.vehiclesService.addPhotos(id, files, user.userId);
  }

  @Post(':id/documents')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, imageUploadOptions),
  )
  addDocuments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.vehiclesService.addDocuments(id, files, user.userId);
  }
}
