"use client";

type CartItemProps = {
  id: string;
  name: string;
  priceJpy: number;
  quantity: number;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
};

export function CartItem({
  id,
  name,
  priceJpy,
  quantity,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  return (
    <div className="flex items-center justify-between border-b py-3">
      <div>
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-sm text-gray-700">¥{priceJpy.toLocaleString()}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateQuantity(id, quantity - 1)}
          disabled={quantity <= 1}
          className="h-8 w-8 rounded-full border text-center disabled:opacity-30"
        >
          -
        </button>
        <span className="w-6 text-center text-gray-900">{quantity}</span>
        <button
          onClick={() => onUpdateQuantity(id, quantity + 1)}
          className="h-8 w-8 rounded-full border text-center"
        >
          +
        </button>
        <button
          onClick={() => onRemove(id)}
          className="ml-2 text-sm text-red-500 hover:text-red-700"
        >
          削除
        </button>
      </div>
    </div>
  );
}
