"use client";
import React, { useEffect, useState, useRef } from 'react';
import JoditEditor, { Jodit } from 'jodit-react';
import websocketService from "../../webSocket/websocketService";
import { useAtom, useStore } from 'jotai';
import { allPages, clickedComment, currentDoc, showComments, tocHeadings, wholeLoading } from '@/store/atoms';
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
import { applyCommentSelection, applySavingHighlights, applyTempHighlight, getCommentsToRemove, handlePageOverflow, refreshTOC, removeTempHighlight, restoreCursorPosition, saveCursorPosition, scrollToActualComment, tempHighlighted } from '@/functions/text-editorFns';
import AddComment from '../text-editor/AddComment';

export default function TextEditor() {
  const editor = useRef(null); // ✅ Create a ref for the editor
  const [docData, setDocData] = useAtom(currentDoc);
  const params = useParams();
  const router = useRouter();
  const sideBoxRef = useRef(null);
  const [pages, setPages] = useAtom(allPages)
  const [loading, setLoading] = useAtom(wholeLoading);
  const [selectedComment, setSelectedComment] = useAtom(clickedComment)
  const [showCommentsBox, setShowCommentsBox] = useAtom(showComments)
  const [cursorPosition, setCursorPosition] = useState(null)
  // Store the latest docData in a ref to avoid re-renders
  const docDataRef = useRef(docData);
  const [headings, setHeadings] = useAtom(tocHeadings)
  useEffect(() => {
    const container = document.querySelector(".jodit-wysiwyg");
    if (!docData) {
      mutate(params.docId);
    } else {
      setLoading(false)
      const contentHTML = docData.content.map((page, i) =>
        `<div id="page-${page.pageNumber}" class="docPage">
      <div class="page-number">${i + 1}</div>
    ${page.content || ""}
           
           
         </div>`
      ).join("");
      editor.current.value = contentHTML
      // container.innerHTML = contentHTML
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
      // Build the full HTML content with non-editable page numbers
      let contentHTML = data.content.map((page, i) =>
        `<div id="page-${page.pageNumber}" class="docPage">
      <div class="page-number">${i + 1}</div>
    ${page.content || ""}
     
    
   </div>`
      ).join(""); // Join all strings together
      const container = document.querySelector(".jodit-wysiwyg");
      editor.current.value = contentHTML
      // if (container) container.innerHTML = contentHTML;
      setDocData(data);
    },
    onError: () => {
      router.replace("/docs");
    },
  });


  useEffect(() => {
    const container = document.querySelector(".jodit-wysiwyg");
    if (!docData || !docData.content || !container) return; // Ensure everything is loaded
    console.log(docData);

    // Build the full HTML content
    const contentHTML = docData.content.map((page, i) =>
      `<div id="page-${page.pageNumber}" class="docPage">
     <div class="page-number">${i + 1}</div>
    ${page.content}
        

       </div>`
    ).join("");
    // Restore cursor position before updating


    // Update the editor content safely
    // editor.current.value = contentHTML
    editor.current.setEditorValue(contentHTML)
    // container.innerHTML = contentHTML;
    if (cursorPosition) {
      restoreCursorPosition(cursorPosition);
    }

    updateTOC();
    docDataRef.current = docData;

    // Ensure correct page numbers
    const pageNums = docData.content.map(page => page.pageNumber);
    setPages(pageNums);

    if (loading) {
      setLoading(false);
    }
  }, [docData]);


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
    console.log('handleMouseUp');
    const sideBox = sideBoxRef.current;
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      const pageElement = e.target.closest('.docPage'); // Find closest page container

      if (selectedText.length > 0 && selectedComment === null) {
        console.log('selection made');
        savedSelection = range; // Save selection globall

        // Get bounding rectangle of selection
        const rect = range.getBoundingClientRect();
        sideBox.style.position = "fixed"; // Fixed to viewport
        sideBox.style.top = `${rect.bottom + 5}px`; // 5px below selection
        sideBox.style.left = `${rect.left}px`; // Align to selection start
        sideBox.style.display = 'flex';
        sideBox.classList.remove('hidden');

        if (selectedComment) {
          setSelectedComment(null);
        }
      } else {
        // Handle clicking inside a comment element
        const commentElement = e.target.closest(".commentSpan");
        if (commentElement) {
          // Extract comment number
          const commentClass = [...commentElement.classList].find(cls => cls.startsWith("comment-"));
          const commentNumber = commentClass ? commentClass.split("-")[1] : null;
          console.log(`Clicked inside comment number: ${commentNumber}`);

          // Handle logic when clicking inside a comment
          setSelectedComment(commentNumber);
          setShowCommentsBox(true);
          scrollToActualComment(commentNumber);
          return;
        }

        // Remove temporary highlight if clicked outside
        removeTempHighlight(docData, selectedComment, params.docId);
        if (sideBox) sideBox.style.display = "none";

        if (!sideBox?.contains(e.target) && selectedComment !== null) {
          if (selectedComment !== null) {
            setSelectedComment(null);
          }
        }
      }
    } else {
      savedSelection = null;
    }
  };


  useEffect(() => {
    if (selectedComment !== null) {
      applyCommentSelection(selectedComment)
    } else {
      setTimeout(() => {

        if (docData) {
          const updatedPages = applySavingHighlights(docData);

          // Update the editor pages
          updatedPages.forEach(({ pageNumber, content }) => {
            const pageElement = document.getElementById(`page-${pageNumber}`);
            if (pageElement) {
              pageElement.innerHTML = content;
            }
          });
          if (cursorPosition) {
            restoreCursorPosition(cursorPosition);
          }
        }
      }, 100)
    }
  }, [selectedComment])


  const handleDocumentClick = (event) => {
    const commentsContainer = document.getElementById("commentsBox");
    if (commentsContainer && !commentsContainer.contains(event.target) && selectedComment !== null) {
      setSelectedComment(null)
    }
  };


  const store = useStore()
  const editorConfigs = {
    placeholder: "",
    uploader: {
      insertImageAsBase64URI: true,
    },
    extraIcons: {
      addPage: `<svg fill="#000000" width="256px" height="256px" version="1.1" viewBox="144 144 512 512" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="m567.93 630.91h-335.87c-5.5664 0-10.906-2.2109-14.844-6.1484s-6.1484-9.2734-6.1484-14.844v-419.84c0-5.5664 2.2109-10.906 6.1484-14.844s9.2773-6.1484 14.844-6.1484h209.92c5.5781-0.03125 10.941 2.1562 14.902 6.0859l125.95 125.95c3.9297 3.9609 6.1211 9.3242 6.0859 14.906v293.89c0 5.5703-2.2109 10.906-6.1484 14.844-3.9336 3.9375-9.2734 6.1484-14.844 6.1484zm-314.88-41.984h293.89v-264.29l-113.57-113.57h-180.32z"></path> <path d="m567.93 337.02h-125.95c-5.5703 0-10.91-2.2109-14.844-6.1484-3.9375-3.9375-6.1484-9.2773-6.1484-14.844v-125.95c0-7.5 4-14.43 10.496-18.18 6.4922-3.75 14.496-3.75 20.992 0 6.4922 3.75 10.496 10.68 10.496 18.18v104.96h104.96-0.003906c7.5 0 14.43 4 18.18 10.496 3.75 6.4922 3.75 14.496 0 20.992-3.75 6.4922-10.68 10.496-18.18 10.496z"></path> <path d="m400 546.94c-5.5703 0-10.91-2.2109-14.844-6.1484-3.9375-3.9336-6.1484-9.2734-6.1484-14.844v-125.95c0-7.5 4-14.43 10.496-18.18 6.4922-3.75 14.496-3.75 20.992 0 6.4922 3.75 10.496 10.68 10.496 18.18v125.95-0.003906c0 5.5703-2.2148 10.91-6.1484 14.844-3.9375 3.9375-9.2773 6.1484-14.844 6.1484z"></path> <path d="m462.98 483.96h-125.95c-7.5 0-14.43-4-18.18-10.492-3.75-6.4961-3.75-14.5 0-20.992 3.75-6.4961 10.68-10.496 18.18-10.496h125.95c7.4961 0 14.43 4 18.18 10.496 3.7461 6.4922 3.7461 14.496 0 20.992-3.75 6.4922-10.684 10.492-18.18 10.492z"></path> </g> </g></svg>`,
      minusPage: `<svg fill="#000000" width="256px" height="256px" version="1.1" viewBox="144 144 512 512" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="m441.98 441.98h-83.969c-7.5 0-14.43 4-18.18 10.496-3.75 6.4922-3.75 14.496 0 20.992 3.75 6.4922 10.68 10.492 18.18 10.492h83.969c7.4961 0 14.43-4 18.18-10.492 3.75-6.4961 3.75-14.5 0-20.992-3.75-6.4961-10.684-10.496-18.18-10.496zm125.95-106.22-0.003906-0.003906c-0.21875-1.9258-0.64062-3.8281-1.2578-5.668v-1.8906 0.003906c-1.0078-2.1602-2.3555-4.1445-3.9883-5.8789l-125.95-125.95c-1.7344-1.6328-3.7188-2.9805-5.8789-3.9883h-1.8906 0.003906c-2.1328-1.2227-4.4883-2.0078-6.9297-2.3086h-127c-16.703 0-32.723 6.6328-44.531 18.445-11.812 11.809-18.445 27.828-18.445 44.531v293.89c0 16.703 6.6328 32.723 18.445 44.531 11.809 11.812 27.828 18.445 44.531 18.445h209.92c16.703 0 32.723-6.6328 44.531-18.445 11.812-11.809 18.445-27.828 18.445-44.531v-209.92-1.2617zm-125.95-74.105 54.367 54.371h-33.375c-5.5703 0-10.91-2.2109-14.844-6.1484-3.9375-3.9375-6.1484-9.2773-6.1484-14.844zm83.965 285.28c0 5.5703-2.2109 10.91-6.1484 14.844-3.9336 3.9375-9.2734 6.1484-14.844 6.1484h-209.92c-5.5664 0-10.906-2.2109-14.844-6.1484-3.9375-3.9336-6.1484-9.2734-6.1484-14.844v-293.89c0-5.5664 2.2109-10.906 6.1484-14.844s9.2773-6.1484 14.844-6.1484h104.96v62.977c0 16.703 6.6328 32.719 18.445 44.531 11.809 11.809 27.828 18.445 44.531 18.445h62.977z"></path> </g></svg>`,
      numbering: `<svg fill="#000000" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="256px" height="256px" viewBox="0 0 381.304 381.304" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M121.203,37.858c0-7.791,6.319-14.103,14.104-14.103H367.2c7.784,0,14.104,6.312,14.104,14.103 s-6.312,14.103-14.104,14.103H135.307C127.522,51.961,121.203,45.649,121.203,37.858z M135.307,120.908h150.426 c7.79,0,14.104-6.315,14.104-14.104c0-7.79-6.313-14.103-14.104-14.103H135.307c-7.785,0-14.104,6.307-14.104,14.103 C121.203,114.598,127.522,120.908,135.307,120.908z M367.2,269.75H135.307c-7.785,0-14.104,6.312-14.104,14.104 c0,7.79,6.319,14.103,14.104,14.103H367.2c7.784,0,14.104-6.312,14.104-14.103C381.304,276.062,374.984,269.75,367.2,269.75z M285.727,338.693h-150.42c-7.785,0-14.104,6.307-14.104,14.104c0,7.79,6.319,14.103,14.104,14.103h150.426 c7.79,0,14.104-6.312,14.104-14.103C299.836,345.005,293.517,338.693,285.727,338.693z M33.866,127.838h22.387V14.405H37.921 c-0.521,5.925-0.068,10.689-4.696,14.277c-4.631,3.591-14.363,5.382-23.158,5.382H6.871v15.681h26.995V127.838z M25.603,345.147 l28.115-20.912c9.69-6.655,16.056-12.826,19.109-18.524c3.05-5.697,4.569-11.821,4.569-18.377c0-10.716-3.585-19.357-10.737-25.941 c-7.161-6.579-16.568-9.865-28.23-9.865c-11.245,0-20.241,3.328-26.982,9.989c-6.75,6.655-10.113,16.691-10.113,30.115H23.02 c0-8.015,1.416-13.548,4.253-16.621c2.834-3.067,6.721-4.604,11.665-4.604s8.854,1.561,11.741,4.676 c2.888,3.12,4.327,6.998,4.327,11.632c0,4.628-1.336,8.808-4.02,12.555c-2.675,3.747-10.125,10.071-22.352,18.962 c-10.453,7.648-24.154,16.964-28.393,23.726L0,364.96h77.632v-19.813H25.603L25.603,345.147z"></path> </g> </g></svg>`,
      subNumbering: `<svg fill="#000000" width="256px" height="256px" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M 2.8067 17.5443 C 4.3659 17.5443 5.6134 16.2969 5.6134 14.7599 C 5.6134 13.2007 4.3659 11.9532 2.8067 11.9532 C 1.2697 11.9532 0 13.2007 0 14.7599 C 0 16.2969 1.2697 17.5443 2.8067 17.5443 Z M 12.6523 16.5420 L 43.0805 16.5420 C 44.1051 16.5420 44.8847 15.7623 44.8847 14.7599 C 44.8847 13.7352 44.1051 12.9557 43.0805 12.9557 L 12.6523 12.9557 C 11.6500 12.9557 10.8703 13.7352 10.8703 14.7599 C 10.8703 15.7623 11.6500 16.5420 12.6523 16.5420 Z M 8.3755 31.0209 C 9.9348 31.0209 11.1822 29.7735 11.1822 28.2142 C 11.1822 26.6549 9.9348 25.4075 8.3755 25.4075 C 6.8162 25.4075 5.5688 26.6549 5.5688 28.2142 C 5.5688 29.7735 6.8162 31.0209 8.3755 31.0209 Z M 18.2212 30.0185 L 48.6493 30.0185 C 49.6516 30.0185 50.4535 29.2166 50.4535 28.2142 C 50.4535 27.2118 49.6516 26.4322 48.6493 26.4322 L 18.2212 26.4322 C 17.1965 26.4322 16.4169 27.2118 16.4169 28.2142 C 16.4169 29.2166 17.1965 30.0185 18.2212 30.0185 Z M 13.9443 44.4974 C 15.4813 44.4974 16.7510 43.2277 16.7510 41.6907 C 16.7510 40.1315 15.4813 38.8841 13.9443 38.8841 C 12.3850 38.8841 11.1376 40.1315 11.1376 41.6907 C 11.1376 43.2277 12.3850 44.4974 13.9443 44.4974 Z M 23.7900 43.4728 L 54.2181 43.4728 C 55.2204 43.4728 56 42.6931 56 41.6907 C 56 40.6661 55.2204 39.8864 54.2181 39.8864 L 23.7900 39.8864 C 22.7653 39.8864 21.9857 40.6661 21.9857 41.6907 C 21.9857 42.6931 22.7653 43.4728 23.7900 43.4728 Z"></path></g></svg>`
    },
    readonly: false,
    buttons: [
      ...Jodit.defaultOptions.buttons.slice(0, 3),

      {
        name: "numberedlist",
        icon: 'numbering', // Using an actual button
        // iconURL: "https://cdn-icons-png.flaticon.com/512/25/25694.png", // Custom icon (optional)
        tooltip: "Numbered List",
        exec: (editor) => {
          const selection = editor.s.current();
          const range = editor.s.range;

          if (selection && range) {
            let parentElement = selection.nodeType === Node.TEXT_NODE ? selection.parentElement : selection;

            // Find if we're inside an existing list
            let list = parentElement.closest("ol");

            if (!list) {
              // Create new ordered list
              list = document.createElement("ol");
              list.classList.add("custom-numbered-list");

              // Create a list item
              const listItem = document.createElement("li");
              listItem.textContent = "New Item";

              list.appendChild(listItem);

              // Insert the list at the cursor position
              editor.s.insertNode(list, false);

              // Place cursor inside the first list item
              editor.s.setCursorIn(listItem);
            }
          }
        }


      },
      {
        name: "subNumberedlist",
        icon: "subNumbering",
        tooltip: "Sub-Numbered List",
        exec: (editor) => {
          const selection = editor.s.current();
          const range = editor.s.range;

          if (selection && range) {
            let parentElement =
              selection.nodeType === Node.TEXT_NODE
                ? selection.parentElement
                : selection;

            const currentLi = parentElement.closest("li");
            if (currentLi) {
              let subList = currentLi.querySelector("ol");

              if (!subList) {
                // If no sublist exists, create one
                subList = document.createElement("ol");
                subList.classList.add("custom-numbered-list"); // Custom class for numbering
                currentLi.appendChild(subList);
              }

              // Create a new sub-item
              const subItem = document.createElement("li");
              subItem.textContent = "Sub Item";
              subList.appendChild(subItem);

              // Set the cursor inside the new sub-item
              editor.s.setCursorIn(subItem);
            } else {
              // Create new ordered list
              let list = document.createElement("ol");
              list.classList.add("custom-numbered-list");

              // Create a list item
              const listItem = document.createElement("li");
              listItem.textContent = "New Item";

              list.appendChild(listItem);

              // Insert the list at the cursor position
              editor.s.insertNode(list, false);

              // Place cursor inside the first list item
              editor.s.setCursorIn(listItem);
            }
          }
        },
      },
      {
        name: "addPage",
        icon: 'addPage', // Using an actual button
        // iconURL: "https://cdn-icons-png.flaticon.com/512/25/25694.png", // Custom icon (optional)
        tooltip: "Add New Page",
        exec: (editor) => {
          const currentDocData = docDataRef.current
          const pageNums = currentDocData?.content.map(page => page.pageNumber)
          const maxPageNumber = Math.max(...pageNums); // Get the next page number
          const newPage = {
            pageNumber: maxPageNumber + 1,
            content: ""
          };
          // Update frontend state
          setPages([...pageNums, maxPageNumber + 1]);
          // Send event to backend
          console.log('from btton');
          websocketService.sendMessage("UPDATE_DOCUMENT", {
            _id: params.docId,
            newPages: [newPage]
          });
        },
      },
      {
        name: "minusPage",
        icon: 'minusPage', // Using an actual button
        // iconURL: "https://cdn-icons-png.flaticon.com/512/25/25694.png", // Custom icon (optional)
        tooltip: "Remove Last Page",
        exec: (editor) => {
          const currentDocData = docDataRef.current
          const pageNums = currentDocData?.content.map(page => page.pageNumber)
          const delPageNum = currentDocData?.content[currentDocData?.content?.length - 1].pageNumber

          // Update frontend state
          setPages(pageNums.pop());
          // Send event to backend
          console.log('from btton');
          websocketService.sendMessage("UPDATE_DOCUMENT", {
            _id: params.docId,
            deletedPages: [delPageNum],
            newPages: [],
            updatedPages: []
          });
        },
      },
      ...Jodit.defaultOptions.buttons.slice(3),
    ],
    enter: "p",

    askBeforePasteHTML: false,
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
  }


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
              config={editorConfigs}
              value={JSON.stringify(docData?.content.map((page, i) =>
                `<div id="page-${page.pageNumber}" class="docPage">
                <div class="page-number">${i + 1}</div>
                  ${page.content}
                </div>`
              ).join(""))}
              onChange={(newContent) => {
                const cursor = saveCursorPosition()
                  setCursorPosition(cursor)
                setTimeout(() => {
                  const currentDocData = docDataRef.current;
                  let updatedPages = [];
                  let deletedPages = [];
                  let newPages = [];
                  
                  currentDocData.content.forEach((page) => {
                    const pageNumber = page.pageNumber;
                    const pageElement = document.getElementById('page-' + pageNumber);
                    if (pageElement) {
                      const cloned = pageElement.cloneNode(true);

                      // Select the page-number element from the cloned node
                      const pageNumberElement = cloned.querySelector('.page-number');

                      if (pageNumberElement) {
                        // Remove the page-number element from the cloned node
                        cloned.removeChild(pageNumberElement);
                      }

                      // Get the updated inner HTML of the cloned node (without the page number)
                      const updatedPageContent = cloned.innerHTML.trim();

                      // if (pageContentElement.scrollHeight > 600) {
                      //   // Recursively check the next page
                      //   console.log('overflowinfg the height');
                      //   console.log(pageNumber);


                      //   const result = handlePageOverflow(pageNumber, pageContentElement);
                      //   updatedPages = [...updatedPages, ...result.overflowPages.updatedPages];
                      //   newPages = [...newPages, ...result.overflowPages.newPages];

                      // } else {
                      const difference = levenshtein.get(page.content, updatedPageContent);
                      if (difference > 20) {
                        updatedPages.push({
                          pageNumber,
                          content: updatedPageContent,
                        });
                      }
                      // }
                    } else {
                      deletedPages.push(pageNumber);
                    }
                  });

                  // Ensure at least one page exists
                  const existingPages = document.getElementsByClassName('docPage');
                  if (existingPages.length === 0) {
                    newPages.push({ pageNumber: 1, content: "" });
                  }
                  const commentsToRemove = getCommentsToRemove(store);
                  if (updatedPages.length > 0 || deletedPages.length > 0 || newPages.length > 0) {
                    websocketService.sendMessage("UPDATE_DOCUMENT", {
                      _id: params.docId,
                      updatedPages,
                      deletedPages,
                      newPages,
                      commentsToRemove
                    });

                    // // Trigger onChange again with new content
                    // const updatedDocData = {
                    //     content: [
                    //         ...currentDocData.content.filter(p => !deletedPages.includes(p.pageNumber)),
                    //         ...updatedPages,
                    //         ...newPages
                    //     ]
                    // };
                    // docDataRef.current = updatedDocData; // Update the reference
                    // onChange(updatedDocData); // Call onChange with updated document data
                  }
                }, 300)
              }}

            />
          ), [])}
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




