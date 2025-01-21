import React from 'react'

export default function Loading() {
    return (
        <div className='fixed top-0 z-[9999] left-0 w-[100vw] h-[100vh] flex justify-center items-center  bg-[#52525294]'>
            <div className='w-12 h-12 rounded-full p-1 bg-white'>
                <span className="loading loading-spinner  text-black h-full w-full"></span>
            </div>
        </div>
    )
}
