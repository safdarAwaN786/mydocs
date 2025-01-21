import Footer from "@/components/layout/Footer";
import { Roboto } from 'next/font/google';
import EditorHeader from "@/components/create-document/EditorHeader";

// Configure the font
const roboto = Roboto({
  subsets: ['latin'], // Include the required subsets
  weight: ['400', '700'], // Specify font weights
  style: ['normal', 'italic'], // Specify styles if needed
});

export const metadata = {
  title: "Doc Editor",
  description: "Documents Management Application",
};

export default function DocEditorLayout({ children }) {
  return (
    <>
      <div className="h-full">
        <EditorHeader />
        {children}
      </div>
    </>

  );
}
