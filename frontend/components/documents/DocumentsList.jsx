"use client"
import { createNewDoc, fetchAllDocuments } from '@/API-calls/Documents/docsNormal';
import { currentDoc } from '@/store/atoms';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import React from 'react'
import { LiaPlusSolid } from "react-icons/lia";
import Loading from '../layout/Loading';
import dayjs from 'dayjs';

export default function DocumentsList() {
  const [docState, setDocState] = useAtom(currentDoc);
  const router = useRouter()
  const [loading, setLoading] = React.useState(false);
  const { isLoading, isError, data, error } = useQuery({
    queryKey: ['docs'],
    queryFn: fetchAllDocuments,
  })

  return (
    <>
    {(isLoading || loading) && (
      <Loading />
    )}
      <div className="d-flex flex-col bg-white py-12 px-[300px]">
        <div className="overflow-x-auto">
          <table className="table">
            {/* head */}
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Author</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((doc) => (
                <tr onClick={() => {
                  setLoading(true)
                  setDocState(doc);
                  router.push(`/doc-editor/${doc._id}`);
                  }} key={doc._id} className="hover cursor-pointer" >
                  <th>{doc.docID}</th>
                  <td>{doc.title}</td>
                  <td>me</td>
                  <td>{dayjs(doc.createdAt).format('DD-MMM-YYYY')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


      </div>
    </>
  )
}
