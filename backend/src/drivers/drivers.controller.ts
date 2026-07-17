import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  imageUploadOptions,
  MAX_FILES_PER_UPLOAD,
} from '../common/image-upload.options';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriversService } from './drivers.service';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  create(@Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto);
  }

  @Get()
  findAll() {
    return this.driversService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDriverDto: UpdateDriverDto) {
    return this.driversService.update(id, updateDriverDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.driversService.remove(id);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  setPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.driversService.setPhoto(id, file);
  }

  @Post(':id/contract-photos')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, imageUploadOptions),
  )
  addContractPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.driversService.addContractPhotos(id, files);
  }
}
