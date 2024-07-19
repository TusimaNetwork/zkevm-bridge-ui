import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { addActivityAsync } from "./thunks";
import { Bridge, Token } from "src/domain";
import { PendingTx } from "src/utils/serializers";

const initialState: TokensSliceState = {
  tokens: [],
};
type ClaimType = {
  data:any 
  primaryKey:string
}
export const tokensSlice = createSlice({
  name: "tokens",
  initialState,
  reducers: {
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
}
