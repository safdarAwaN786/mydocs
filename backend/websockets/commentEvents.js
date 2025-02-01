const DocumentModel = require("../models/Document");

const comments = {}; // Simulating in-memory comments

async function handleCommentEvents(ws, data) {
  // const { comment, docId, updatedContent, commentNumber } = data;

  const { docId, updatedContent, commentNumber, comment, reply, commentsToRemove } = data;
  const document = await DocumentModel.findById(docId);
  switch (data.type) {
    case "ADD_COMMENT":
      document.comments = [
        ...document?.comments,
        {
          commentBy: "You",
          commentDate: new Date(),
          comment,
          commentNumber,
          replies: [],
          resolved: false,
        },
      ];
      document.content = updatedContent;
      document.comments = document.comments.filter(comment => !commentsToRemove.includes(comment.commentNumber))
      const updatedDoc = await DocumentModel.findByIdAndUpdate(
        docId,
        document,
        { new: true }
      );
      ws.send(
        JSON.stringify({
          status: "success",
          message: "Comment Added",
          doc: updatedDoc,
        })
      );
      break;

    case "REPLY_COMMENT":
      document.comments = document.comments.filter(comment => !commentsToRemove.includes(comment.commentNumber))
      const commentIndex = document?.comments?.findIndex(
        (comment) => comment.commentNumber == commentNumber
      );
      document.comments[commentIndex].replies = [
        ...document.comments[commentIndex].replies,
        { replyBy: "You", replyDate: new Date(), reply },
      ];
      document.comments[commentIndex].resolved = false;
      await DocumentModel.findByIdAndUpdate(docId, document);
      ws.send(
        JSON.stringify({
          status: "success",
          message: "Reply Added",
          doc: document,
        })
      );

      break;

    case "RESOLVE_COMMENT":
      document.comments = document.comments.filter(comment => !commentsToRemove.includes(comment.commentNumber))
      const commentId = document.comments?.findIndex(
        (comment) => comment.commentNumber === commentNumber
      );

      // document.content = updatedContent;
      if (commentId !== undefined && commentId !== -1) {
        document.comments[commentId].resolved = true;
        // document.content = updatedContent;
      } else {
        ws.send(
          JSON.stringify({
            status: "failed",
            message: "Comment not found",
            doc: document,
          })
        );
      }
      await DocumentModel.findByIdAndUpdate(docId, document);
      ws.send(
        JSON.stringify({
          status: "success",
          message: "Comment Resolved",
          doc: document,
        })
      );

      break;

    default:
      ws.send(JSON.stringify({ error: "Unknown comment event" }));
  }
}

module.exports = { handleCommentEvents };
