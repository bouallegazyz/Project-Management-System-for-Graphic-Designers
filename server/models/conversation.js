import mongoose from "mongoose";

const OPEN_CHANNEL_TYPE = "open-admin-graphistes";
const DM_TYPE = "dm";
const OPEN_CHANNEL_KEY = "open-admin-graphistes";
const OPEN_CHANNEL_NAME = "Canal Admins & Graphistes";

const conversationSchema = new mongoose.Schema(
  {
    conversationType: {
      type: String,
      enum: [DM_TYPE, OPEN_CHANNEL_TYPE],
      default: DM_TYPE,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    participantKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastMessage: {
      text: { type: String, default: "" },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
);

conversationSchema.path("participants").validate({
  validator(value) {
    const update = typeof this?.getUpdate === "function" ? this.getUpdate() : null;
    const queryType = update?.conversationType || update?.$set?.conversationType;
    const currentType = this?.conversationType || queryType;

    if (currentType === OPEN_CHANNEL_TYPE) {
      return Array.isArray(value);
    }

    return Array.isArray(value) && value.length === 2;
  },
  message: "Une conversation privée doit avoir exactement deux participants.",
});

conversationSchema.index({ participants: 1 });

conversationSchema.pre("validate", function normalizeConversation() {
  if (!Array.isArray(this.participants)) {
    this.participants = [];
  }

  const participantIds = this.participants
    .map((id) => id?.toString?.() || String(id))
    .filter(Boolean);

  if (this.conversationType === OPEN_CHANNEL_TYPE) {
    const uniqueIds = [...new Set(participantIds)].sort();
    this.participants = uniqueIds;
    this.participantKey = OPEN_CHANNEL_KEY;
    this.name = this.name || OPEN_CHANNEL_NAME;
    return;
  }

  const sortedParticipantIds = participantIds.sort();
  this.participants = sortedParticipantIds;
  this.participantKey = sortedParticipantIds.join(":");
});

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
