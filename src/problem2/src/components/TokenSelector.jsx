import { CheckCircle, ChevronDown } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Image } from "../components/Image";
import { useDebounce } from "../hooks/use-debounce";

export const TokenSelector = ({ currentToken, tokens, onSelect, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredTokens = useMemo(() => {
    if (!debouncedSearchTerm) return tokens;
    return tokens.filter(
      (token) =>
        token.symbol
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        token.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [tokens, debouncedSearchTerm]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSearchTerm("");
          setIsOpen(true);
        }}
        className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 transition duration-200 p-2 pl-3 rounded-xl font-bold text-lg text-white group"
      >
        <div className="w-6 h-6 rounded-full overflow-hidden">
          <Image
            src={currentToken.iconUrl}
            alt={currentToken.currency}
            fallbackSrc={"https://placehold.co/64x64/2563eb/ffffff?text=?"}
          />
        </div>
        <span>{currentToken.symbol}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white transition" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-80 backdrop-blur-sm p-4">
          <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-white">
              Select {label}
            </h3>

            <input
              type="text"
              placeholder="Search token..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 mb-4 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />

            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((token) => (
                  <div
                    key={token.symbol}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition duration-150 ${
                      currentToken.symbol === token.symbol
                        ? "bg-indigo-600"
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                    onClick={() => {
                      onSelect(token);
                      setIsOpen(false);
                    }}
                  >
                    <div className="w-6 h-6 mr-3 rounded-full overflow-hidden">
                      <Image
                        src={token.iconUrl}
                        alt={token.currency}
                        fallbackSrc={
                          "https://placehold.co/64x64/2563eb/ffffff?text=?"
                        }
                      />
                    </div>
                    <div className="grow">
                      <p className="text-white font-medium">{token.name}</p>
                      <p className="text-sm text-gray-300">
                        ${token.priceUsd.toFixed(4)}
                      </p>
                    </div>
                    {currentToken.symbol === token.symbol && (
                      <CheckCircle className="w-5 h-5 text-white" />
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">
                  No matching tokens found.
                </p>
              )}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
