const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../../config');

/**
 * Single Users collection shared by all 4 roles (Patient, Doctor, ChiefDoctor, Admin).
 * Role-specific fields are nested under `profile` and validated conditionally.
 * This mirrors the frontend's 4 login tabs (patient/doctor/chief/admin).
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never return password by default
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'chief', 'admin'],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    /* Doctor / Chief-Doctor specific fields */
    specialty: { type: String, trim: true },
    experienceYears: { type: Number, min: 0 },
    licenseNumber: { type: String, trim: true },
    languages: [{ type: String, trim: true }],
    consultationFee: { type: Number, min: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },

    /* Patient specific fields */
    age: { type: Number, min: 0 },
    gender: { type: String, enum: ['male', 'female', 'other'] },

    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

/* Hash password before saving, only if modified */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, config.bcryptSaltRounds);
  next();
});

/* Instance method to compare a plaintext password against the stored hash */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/* Strip sensitive fields when converting to JSON (API responses) */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
