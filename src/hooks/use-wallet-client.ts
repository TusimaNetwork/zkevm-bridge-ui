import useSWR from "swr"
import { createWalletClient, custom } from "viem"
import { mainnet } from "viem/chains"

export const useWalletClient = () => {
  if (window.ethereum && window.ethereum.isMetaMask) {
    return createWalletClient({
      chain: mainnet,
      transport: custom(window.ethereum)
    })
  }
}