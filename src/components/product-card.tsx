"use client";

type ProductCardProps = {
  id: string;
  name: string;
  variety: string;
  weightGrams: number;
  priceJpy: number;
  imageUrl: string | null;
  description: string | null;
  onAddToCart: (id: string) => void;
};

export function ProductCard({
  name,
  variety,
  weightGrams,
  priceJpy,
  imageUrl,
  description,
  id,
  onAddToCart,
}: ProductCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={name}
          className="mb-3 h-48 w-full rounded-md object-cover"
        />
      )}
      <h3 className="text-lg font-bold">{name}</h3>
      <p className="text-sm text-gray-500">
        {variety} / {weightGrams}g
      </p>
      {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xl font-bold text-orange-600">
          ¥{priceJpy.toLocaleString()}
        </span>
        <button
          onClick={() => onAddToCart(id)}
          className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          カートに追加
        </button>
      </div>
    </div>
  );
}
