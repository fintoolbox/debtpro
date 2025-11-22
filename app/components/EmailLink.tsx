"use client";

import { useEffect, useState } from "react";

export default function EmailLink() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const user = "hello.fintoolbox";
    const domain = "gmail.com";
    setEmail(`${user}@${domain}`);
  }, []);

  if (!email) {
    // Nothing server-side, and a tiny delay client-side
    return null;
  }

  return (
    <a
      href={`mailto:${email}`}
      className="text-blue-400 hover:text-blue-300"
    >
      {email}
    </a>
  );
}
