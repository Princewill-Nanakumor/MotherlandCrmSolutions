import Head from "next/head";

export default function Custom500() {
  return (
    <>
      <Head>
        <title>Server error</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            500
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            A server error occurred. Please try again later.
          </p>
        </div>
      </div>
    </>
  );
}
