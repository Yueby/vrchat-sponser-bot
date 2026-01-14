import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  customName: string;
  username: string;
  avatar: string;           // Avatar URL
  roles: string[];          // Role ID array
  roleNames: string[];      // Role name array (for display)
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  customName: { type: String, required: true },
  username: { type: String },
  avatar: { type: String },
  roles: [{ type: String }],
  roleNames: [{ type: String }],
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
