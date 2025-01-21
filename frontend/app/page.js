import Link from "next/link";
import React from "react";

export default function Login() {
  
  return (
    <div className="w-full h-[100vh] flex flex-col gap-2 justify-center items-center">
      <h1 className="text-3xl font-extrabold">Login Page</h1>
      <Link href="/docs">
        <button className="btn btn-xs my-3 sm:btn-sm md:btn-md lg:btn-lg">
          Documents
        </button>
      </Link>
    </div>
  );
}
