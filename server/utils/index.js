import mongoose from 'mongoose';

const connectDB = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('MongoDB URI missing. Set MONGO_URI in your env.');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

export default connectDB;