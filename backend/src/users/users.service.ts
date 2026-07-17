import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async upsertAdmin(
    username: string,
    passwordHash: string,
  ): Promise<UserDocument> {
    return this.userModel
      .findOneAndUpdate(
        { username },
        { username, passwordHash },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
      .exec();
  }
}
