const documents = {}; // Simulating in-memory document storage
const DocumentModel = require("../models/Document");

async function handleDocumentEvents(ws, data) {
  switch (data.type) {
    case "UPDATE_DOCUMENT":
      const { _id, title, content } = data;
      if (_id) {
        await DocumentModel.findByIdAndUpdate(
          _id,
          { title, content },
          { new: true }
        )
          .then((res) => {
            ws.send(
              JSON.stringify({
                status: "success",
                message: "Document Updated",
                doc: res,
              })
            );
          })
          .catch((error) => {
            ws.send(
              JSON.stringify({
                status: "error",
                message: "Document not found",
              })
            );
          });
      } else {
        if (content?.length > 0) {
          const doc = new DocumentModel({ title, content });
          await doc.save();
          ws.send(
            JSON.stringify({
              status: "success",
              message: "Document Updated",
              doc,
            })
          );
        } else {
          ws.send(
            JSON.stringify({
              status: "error",
              message: "Invalid content",
            })
          );
        }
      }

      break;

    case "FETCH_DOCUMENT":
      ws.send(
        JSON.stringify({
          status: "success",
          content: documents[data.docId] || "No content",
        })
      );
      break;

    default:
      ws.send(JSON.stringify({ error: "Unknown document event" }));
  }
}

module.exports = { handleDocumentEvents };
