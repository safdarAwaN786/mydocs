import { currentDoc } from "@/store/atoms";
import websocketService from "@/webSocket/websocketService";
import levenshtein from 'fast-levenshtein';


export let tempHighlighted = false;

export const applyDeleteComment = (commentNumber) => {
  const container = document.querySelector('.jodit-wysiwyg');
  const commentsHtml = container?.innerHTML;

  if (!commentsHtml) return '';

  // Create a temporary container to parse the HTML
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = commentsHtml;

  // Select all elements with the id `comment-${selectedComment}`
  const commentTags = tempContainer.querySelectorAll(`span.comment-${commentNumber}`);

  // Loop through the selected elements
  commentTags.forEach((element) => {
    const parent = element.parentElement; // Get the parent element

    if (parent) {
      // Insert the content of the element into the parent element at the same place
      const fragment = document.createDocumentFragment();
      while (element.firstChild) {
        fragment.appendChild(element.firstChild);
      }
      parent.insertBefore(fragment, element); // Insert the content before the element
      parent.removeChild(element); // Remove the original element
    }
  });

  return tempContainer.innerHTML;
};


const getTextNodes = (node) => {
  let textNodes = [];
  const walk = (node) => {
    if (node.nodeType === 3) {  // TEXT_NODE
      textNodes.push(node);
    } else {
      for (let child of node.childNodes) {
        walk(child);
      }
    }
  };
  walk(node);
  return textNodes;
};

export const applyTempHighlight = (savedSelection, tempCommentNumber) => {
  if (!savedSelection) {
    console.log('No saved selection to highlight.');
    return;
  }
  const container = document.querySelector('.jodit-wysiwyg');

  if (!container) return;

  const textNodes = getTextNodes(container);
  const selection = window.getSelection();

  // Restore saved selection
  selection.removeAllRanges();
  selection.addRange(savedSelection);

  const range = savedSelection;
  const selectedText = range.toString();
  if (!selectedText) return;

  const startNodeIndex = textNodes.findIndex((node) => node === range.startContainer);
  const endNodeIndex = textNodes.findIndex((node) => node === range.endContainer);
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  if (startNodeIndex === -1 || endNodeIndex === -1) return;

  const commentClass = `comment-${tempCommentNumber}`;

  let newlyAddedSpans = [];

  if (startNodeIndex === endNodeIndex) {
    const span = document.createElement('span');
    span.style.backgroundColor = 'orange';
    span.classList.add(commentClass);
    span.classList.add('commentSpan');
    span.textContent = selectedText;

    range.deleteContents();
    range.insertNode(span);
    newlyAddedSpans.push(span);
  } else {
    const startNode = textNodes[startNodeIndex];
    const endNode = textNodes[endNodeIndex];

    if (startNode) {
      const startText = startNode.textContent || '';
      const highlightedStartText = startText.substring(startOffset);
      startNode.textContent = startText.substring(0, startOffset);

      const span = document.createElement('span');
      span.style.backgroundColor = 'orange';
      span.classList.add(commentClass);
      span.classList.add('commentSpan');
      span.textContent = highlightedStartText;
      startNode.parentNode.insertBefore(span, startNode.nextSibling);
      newlyAddedSpans.push(span);
    }

    for (let i = startNodeIndex + 1; i < endNodeIndex; i++) {
      const node = textNodes[i];
      if (node) {
        const span = document.createElement('span');
        span.style.backgroundColor = 'orange';
        span.classList.add(commentClass);
        span.classList.add('commentSpan');

        span.textContent = node.textContent;
        node.parentNode.replaceChild(span, node);
        newlyAddedSpans.push(span);
      }
    }

    if (endNode) {
      const endText = endNode.textContent || '';
      const highlightedEndText = endText.substring(0, endOffset);
      endNode.textContent = endText.substring(endOffset);

      const span = document.createElement('span');
      span.style.backgroundColor = 'orange';
      span.classList.add(commentClass);
      span.classList.add('commentSpan');
      span.textContent = highlightedEndText;
      endNode.parentNode.insertBefore(span, endNode);
      newlyAddedSpans.push(span);
    }
  }

  tempHighlighted = true;
};

export const removeTempHighlight = (docData, selectedComment, docId) => {
  const container = document.querySelector('.jodit-wysiwyg');
  if (!container) return;
  const commentClass = `comment-${docData?.comments?.length > 0
    ? (docData?.comments[docData?.comments.length - 1]).commentNumber + 1
    : 1}`;
  const highlightedSpans = container.querySelectorAll(`span.${commentClass}`);

  highlightedSpans.forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;

    // Replace the span with its text content
    const textNode = document.createTextNode(span.textContent);
    parent.replaceChild(textNode, span);

    // Normalize to merge adjacent text nodes
    parent.normalize();
  });
  console.log('All highlights removed.');
  tempHighlighted = false
};

