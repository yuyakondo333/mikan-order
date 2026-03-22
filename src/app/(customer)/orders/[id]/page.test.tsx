import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

class NotFoundError extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}

const { mockNotFound } = vi.hoisted(() => ({
  mockNotFound: vi.fn(() => {
    throw new NotFoundError();
  }),
}));
vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

vi.mock("@/lib/dal", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/db/queries/orders", () => ({
  getOrderDetailV2: vi.fn(),
}));

vi.mock("@/db/queries/payment-settings", () => ({
  getPaymentSettings: vi.fn(),
}));

vi.mock("@/components/order-detail-view", () => ({
  OrderDetailView: (props: Record<string, unknown>) => (
    <div data-testid="order-detail-view" data-order={JSON.stringify(props.order)} />
  ),
}));

import { getAuthenticatedUser } from "@/lib/dal";
import { getOrderDetailV2 } from "@/db/queries/orders";
import { getPaymentSettings } from "@/db/queries/payment-settings";
import OrderDetailPage, { generateMetadata } from "./page";

const mockGetAuth = vi.mocked(getAuthenticatedUser);
const mockGetOrderDetail = vi.mocked(getOrderDetailV2);
const mockGetPaymentSettings = vi.mocked(getPaymentSettings);

const mockUser = {
  id: "user-1",
  lineUserId: "U1234567890",
  displayName: "テスト",
  pictureUrl: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

function makeMockOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    userId: "user-1",
    fulfillmentMethod: "pickup" as const,
    status: "pending" as const,
    totalJpy: 3600,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    items: [],
    address: null,
    pickupDate: null,
    pickupTimeSlot: null,
    note: null,
    addressId: null,
    ...overrides,
  };
}

describe("OrderDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合notFoundを呼びgetOrderDetailV2を呼ばない", async () => {
    mockGetAuth.mockResolvedValue(null);

    await expect(
      OrderDetailPage({ params: Promise.resolve({ id: "order-1" }) })
    ).rejects.toThrow(NotFoundError);

    expect(mockNotFound).toHaveBeenCalled();
    expect(mockGetOrderDetail).not.toHaveBeenCalled();
  });

  it("認証済みだがgetOrderDetailV2がnullを返す場合notFoundを呼ぶ", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetOrderDetail.mockResolvedValue(null);

    await expect(
      OrderDetailPage({ params: Promise.resolve({ id: "nonexistent-order" }) })
    ).rejects.toThrow(NotFoundError);

    expect(mockGetOrderDetail).toHaveBeenCalledWith("nonexistent-order", "user-1");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("認証済みで自分の注文の場合OrderDetailViewをレンダリングする", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetOrderDetail.mockResolvedValue(makeMockOrder());

    const result = await OrderDetailPage({
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(mockGetOrderDetail).toHaveBeenCalledWith("order-1", "user-1");
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("delivery + awaiting_paymentの場合bankTransferInfoが取得される", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetOrderDetail.mockResolvedValue(
      makeMockOrder({ fulfillmentMethod: "delivery", status: "awaiting_payment" })
    );
    mockGetPaymentSettings.mockResolvedValue({
      id: "ps-1",
      bankName: "みかん銀行",
      branchName: "果実支店",
      accountType: "普通",
      accountNumber: "1234567",
      accountHolder: "ミカンノウエン",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await OrderDetailPage({
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(mockGetPaymentSettings).toHaveBeenCalled();
  });
});

describe("generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証済みで自分の注文の場合日付入りタイトルを返す", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetOrderDetail.mockResolvedValue(
      makeMockOrder({ createdAt: new Date("2025-03-15") })
    );

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(mockGetOrderDetail).toHaveBeenCalledWith("order-1", "user-1");
    expect(metadata.title).toBe("注文詳細 - 2025/3/15");
  });

  it("未認証の場合デフォルトタイトルを返す", async () => {
    mockGetAuth.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(metadata.title).toBe("注文が見つかりません");
    expect(mockGetOrderDetail).not.toHaveBeenCalled();
  });

  it("認証済みだがgetOrderDetailV2がnullの場合デフォルトタイトルを返す", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetOrderDetail.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "other-order" }),
    });

    expect(metadata.title).toBe("注文が見つかりません");
    expect(mockGetOrderDetail).toHaveBeenCalledWith("other-order", "user-1");
  });
});
