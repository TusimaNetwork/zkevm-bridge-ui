import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { Token } from "src/domain";

const initialState: TokensSliceState = {
  tokens: [],
  nativeTokens:[]
};
type ClaimType = {
  data:any 
  primaryKey:string
}
export const tokensSlice = createSlice({
  name: "tokens",
  initialState,
  reducers: {
    setNativeTokens: (state, action: PayloadAction<{ tokens: Token[] }>) => {
      const { tokens } = action.payload;
      state.nativeTokens = [...tokens];
    },
    addToken: (state, action: PayloadAction<{ token: Token }>) => {
      const { token } = action.payload
      if(!state.tokens.find(
        (tkn) => tkn.address === token.address && tkn.chainId === token.chainId
      )){
        state.tokens = [token,...state.tokens]
      }
    },
    removeToken: (state, action: PayloadAction<{ token:Token }>) => {
      const { token} = action.payload
      state.tokens = state.tokens.filter((tkn)=>!(tkn.chainId === token.chainId && tkn.address === token.address))
    },
  }
})

export interface TokensSliceState {
  tokens: Token[]
  nativeTokens:Token[]
}
