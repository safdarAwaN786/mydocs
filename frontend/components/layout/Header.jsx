import React from 'react'
import { SiGoogledocs } from "react-icons/si";

export default function Header() {
  return (
    <>
      <div className='w-full z-10 p-2 h-16 shadow-sm fixed top-0 left-0 shadow-gray-200 items-center text-xl font-medium flex-row sm:px-5 flex justify-between '>
        <div className='flex gap-3 flex-row items-center'>
          <SiGoogledocs className='text-blue-500 text-4xl' />
          Docs
        </div>
        <div className='flex gap-3 flex-row items-center'>
          <div className='w-10 h-10 bg-red-300 flex items-center justify-center rounded-full'>
            SH
          </div>
        </div>
      </div>
      <div className='h-16 w-full'>

      </div>
    </>
  )
}
