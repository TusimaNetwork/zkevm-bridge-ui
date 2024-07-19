import { EAGLE, GOERLI } from "src/chains"
import { createPublicClient, custom, http } from "viem"
import { mainnet } from "viem/chains"

export const usePublicClient = () => {
  if (window.ethereum && window.ethereum.isMetaMask) {
    return createPublicClient({
      chain: mainnet,
      transport: custom(window.ethereum)
    })
  }
}
export const useGOERLIPublicClient = () => {
    return createPublicClient({
      chain: GOERLI,
      transport: http()
    })
}
export const useEAGLEPublicClient = () => {
  return createPublicClient({
    chain: EAGLE,
    transport: http()
  })
}