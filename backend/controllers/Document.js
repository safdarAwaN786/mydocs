const Document = require("../models/Document");

module.exports.CreateDocument = async (req, res) => {
  try {
    await Document.deleteMany({ content: [] });
    const newDoc = new Document({ title: "Untitled Document", content: [{pageNumber : 1, content : ""}] });
    await newDoc.save();
    res.status(200).json(newDoc);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

module.exports.getDocumentById = async (req, res) => {
  try {
    const docData = await Document.findById(req.params.docId);
    res.status(200).json(docData);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

module.exports.geAllDocuments = async (req, res) => {
  try {
    const docs = await Document.find({
      content: { $exists: true, $ne: [], $type: "array" },
    });
    res.status(200).json(docs);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};
