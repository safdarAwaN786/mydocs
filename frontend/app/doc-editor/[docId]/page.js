import TextEditor from '@/components/create-document/TextEditor'
import React from 'react'
import "@/styles/TextEditorStyles.css"

export default function CreateDocument() {
    return (
        <>
        <div className=' w-full top-16 bg-[#fafafa]   absolute bottom-0'>
            <TextEditor />
        </div>
        </>
    )
}
