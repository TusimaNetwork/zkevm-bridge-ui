import { useMemo } from "react";
import { Chain, Token } from "src/domain";
import { useDispatch,selectTokens,useSelector,tokensSlice } from "src/lib/redux";

export const useCustomTokens = () => {
  const dispatch = useDispatch()
  const tokens = useSelector(selectTokens)
  const getCustomTokens:Token[]=useMemo(()=>{
    return tokens.tokens
  },[tokens.tokens])
  function getChainCustomTokens(chain: Chain): Token[] {
    return getCustomTokens.filter(
      (token) =>
        token.chainId === chain.chainId ||
        (token.wrappedToken && token.wrappedToken.chainId === chain.chainId)
    );
  }
  const addCustomToken=(token: Token): Token[]=> {
    dispatch(tokensSlice.actions.addToken({token}))
    return getCustomTokens
  }
  
  function removeCustomToken(token: Token): Token[] {
    dispatch(tokensSlice.actions.removeToken({token}))
    return getCustomTokens
  }
  function cleanupCustomTokens(tokens:Token[]){
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index]
      removeCustomToken(token)
    }
  }
  function isChainCustomToken(token:Token,chain:Chain){
    return getChainCustomTokens(chain).find((tkn) => tkn.address === token.address) !== undefined;
  }

  
  return {
    getCustomTokens,
    addCustomToken,
    removeCustomToken,
    cleanupCustomTokens,
    isChainCustomToken
  }
};
