"use client"
import { createNewDoc } from '@/API-calls/Documents/docsNormal';
import { currentDoc } from '@/store/atoms';
import { useMutation } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import { LiaPlusSolid } from "react-icons/lia";
import Loading from '../layout/Loading';

export default function Templates() {
    const [docState, setDocState] = useAtom(currentDoc);
    const [newDocCreating, setNewDocCreating] = useState(false);
    const router = useRouter()
    const { mutate, isPending, isError, error } = useMutation({
        mutationFn: createNewDoc,
        onSuccess: (data) => {
            setDocState(data);
            router.push("/doc-editor/" + data._id);
        },
        onError: (error) => {
            console.error("Error creating document:", error);
        },
    })

    return (
        <>
        {newDocCreating && (
            <Loading />
        )}
            <div className="d-flex flex-row bg-slate-100 py-12 px-[300px]">
                <div onClick={() => {
                    mutate()
                    setNewDocCreating(true)
                }}>
                    <div className="w-44 h-60 flex bg-white hover:text-blue-600 cursor-pointer items-center justify-center">
                        <LiaPlusSolid className=' text-[60px] ' />
                    </div>
                </div>
            </div>
        </>
    )
}
