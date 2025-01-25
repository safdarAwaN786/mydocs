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
import { TfiMenuAlt } from "react-icons/tfi";
import { BsArrowLeft } from "react-icons/bs";
import levenshtein from 'fast-levenshtein';

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
  const [headings, setHeadings] = useState([]);
  const [showTOC, setShowTOC] = useState(false);

  const updateTOC = () => {
    const container = document.querySelector(".jodit-wysiwyg"); // Jodit's content area
    if (!container) return;

    const headingElements = container.querySelectorAll("h1, h2, h3");

    const tocData = [];
    let lastH1 = null, lastH2 = null;

    headingElements.forEach((el, index) => {
      const level = parseInt(el.tagName.replace("H", ""), 10);
      if (el.innerText?.length > 0) {

        const item = {
          id: `heading-${index}`,
          text: el.innerText,
          level: level,
          element: el,
          children: [],
        };

        el.id = item.id; // Set ID for linking

        if (level === 1) {
          tocData.push(item);
          lastH1 = item;
          lastH2 = null;
        } else if (level === 2) {
          if (lastH1) {
            lastH1.children.push(item);
          } else {
            tocData.push(item); // Add at top-level if no H1 exists
          }
          lastH2 = item;
        } else if (level === 3) {
          if (lastH2) {
            lastH2.children.push(item);
          } else if (lastH1) {
            lastH1.children.push(item);
          } else {
            tocData.push(item); // Add at top-level if no H1 or H2 exists
          }
        }
      }
    });
    setContentToShow(container.innerHTML)
    setHeadings(tocData)
  }

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
      toolbarButton.style.display = 'none'
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
      const container = document.querySelector(".jodit-wysiwyg");
      const difference = levenshtein.get(contentToShow, container.innerHTML);
      if (difference >= 200) {
        setContentToShow(newContent);
        updateTOC();
      }
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
    } else {
      updateTOC()
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

  let tempHighlighted = false;

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
      span.classList.add('commentSpan');

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
        span.classList.add('commentSpan');
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
          span.classList.add('commentSpan');
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
        span.classList.add('commentSpan');
        span.textContent = highlightedEndText;
        endNode.parentNode.insertBefore(span, endNode);
        newlyAddedSpans.push(span);
      }
    }
    // Clear saved selection after applying highlights
    savedSelection = null;
    tempHighlighted = true;
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
    tempHighlighted = false
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
    const allCommentTags = tempContainer.querySelectorAll(`span.commentSpan`);
    allCommentTags.forEach((element) => {
      element.style.backgroundColor = 'yellow'; // Set background color
    });
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
    tempHighlighted = true;
    const container = document.getElementsByClassName('jodit-wysiwyg')[0];
    const commentsHtml = container?.innerHTML;

    if (!commentsHtml) return '';
    const commentClass = `comment-${selectedComment}`;

    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = commentsHtml;
    const allCommentTags = tempContainer.querySelectorAll(`span.commentSpan`);
    allCommentTags.forEach((element) => {
      element.style.backgroundColor = 'yellow'; // Set background color
    });
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


  const TOCItem = ({ item }) => (
    <li className='pt-3' >
      <a className={`bg-gray-200 p-1 text-md  rounded-md ${item.level === 1 ? 'font-extrabold' : ' font-semibold'}`} href={`#${item.id}`}
        onClick={(e) => {
          e.preventDefault();

          const scrollableContainer = document.getElementById("content-container");
          const targetElement = document.getElementById(item.id); // Get the actual element by ID

          if (scrollableContainer && targetElement) {
            const containerRect = scrollableContainer.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();

            // Calculate scroll position relative to the container
            const scrollPosition =
              targetRect.top - containerRect.top + scrollableContainer.scrollTop;

            scrollableContainer.scrollTo({
              top: scrollPosition,
              behavior: "smooth",
            });
          }
        }}
      >
        {item.text}
      </a>
      {item.children.length > 0 && (
        <ul className='  font-semibold  text-md  list-disc ml-3'>
          {item.children.map((subItem) => (
            <TOCItem key={subItem.id} item={subItem} />
          ))}
        </ul>
      )}
    </li>
  );



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
        <div onClick={() => setShowTOC(true)} className='fixed top-[150px] left-2 z-20 rounded-full shadow-md flex justify-center items-center shadow-slate-300 cursor-pointer bg-slate-100 h-10 w-10'>
          <TfiMenuAlt className='text-xl' />
        </div>
        {showTOC && (
          <div className=' fixed top-[140px] overflow-y-scroll left-2 z-20 p-3 shadow-lg shadow-gray-300 bg-gray-100 rounded-md bottom-4 w-[350px]'>
            <div className='w-full flex justify-start mb-2'><BsArrowLeft onClick={() => setShowTOC(false)} className=' text-2xl cursor-pointer' /></div>
            <p className='text-xl font-bold'>Table of Contents</p>
            {headings?.length > 0 ? (
              <ul className='list-decimal ml-5  '>
                {headings?.map((h1) => (
                  <TOCItem key={h1.id} item={h1} />
                ))}
              </ul>
            ) : <div className='h-full flex w-full justify-center items-center'><span>No any Table of Content detected</span></div>}

          </div>
        )}
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
        <div onMouseUp={handleMouseUp} id='content-container' className='w-full   overflow-y-scroll max-h-[90vh]'>
          <JoditEditor
            ref={editor} // ✅ Assign the ref
            config={{
              placeholder: "",
              uploader: {
                insertImageAsBase64URI: true,
              },
              readonly: false,
              enter: "br",
              events: {
                afterInit: (editor) => {
                  editor.editorDocument.head.insertAdjacentHTML(
                    "beforeend",
                    `<style>
                      h1 { font-size: 2.25rem; font-weight: bold; } 
                      h2 { font-size: 1.875rem; font-weight: bold; } 
                      h3 { font-size: 1.5rem; font-weight: bold; } 
                    </style>`
                  );
                },
              },

            }} // ✅ Remove placeholder
            value={contentToShow || ""}
            onChange={(newContent) => {
              const difference = levenshtein.get(contentToShow, newContent);

              if (difference >= 100) {  // Check if at least 30 character changes
                console.log(`Content changed by ${difference} characters`);
                console.log('temphighlighted', tempHighlighted);

                setTimeout(() => {
                  if (!tempHighlighted) {
                    setContentToShow(newContent);
                    websocketService.sendMessage("UPDATE_DOCUMENT", {
                      _id: params.docId,
                      content: newContent,
                    });

                    updateTOC();
                  }
                }, 400)
              }
            }}

            onBlur={(newContent) => {
              const difference = levenshtein.get(contentToShow, newContent);

              if (difference >= 100) {  // Check if at least 30 character changes
                console.log(`Content changed by ${difference} characters`);
                console.log('temphighlighted', tempHighlighted);

                setTimeout(() => {
                  if (!tempHighlighted) {
                    setContentToShow(newContent);
                    websocketService.sendMessage("UPDATE_DOCUMENT", {
                      _id: params.docId,
                      content: newContent,
                    });

                    updateTOC();
                  }
                }, 400)
              }
            }}
          />
        </div>
        {showCommentsBox &&
          <div className=' w-[28%] mx-2 mt-[2px] overflow-y-scroll max-h-[90vh] bg-[#e9e9e9] p-2 rounded-lg'>
            <div className='flex flex-row justify-between items-center'>
              <p className='font-semibold'>All Comments</p>
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
                <p className='text-md'>Resolved Comments</p>
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


