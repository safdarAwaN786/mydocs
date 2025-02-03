const documents = {}; // Simulating in-memory document storage
const DocumentModel = require("../models/Document");

async function handleDocumentEvents(ws, data) {
  const { _id, title, content, updatedPages, deletedPages, newPages, commentsToRemove } = data;

  const document = await DocumentModel.findById(_id);
  switch (data.type) {
    case "UPDATE_DOCUMENT":
      if (_id) {
        document.comments = document.comments.filter(comment => !commentsToRemove?.includes(comment.commentNumber))
        document.title = title;
        // Update pages
        document.content = document.content.map(page => {
          const updatedPage = updatedPages?.find(p => p.pageNumber === page.pageNumber);
          return updatedPage ? { ...page, content: updatedPage.content } : page;
        });

        // Remove deleted pages
        document.content = document.content.filter(page => !deletedPages?.includes(page.pageNumber));

        // Add new pages
        document.content.push(...newPages);

        // Ensure at least one page exists
        if (document.content.length === 0) {
          document.content = [{ pageNumber: 1, content: "" }];
        }

        await DocumentModel.findByIdAndUpdate(
          _id,
          document,
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
