import { clickedComment, connectedSocket, currentDoc, showComments, wholeLoading } from '@/store/atoms'
import dayjs from 'dayjs'
import { useAtom, useStore } from 'jotai'
import React, { useState } from 'react'
import { IoClose } from 'react-icons/io5'
import { MdAccountCircle } from 'react-icons/md'
import Loading from '../layout/Loading'
import { GiCheckMark } from 'react-icons/gi'
import websocketService from '@/webSocket/websocketService'
import { applyDeleteComment, getCommentsToRemove, scrollToCommentContent } from '@/functions/text-editorFns'

export default function CommentsList({ docId }) {
    const [showCommentsBox, setShowCommentsBox] = useAtom(showComments)
    const [tempReplies, setTempReplies] = useState([])
    const [loading, setLoading] = useAtom(wholeLoading);
    // const [websocketService, setWebSocketService] = useAtom(connectedSocket)
    const [selectedComment, setSelectedComment] = useAtom(clickedComment)
    const [docData, setDocData] = useAtom(currentDoc);
    const store = useStore()
    const handleCommentClick = (e, commentNumber) => {
        // Get all elements with the specific class
        const elementsWithClass = document.getElementsByClassName("comment-check");

        // Convert HTMLCollection to an array for easier manipulation
        const elementsArray = Array.from(elementsWithClass);

        // Check if the event target lies within any of the elements
        const isTargetInsideClass = elementsArray.some(element => element.contains(e.target));

        if (!isTargetInsideClass) {
            setSelectedComment(commentNumber);
            scrollToCommentContent(commentNumber);
            if (!tempReplies.some(reply => reply.forComment === commentNumber)) {
                setTempReplies([...tempReplies, { forComment: commentNumber, reply: "" }]);
            }
        }
    };

    const handleCommentCheck = async (commentNumber) => {
        // const commentRemovedContent = applyDeleteComment(commentNumber);
        setLoading(true)
        const commentsToRemove = getCommentsToRemove(store)
        websocketService.sendMessage("RESOLVE_COMMENT", {
            docId: docId,
            commentNumber,
            // updatedContent: commentRemovedContent,
            commentsToRemove
        });

    };



    const handleReplySubmit = async (e, commentNumber) => {
        e.preventDefault()

        // setLoading(true)
        const replyToAdd = tempReplies.find(reply => reply.forComment === commentNumber)
        setLoading(true)
        const commentsToRemove = getCommentsToRemove(store)
        websocketService.sendMessage("REPLY_COMMENT", {
            docId: docId,
            commentNumber: replyToAdd.forComment,
            reply: replyToAdd.reply,
            commentsToRemove
        });

        const updatedReplies = [...tempReplies];
        const replyIndex = updatedReplies.findIndex(obj => obj.forComment == selectedComment);
        updatedReplies[replyIndex] = { ...updatedReplies[replyIndex], reply: "" }
        setTempReplies(updatedReplies)
    };

    const updateReply = (commentNumber, reply) => {
        const updatedReplies = [...tempReplies];
        const replyIndex = updatedReplies.findIndex(obj => obj.forComment == commentNumber);
        updatedReplies[replyIndex] = { ...updatedReplies[replyIndex], reply }
        setTempReplies(updatedReplies)
    }


    return (
        <>
            {(loading) && (
                <Loading />
            )}
            {showCommentsBox &&
                <div id='commentsList' className=' fixed top-[140px]  right-0 z-20 p-3 shadow-lg shadow-gray-300  rounded-lg bottom-4 w-[400px] mx-2 mt-[2px] overflow-y-scroll max-h-[90vh] bg-[#e9e9e9] '>
                    <div className='flex flex-row justify-between items-center'>
                        <p className='font-semibold'>All Comments</p>
                        <button onClick={() => {
                            setShowCommentsBox(false)
                        }} className=" p-1 bg-slate-200 rounded-full"><IoClose className='text-gray-600 text-2xl' /></button>
                    </div>
                    {docData?.comments?.length === 0 && <div className='w-full h-[80%] flex justify-center items-center'> <p className='text-center text-gray-500'>No comments yet</p></div>}
                    <div id='commentsBox' className='cursor-pointer' >
                        {docData?.comments?.map((comment, key) => {
                            const commentReply = tempReplies.find(reply => reply.forComment === comment.commentNumber)
                            return (

                                <div id={'commentBox-' + comment.commentNumber} key={key} onClick={(e) => handleCommentClick(e, comment.commentNumber)} className={` w-full ${comment.commentNumber == selectedComment ? "border border-gray-400 bg-white  shadow-xl" : `${comment.resolved ? 'bg-[#bdbdbd]' : 'bg-gray-300'}`} rounded-lg  p-2 my-2`}>
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
                                            {!comment.resolved && (
                                                <div onClick={() => handleCommentCheck(comment.commentNumber)} className={`p-1 cursor-pointer comment-check h-8 w-8  flex justify-center items-center rounded-full hover:bg-gray-300`}>
                                                    <GiCheckMark className=' text-lg text-blue-600 ' />
                                                </div>
                                            )}

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
                        {/* <div>
                            <p className='text-md'>Resolved Comments</p>
                            {comments?.filter(com => com.resolved === true)?.map((comment, key) => {
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
                        </div> */}
                    </div>

                </div>}
        </>
    )
}