export const applySavingHighlights = (docData) => {
  if (!docData || !docData.content) return [];

  let updatedPages = [];

  docData.content.forEach((page) => {
    const pageElement = document.getElementById(`page-${page.pageNumber}`);
    if (!pageElement) return;

    const clonedPage = pageElement.cloneNode(true);
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = clonedPage.innerHTML;

    const commentClass = `comment-${docData?.comments?.length > 0
      ? (docData?.comments[docData?.comments.length - 1]).commentNumber + 1
      : 1}`;

    // Highlight all existing comment spans
    tempContainer.querySelectorAll(`span.commentSpan`).forEach((element) => {
      element.style.backgroundColor = 'yellow';
    });

    // Highlight new comment spans
    tempContainer.querySelectorAll(`span.${commentClass}`).forEach((element) => {
      element.style.backgroundColor = 'yellow';
    });

    updatedPages.push({
      pageNumber: page.pageNumber,
      content: tempContainer.innerHTML.trim(),
    });
  });

  return updatedPages;
};


export const refreshTOC = () => {
  const container = document.querySelector(".jodit-wysiwyg"); // Jodit's content area
  if (!container) return;

  const headingElements = container.querySelectorAll("h1, h2, h3");

  const tocData = [];
  let lastH1 = null, lastH2 = null;

  headingElements.forEach((el, index) => {
    const level = parseInt(el.tagName.replace("H", ""), 10);
    if (el.innerText?.length > 0) {

      const item = {
        id: `heading-${index}`,
        text: el.innerText,
        level: level,
        element: el,
        children: [],
      };

      el.id = item.id; // Set ID for linking

      if (level === 1) {
        tocData.push(item);
        lastH1 = item;
        lastH2 = null;
      } else if (level === 2) {
        if (lastH1) {
          lastH1.children.push(item);
        } else {
          tocData.push(item); // Add at top-level if no H1 exists
        }
        lastH2 = item;
      } else if (level === 3) {
        if (lastH2) {
          lastH2.children.push(item);
        } else if (lastH1) {
          lastH1.children.push(item);
        } else {
          tocData.push(item); // Add at top-level if no H1 or H2 exists
        }
      }
    }
  });
  return tocData
}


export const applyCommentSelection = (selectedComment) => {
  tempHighlighted = true;
  const container = document.getElementsByClassName('jodit-wysiwyg')[0];
  const commentsHtml = container?.innerHTML;

  if (!commentsHtml) return '';
  const commentClass = `comment-${selectedComment}`;
  // Create a temporary container to parse the HTML
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = commentsHtml;
  const allCommentTags = tempContainer.querySelectorAll(`span.commentSpan`);
  allCommentTags.forEach((element) => {
    element.style.backgroundColor = 'yellow'; // Set background color
  });
  // Select all elements with the id `temp-comment-2`
  const commentTags = tempContainer.querySelectorAll(`span.${commentClass}`);
  // Loop through the selected elements and update them
  commentTags.forEach((element) => {
    element.style.backgroundColor = 'orange'; // Set background color
  });
  // Return the updated HTML
  container.innerHTML = tempContainer.innerHTML


};

export const scrollToCommentContent = (commentNumber) => {
  const scrollableContainer = document.getElementById("content-container");
  const targetElement = document.getElementsByClassName('comment-' + commentNumber)[0]
  if (scrollableContainer && targetElement) {
    const containerRect = scrollableContainer.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    // Calculate scroll position relative to the container
    const scrollPosition = targetRect.top - containerRect.top + scrollableContainer.scrollTop;
    scrollableContainer.scrollTo({
      top: scrollPosition - 200,
      behavior: "smooth",
    });
  }
}

export const scrollToActualComment = (commentNumber) => {
  const scrollableContainer = document.getElementById("commentsList");
  const targetElement = document.getElementById('commentBox-' + commentNumber);
  if (scrollableContainer && targetElement) {
    const containerRect = scrollableContainer.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    // Calculate scroll position relative to the container
    const scrollPosition = targetRect.top - containerRect.top + scrollableContainer.scrollTop;

    scrollableContainer.scrollTo({
      top: scrollPosition - 130,
      behavior: "smooth",
    });
  }
}

export const getCommentsToRemove = (store) => {
  const comments = store.get(currentDoc).comments
  const commentNumbersToRemove = [];
  for (let i = 0; i < comments.length; i++) {
    const commentNumber = comments[i].commentNumber;
    const commentElements = document.getElementsByClassName('comment-' + commentNumber);
    if (commentElements.length === 0) {
      commentNumbersToRemove.push(commentNumber)
    }
  }
  return commentNumbersToRemove;
}

