"use client";
import { getCommentsToRemove } from "@/functions/text-editorFns";
import { currentDoc } from "@/store/atoms";
import { useAtom, useStore } from "jotai";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NavigationWatcher = () => {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const [docData, setDocData] = useAtom(currentDoc);
  const store = useStore();
  const [isBlocking, setIsBlocking] = useState(false);

  useEffect(() => {
    const handleNavigationAttempt = async (event) => {
      if (isBlocking) return;

      if (prevPathRef.current.startsWith("/doc-editor")) {
        event.preventDefault();
        setIsBlocking(true);

        await handleBeforeUnload(); // Run function before navigation

        setIsBlocking(false);
        window.location.href = event.currentTarget.href; // Continue navigation
      }
    };

    const handleBeforeUnload = async () => {
      let updatedPages = [];
      let deletedPages = [];
      let newPages = [];

      for (let page of docData.content) {
        const pageNumber = page.pageNumber;
        const pageElement = document.getElementById("page-" + pageNumber);

        if (pageElement) {
          const cloned = pageElement.cloneNode(true);
          const pageNumberElement = cloned.querySelector(".page-number");
          if (pageNumberElement) cloned.removeChild(pageNumberElement);

          const updatedPageContent = cloned.innerHTML.trim();
          if (updatedPageContent !== page.content) {
            updatedPages.push({ pageNumber, content: updatedPageContent });
          }
        } else {
          deletedPages.push(pageNumber);
        }
      }

      const existingPages = document.getElementsByClassName("docPage");
      if (existingPages.length === 0) newPages.push({ pageNumber: 1, content: `` });

      const commentsToRemove = getCommentsToRemove(store);

      if (updatedPages.length > 0 || deletedPages.length > 0 || newPages.length > 0) {
        await websocketService.sendMessage("UPDATE_DOCUMENT", {
          _id: params.docId,
          updatedPages,
          deletedPages,
          newPages,
          commentsToRemove,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleNavigationAttempt, true); // Detect clicks

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleNavigationAttempt, true);
    };
  }, [isBlocking, docData]);

  return null;
};

export default NavigationWatcher;
