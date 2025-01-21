const mongoose = require("mongoose");

// Define the schema for the Document model
const documentSchema = new mongoose.Schema(
  {
    docID: {
      type: String,
      // required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      default: "",
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    author: {
      type: String,
      //   required: true,
    },
    comments: { type: Array },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

// Pre-save hook to assign a docID based on the max existing docID
documentSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const lastDoc = await Document.findOne().sort({ docID: -1 }); // Get the doc with the highest docID
      const newId = lastDoc
        ? (parseInt(lastDoc.docID) + 1).toString().padStart(4, "0")
        : "0001"; // Increment and format
      this.docID = newId;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Create a model based on the schema
const Document = mongoose.model("Document", documentSchema);

module.exports = Document;
