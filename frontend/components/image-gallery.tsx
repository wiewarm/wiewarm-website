'use client';

import { useState } from 'react';
import Image from 'next/image';
import { XIcon } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { LocationImage } from '@/lib/wiewarm-api';

export function ImageGallery({ images, name, city }: { images: LocationImage[]; name: string; city: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const altFor = (image: LocationImage, index: number) => image.text || `${name} in ${city}, Bild ${index + 1}`;
  const current = selected === null ? null : images[selected];

  return <>
    <div className="image-gallery">{images.map((image, index) => <button key={image.image} type="button" onClick={() => setSelected(index)} aria-label={`${altFor(image, index)} vergrössern`}>
      <Image src={image.image} alt={altFor(image, index)} fill sizes="(max-width: 450px) 100vw, (max-width: 760px) 50vw, 24vw" priority={index === 0} />
      {image.text ? <span>{image.text}</span> : null}
    </button>)}</div>

    <Dialog open={current !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
      <DialogContent showCloseButton={false} className="h-[90dvh] w-[94vw] max-w-none overflow-hidden rounded-2xl bg-black p-0 ring-0 sm:max-w-none">
        {current && selected !== null ? <>
          <DialogTitle className="sr-only">{altFor(current, selected)}</DialogTitle>
          <Image src={current.original} alt={altFor(current, selected)} fill unoptimized sizes="94vw" className="object-contain" />
          {current.text ? <p className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-4 pt-8 pb-3 text-sm text-white">{current.text}</p> : null}
        </> : null}
        <DialogClose render={<button type="button" />} className="absolute top-3 right-3 z-10 grid size-10 cursor-pointer place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80">
          <XIcon className="size-5" aria-hidden="true" />
          <span className="sr-only">Schliessen</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  </>;
}
