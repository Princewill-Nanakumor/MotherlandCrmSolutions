import Head from "next/head";

interface ErrorProps {
  statusCode?: number;
}

export default function Error({ statusCode }: ErrorProps) {
  const title = statusCode === 404 ? "Page not found" : "An error occurred";
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {statusCode ?? "Error"}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {statusCode === 404
              ? "This page could not be found."
              : "An error occurred on the server."}
          </p>
        </div>
      </div>
    </>
  );
}
