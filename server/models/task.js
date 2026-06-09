import mongoose, { Schema } from "mongoose";
const taskSchema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        // Use `stage` to align with controllers and routes
        stage: { type: String, enum: ['todo', 'in-progress', 'completed'], default: 'todo' },
        date: { type: Date , default: new Date() },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }, 
        orderName: { type: String, trim: true, default: "" },
        clientName: { type: String, trim: true, default: "" },
        // Store a list of activity entries
        activities: [{
            type: {
                type: String,
                default: "assigned",
                enum: [
                    "assigned",
                    "started",
                    "in-progress",
                    "bug",
                    "completed",
                    "commented",
                ],
            },
            activity: String,
            date: { type: Date, default: new Date() },
            by: { type: Schema.Types.ObjectId, ref: 'User' },
        }],
        subtasks: [{
            title: { type: String, required: true },
            date: Date,
            tag: String,
        }],
        assets: [String],
        team: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        isTrashed: { type: Boolean, default: false },
    },
    { timestamps: true }
);
const Task = mongoose.model('Task', taskSchema);
export default Task;
    



