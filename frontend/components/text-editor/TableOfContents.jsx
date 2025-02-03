import { tocHeadings } from '@/store/atoms';
import { useAtom } from 'jotai';
import React, { useState } from 'react'
import { BsArrowLeft } from 'react-icons/bs';
import { TfiMenuAlt } from 'react-icons/tfi';

const TOCItem = ({ item }) => (
    <li className='pt-3' >
        <a className={`bg-[#f8f8f8] p-1 text-md  rounded-md ${item.level === 1 ? 'font-extrabold' : ' font-semibold'}`} 
            onClick={(e) => {
                e.preventDefault();
                const scrollableContainer = document.getElementById("content-container");
                const targetElement = document.getElementById(item.id); // Get the actual element by ID
                if (scrollableContainer && targetElement) {
                    const containerRect = scrollableContainer.getBoundingClientRect();
                    const targetRect = targetElement.getBoundingClientRect();
                    // Calculate scroll position relative to the container
                    const scrollPosition = targetRect.top - containerRect.top + scrollableContainer.scrollTop;
                    scrollableContainer.scrollTo({
                        top: scrollPosition - 80,
                        behavior: "smooth",
                    });
                }
            }}
        >
            {item.text}
        </a>
        {item.children.length > 0 && (
            <ul className='   font-semibold  text-md  list-disc ml-3'>
                {item.children.map((subItem) => (
                    <TOCItem key={subItem.id} item={subItem} />
                ))}
            </ul>
        )}
    </li>
);


export default function TableOfContents() {
    const [showTOC, setShowTOC] = useState(false);
    const [headings, setHeadings] = useAtom(tocHeadings)

    return (
        <>
            <div onClick={() => setShowTOC(true)} className='fixed top-[150px] left-2 z-20 rounded-full shadow-md flex justify-center items-center shadow-slate-300 cursor-pointer bg-[#e9e9e9] h-10 w-10'>
                <TfiMenuAlt className='text-xl' />
            </div>
            {showTOC && (
                <div className=' fixed top-[140px] overflow-y-scroll left-2 z-20 p-3 shadow-lg shadow-gray-300 bg-[#e9e9e9] rounded-md bottom-4 w-[350px]'>
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
        </>
    )
}
