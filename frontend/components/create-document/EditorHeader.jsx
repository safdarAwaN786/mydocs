"use client";
import React from 'react'
import { SiGoogledocs } from "react-icons/si";
import { MdOutlineMessage } from "react-icons/md";
import { FaUserGroup } from "react-icons/fa6";
import Link from 'next/link';
import { useAtom } from 'jotai';
import { currentDoc, showComments } from '@/store/atoms';
import websocketService from '@/webSocket/websocketService';
import { useParams } from 'next/navigation';


export default function EditorHeader() {
  const [docData, setDocData] = useAtom(currentDoc)
  const [showCommentsBox, setShowCommentsBox] = useAtom(showComments)
  const params = useParams();

  return (
    <>
      <div className='w-full  p-2 h-16 shadow-sm z-[100] fixed top-0 left-0 shadow-gray-200 items-center text-xl font-medium flex-row sm:px-5 flex justify-between '>
        <div className='flex gap-3 items-center'>
          <Link href="/docs">
            <SiGoogledocs className='text-blue-500 text-4xl' />
          </Link>
          <div className='flex flex-col h-full'>
            <span className='mb-[-4px]'>
              <input onChange={(e)=> {
                 websocketService.sendMessage("UPDATE_DOCUMENT", {
                  _id: params.docId,
                  title: e.target.value,
                  content : docData?.content
                });
              }} type='text' defaultValue={docData?.title} />
            </span>
            <span className='text-sm'>
              {docData?.docID}
            </span>
          </div>
        </div>
        <div className='flex gap-4 flex-row items-center'>
          <MdOutlineMessage onClick={()=> setShowCommentsBox(!showCommentsBox)} className='text-black text-xl cursor-pointer hover:text-blue-500' />
          <div className='w-24 rounded-full h-10 text-xl bg-blue-200 gap-2 cursor-pointer flex items-center justify-center hover:bg-blue-300'>
            <FaUserGroup />
            <span className='text-sm font-normal'>
              Share
            </span>
          </div>
          <div className='w-10 h-10 bg-red-300 text-xl flex items-center justify-center rounded-full'>
            SH
          </div>
        </div>
      </div>

    </>
  )
}
