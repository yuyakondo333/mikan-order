# 商品バリエーション テストシナリオリスト

## A. バリデーション（validations.ts）

| # | テストケース | 優先度 |
|---|---|---|
| A1 | productSchema: name が空文字 → エラー | 高 |
| A2 | productSchema: stockKg が負数 → エラー | 高 |
| A3 | productSchema: 正常値で成功 | 高 |
| A4 | variantSchema: label が空文字 → エラー | 高 |
| A5 | variantSchema: weightKg が 0 → エラー（positive） | 高 |
| A6 | variantSchema: weightKg が 0.5（小数）→ 成功 | 高 |
| A7 | variantSchema: priceJpy が 0 → エラー（positive） | 高 |
| A8 | variantSchema: priceJpy が小数 → エラー（int） | 中 |
| A9 | variantSchema: 正常値で成功 | 高 |
| A10 | productWithVariantsSchema: variants が空配列 → エラー | 高 |
| A11 | productWithVariantsSchema: variants が1つ以上で成功 | 高 |
| A12 | variantSchema: デフォルト値（isGiftOnly=false, displayOrder=0, isAvailable=true）が適用される | 中 |
| A13 | productSchema: stockKg が 0.5（小数）→ 成功 | 中 |

## B. 在庫計算（calcStockConsumption）

| # | テストケース | 優先度 |
|---|---|---|
| B1 | 整数重量 × 整数数量（3kg × 2 = 6） | 高 |
| B2 | 小数重量 × 整数数量（0.5kg × 3 = 1.5） | 高 |
| B3 | weightKg が string "3.000" で渡される → 正しく変換 | 高 |
| B4 | quantity が 0 → 消費量 0 | 低 |

## C. 在庫操作（deductStock / restoreStock）

| # | テストケース | 優先度 |
|---|---|---|
| C1 | deductStock: 在庫十分 → 減算成功、返り値あり | 高 |
| C2 | deductStock: 在庫不足 → 空配列返却（例外ではない） | 高 |
| C3 | deductStock: 在庫ぴったり → 減算成功（境界値） | 高 |
| C4 | restoreStock: 指定量が加算される | 高 |

## D. カート操作（Server Actions: cart.ts）

| # | テストケース | 優先度 |
|---|---|---|
| D1 | addToCart: 未認証 → エラー | 高 |
| D2 | addToCart: 存在しないvariantId → エラー | 高 |
| D3 | addToCart: 販売停止バリエーション → エラー | 高 |
| D4 | addToCart: 販売停止商品のバリエーション → エラー | 高 |
| D5 | addToCart: 在庫十分で成功 | 高 |
| D6 | addToCart: 在庫不足で失敗 | 高 |
| D7 | addToCart: 既存カートアイテム（同一variant）あり → 合算で在庫チェック | 高 |
| D8 | addToCart: quantity < 1 → エラー | 高 |
| D9 | updateCartItemQuantity: 在庫十分で成功 | 高 |
| D10 | updateCartItemQuantity: 在庫不足で失敗 | 高 |
| D11 | removeFromCart: 正常削除 | 高 |
| D12 | addToCart: 同一商品の別バリエーションがそれぞれ別行でカートに入る | 高 |
| D13 | addToCart: productId 冗長カラムが正しくセットされる | 中 |

## E. 注文作成（Server Actions: orders.ts - createOrder）

| # | テストケース | 優先度 |
|---|---|---|
| E1 | 未認証 → エラー | 高 |
| E2 | カート空 → エラー | 高 |
| E3 | カート内に販売停止商品 → エラー | 高 |
| E4 | カート内に販売停止バリエーション → エラー | 高 |
| E5 | 単一バリエーション × 単一数量 → 在庫チェックOK → 注文成功 | 高 |
| E6 | 同一商品の複数バリエーション → 合計消費kgで在庫チェック | 高 |
| E7 | 在庫10kg、3kg×2(=6kg)+5kg×1(=5kg)=合計11kg → 個別OKだが合計NG → 注文失敗 | 高 |
| E8 | 異なる商品のバリエーションは独立して在庫チェック | 高 |
| E9 | トランザクション内の在庫減算失敗 → 全ロールバック | 高 |
| E10 | order_items にスナップショット（productName, label, weightKg, unitPriceJpy）が記録される | 高 |
| E11 | order_items に productId が記録される | 中 |
| E12 | 注文成功後にカートがクリアされる | 高 |
| E13 | 在庫ぴったり（在庫 = 合計消費kg）で成功（境界値） | 中 |
| E14 | 合計金額が variant.priceJpy × quantity の合計で計算される | 高 |

## F. 注文キャンセル（Server Actions: orders.ts - updateOrderStatusAction）

| # | テストケース | 優先度 |
|---|---|---|
| F1 | 非管理者 → エラー | 高 |
| F2 | キャンセル → order_items.weightKg × quantity が stockKg に加算される | 高 |
| F3 | キャンセル → 復元量が order_items スナップショットベース（マスタ変更後でも正確） | 高 |
| F4 | バリエーション削除後のキャンセル → productId で復元先特定 | 高 |
| F5 | 商品削除後のキャンセル → productId が NULL → 復元スキップ（エラーにならない） | 高 |
| F6 | 既にキャンセル済みの注文 → 二重復元しない | 高 |
| F7 | ステータス「準備完了」→ LINE通知にバリエーションラベルが含まれる | 中 |
| F8 | 同一商品の複数バリエーション（3kg×2+5kg×1）キャンセル → 合計11kg復元 | 高 |

## G. 商品/バリエーション管理（Server Actions: products.ts）

| # | テストケース | 優先度 |
|---|---|---|
| G1 | createProductAction: 非管理者 → エラー | 高 |
| G2 | createProductAction: 正常作成 | 高 |
| G3 | updateProductAction: name, stockKg, isAvailable の部分更新 | 高 |
| G4 | deleteProductAction: 商品削除（CASCADE で variants も消える） | 高 |
| G5 | createVariantAction: 正常作成 | 高 |
| G6 | updateVariantAction: 部分更新 | 中 |
| G7 | deleteVariantAction: 最後の1つ → エラー（最低1つ必要） | 高 |
| G8 | deleteVariantAction: 2つ以上ある場合は削除成功 | 高 |
| G9 | toggleProductAvailabilityAction: isAvailable 反転 | 中 |

## H. クエリ層

| # | テストケース | 優先度 |
|---|---|---|
| H1 | getAvailableProductsWithVariants: product.isAvailable=true のみ返す | 高 |
| H2 | getAvailableProductsWithVariants: variant.isAvailable=false のバリエーションはフィルタされる | 高 |
| H3 | getAvailableProductsWithVariants: バリエーションが displayOrder 順で返る | 中 |
| H4 | getAvailableProductsWithVariants: 全variant非公開の商品は返らない | 中 |
| H5 | getCartWithVariants: cart_items + variants + products のJOINで必要フィールドが全て返る | 高 |
| H6 | getCartWithVariants: 7日以上前のカートアイテムは除外される | 高 |
| H7 | getOrderWithUserAndItems: order_items のスナップショット（productName, label, weightKg）が返る | 中 |
| H8 | countVariantsByProductId: 正しい件数を返す | 中 |
