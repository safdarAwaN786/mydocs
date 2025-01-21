"use client";
import React, { useEffect, useState, useRef } from 'react';
import JoditEditor from 'jodit-react';
import websocketService from "../../webSocket/websocketService";
import { useAtom } from 'jotai';
import { currentDoc, showComments } from '@/store/atoms';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { fetchDocument } from '@/API-calls/Documents/docsNormal';
import Loading from '../layout/Loading';
import { BiCommentAdd } from "react-icons/bi";
import { BsEmojiLaughing } from "react-icons/bs";
import { BiCommentEdit } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import dayjs from 'dayjs';
import { GiCheckMark } from "react-icons/gi";
import Image from 'next/image';
import { MdAccountCircle } from "react-icons/md";

export default function TextEditor() {
  const editor = useRef(null); // ✅ Create a ref for the editor
  const [docData, setDocData] = useAtom(currentDoc);
  const params = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [contentToShow, setContentToShow] = useState("")
  const [currentComment, setCurrentComment] = useState("")
  const [tempReplies, setTempReplies] = useState([])
  const [selectedComment, setSelectedComment] = useState(null)
  const [showCommentsBox, setShowCommentsBox] = useAtom(showComments)
  const { mutate, isLoading } = useMutation({
    mutationFn: fetchDocument,
    onSuccess: (data) => {
      if (!data) {
        router.replace("/docs");
        return;
      }
      setContentToShow(data.content)
      setDocData(data);
      setDocDataState(data.content);
    },
    onError: () => {
      router.replace("/docs");
    },
  });

  useEffect(() => {
    if (!docData) {
      mutate(params.docId);
    } else {
      setContentToShow(docData.content)
    }
    websocketService.connect("ws://localhost:5000", setDocData);
    return () => websocketService.disconnect();
  }, []);

  const sideBox = document.getElementById("sideBox");

  const handleMouseUp = (e) => {
    console.log('Selection made');

    const container = document.getElementsByClassName('jodit-wysiwyg')[0];
    const selection = window.getSelection();
    const contentContainer = document.getElementById("content-container");
    const textNodes = getTextNodes(container);

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();

      if (selectedText.length > 0) {
        console.log('Removing d-none and positioning sideBox');

        if (sideBox) {
          // Get bounding rectangle of selection
          const rect = range.getBoundingClientRect();

          // Calculate top and left relative to the content container (so it moves with scrolling)
          const contentRect = contentContainer.getBoundingClientRect();
          const topPosition = rect.bottom - contentRect.top + contentContainer.scrollTop; // Adjust for scrolling
          const leftPosition = rect.left - contentRect.left + contentContainer.scrollLeft;

          // Set new position
          sideBox.style.position = "absolute";  // Change from 'sticky' to 'absolute'
          sideBox.style.top = `${topPosition}px`;
          sideBox.style.left = `${leftPosition}px`;
          sideBox.style.display = 'flex'; // Show the sideBox

          // Save selection data
          const startNodeIndex = textNodes.findIndex((node) => node === range.startContainer);
          const endNodeIndex = textNodes.findIndex((node) => node === range.endContainer);
          const startOffset = range.startOffset;
          const endOffset = range.endOffset;

          const data = {
            text: selectedText,
            startOffset,
            endOffset,
            startNodeIndex,
            endNodeIndex
          };
          localStorage.setItem('commentFor', JSON.stringify(data));
          if(selectedComment){
            setSelectedComment(null)
            setTimeout(()=> applyTempHighlights(), 300)
          } else {
            applyTempHighlights()
          }
        }
      } else {
        console.log('No selection made');
        if (sideBox) {
          sideBox.style.display = 'none';
        }
        if (currentComment?.length < 1 && !sideBox?.contains(e.target)) {
          setContentToShow(docData?.content);
          setSelectedComment(null);
        }
      }
    }
  };




  const applyTempHighlights = () => {
  
    
    const container = document.getElementsByClassName('jodit-wysiwyg')[0];
    const highlight = JSON.parse(localStorage.getItem('commentFor'));
    if (!container || !highlight) return;
    const range = document.createRange();
    const textNodes = getTextNodes(container); // Utility to get all text nodes within the container
    // Set range start and end
    range.setStart(textNodes[highlight.startNodeIndex], highlight.startOffset);

    range.setEnd(textNodes[highlight.endNodeIndex], highlight.endOffset);
    const isSingleNode = highlight.startNodeIndex === highlight.endNodeIndex;

    if (isSingleNode) {
      // Single-node highlight
      const singleHighlightSpan = document.createElement('span');
      singleHighlightSpan.style.backgroundColor = 'orange';
      singleHighlightSpan.id = `comment-${docData?.comments?.length > 0 ? (docData?.comments[docData?.comments?.length - 1]).commentNumber + 1 : 1}`
      const selectedText = range.extractContents();
      singleHighlightSpan.appendChild(selectedText);
      range.insertNode(singleHighlightSpan);
    } else {
      // Multi-node highlight
      const startNode = textNodes[highlight.startNodeIndex];
      const endNode = textNodes[highlight.endNodeIndex];
      // Highlight the text in the starting node
      if (startNode) {
        const startText = startNode.textContent || '';
        const highlightedStartText = startText.substring(highlight.startOffset);
        const remainingStartText = startText.substring(0, highlight.startOffset);
        startNode.textContent = remainingStartText;
        const startHighlightSpan = document.createElement('span');
        startHighlightSpan.style.backgroundColor = 'orange';
        startHighlightSpan.id = `comment-${docData?.comments?.length > 0 ? (docData?.comments[docData?.comments?.length - 1]).commentNumber + 1 : 1}`
        startHighlightSpan.textContent = highlightedStartText;
        startNode.parentNode.insertBefore(startHighlightSpan, startNode.nextSibling);
      }
      // Highlight text in all intermediate nodes
      for (let i = highlight.startNodeIndex + 1; i < highlight.endNodeIndex; i++) {
        const currentNode = textNodes[i];
        if (currentNode) {
          const highlightSpan = document.createElement('span');
          highlightSpan.style.backgroundColor = 'orange';
          highlightSpan.id = `comment-${docData?.comments?.length > 0 ? (docData?.comments[docData?.comments?.length - 1]).commentNumber + 1 : 1}`
          highlightSpan.textContent = currentNode.textContent;
          currentNode.parentNode.replaceChild(highlightSpan, currentNode);
        }
      }

      // Highlight the text in the ending node
      if (endNode) {
        const endText = endNode.textContent || '';
        const highlightedEndText = endText.substring(0, highlight.endOffset);
        const remainingEndText = endText.substring(highlight.endOffset);
        endNode.textContent = remainingEndText;
        const endHighlightSpan = document.createElement('span');
        endHighlightSpan.style.backgroundColor = 'orange';
        endHighlightSpan.id = `comment-${docData?.comments?.length > 0 ? (docData?.comments[docData?.comments.length - 1]).commentNumber + 1 : 1}`
        endHighlightSpan.textContent = highlightedEndText;
        endNode.parentNode.insertBefore(endHighlightSpan, endNode);
      }
    }

    setTimeout(() => {
      setContentToShow(container.innerHTML)
    }, 300)
  };

  const applySavingHighlights = () => {
    const container = document.getElementsByClassName('jodit-wysiwyg')[0];
    const tempCommentsHtml = container?.innerHTML;

    if (!tempCommentsHtml) return '';

    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = tempCommentsHtml;

    // Select all elements with the id `temp-comment-2`
    const tempComments = tempContainer.querySelectorAll(`[id='comment-${docData?.comments?.length > 0 ? (docData?.comments[docData?.comments?.length - 1]).commentNumber + 1 : 1}']`);

    // Loop through the selected elements and update them
    tempComments.forEach((element) => {
      element.style.backgroundColor = 'yellow'; // Set background color
    });

    // Return the updated HTML
    return tempContainer.innerHTML;
  };

  const applyCommentSelection = () => {
    const commentsHtml = docData.content;

    if (!commentsHtml) return '';

    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = commentsHtml;

    // Select all elements with the id `temp-comment-2`
    const commentTags = tempContainer.querySelectorAll(`[id='comment-${selectedComment}']`);
    // Loop through the selected elements and update them
    commentTags.forEach((element) => {
      element.style.backgroundColor = 'orange'; // Set background color
    });

    // Return the updated HTML
    setContentToShow(tempContainer.innerHTML)

  };



  const applyDeleteComment = (commentNumber) => {
    const commentsHtml = docData.content;

    if (!commentsHtml) return '';

    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = commentsHtml;

    // Select all elements with the id `comment-${selectedComment}`
    const commentTags = tempContainer.querySelectorAll(`[id='comment-${commentNumber}']`);

    // Loop through the selected elements
    commentTags.forEach((element) => {
      const parent = element.parentElement; // Get the parent element

      if (parent) {
        // Insert the content of the element into the parent element at the same place
        const fragment = document.createDocumentFragment();
        while (element.firstChild) {
          fragment.appendChild(element.firstChild);
        }
        parent.insertBefore(fragment, element); // Insert the content before the element
        parent.removeChild(element); // Remove the original element
      }
    });
    // setContentToShow(tempContainer.innerHTML)
    // Return the updated HTML
    return tempContainer.innerHTML;
  };



  useEffect(() => {
    if (selectedComment !== null) {
      applyCommentSelection()
    } else {
      setContentToShow(docData?.content)
    }
  }, [selectedComment])

  const getTextNodes = (node) => {
    let textNodes = [];
    const walk = (node) => {
      if (node.nodeType === 3) {  // TEXT_NODE
        textNodes.push(node);
      } else {
        for (let child of node.childNodes) {
          walk(child);
        }
      }
    };
    walk(node);
    return textNodes;
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (currentComment !== "") {
      setLoading(true)
      setSelectedComment(null)
      const updatedContentToSave = applySavingHighlights()
      websocketService.sendMessage("ADD_COMMENT", {
        docId: params.docId,
        comment: currentComment,
        updatedContent: updatedContentToSave,
        commentNumber: docData?.comments?.length > 0 ? (docData?.comments[docData?.comments?.length - 1]).commentNumber + 1 : 1,
      });
      document.getElementById("my_modal_1").close();
      setCurrentComment("")
      setContentToShow(updatedContentToSave)
    }
  };
  const handleReplySubmit = async (e, commentNumber) => {
    e.preventDefault()

    // setLoading(true)
    const replyToAdd = tempReplies.find(reply => reply.forComment === commentNumber)
    websocketService.sendMessage("REPLY_COMMENT", {
      docId: params.docId,
      commentNumber: replyToAdd.forComment,
      reply: replyToAdd.reply
    });

    const updatedReplies = [...tempReplies];
    const replyIndex = updatedReplies.findIndex(obj => obj.forComment == selectedComment);
    updatedReplies[replyIndex] = { ...updatedReplies[replyIndex], reply: "" }
    setTempReplies(updatedReplies)
  };

  const handleCommentCheck = async (commentNumber) => {

    const commentRemovedContent = applyDeleteComment(commentNumber);
    setLoading(true)
    websocketService.sendMessage("RESOLVE_COMMENT", {
      docId: params.docId,
      commentNumber,
      updatedContent: commentRemovedContent,
    });

  };

  const handleCommentClick = (e, commentNumber) => {
    // Get all elements with the specific class
    const elementsWithClass = document.getElementsByClassName("comment-check");

    // Convert HTMLCollection to an array for easier manipulation
    const elementsArray = Array.from(elementsWithClass);

    // Check if the event target lies within any of the elements
    const isTargetInsideClass = elementsArray.some(element => element.contains(e.target));

    if (!isTargetInsideClass) {
      setSelectedComment(commentNumber);
      if (!tempReplies.some(reply => reply.forComment === commentNumber)) {
        setTempReplies([...tempReplies, { forComment: commentNumber, reply: "" }]);
      }
    }
  };
  useEffect(() => {
    if (docData) {
      setContentToShow(docData.content)
      if(docData.comments?.length === 0){
        setShowCommentsBox(false)
      }
      setLoading(false)
    }
  }, [docData])

  const handleDocumentClick = (event) => {

    const commentsContainer = document.getElementById("commentsBox");
    if (commentsContainer && !commentsContainer.contains(event.target)) {
      setSelectedComment(null)

    }

  };

  const updateReply = (commentNumber, reply) => {
    const updatedReplies = [...tempReplies];
    const replyIndex = updatedReplies.findIndex(obj => obj.forComment == commentNumber);
    updatedReplies[replyIndex] = { ...updatedReplies[replyIndex], reply }
    setTempReplies(updatedReplies)
  }

  if (isLoading || loading) return <Loading />;

  return (
    <>
      {/* Open the modal using document.getElementById('ID').showModal() method */}
      <dialog id="my_modal_1" className="modal">
        <div className="modal-box p-y-0">
          <div className="modal-action flex flex-row justify-between items-center py-0 my-0">
            <h3 className="font-semibold text-lg">New Comment</h3>
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button onClick={() => {
                setContentToShow(docData?.content);
                setCurrentComment("");
              }} className=" p-1 bg-slate-200 rounded-full"><IoClose className='text-gray-600 text-2xl' /></button>
            </form>
          </div>
          <form id='comment-form-container' onSubmit={handleSubmitComment} className={`w-full`}>
            <div className='my-2 flex flex-wrap items-end gap-1'>
              <input value={currentComment} onChange={e => setCurrentComment(e.target.value)} placeholder='Write Comment' className='bg-gray-200 text-black-2 p-2 focus:outline-none border-0 w-[100%] px-3 rounded-full' required />
              <div className='flex-row justify-end w-full flex'>
                <button type='submit'
                  className="inline-flex h-6 w-8 items-center justify-center rounded-full bg-blue-700 px-14 py-4 my-1 text-center font-medium text-white hover:bg-opacity-90 "
                >Comment
                </button>

              </div>
            </div>
          </form>

        </div>
      </dialog>

      <div onClick={(e) => handleDocumentClick(e)} className='w-full flex flex-row'>
        <div style={{ display: "none" }} id='sideBox' className=' z-[3] items-center justify-between px-2  sticky h-10  flex-row gap-2 rounded-full shadow-2xl border border-slate-500 shadow-slate-500 w-28 bg-white'>
          <BiCommentAdd onClick={() => {
            document.getElementById('my_modal_1').showModal()
            sideBox.style.display = 'none';
          }} className=' text-2xl text-blue-600 cursor-pointer' />
          <BsEmojiLaughing className=' text-xl text-blue-600 cursor-pointer' />
          <BiCommentEdit className=' text-xl text-blue-600 cursor-pointer' />
        </div>
        <div onMouseUp={handleMouseUp} id='content-container' className='w-full  overflow-y-scroll max-h-[90vh]'>
          <JoditEditor
            ref={editor} // ✅ Assign the ref
            config={{ placeholder: "" }} // ✅ Remove placeholder
            value={contentToShow}
            onBlur={(newContent) => { // ✅ Use onBlur instead of onChange
              if (newContent === contentToShow) return;
              setContentToShow(newContent);
              console.log('calling event');

              websocketService.sendMessage("UPDATE_DOCUMENT", {
                _id: params.docId,
                content: newContent,
              });
            }}
          />
        </div>
        {showCommentsBox &&
          <div className=' w-[28%] mx-2 mt-[2px] overflow-y-scroll max-h-[90vh] bg-[#e9e9e9] p-2 rounded-lg'>
            <div className='flex flex-row justify-between items-center'>
            <h2 className='font-semibold'>All Comments</h2>
            <button onClick={() => {
                setShowCommentsBox(false)
              }} className=" p-1 bg-slate-200 rounded-full"><IoClose className='text-gray-600 text-2xl' /></button>
            </div>
              {docData?.comments?.length === 0 && <div className='w-full h-[80%] flex justify-center items-center'> <p className='text-center text-gray-500'>No comments yet</p></div>}
            <div id='commentsBox' className='cursor-pointer' >
              {docData?.comments?.filter(com => com.resolved === false)?.map((comment, key) => {
                const commentReply = tempReplies.find(reply => reply.forComment === comment.commentNumber)
                return (
                  <div key={key} onClick={(e) => handleCommentClick(e, comment.commentNumber)} className={` w-full ${selectedComment === comment.commentNumber ? "border border-gray-400 bg-white  shadow-xl" : "bg-gray-300"} rounded-lg  p-2 my-2`}>

                    <div className=' mb-3'>
                      <div className=' flex flex-row justify-between '>
                        <div className='flex flex-row gap-2 items-center'>
                          <span className="h-8 w-8 rounded-full">
                            <MdAccountCircle className=' text-3xl ' />
                            {/* <Image
                              width={90}
                              height={90}
                              src={"/images/user/user-01.png"}
                              style={{
                                width: "auto",
                                height: "auto",
                              }}
                              alt="User"
                            /> */}
                          </span>
                          <div className='flex flex-col gap-0'>
                            <span className='font-semibold text-md text-gray-700'>{comment.commentBy}</span>
                            <span className='font-semibild text-gray-500 text-sm mt-[-4px]'>{dayjs(comment.commentDate).format("HH:MM DD MMM")}</span>
                          </div>
                        </div>
                        
                          <div onClick={() => handleCommentCheck(comment.commentNumber)} className={`p-1 cursor-pointer comment-check h-8 w-8  flex justify-center items-center rounded-full hover:bg-gray-300`}>
                            <GiCheckMark className=' text-lg text-blue-600 ' />
                          </div>
                        
                      </div>
                      <p className=' text-black text-lg ms-2 mt-1'>{comment.comment}</p>
                    </div>
                    {comment.replies?.map((reply, index) =>

                      <div key={`${comment.commentNumber}-reply-${index}`} className=' mb-4 ms-4'>
                        <div className='flex flex-row gap-2 items-center'>
                          <span className="h-8 w-8 rounded-full">
                            <MdAccountCircle className=' text-3xl ' />

                          </span>
                          <div className='flex flex-col gap-0'>
                            <span className='font-semibold text-lg text-gray-700'>{reply.replyBy}</span>
                            <span className='font-semibild text-gray-500 text-sm mt-[-4px]'>{dayjs(reply.replyDate).format("HH:mm DD MMM")}</span>
                          </div>
                        </div>
                        <p className=' text-black text-lg ms-2 mt-1'>{reply.reply}</p>
                      </div>

                    )}

                    {(selectedComment === comment.commentNumber || commentReply?.reply?.length > 0) && (
                      <form onSubmit={(e) => handleReplySubmit(e, comment.commentNumber)}>
                        <input value={commentReply?.reply} onChange={(e) => updateReply(comment.commentNumber, e.target.value)} placeholder='Reply' className='bg-white text-black-2 px-3 py-1 focus:outline-none w-[100%] rounded-full border border-gray-700' required />
                        {commentReply?.reply?.length > 0 && (
                          <div className='flex-row justify-end w-full flex mt-1'>
                            <button type='submit'
                              className={`inline-flex cursor-pointer h-6 w-8 items-center justify-center rounded-full bg-blue-600 px-10 py-4 my-1 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10`}
                            >Reply
                            </button>
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                )
              })}
              <div >
              <h1 className='text-md'>Resolved Comments</h1>
              {docData?.comments?.filter(com => com.resolved === true)?.map((comment, key) => {
                const commentReply = tempReplies.find(reply => reply.forComment === comment.commentNumber)
                return (
                  <div key={key} onClick={(e) => handleCommentClick(e, comment.commentNumber)} className={` w-full ${selectedComment === comment.commentNumber ? "border border-gray-500 bg-white  shadow-xl" : "bg-gray-300"} rounded-lg  p-2 my-2`}>

                    <div className=' mb-3'>
                      <div className=' flex flex-row justify-between '>
                        <div className='flex flex-row gap-2 items-center'>
                          <span className="h-8 w-8 rounded-full">
                            <MdAccountCircle className=' text-3xl ' />
                          </span>
                          <div className='flex flex-col gap-0'>
                            <span className='font-semibold text-md text-gray-700'>{comment.commentBy}</span>
                            <span className='font-semibild text-gray-500 text-sm mt-[-4px]'>{dayjs(comment.commentDate).format("HH:MM DD MMM")}</span>
                          </div>
                        </div>
                        
                          {/* <div onClick={() => handleCommentCheck(comment.commentNumber)} className={`p-1 cursor-pointer comment-check h-8 w-8  flex justify-center items-center rounded-full hover:bg-gray-300`}>
                            <GiCheckMark className=' text-lg text-blue-600 ' />
                          </div> */}
                        
                      </div>
                      <p className=' text-black text-lg ms-2 mt-1'>{comment.comment}</p>
                    </div>
                    {comment.replies?.map((reply, index) =>

                      <div key={`${comment.commentNumber}-reply-${index}`} className=' mb-4 ms-4'>
                        <div className='flex flex-row gap-2 items-center'>
                          <span className="h-8 w-8 rounded-full">
                            <MdAccountCircle className=' text-3xl ' />

                          </span>
                          <div className='flex flex-col gap-0'>
                            <span className='font-semibold text-lg text-gray-700'>{reply.replyBy}</span>
                            <span className='font-semibild text-gray-500 text-sm mt-[-4px]'>{dayjs(reply.replyDate).format("HH:mm DD MMM")}</span>
                          </div>
                        </div>
                        <p className=' text-black text-lg ms-2 mt-1'>{reply.reply}</p>
                      </div>

                    )}

                    {(selectedComment === comment.commentNumber || commentReply?.reply?.length > 0) && (
                      <form onSubmit={(e) => handleReplySubmit(e, comment.commentNumber)}>
                        <input value={commentReply?.reply} onChange={(e) => updateReply(comment.commentNumber, e.target.value)} placeholder='Reply' className='bg-white text-black-2 px-3 py-1 focus:outline-none w-[100%] rounded-full border border-gray-700' required />
                        {commentReply?.reply?.length > 0 && (
                          <div className='flex-row justify-end w-full flex mt-1'>
                            <button type='submit'
                              className={`inline-flex cursor-pointer h-6 w-8 items-center justify-center rounded-full bg-blue-600 px-10 py-4 my-1 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10`}
                            >Reply
                            </button>
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                )
              })}
            </div>
            </div>
            
          </div>}

      </div>
    </>
  );
}
