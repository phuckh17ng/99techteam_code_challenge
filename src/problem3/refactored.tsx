import React, { useMemo } from "react";
// Assume these types and hooks are defined
// Assume these hooks exist
declare function useWalletBalances(): WalletBalance[];
declare function usePrices(): Record<string, number>;

// Assume WalletRow component exists
declare const WalletRow: React.FC<WalletRowProps>;
interface WalletRowProps {
  className: string;
  amount: number;
  usdValue: number;
  formattedAmount: string;
}

interface WalletBalance {
  currency: string;
  amount: number;
  // ✅ IMPROVEMENT: Added 'blockchain' property to the interface for better type safety.
  blockchain: string;
}

interface BoxProps {
  className?: string;
  children?: React.ReactNode;
}

interface Props extends BoxProps {
  // Add other props if needed
  classes: { row: string };
}

// ✅ IMPROVEMENT: Using a constant object map for priorities instead of a switch/case block.
// This improves readability and maintainability.
const BLOCKCHAIN_PRIORITIES: Record<string, number> = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20,
};

const DEFAULT_PRIORITY = -99;

// ✅ IMPROVEMENT: The pure function 'getPriority' is moved outside the component,
// ensuring it's not redefined on every render (Performance/Anti-pattern fix).
// This function can also be placed in a separate utils.ts file if needed.
const getPriority = (blockchain: string): number => {
  return BLOCKCHAIN_PRIORITIES[blockchain] ?? DEFAULT_PRIORITY;
};

// ✅ IMPROVEMENT: Formatting logic is extracted into a reusable, pure function.
// This function can also be placed in a separate utils.ts file if needed.
const formatAmount = (amount: number): string => {
  return amount.toFixed(2);
};

// ✅ IMPROVEMENT: Added a simple component to handle the empty state display.
const EmptyBalanceMessage: React.FC = () => (
  <p style={{ textAlign: "center", padding: "20px", color: "#666" }}>
    No valid balances to display.
  </p>
);

const WalletPage: React.FC<Props> = (props) => {
  const { children, classes, ...rest } = props;

  const balances = useWalletBalances();
  const prices = usePrices();

  // ✅ IMPROVEMENT: Logic is separated into two `useMemo` blocks for better readability,
  // while still maintaining high performance (memoizing data transformation).
  const formattedBalances = useMemo(() => {
    const sortedAndFiltered = balances
      .filter((balance: WalletBalance) => {
        const balancePriority = getPriority(balance.blockchain);
        // ✅ IMPROVEMENT: Corrected filtering logic: only display balances with valid priority AND amount > 0.
        return balancePriority > DEFAULT_PRIORITY && balance.amount > 0;
      })
      .sort((lhs: WalletBalance, rhs: WalletBalance) => {
        const leftPriority = getPriority(lhs.blockchain);
        const rightPriority = getPriority(rhs.blockchain);
        // ✅ IMPROVEMENT: Simplified sort logic (descending order by priority).
        return rightPriority - leftPriority;
      });

    return sortedAndFiltered.map((balance: WalletBalance) => {
      // ✅ IMPROVEMENT: Added fallback for price access.
      const price = prices[balance.currency] || 0;
      const usdValue = price * balance.amount;

      return {
        ...balance,
        // ✅ IMPROVEMENT: Using the extracted 'formatAmount' utility function.
        formatted: formatAmount(balance.amount),
        usdValue: usdValue,
      };
    });
    // ✅ IMPROVEMENT: Dependencies are correct—only re-run when source data changes.
  }, [balances, prices]);

  const rows = useMemo(() => {
    // ✅ IMPROVEMENT: Separated JSX mapping to keep 'formattedBalances' clean and 'rows' stable.
    return formattedBalances.map((balance) => (
      <WalletRow
        // ✅ IMPROVEMENT: Replaced anti-pattern 'key={index}' with a stable composite key.
        key={`${balance.blockchain}-${balance.currency}`}
        className={classes.row}
        amount={balance.amount}
        usdValue={balance.usdValue}
        formattedAmount={balance.formatted}
      />
    ));
    // ✅ IMPROVEMENT: Relies on the memoized 'formattedBalances' array, ensuring rows are stable
    // unless the underlying data truly changes.
  }, [formattedBalances, classes.row]);

  // ✅ IMPROVEMENT: Conditional rendering logic to handle the empty balance scenario gracefully.
  const content = rows.length > 0 ? rows : <EmptyBalanceMessage />;

  return <div {...rest}>{content}</div>;
};

export default WalletPage;
