"use client";

import { useEffect, useRef, useState } from "react";

type ClampedReviewTextProps = {
  text: string;
};

// Shows at most four lines, ending in an ellipsis. "Read more" appears only
// when text was actually cut off; the surrounding card is the link.
export default function ClampedReviewText({ text }: ClampedReviewTextProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) {
      return;
    }

    const measure = () => {
      setIsClamped(element.scrollHeight > element.clientHeight + 1);
    };

    // Measure right away, then again whenever the width changes (rotating
    // a phone, fonts finishing loading).
    const timeoutId = window.setTimeout(measure, 0);
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      window.clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [text]);

  return (
    <div className="space-y-1">
      <p
        ref={textRef}
        className="line-clamp-4 whitespace-pre-line leading-relaxed text-gray-800"
      >
        {text}
      </p>
      {isClamped && (
        <span className="text-sm font-medium text-[#2F4F46] underline decoration-[#2F4F46]/30 underline-offset-4">
          Read more
        </span>
      )}
    </div>
  );
}
