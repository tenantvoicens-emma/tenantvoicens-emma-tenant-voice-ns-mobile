type ButtonProps = {
  text: string;
  onClick?: () => void;
};

export default function Button({
  text,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
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