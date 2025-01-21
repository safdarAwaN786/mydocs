export const BASE_URL = "http://localhost:5000/api";
// export const WS_URL = "ws://localhost:5000;
export const WS_URL = "wss://mydocs-oxbq.onrender.com";



export const createNewDoc = async () => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/create-doc`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to create new document:", error);
    throw error;
  }
};

export const fetchDocument = async (docId) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/documentById/${docId}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch the document");
  }
  return response.json();
};

export const fetchAllDocuments = async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Ensures fresh data (use `force-cache` if you prefer caching)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }
};

