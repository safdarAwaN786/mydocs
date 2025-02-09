import { applySavingHighlights, getCommentsToRemove, removeTempHighlight, updateEditorContent } from '@/functions/text-editorFns';
import { clickedComment, currentDoc, wholeLoading } from '@/store/atoms';
import websocketService from '@/webSocket/websocketService';
import { useAtom, useStore } from 'jotai';
import React, { useState } from 'react'
import { IoClose } from 'react-icons/io5';

export default function AddComment({ docId }) {
    const [selectedComment, setSelectedComment] = useAtom(clickedComment)
    const [currentComment, setCurrentComment] = useState("")
    const [docData, setDocData] = useAtom(currentDoc);
    const container = document.querySelector(".jodit-wysiwyg");
    const [loading, setLoading] = useAtom(wholeLoading);
    const store = useStore()
    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (currentComment === "") return;

        setSelectedComment(null);
        setLoading(true);

        const updatedPages = applySavingHighlights(docData);
        const commentsToRemove = getCommentsToRemove(store);
        const pagesToSend = updatedPages.map(page => {
            const pageElement = document.getElementById('page-'+ page.pageNumber);
            const clonedPage = pageElement.cloneNode(true);
            clonedPage.removeChild(clonedPage.querySelector('.page-number'))
            return { pageNumber : page.pageNumber, content : clonedPage.innerHTML}
        })
        websocketService.sendMessage("ADD_COMMENT", {
            docId: docId,
            comment: currentComment,
            updatedPages : pagesToSend, // Send the updated pages instead of a single string
            commentNumber: docData?.comments?.length > 0
                ? docData?.comments[docData?.comments?.length - 1].commentNumber + 1
                : 1,
            commentsToRemove
        });

        document.getElementById("my_modal_1").close();
        setCurrentComment("");

        // Update docData state with new content
        const newDocData = {
            ...docData,
            content: docData.content.map((page) => {
                const updatedPage = updatedPages.find((p) => p.pageNumber === page.pageNumber);
                return updatedPage ? { ...page, content: updatedPage.content } : page;
            }),
        };

        setDocData(newDocData);
        setTimeout(()=>{
            
            updateEditorContent(newDocData, cursorPosition)
          }, 150)
        // Update the editor pages
        updatedPages.forEach(({ pageNumber, content }) => {
            const pageElement = document.getElementById(`page-${pageNumber}`);
            if (pageElement) {
                pageElement.innerHTML = content;
            }
        });
    };

    return (
        <>
            <dialog id="my_modal_1" className="modal">
                <div className="modal-box p-y-0">
                    <div className="modal-action flex flex-row justify-between items-center py-0 my-0">
                        <h3 className="font-semibold text-lg">New Comment</h3>
                        <form method="dialog">

                            <button onClick={() => {

                                removeTempHighlight()
                                container.innerHTML = docData.content.map((page, i) =>
                                    `<div id="page-${page.pageNumber}" class="docPage">
    ${page.content}
         <div class="page-number">${i + 1}</div>
       </div>`
                                ).join("")
                                setCurrentComment("");
                            }} className=" p-1 bg-slate-200 rounded-full"><IoClose className='text-gray-600 text-2xl' /></button>
                        </form>
                    </div>
                    <form id='comment-form-container' onSubmit={handleSubmitComment} className={`w-full`}>
                        <div className='my-2 flex flex-wrap items-end gap-1'>
                            <input value={currentComment} onChange={e => {
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

        </>
    )
}
