import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  customName: string;
  username: string;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  customName: { type: String, required: true },
  username: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
