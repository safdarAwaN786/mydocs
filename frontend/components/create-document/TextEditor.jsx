"use client";
import React, { useEffect, useState, useRef } from 'react';
import JoditEditor from 'jodit-react';
import websocketService from "../../webSocket/websocketService";
import { useAtom, useStore } from 'jotai';
import { clickedComment, currentDoc, showComments, tocHeadings, wholeLoading } from '@/store/atoms';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { fetchDocument, WS_URL } from '@/API-calls/Documents/docsNormal';
import Loading from '../layout/Loading';
import { BiCommentAdd } from "react-icons/bi";
import { BsEmojiLaughing } from "react-icons/bs";
import { BiCommentEdit } from "react-icons/bi";
import levenshtein from 'fast-levenshtein';
import TableOfContents from '../text-editor/TableOfContents';
import CommentsList from '../text-editor/CommentsList';
import { applyCommentSelection, applyTempHighlight, getCommentsToRemove, refreshTOC, removeTempHighlight, restoreCursorPosition, saveCursorPosition, scrollToActualComment, tempHighlighted } from '@/functions/text-editorFns';
import AddComment from '../text-editor/AddComment';

export default function TextEditor() {
  const editor = useRef(null); // ✅ Create a ref for the editor
  const [docData, setDocData] = useAtom(currentDoc);
  const params = useParams();
  const router = useRouter();
  const sideBoxRef = useRef(null);
  const [loading, setLoading] = useAtom(wholeLoading);
  const [selectedComment, setSelectedComment] = useAtom(clickedComment)
  const [showCommentsBox, setShowCommentsBox] = useAtom(showComments)
  // Store the latest docData in a ref to avoid re-renders
  const docDataRef = useRef(docData);
  const [headings, setHeadings] = useAtom(tocHeadings)
  useEffect(() => {
    const container = document.querySelector(".jodit-wysiwyg");
    if (!docData) {
      mutate(params.docId);
    } else {
      setLoading(false)
      container.innerHTML = docData.content
    }
    websocketService.connect(WS_URL, setDocData);
    return () => {
      websocketService.disconnect()
    };
  }, []);

  const updateTOC = () => {
    const tocData = refreshTOC()
    setHeadings(tocData)
  }

  const { mutate, isLoading } = useMutation({
    mutationFn: fetchDocument,
    onSuccess: (data) => {
      if (!data) {
        router.replace("/docs");
        return;
      }
      const container = document.querySelector(".jodit-wysiwyg");
      container.innerHTML = data.content
      setDocData(data);
    },
    onError: () => {
      router.replace("/docs");
    },
  });


  useEffect(() => {
    const container = document.querySelector(".jodit-wysiwyg");
    if (docData) {
      const difference = levenshtein.get(docData?.content || "", container.innerHTML);
      updateTOC();
      docDataRef.current = docData;
      if (difference > 60) {

        // Restore the cursor position after updating the content
        const cursorPosition = saveCursorPosition();
        container.innerHTML = docData?.content
        if (cursorPosition) {
          restoreCursorPosition(cursorPosition);
        }
      }
      if (loading) {
        setLoading(false)
      }
    } else {
      mutate(params.docId);
    }
  }, [docData])


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


  let savedSelection = null
  const handleMouseUp = (e) => {
    console.log('handlemouseup');
    const sideBox = sideBoxRef.current;
    const selection = window.getSelection();
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
        // Check if the click happens inside a comment element
        const commentElement = e.target.closest(".commentSpan");

        if (commentElement) {
          // Extract comment number
          const commentClass = [...commentElement.classList].find(cls => cls.startsWith("comment-"));

          if (commentClass) {
            const commentNumber = commentClass.split("-")[1];
            console.log(`Clicked inside comment number: ${commentNumber}`);
            
            // Handle logic when clicking inside a comment
            setSelectedComment(commentNumber);
            setShowCommentsBox(true);
            scrollToActualComment(commentNumber)
            return;
          }
        }


        removeTempHighlight(docData, selectedComment, params.docId)
        if (sideBox) {
          sideBox.style.display = "none";

        }
        if (!sideBox?.contains(e.target) && selectedComment !== null) {
          if (selectedComment !== null) {
            setSelectedComment(null);
          }
        }
      }
    } else {
      savedSelection = null
    }
  };

  useEffect(() => {
    if (selectedComment !== null) {
      applyCommentSelection(selectedComment)
    } else {
      const container = document.querySelector(".jodit-wysiwyg");
      const cursorPosition = saveCursorPosition();
      container.innerHTML = docData?.content
      if (cursorPosition) {
        restoreCursorPosition(cursorPosition);
      }
    }
  }, [selectedComment])


  const handleDocumentClick = (event) => {
    const commentsContainer = document.getElementById("commentsBox");
    if (commentsContainer && !commentsContainer.contains(event.target) && selectedComment !== null) {
      setSelectedComment(null)
    }
  };


  const store = useStore()


  return (
    <>
      {(isLoading || loading) && (
        <Loading />
      )}
      <AddComment docId={params.docId} />


      <div onClick={(e) => handleDocumentClick(e)} className='w-full flex flex-row'>
        <TableOfContents />
        <div ref={sideBoxRef} style={{ display: "none" }} id='sideBox' className=' z-[2] items-center justify-between px-2  h-10  flex-row gap-2 rounded-full shadow-2xl border border-slate-500 shadow-slate-500 w-28 bg-white'>
          <BiCommentAdd onClick={() => {
            const sideBox = sideBoxRef.current;
            const tempCommentNumber = docData?.comments?.length > 0
              ? (docData?.comments[docData?.comments.length - 1]).commentNumber + 1
              : 1
            applyTempHighlight(savedSelection, tempCommentNumber)
            savedSelection = null
            document.getElementById('my_modal_1').showModal()
            sideBox.style.display = "none"
          }} className=' text-2xl text-blue-600 cursor-pointer' />
          <BsEmojiLaughing className=' text-xl text-blue-600 cursor-pointer' />
          <BiCommentEdit className=' text-xl text-blue-600 cursor-pointer' />
        </div>
        <div onMouseUp={handleMouseUp} id="content-container" className="w-full overflow-y-scroll max-h-[90vh]">
          {React.useMemo(() => (
            <JoditEditor
              ref={editor} // ✅ Assign the ref
              config={{
                placeholder: "",
                uploader: {
                  insertImageAsBase64URI: true,
                },
                readonly: false,
                enter: "p",
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
              }}
              value={docData?.content || ""}
              onChange={(newContent) => {
                const currentDocData = docDataRef.current; // Get the latest docData from the ref
                const difference = levenshtein.get(currentDocData?.content || "", newContent);

                if (difference >= 10) {  // Check if at least 50 character changes
                  if (!tempHighlighted) {
                    console.log(docData);
                    const sideBox = sideBoxRef.current;
                    sideBox.style.display = "none";
                    const commentsToRemove = getCommentsToRemove(store)
                    websocketService.sendMessage("UPDATE_DOCUMENT", {
                      _id: params.docId,
                      content: newContent,
                      commentsToRemove
                    });
                  }
                }
              }}
            />
          ), [])} {/* Add dependencies to memoize */}
        </div>

        <CommentsList docId={params.docId} websocketService={websocketService} />
      </div>
    </>
  );
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


