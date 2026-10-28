type FormMessagesProps = {
  message?: string;
  errorMessage?: string;
};

// Success and error notes shown under a form.
export default function FormMessages({
  message,
  errorMessage,
}: FormMessagesProps) {
  return (
    <>
      {message && (
        <p
          className="rounded-2xl bg-[#E6EEE3] px-4 py-3 text-[#1C5F31]"
          role="status"
        >
          {message}
        </p>
      )}
      {errorMessage && (
        <p
          className="rounded-2xl bg-[#FBEDE9] px-4 py-3 text-[#8A3B2B]"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </>
  );
}
