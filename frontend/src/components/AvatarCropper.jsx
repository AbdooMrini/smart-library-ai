import { useEffect, useRef, useState } from "react";

export default function AvatarCropper({ file, onCancel, onConfirm }) {
  const [url, setUrl] = useState("");
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const imageRef = useRef(null);
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  const crop = () => {
    const image = imageRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const context = canvas.getContext("2d");
    const base = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    const maxX = Math.max(0, image.naturalWidth - base);
    const maxY = Math.max(0, image.naturalHeight - base);
    const sourceX = maxX * ((x + 100) / 200);
    const sourceY = maxY * ((y + 100) / 200);
    context.drawImage(image, sourceX, sourceY, base, base, 0, 0, 512, 512);
    canvas.toBlob((blob) => onConfirm(new File([blob], "avatar.webp", { type: "image/webp" })), "image/webp", 0.88);
  };
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4"><div className="card w-full max-w-md p-6"><h3 className="text-xl font-bold">Recadrer la photo</h3><div className="relative mx-auto mt-5 size-72 overflow-hidden rounded-full bg-neutral-200"><img ref={imageRef} src={url} className="h-full w-full object-cover" style={{ transform: `scale(${zoom}) translate(${x / 4}%, ${y / 4}%)` }} alt="" /></div><label className="mt-5 block text-sm">Zoom<input type="range" min="1" max="3" step=".05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full" /></label><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs">Horizontal<input type="range" min="-100" max="100" value={x} onChange={(event) => setX(Number(event.target.value))} className="w-full" /></label><label className="text-xs">Vertical<input type="range" min="-100" max="100" value={y} onChange={(event) => setY(Number(event.target.value))} className="w-full" /></label></div><div className="mt-6 flex justify-end gap-2"><button onClick={onCancel} className="btn-light">Annuler</button><button onClick={crop} className="btn-dark">Utiliser cette photo</button></div></div></div>;
}
