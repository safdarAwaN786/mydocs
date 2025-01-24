"use client";
import React, { useEffect, useState, useRef } from 'react';
import JoditEditor from 'jodit-react';
import websocketService from "../../webSocket/websocketService";
import { useAtom } from 'jotai';
import { currentDoc, showComments } from '@/store/atoms';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { fetchDocument, WS_URL } from '@/API-calls/Documents/docsNormal';
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
  const sideBoxRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [contentToShow, setContentToShow] = useState(null)
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
    },
    onError: () => {
      router.replace("/docs");
    },
  });

  useEffect(() => {
    const hideButton = () => {
      const toolbarButton = document.querySelector('.jodit-toolbar-button_about');
      if (toolbarButton) {
        console.log('Setting display none to icon');
        toolbarButton.style.display = 'none';
        console.log(toolbarButton);
      } else {
        console.log('Button not found, retrying...');
        setTimeout(hideButton, 500); // Retry after 500ms if button not found
      }
    };

    // Observe mutations in the toolbar area
    const observer = new MutationObserver(hideButton);
    const toolbar = document.querySelector('.jodit-toolbar');
    if (toolbar) {
      observer.observe(toolbar, { childList: true, subtree: true });
    }

    hideButton(); // Initial attempt

    return () => observer.disconnect(); // Cleanup observer on unmount
  }, []);



  useEffect(() => {
    const toolbarButton = document.querySelector('.jodit-toolbar-button_about');
    setTimeout(() => {
      console.log('setting none to icon');

      toolbarButton.style.display = 'none'
      console.log(toolbarButton);

    }, 2000)
    if (toolbarButton) {
      toolbarButton.style.display = 'none'; // Hide the element
    }
    if (!docData) {
      mutate(params.docId);
    } else {
      setLoading(false)
      setContentToShow(docData.content)
    }
    websocketService.connect(WS_URL, setDocData);
    return () => websocketService.disconnect();
  }, []);

  useEffect(() => {
    if (docData) {
      setContentToShow(docData.content)
      if (docData.comments?.length === 0) {
        setShowCommentsBox(false)
      }
      setLoading(false)
    }
  }, [docData])

  useEffect(() => {
    if (contentToShow === null) {
      mutate(params.docId);
    }

  }, [contentToShow])

  let savedSelection = null; // Store selection globally
  useEffect(() => {
    const handleScroll = () => {
      const sideBox = sideBoxRef.current;
      const selection = window.getSelection();
      if (!sideBox || !selection.rangeCount) return;

      const range = selection.getRangeAt(0); // Get the current selection range
      const rect = range.getBoundingClientRect();

      if (!rect || rect.top === 0 || rect.bottom === 0) return;

      // Adjust the sideBox position based on the selection
      sideBox.style.position = "fixed"; // Keeps it in the viewport
      sideBox.style.top = `${rect.bottom + 5}px`; // 5px below the selected text
      sideBox.style.left = `${rect.left}px`; // Align to the selection's left edge
    };

    document.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, []);



  const handleMouseUp = (e) => {
    const sideBox = sideBoxRef.current;
    const container = document.getElementsByClassName('jodit-wysiwyg')[0];
    const selection = window.getSelection();
    const textNodes = getTextNodes(container);

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();

      if (selectedText.length > 0 && selectedComment === null) {
        console.log('selection made');
        savedSelection = range; // Save selection globally
        // Get bounding rectangle of selection
        const rect = range.getBoundingClientRect();

        sideBox.style.position = "fixed"; // Fixed to viewport
        sideBox.style.top = `${rect.bottom + 5}px`; // 5px below selection
        sideBox.style.left = `${rect.left}px`; // Align to selection start
        sideBox.style.display = 'flex'
        sideBox.classList.remove('hidden')


        if (selectedComment) {
          setSelectedComment(null)
        }

      } else {
        console.log('No selection made');

        removeTempHighlight()

        if (sideBox) {
          sideBox.style.display = "none";
          setContentToShow(docData?.content)
        }
        if (currentComment?.length < 1 && !sideBox?.contains(e.target)) {
          setSelectedComment(null);
        }
      }
    } else {
      savedSelection = null
    }
  };



  const applyTempHighlight = () => {
    if (!savedSelection) {
      console.log('No saved selection to highlight.');
      return;
    }

    const container = document.getElementsByClassName('jodit-wysiwyg')[0];
    if (!container) return;

    const textNodes = getTextNodes(container);
    const selection = window.getSelection();

    // Restore saved selection
    selection.removeAllRanges();
    selection.addRange(savedSelection);

    const range = savedSelection;
    const selectedText = range.toString();
    if (!selectedText) return;

    const startNodeIndex = textNodes.findIndex((node) => node === range.startContainer);
    const endNodeIndex = textNodes.findIndex((node) => node === range.endContainer);
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    if (startNodeIndex === -1 || endNodeIndex === -1) return;

    const commentClass = `comment-${docData?.comments?.length > 0
      ? (docData?.comments[docData?.comments.length - 1]).commentNumber + 1
      : 1}`;

    let newlyAddedSpans = [];

    if (startNodeIndex === endNodeIndex) {
      const span = document.createElement('span');
      span.style.backgroundColor = 'orange';
      span.classList.add(commentClass);
      span.textContent = selectedText;

      range.deleteContents();
      range.insertNode(span);
      newlyAddedSpans.push(span);
    } else {
      const startNode = textNodes[startNodeIndex];
      const endNode = textNodes[endNodeIndex];

      if (startNode) {
        const startText = startNode.textContent || '';
        const highlightedStartText = startText.substring(startOffset);
        startNode.textContent = startText.substring(0, startOffset);

        const span = document.createElement('span');
        span.style.backgroundColor = 'orange';
        span.classList.add(commentClass);
        span.textContent = highlightedStartText;
        startNode.parentNode.insertBefore(span, startNode.nextSibling);
        newlyAddedSpans.push(span);
      }

      for (let i = startNodeIndex + 1; i < endNodeIndex; i++) {
        const node = textNodes[i];
        if (node) {
          const span = document.createElement('span');
          span.style.backgroundColor = 'orange';
          span.classList.add(commentClass);
          span.textContent = node.textContent;
          node.parentNode.replaceChild(span, node);
          newlyAddedSpans.push(span);
        }
      }

      if (endNode) {
        const endText = endNode.textContent || '';
        const highlightedEndText = endText.substring(0, endOffset);
        endNode.textContent = endText.substring(endOffset);

        const span = document.createElement('span');
        span.style.backgroundColor = 'orange';
        span.classList.add(commentClass);
        span.textContent = highlightedEndText;
        endNode.parentNode.insertBefore(span, endNode);
        newlyAddedSpans.push(span);
      }
    }
    // Clear saved selection after applying highlights
    savedSelection = null;
  };



  const removeTempHighlight = () => {
    const container = document.getElementsByClassName('jodit-wysiwyg')[0];
    if (!container) return;
    const commentClass = `comment-${docData?.comments?.length > 0
      ? (docData?.comments[docData?.comments.length - 1]).commentNumber + 1
      : 1}`;
    const highlightedSpans = container.querySelectorAll(`span.${commentClass}`);

    highlightedSpans.forEach((span) => {
      const parent = span.parentNode;
      if (!parent) return;

      // Replace the span with its text content
      const textNode = document.createTextNode(span.textContent);
      parent.replaceChild(textNode, span);

      // Normalize to merge adjacent text nodes
      parent.normalize();
    });
    if (selectedComment === null && (Math.abs(contentToShow.length - docData?.content.length) > 100)) {
      websocketService.sendMessage("UPDATE_DOCUMENT", {
        _id: params.docId,
        content: container.innerHTML,
      });
    }
    console.log('All highlights removed.');
  };


  const applySavingHighlights = () => {
    const container = document.getElementsByClassName('jodit-wysiwyg')[0];
    const tempCommentsHtml = container?.innerHTML;

    if (!tempCommentsHtml) return '';
    const commentClass = `comment-${docData?.comments?.length > 0
      ? (docData?.comments[docData?.comments.length - 1]).commentNumber + 1
      : 1}`;
    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = tempCommentsHtml;

    // Select all elements with the id `temp-comment-2`
    const tempComments = tempContainer.querySelectorAll(`span.${commentClass}`);

    // Loop through the selected elements and update them
    tempComments.forEach((element) => {
      element.style.backgroundColor = 'yellow'; // Set background color
    });

    // Return the updated HTML
    return tempContainer.innerHTML;
  };

  const applyCommentSelection = () => {
    const container = document.getElementsByClassName('jodit-wysiwyg')[0];
    const commentsHtml = container?.innerHTML;

    if (!commentsHtml) return '';
    const commentClass = `comment-${selectedComment}`;

    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = commentsHtml;

    // Select all elements with the id `temp-comment-2`
    const commentTags = tempContainer.querySelectorAll(`span.${commentClass}`);
    // Loop through the selected elements and update them
    commentTags.forEach((element) => {
      element.style.backgroundColor = 'orange'; // Set background color
    });

    // Return the updated HTML
    setContentToShow(tempContainer.innerHTML)

  };



  const applyDeleteComment = (commentNumber) => {
    const container = document.getElementsByClassName('jodit-wysiwyg')[0];
    const commentsHtml = container?.innerHTML;

    if (!commentsHtml) return '';

    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = commentsHtml;

    // Select all elements with the id `comment-${selectedComment}`
    const commentTags = tempContainer.querySelectorAll(`span.comment-${commentNumber}`);

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
      setLoading(true)
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
    setLoading(true)
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


  return (
    <>
      {/* Open the modal using document.getElementById('ID').showModal() method */}
      {(isLoading || loading) && (
        <Loading />
      )}

      <dialog id="my_modal_1" className="modal">
        <div className="modal-box p-y-0">
          <div className="modal-action flex flex-row justify-between items-center py-0 my-0">
            <h3 className="font-semibold text-lg">New Comment</h3>
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button onClick={() => {
                console.log(docData);
                removeTempHighlight()
                setContentToShow(docData?.content);
                setCurrentComment("");
              }} className=" p-1 bg-slate-200 rounded-full"><IoClose className='text-gray-600 text-2xl' /></button>
            </form>
          </div>
          <form id='comment-form-container' onSubmit={handleSubmitComment} className={`w-full`}>
            <div className='my-2 flex flex-wrap items-end gap-1'>
              <input value={currentComment} onChange={e => {
                const container = document.getElementsByClassName('jodit-wysiwyg')[0];
                setContentToShow(container.innerHTML)
                setCurrentComment(e.target.value)
              }} placeholder='Write Comment' className='bg-gray-200 text-black-2 p-2 focus:outline-none border-0 w-[100%] px-3 rounded-full' required />
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
        <div ref={sideBoxRef} style={{ display: "none" }} id='sideBox' className=' z-[2] items-center justify-between px-2  h-10  flex-row gap-2 rounded-full shadow-2xl border border-slate-500 shadow-slate-500 w-28 bg-white'>
          <BiCommentAdd onClick={() => {
            const sideBox = sideBoxRef.current;
            applyTempHighlight()
            // applyTempHighlights()
            document.getElementById('my_modal_1').showModal()
            sideBox.style.display = "none"
          }} className=' text-2xl text-blue-600 cursor-pointer' />
          <BsEmojiLaughing className=' text-xl text-blue-600 cursor-pointer' />
          <BiCommentEdit className=' text-xl text-blue-600 cursor-pointer' />
        </div>
        <div onMouseUp={handleMouseUp} id='content-container' className='w-full  overflow-y-scroll max-h-[90vh]'>
          <JoditEditor
            ref={editor} // ✅ Assign the ref
            config={{
              placeholder: "",
              uploader: {
                url: 'https://xdsoft.net/jodit/finder/?action=fileUpload'
              },
              readonly: false,
              license: "",
              enter: "br",
              filebrowser: {
                ajax: {
                  url: 'https://xdsoft.net/jodit/finder/'
                },
                height: 580,
              }
            }} // ✅ Remove placeholder
            value={contentToShow || ""}

            onChange={(newContent) => { // ✅ Use onBlur instead of onChange

              console.log(Math.abs(newContent.length - contentToShow.length))
              if (Math.abs(newContent.length - contentToShow.length) > 100) {

                console.log('calling event');
                setContentToShow(newContent);
                websocketService.sendMessage("UPDATE_DOCUMENT", {
                  _id: params.docId,
                  content: newContent,
                });

              }
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
