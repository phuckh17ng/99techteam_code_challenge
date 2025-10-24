import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Repeat2,
  TrendingUp,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ENVIRONMENT_CONFIG } from "./constants/environment";
import rawTokenData from "./data/rawTokenData.json";
import { TokenSelector } from "./components/TokenSelector";

const processedTokenData = rawTokenData.reduce((acc, item) => {
  acc[item.currency] = {
    symbol: item.currency,
    name: item.currency,
    priceUsd: item.price,
    iconUrl: `${ENVIRONMENT_CONFIG.TOKEN_ICONS_URL}/${item.currency}.svg`,
  };
  return acc;
}, {});

const TOKENS = Object.values(processedTokenData);

const SLIPPAGE_RATE = 0.003;
const API_SIMULATION_DELAY = 2000;
const MAX_BALANCE = 1000;

const createSwapSchema = (maxBalance, fromSymbol) =>
  z.object({
    fromAmount: z
      .string()
      .nonempty("Please enter an amount to swap.")
      .transform((val) => {
        const cleaned = val.replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");
        return parts.length > 2
          ? parts[0] + "." + parts.slice(1).join("")
          : cleaned;
      })
      .pipe(
        z
          .string()
          .refine((val) => val.trim() !== "", "Please enter an amount to swap.")
      )
      .refine(
        (val) => !isNaN(parseFloat(val)),
        "Amount must be a valid number."
      )
      .refine((val) => parseFloat(val) > 0, "Amount must be greater than zero.")
      .refine(
        (val) => parseFloat(val) <= maxBalance,
        `Amount must not exceed the balance of ${maxBalance} ${fromSymbol}.`
      ),

    toAmount: z.string().optional(),
  });

