import { Bridge, Chain, ChainKey, Currency, EthereumChainId } from "src/domain";
export enum FromLabel {
  Deposit ="Deposit",
  Withdraw="Withdraw"
}
export function getBridgeStatus(status: Bridge["status"], from: Bridge["from"]): string {
  switch (status) {
    case "pending": {
      return "Processing";
    }
    case "initiated": {
      if (from.key === ChainKey.ethereum) {
        return "Processing";
      } else {
        return "Initiated";
      }
    }
    case "on-hold": {
      if (from.key === ChainKey.ethereum) {
        return "Processing";
      } else {
        return "On Hold";
      }
    }
    case "completed": {
      return "Completed";
    }
  }
}

export function getEthereumNetworkName(chainId: number): string {
  switch (chainId) {
    case EthereumChainId.GOERLI: {
      return "Goerli Testnet";
    }
    case EthereumChainId.EAGLE:{
      return 'Tusima Eagle'
    }
    case EthereumChainId.SEPOLIA:{
      return 'Sepolia'
    }
    default: {
      return "Ethereum";
    }
  }
}

export function getDeploymentName(chain: Chain): string | undefined {
  switch (chain.chainId) {
    case EthereumChainId.MAINNET: {
      return "Mainnet Beta";
    }
    case EthereumChainId.GOERLI: {
      return "Testnet";
    }
    default: {
      return undefined;
    }
  }
}

type CurrencySymbol = "€" | "$" | "¥" | "£";

export function getCurrencySymbol(currency: Currency): CurrencySymbol {
  switch (currency) {
    case Currency.EUR: {
      return "€";
    }
    case Currency.USD: {
      return "$";
    }
    case Currency.GBP: {
      return "£";
    }
    case Currency.JPY:
    case Currency.CNY: {
      return "¥";
    }
  }
}