export const saveCursorPosition = () => {
  const container = document.querySelector('.jodit-wysiwyg');
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const preSelectionRange = range.cloneRange();
  preSelectionRange.selectNodeContents(container);
  preSelectionRange.setEnd(range.startContainer, range.startOffset);

  const start = preSelectionRange.toString().length;
  const end = start + range.toString().length;

  return { start, end };
};

export const restoreCursorPosition = ({ start, end }) => {
  const container = document.querySelector('.jodit-wysiwyg');
  const selection = window.getSelection();
  const range = document.createRange();

  let charCount = 0;
  let startNode = null;
  let startOffset = 0;
  let endNode = null;
  let endOffset = 0;

  // Traverse the container's text nodes to find the correct position
  const traverse = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const nextCharCount = charCount + node.length;
      if (!startNode && nextCharCount >= start) {
        startNode = node;
        startOffset = start - charCount;
      }
      if (!endNode && nextCharCount >= end) {
        endNode = node;
        endOffset = end - charCount;
      }
      charCount = nextCharCount;
    } else {
      for (let child of node.childNodes) {
        traverse(child);
      }
    }
  };

  traverse(container);

  if (startNode && endNode) {
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};


const PAGE_HEIGHT = 600;

export const handlePageOverflow = (pageNumber, pageContentElement) => {

  let overflowText = extractOverflowingContent(pageContentElement, PAGE_HEIGHT);
  if (!overflowText) return { overflowPages: { updatedPages: [], newPages: [] } };

  const updatedPages = [];
  const newPages = [];

  updatedPages.push({ pageNumber, content: pageContentElement.innerHTML });

  let nextPageNumber = pageNumber + 1;
  let nextPageDiv = document.getElementById(`page-${nextPageNumber}`);

  if (nextPageDiv) {
    const nextPageContentElement = nextPageDiv.querySelector('.page-content');
    nextPageContentElement.innerHTML = overflowText + nextPageContentElement.innerHTML;

    updatedPages.push({ pageNumber: nextPageNumber, content: nextPageContentElement.innerHTML });
  } else {
    while (overflowText.length > 0) {
      const newPageContent = overflowText.substring(0, PAGE_HEIGHT);
      overflowText = overflowText.substring(PAGE_HEIGHT);

      const newPageDiv = document.createElement('div');
      newPageDiv.id = `page-${nextPageNumber}`;
      newPageDiv.className = 'docPage';
      newPageDiv.innerHTML = `
        <div class="page-number">${nextPageNumber}</div>
        <div class="page-content">${newPageContent}</div>
      `;

      document.body.appendChild(newPageDiv);
      newPages.push({ pageNumber: nextPageNumber, content: newPageContent });

      nextPageNumber++;
    }
  }

  return { overflowPages: { updatedPages, newPages } };
};

const extractOverflowingContent = (pageContentElement, maxHeight) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = pageContentElement.innerHTML;
  document.body.appendChild(tempDiv);

  let overflowText = '';
  while (tempDiv.scrollHeight > maxHeight && tempDiv.childNodes.length > 0) {
    overflowText = tempDiv.lastChild.outerHTML + overflowText;
    tempDiv.removeChild(tempDiv.lastChild);
  }

  pageContentElement.innerHTML = tempDiv.innerHTML;
  document.body.removeChild(tempDiv);

  return overflowText;
};


export const insertNumberedList = (editor) => {
  const selection = editor.s.insertNode(document.createElement("ol"));
  const listItem = document.createElement("li");
  listItem.textContent = "New Item";
  selection.appendChild(listItem);
  editor.s.setCursorIn(listItem);
};


export const insertSubpointsList = (editor) => {
  const selection = editor.s.current();
  if (selection) {
    const currentLi = selection.closest("li");
    if (currentLi) {
      let subList = currentLi.querySelector("ol");
      if (!subList) {
        subList = document.createElement("ol");
        currentLi.appendChild(subList);
      }
      const subItem = document.createElement("li");
      subItem.textContent = "Sub Item";
      subList.appendChild(subItem);
      editor.s.setCursorIn(subItem);
    }
  }
};


export const endListing = (editor) => {
  const selection = editor.s.current();
  if (selection) {
    const closestOl = selection.closest("ol");
    if (closestOl) {
      closestOl.remove();
      const newDiv = document.createElement("div");
      newDiv.textContent = "New Paragraph Here...";
      editor.s.insertNode(newDiv);
      editor.s.setCursorIn(newDiv);
    }
  }
};






export function placeCursorAtEnd(element) {
  if (document.createRange && window.getSelection) {
    let range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    let sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}



