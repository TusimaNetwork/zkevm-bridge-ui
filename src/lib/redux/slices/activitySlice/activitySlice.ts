import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { addActivityAsync } from "./thunks";
import { Bridge } from "src/domain";

const initialState: ActivitySliceState = {
  lists: {},
};

export const activitySlice = createSlice({
  name: "activity",
  initialState,
  reducers: {
    addActivity: (state, action: PayloadAction<{ account: string; bridge: Bridge }>) => {
      const { account, bridge } = action.payload
      const txs = state.lists[account] ?? {}
      txs[`${bridge.from.chainId}-${bridge.depositTxHash}`] = bridge
      state.lists[account] = txs
    },
  },
  extraReducers: (builder) => {
    builder.addCase(addActivityAsync.pending, (state) => {})
  }
})

export interface ActivitySliceState {
  lists: {
    [account: string]: {
      [hash: string]: Bridge
    }
  }
}
