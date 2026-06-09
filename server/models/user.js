import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        fullname: { type: String, required: true },
        title: { type: String },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['user', 'admin', 'client'], default: 'user' },
        isAdmin: { type: Boolean, required: true, default: false },
        tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};
const User = mongoose.model('User', userSchema);

export default User;