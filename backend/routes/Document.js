const express = require("express");
const DocumentController = require("../controllers/Document");
const router = express.Router();

router.post("/create-doc", DocumentController.CreateDocument);
router.get("/documentById/:docId", DocumentController.getDocumentById);
router.get("/documents", DocumentController.geAllDocuments);

module.exports = router;