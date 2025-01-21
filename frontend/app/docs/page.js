import DocumentsList from "@/components/documents/DocumentsList";
import Templates from "@/components/documents/Templates";

export default function Home() {
  return (
    <>
      <div className="w-full">
        <Templates />
        <DocumentsList />
      </div>
      {/* <Link href='/create-doc' >
        Create Doc
      </Link>
      <DocumentsList /> */}
    </>
  );
}
