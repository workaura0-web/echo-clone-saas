"use client";

import { useEffect, useState } from "react";
import { User as UserIcon } from "lucide-react";

interface UserAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  sizeClass?: string;
  textClass?: string;
  roundedClass?: string;
}

export default function UserAvatar({
  photoURL,
  displayName,
  sizeClass = "w-12 h-12",
  textClass = "text-lg",
  roundedClass = "rounded-xl",
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photoURL]);

  const cleanPhoto = typeof photoURL === "string" && photoURL.trim() ? photoURL.trim() : null;
  const initial = displayName?.trim()?.[0]?.toUpperCase();

  return (
    <div
      className={`${sizeClass} ${roundedClass} bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 p-[1.5px] shrink-0 overflow-hidden shadow-sm`}
    >
      <div
        className={`w-full h-full ${roundedClass} bg-slate-900 dark:bg-slate-950 flex items-center justify-center text-white font-bold ${textClass} overflow-hidden`}
      >
        {cleanPhoto && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cleanPhoto}
            alt={displayName ? `${displayName} profile picture` : "User profile picture"}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : initial ? (
          <span>{initial}</span>
        ) : (
          <UserIcon className="w-1/2 h-1/2 text-cyan-300" />
        )}
      </div>
    </div>
  );
}
