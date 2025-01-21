
import Header from "@/components/layout/Header";

export const metadata = {
  title: "My Docs",
  description: "Documents Management Application",
};

export default function DocsLayout({ children }) {

  return (
    <>
      <Header />
      {children}
      {/* <Footer /> */}
    </>
  );
}
