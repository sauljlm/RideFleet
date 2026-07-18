import Image from 'next/image';

interface PhotoThumbnailProps {
  src: string | null;
  alt: string;
  size?: number;
  rounded?: 'full' | 'md';
}

export function PhotoThumbnail({
  src,
  alt,
  size = 40,
  rounded = 'md',
}: PhotoThumbnailProps) {
  const roundedClass = rounded === 'full' ? 'rounded-full' : 'rounded-md';

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex shrink-0 items-center justify-center bg-gray-200 text-xs font-medium text-gray-500 ${roundedClass}`}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 object-cover ${roundedClass}`}
      style={{ width: size, height: size }}
    />
  );
}
