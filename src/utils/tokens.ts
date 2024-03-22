import { constants as ethersConstants } from "ethers";

import { Chain, Token } from "src/domain";

const selectTokenAddress = (token: Token, chain: Chain): string => {
  return token.wrappedToken && chain.chainId === token.wrappedToken.chainId
    ? token.wrappedToken.address
    : token.address;
};

const isTokenEther = (token: Token | string): boolean => {
  const address = typeof token === 'string' ? token : (token as Token).address;

  return [ethersConstants.AddressZero,'0x0000000000000000000000000000000000000001'].includes(address)
};

export { isTokenEther, selectTokenAddress };
