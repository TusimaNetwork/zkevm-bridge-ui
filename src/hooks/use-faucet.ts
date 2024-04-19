import { useState } from "react";
import { Contract } from "ethers";
import abi from "src/abi/faucet.json";
import { useProvidersContext } from "src/contexts/providers.context";
import { EthereumChainId } from "src/domain";
export function useFaucet(
  chain: any,
  address: string
): { isClaimButtonDisabled: any; isAddButtonDisabled: any; onFaucet: any; onAddToken: any } {
  const [isClaimButtonDisabled, setClaimButtonDisabled] = useState(false);
  const [isAddButtonDisabled, setAddButtonDisabled] = useState({
    TSM: false,
    USDT: false,
    USDC: false,
  });
  const { changeNetwork, connectedProvider } = useProvidersContext();
  const onFaucet = async () => {
    if (connectedProvider.status === "successful") {
      const provider = connectedProvider.data.provider;
      const chainId = await provider.getNetwork();
      if (chainId?.chainId !== EthereumChainId.SEPOLIA) {
        changeNetwork(chain).then(executeFaucet);
      } else {
        executeFaucet();
      }
    }
  };
  const executeFaucet = async () => {
    if (connectedProvider.status === "successful") {
      const provider = connectedProvider.data.provider;
      const signer = provider.getSigner();
      const contract = new Contract("0x2C5628A41C31a68fa5132203cE8A21990e958dfA", abi, signer);
      setClaimButtonDisabled(true);
      try {
        const { wait } = await contract.mintToken(address);
        await wait();
      } finally {
        setClaimButtonDisabled(false);
      }
    }
  };
  const onAddToken = async (name: "USDT" | "USDC" | "TSM") => {
    if (connectedProvider.status === "successful") {
      const provider = connectedProvider.data.provider;
      const chainId = await provider.getNetwork();
      if (chainId?.chainId !== EthereumChainId.SEPOLIA) {
        changeNetwork(chain).then(() => executeAddToken(name));
      } else {
        executeAddToken(name);
      }
    }
  };
  const executeAddToken = async (symbol: "USDT" | "USDC" | "TSM") => {
	const { host, protocol } = window.location
    if (connectedProvider.status === "successful") {
      const tokens = {
        TSM: {
          address: "0x539a827822b2a532092b8A08919DCAC4B00bead1",
          decimals: 18,
        },
        USDT: {
          address: "0x2F813BDd15E9f2821545dFDfBF9BB570Fb88D041",
          decimals: 18,
        },
        USDC: {
          address: "0xCD6b2a3DE83182af377AEC5d71C261A0031E2fB8",
          decimals: 18,
        },
      }

      setAddButtonDisabled({
        ...isAddButtonDisabled,
        [symbol]: true
      })
      window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
		...tokens[symbol],
		symbol,
		image: `${protocol}//${host}/symbol/${symbol.toLocaleUpperCase()}.png`,	
	  }
        }
      }).finally(()=>{
	setAddButtonDisabled({
          ...isAddButtonDisabled,
          [symbol]: false
        })
      })
    }
  }
  return {
    isAddButtonDisabled,
    isClaimButtonDisabled,
    onFaucet,
    onAddToken,
  };
}