function App() {
  const defaultFromToken = TOKENS.find((t) => t.symbol === "ETH") || TOKENS[0];
  const defaultToToken = TOKENS.find((t) => t.symbol === "USDC") || TOKENS[1];

  // State managed outside RHF
  const [fromToken, setFromToken] = useState(defaultFromToken);
  const [toToken, setToToken] = useState(defaultToToken);
  const [isSwapping, setIsSwapping] = useState(false);
  const [lastUpdatedField, setLastUpdatedField] = useState(null); // 'from' or 'to'
  const [successMessage, setSuccessMessage] = useState("");

  // Create dynamic schema based on current token
  const swapSchema = useMemo(
    () => createSwapSchema(MAX_BALANCE, fromToken.symbol),
    [fromToken.symbol]
  );

  // Initialize react-hook-form
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    clearErrors,
  } = useForm({
    resolver: zodResolver(swapSchema),
    mode: "onChange",
    defaultValues: {
      fromAmount: "",
      toAmount: "",
    },
  });

  // Watch input values
  const watchedFromAmount = watch("fromAmount");
  const watchedToAmount = watch("toAmount");

  // --- Exchange Logic ---

  // Calculate Exchange Rate
  const exchangeRate = useMemo(() => {
    if (fromToken.priceUsd && toToken.priceUsd && toToken.priceUsd > 0) {
      return fromToken.priceUsd / toToken.priceUsd;
    }
    return 0;
  }, [fromToken.priceUsd, toToken.priceUsd]);

  // Calculation function
  const calculateAmount = useCallback((amount, rate, isReverse = false) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || rate <= 0) return 0;

    const adjustedRate = rate * (1 - SLIPPAGE_RATE);

    if (isReverse) {
      return numAmount / adjustedRate;
    }
    return numAmount * adjustedRate;
  }, []);

  useEffect(() => {
    if (exchangeRate <= 0) {
      // Clear amounts if rate is invalid
      setValue("toAmount", "");
      setValue("fromAmount", "");
      return;
    }

    // Determine the driving input and calculate the reciprocal output
    if (lastUpdatedField === "from") {
      const inputAmount = parseFloat(watchedFromAmount);

      if (isNaN(inputAmount) || inputAmount <= 0) {
        setValue("toAmount", "");
        return;
      }

      const calculatedToAmount = calculateAmount(
        inputAmount,
        exchangeRate,
        false
      );
      setValue("toAmount", calculatedToAmount.toFixed(8), {
        shouldValidate: true,
      });
    } else if (lastUpdatedField === "to") {
      const outputAmount = parseFloat(watchedToAmount);

      if (isNaN(outputAmount) || outputAmount <= 0) {
        setValue("fromAmount", "");
        return;
      }

      const calculatedFromAmount = calculateAmount(
        outputAmount,
        exchangeRate,
        true
      );
      setValue("fromAmount", calculatedFromAmount.toFixed(8));
      clearErrors("fromAmount");
    }
  }, [
    watchedFromAmount,
    watchedToAmount,
    exchangeRate,
    lastUpdatedField,
    calculateAmount,
    setValue,
    clearErrors,
  ]);

  // Effect to prevent swapping identical tokens and clear amounts/errors on token change
  useEffect(() => {
    if (fromToken.symbol === toToken.symbol) {
      const newToToken = TOKENS.find((t) => t.symbol !== fromToken.symbol);
      if (newToToken) {
        setToToken(newToToken);
      }
    }
    // Reset amounts and errors when tokens change
    setValue("fromAmount", "");
    setValue("toAmount", "");
    clearErrors("fromAmount");
    setLastUpdatedField(null);
  }, [fromToken, toToken, setValue, clearErrors]);

  // --- Handlers ---

  const handleSetFromToken = (token) => {
    setFromToken(token);
  };

  const handleSetToToken = (token) => {
    setToToken(token);
  };

  const handleSwapTokens = () => {
    const newFromToken = toToken;
    const newToToken = fromToken;
    setFromToken(newFromToken);
    setToToken(newToToken);
    // Swap the amounts in the input fields
    const tempAmount = watchedFromAmount;
    setValue("fromAmount", watchedToAmount);
    setValue("toAmount", tempAmount);

    setLastUpdatedField("from"); // Set 'from' as the driver after swap
    clearErrors("fromAmount");
  };

  const alertSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  // Submit Handler for RHF
  const onSubmit = (data) => {
    // RHF already validated fromAmount based on Zod rules
    const inputAmount = parseFloat(data.fromAmount);
    console.log(
      "Submitting swap:",
      inputAmount,
      fromToken.symbol,
      "to",
      toToken.symbol
    );
    if (fromToken.symbol === toToken.symbol) {
      // This is primarily handled in useEffect, but good to have a final check
      alert("Cannot swap two identical currencies.");
      return;
    }

    if (exchangeRate <= 0) {
      // The rate logic is complex to put in Zod, so this check remains here
      // This is now displayed as a regular error message in the UI
      return;
    }

    setIsSwapping(true);

    setTimeout(() => {
      setIsSwapping(false);
      alertSuccess(
        `Swap successful! You received ${parseFloat(watchedToAmount).toFixed(
          4
        )} ${toToken.symbol}`
      );
      // Reset form and state
      setValue("fromAmount", "");
      setValue("toAmount", "");
      setLastUpdatedField(null);
      clearErrors("fromAmount");
    }, API_SIMULATION_DELAY);
  };

  // Logic to manually filter input and set the driving field
  const handleInputChange = (e, fieldName) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    // Basic input cleaning
    const cleanValue =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : value;

    setValue(fieldName, cleanValue, {
      shouldValidate: fieldName === "fromAmount",
    });
    setLastUpdatedField(fieldName === "fromAmount" ? "from" : "to");
  };

  const rateError = exchangeRate <= 0;
  const generalError = rateError
    ? "Cannot calculate exchange rate for this token pair."
    : errors.fromAmount?.message || "";

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans">
      {/* Success Alert */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-xl bg-green-600 text-white shadow-lg flex items-center space-x-3 transition-opacity duration-300">
          <CheckCircle className="w-6 h-6" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      <div className="w-full max-w-lg bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-2xl border border-gray-700">
        <h1 className="text-3xl font-extrabold text-white mb-6 text-center">
          Swap
        </h1>

        {/* Use RHF's handleSubmit */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* FROM TOKEN INPUT */}
          <div className="bg-gray-700/70 p-4 rounded-xl shadow-inner border border-gray-600">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-400">
                Amount to send
              </span>
              <span className="text-xs text-gray-400">
                Balance: {MAX_BALANCE} {fromToken.symbol}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Controller
                name="fromAmount"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    value={watchedFromAmount} // Controlled value
                    onChange={(e) => handleInputChange(e, "fromAmount")}
                    placeholder="0.0"
                    className="w-full text-3xl bg-transparent text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-0 appearance-none"
                  />
                )}
              />
              <TokenSelector
                currentToken={fromToken}
                tokens={TOKENS.filter((t) => t.symbol !== toToken.symbol)}
                onSelect={handleSetFromToken}
                label="From Token"
              />
            </div>
          </div>

          <div className="flex justify-center -mt-1">
            <button
              type="button"
              onClick={handleSwapTokens}
              className="p-3 bg-gray-700 border-4 border-gray-800 rounded-full text-indigo-400 hover:text-indigo-300 hover:bg-gray-600 transition-all duration-300 shadow-lg hover:shadow-indigo-500/50"
              title="Reverse tokens"
            >
              <Repeat2 className="w-5 h-5" />
            </button>
          </div>

          {/* TO TOKEN INPUT */}
          <div className="bg-gray-700/70 p-4 rounded-xl shadow-inner border border-gray-600">
            <span className="text-sm font-medium text-gray-400 mb-1 block">
              Amount to receive
            </span>
            <div className="flex items-center space-x-3">
              <Controller
                name="toAmount"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    value={watchedToAmount} // Controlled value
                    onChange={(e) => handleInputChange(e, "toAmount")}
                    placeholder="0.0"
                    className="w-full text-3xl bg-transparent text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-0 appearance-none"
                    disabled={isSwapping}
                  />
                )}
              />
              <TokenSelector
                currentToken={toToken}
                tokens={TOKENS.filter((t) => t.symbol !== fromToken.symbol)}
                onSelect={handleSetToToken}
                label="To Token"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 text-sm text-gray-300">
            <div className="flex justify-between">
              <span className="flex items-center space-x-1 font-medium text-indigo-400">
                <TrendingUp className="w-4 h-4" />
                <span>Rate</span>
              </span>
              <span>
                1 {fromToken.symbol} ={" "}
                {exchangeRate ? exchangeRate.toFixed(8) : "---"}{" "}
                {toToken.symbol}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="flex items-center space-x-1">
                <RefreshCw className="w-4 h-4 text-gray-500" />
                <span>Slippage Fee</span>
              </span>
              <span>{SLIPPAGE_RATE * 100}%</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 text-white border-t border-gray-700">
              <span>Total (Estimated)</span>
              <span className="text-green-400">
                {watchedToAmount
                  ? parseFloat(watchedToAmount).toFixed(8)
                  : "0.0000"}{" "}
                {toToken.symbol}
              </span>
            </div>
          </div>

          {/* Error Display (using generalError derived from RHF errors) */}
          {generalError && (
            <div className="p-3 bg-red-800/50 border border-red-700 rounded-xl text-red-300 flex items-center space-x-2 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{generalError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={
              isSwapping ||
              !watchedFromAmount ||
              parseFloat(watchedFromAmount) <= 0 ||
              !!generalError ||
              rateError
            }
            className={`w-full py-4 text-lg font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
              isSwapping
                ? "bg-indigo-700 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSwapping ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Transaction...</span>
              </>
            ) : (
              <span>Comfirm Swap</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
