import { defineChain } from "viem";
import { EthereumChainId } from "./domain";
// networkId: polygonZkEVMNetworkId,
// rpcUrl: VITE_POLYGON_ZK_EVM_RPC_URL,
const env = import.meta.env;
export const GOERLI = defineChain({
  id: EthereumChainId.GOERLI,
  name: "Eagle",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [env.VITE_ETHEREUM_RPC_URL],
    },
    public: {
      http: [env.VITE_ETHEREUM_RPC_URL],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: env.VITE_ETHEREUM_EXPLORER_URL },
  },
  network: String(EthereumChainId.GOERLI),
});
export const EAGLE = defineChain({
  id: EthereumChainId.EAGLE,
  name: "Eagle",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [env.VITE_POLYGON_ZK_EVM_RPC_URL],
    },
    public: {
      http: [env.VITE_POLYGON_ZK_EVM_RPC_URL],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: env.VITE_POLYGON_ZK_EVM_EXPLORER_URL },
  },
  network: String(EthereumChainId.EAGLE),
});
