type ButtonProps = {
  text: string;
};

export default function Button({
  text,
}: ButtonProps) {
  return (
    <button
      className="
        w-full
        rounded-full
        bg-[#4CAF50]
        py-4
        text-lg
        font-medium
        text-white
        transition
        hover:brightness-95
      "
    >
      {text}
    </button>
  );
}